/**
 * Fluid Network Solver
 * 
 * Supports:
 * - Incompressible liquid flow (Darcy-Weisbach)
 * - Compressible gas flow (isentropic)
 * - Choked flow detection and calculation
 * - Valves and orifices with Cd, CdA, or Cv specification
 * 
 * References:
 * - Crane Technical Paper 410
 * - Perry's Chemical Engineers' Handbook
 * - ASME MFC-3M (Orifice Metering)
 */

import { 
  getFluidProperties, 
  criticalPressureRatio,
  isentropicTemperature,
  getLocalFluidProperties,
  gasDensityAtPT
} from './constants'

// Default fluid (water at 20°C)
const DEFAULT_FLUID = getFluidProperties('water', 293.15)  // 20°C in Kelvin

// ============================================================
// FUNDAMENTAL EQUATIONS
// ============================================================

/**
 * Calculate Reynolds number
 * Re = ρVD/μ
 * 
 * @param {number} velocity - Flow velocity (m/s)
 * @param {number} diameter - Pipe diameter (m)
 * @param {object} fluid - Fluid properties
 * @returns {number} Reynolds number (dimensionless)
 */
function reynolds(velocity, diameter, fluid = DEFAULT_FLUID) {
  return (fluid.density * Math.abs(velocity) * diameter) / fluid.viscosity
}

/**
 * Calculate Darcy friction factor using Swamee-Jain approximation
 * (explicit approximation of Colebrook-White equation)
 * 
 * f = 0.25 / [log₁₀(ε/3.7D + 5.74/Re^0.9)]²
 * 
 * Valid for: 5000 ≤ Re ≤ 10⁸, 10⁻⁶ ≤ ε/D ≤ 0.05
 * 
 * @param {number} Re - Reynolds number
 * @param {number} diameter - Pipe diameter (m)
 * @param {number} roughness - Pipe roughness (m)
 * @returns {number} Darcy friction factor (dimensionless)
 */
function frictionFactor(Re, diameter, roughness = 0.000045) {
  if (Re < 2300) {
    // Laminar flow: f = 64/Re
    return Re > 0 ? 64 / Re : 0.02
  }
  // Turbulent flow - Swamee-Jain equation
  const relativeRoughness = roughness / diameter
  const term1 = relativeRoughness / 3.7
  const term2 = 5.74 / Math.pow(Re, 0.9)
  return 0.25 / Math.pow(Math.log10(term1 + term2), 2)
}

// ============================================================
// INCOMPRESSIBLE (LIQUID) FLOW
// ============================================================

/**
 * Calculate mass flow rate for UNCHOKED incompressible flow through a restriction
 * 
 * Derivation:
 * Q = Cd × A × √(2ΔP/ρ)           [Volumetric flow]
 * ṁ = ρQ = Cd × A × √(2ρΔP)       [Mass flow]
 * 
 * @param {number} Cd - Discharge coefficient (dimensionless)
 * @param {number} area - Flow area (m²)
 * @param {number} P1 - Upstream pressure (Pa)
 * @param {number} P2 - Downstream pressure (Pa)
 * @param {object} fluid - Fluid properties
 * @returns {number} Mass flow rate (kg/s)
 */
function incompressibleMassFlow(Cd, area, P1, P2, fluid) {
  const dP = P1 - P2
  if (dP <= 0) return 0
  // ṁ = Cd × A × √(2ρΔP)
  return Cd * area * Math.sqrt(2 * fluid.density * dP)
}

/**
 * Calculate mass flow rate for CHOKED liquid flow (cavitating)
 * 
 * When P2 drops below vapor pressure (Pv), flow becomes choked.
 * The effective pressure drop is limited to (P1 - Pv).
 * 
 * ṁ_choked = Cd × A × √(2ρ(P1 - Pv))
 * 
 * @param {number} Cd - Discharge coefficient
 * @param {number} area - Flow area (m²)
 * @param {number} P1 - Upstream pressure (Pa)
 * @param {object} fluid - Fluid properties (must include vaporPressure)
 * @returns {number} Choked mass flow rate (kg/s)
 */
function chokedLiquidMassFlow(Cd, area, P1, fluid) {
  const Pv = fluid.vaporPressure || 0
  const effectiveDP = P1 - Pv
  if (effectiveDP <= 0) return 0
  return Cd * area * Math.sqrt(2 * fluid.density * effectiveDP)
}

// ============================================================
// COMPRESSIBLE (GAS) FLOW
// ============================================================

/**
 * Calculate mass flow rate for UNCHOKED compressible (subsonic) gas flow
 * 
 * Using isentropic flow relations:
 * ṁ = Cd × A × P1 × √(2γ/((γ-1)RT₁)) × √((P2/P1)^(2/γ) - (P2/P1)^((γ+1)/γ))
 * 
 * Simplified form using upstream density:
 * ṁ = Cd × A × √(2ρ₁P₁ × (γ/(γ-1)) × ((P2/P1)^(2/γ) - (P2/P1)^((γ+1)/γ)))
 * 
 * @param {number} Cd - Discharge coefficient
 * @param {number} area - Flow area (m²)
 * @param {number} P1 - Upstream pressure (Pa)
 * @param {number} P2 - Downstream pressure (Pa)
 * @param {object} fluid - Gas properties (must include gamma)
 * @returns {number} Mass flow rate (kg/s)
 */
function compressibleMassFlowUnchoked(Cd, area, P1, P2, fluid) {
  const gamma = fluid.gamma || 1.4
  const rho1 = fluid.density
  
  const pressureRatio = P2 / P1
  if (pressureRatio >= 1) return 0
  
  // Isentropic flow coefficient
  const exponent1 = 2 / gamma
  const exponent2 = (gamma + 1) / gamma
  const flowFunction = Math.pow(pressureRatio, exponent1) - Math.pow(pressureRatio, exponent2)
  
  // Mass flow rate
  const coefficient = 2 * rho1 * P1 * (gamma / (gamma - 1))
  return Cd * area * Math.sqrt(coefficient * flowFunction)
}

/**
 * Calculate mass flow rate for CHOKED compressible (sonic) gas flow
 * 
 * At choked conditions, flow velocity at throat equals speed of sound.
 * Flow becomes independent of downstream pressure.
 * 
 * ṁ_choked = Cd × A × P1 × √(γρ₁/P1) × (2/(γ+1))^((γ+1)/(2(γ-1)))
 * 
 * Or equivalently:
 * ṁ_choked = Cd × A × √(γρ₁P₁) × (2/(γ+1))^((γ+1)/(2(γ-1)))
 * 
 * @param {number} Cd - Discharge coefficient
 * @param {number} area - Flow area (m²)
 * @param {number} P1 - Upstream pressure (Pa)
 * @param {object} fluid - Gas properties
 * @returns {number} Choked mass flow rate (kg/s)
 */
function chokedGasMassFlow(Cd, area, P1, fluid) {
  const gamma = fluid.gamma || 1.4
  const rho1 = fluid.density
  
  // Choked flow coefficient: (2/(γ+1))^((γ+1)/(2(γ-1)))
  const chokedCoeff = Math.pow(2 / (gamma + 1), (gamma + 1) / (2 * (gamma - 1)))
  
  // ṁ = Cd × A × √(γρ₁P₁) × chokedCoeff
  return Cd * area * Math.sqrt(gamma * rho1 * P1) * chokedCoeff
}

/**
 * Calculate mass flow rate through a restriction (valve/orifice)
 * Automatically handles:
 * - Liquid vs gas
 * - Choked vs unchoked conditions
 * 
 * @param {number} Cd - Discharge coefficient
 * @param {number} area - Flow area (m²)
 * @param {number} P1 - Upstream pressure (Pa)
 * @param {number} P2 - Downstream pressure (Pa)
 * @param {object} fluid - Fluid properties
 * @returns {object} { massFlow, isChoked, flowRegime }
 */
function restrictionMassFlow(Cd, area, P1, P2, fluid) {
  if (P1 <= P2) {
    return { massFlow: 0, isChoked: false, flowRegime: 'no_flow' }
  }
  
  if (fluid.type === 'gas') {
    // Compressible gas flow
    const gamma = fluid.gamma || 1.4
    const criticalRatio = criticalPressureRatio(gamma)
    const pressureRatio = P2 / P1
    
    if (pressureRatio <= criticalRatio) {
      // Choked (sonic) flow
      return {
        massFlow: chokedGasMassFlow(Cd, area, P1, fluid),
        isChoked: true,
        flowRegime: 'choked_gas'
      }
    } else {
      // Unchoked (subsonic) flow
      return {
        massFlow: compressibleMassFlowUnchoked(Cd, area, P1, P2, fluid),
        isChoked: false,
        flowRegime: 'subsonic_gas'
      }
    }
  } else {
    // Incompressible liquid flow
    const Pv = fluid.vaporPressure || 0
    
    if (P2 <= Pv) {
      // Choked (cavitating) flow
      return {
        massFlow: chokedLiquidMassFlow(Cd, area, P1, fluid),
        isChoked: true,
        flowRegime: 'choked_liquid'
      }
    } else {
      // Unchoked flow
      return {
        massFlow: incompressibleMassFlow(Cd, area, P1, P2, fluid),
        isChoked: false,
        flowRegime: 'incompressible'
      }
    }
  }
}

// ============================================================
// CV-BASED FLOW CALCULATIONS
// ============================================================

/**
 * Calculate volumetric flow rate using Cv (liquid, unchoked)
 * 
 * Standard Cv equation:
 * Q_gpm = Cv × √(ΔP_psi / SG)
 * 
 * Converting to SI (m³/s):
 * Q = Cv × 7.599×10⁻⁷ × √(ΔP / SG)
 * 
 * where SG = ρ/ρ_water = ρ/998
 * 
 * @param {number} Cv - Flow coefficient
 * @param {number} P1 - Upstream pressure (Pa)
 * @param {number} P2 - Downstream pressure (Pa)
 * @param {object} fluid - Fluid properties
 * @returns {number} Volumetric flow rate (m³/s)
 */
function cvLiquidFlow(Cv, P1, P2, fluid) {
  const dP = P1 - P2
  if (dP <= 0) return 0
  const SG = fluid.density / 998  // Specific gravity relative to water
  // Cv conversion: 1 GPM/√psi = 7.599×10⁻⁷ m³/s/√Pa
  return Cv * 7.599e-7 * Math.sqrt(dP / SG)
}

/**
 * Calculate volumetric flow rate using Cv (gas, unchoked)
 * 
 * For gases at subcritical conditions:
 * Q_scfh = 963 × Cv × √((P1² - P2²) / (SG × T × Z))
 * 
 * Simplified SI form using compressibility approach:
 * ṁ = Cv × C × P1 × √((1 - (P2/P1)²) / (T × SG))
 * 
 * @param {number} Cv - Flow coefficient
 * @param {number} P1 - Upstream pressure (Pa)
 * @param {number} P2 - Downstream pressure (Pa)
 * @param {object} fluid - Gas properties
 * @param {number} T - Temperature (K), default 293.15
 * @returns {number} Volumetric flow rate at standard conditions (m³/s)
 */
function cvGasFlowUnchoked(Cv, P1, P2, fluid, T = 293.15) {
  const gamma = fluid.gamma || 1.4
  const pressureRatio = P2 / P1
  if (pressureRatio >= 1) return 0
  
  // Specific gravity relative to air
  const SG = fluid.density / 1.204
  
  // Y factor (expansion factor for gases)
  const xT = 0.7  // Typical critical pressure ratio for valves
  const x = 1 - pressureRatio
  const Y = 1 - x / (3 * xT)
  
  // Mass flow using gas Cv equation
  // Simplified: treat similar to liquid with expansion factor
  const dP = P1 - P2
  const N = 2.73e-3  // Units conversion factor for SI
  
  return N * Cv * Y * Math.sqrt(dP * P1 / (SG * T))
}

/**
 * Calculate mass flow rate using Cv (gas, choked)
 * 
 * At choked conditions:
 * ṁ_choked = Cv × C × P1 × √(γ/(SG × T))
 * 
 * @param {number} Cv - Flow coefficient
 * @param {number} P1 - Upstream pressure (Pa)
 * @param {object} fluid - Gas properties
 * @param {number} T - Temperature (K)
 * @returns {number} Mass flow rate (kg/s)
 */
function cvGasFlowChoked(Cv, P1, fluid, T = 293.15) {
  const gamma = fluid.gamma || 1.4
  const SG = fluid.density / 1.204  // Relative to air
  
  // Choked flow coefficient
  const Y = 0.667  // Y factor at choked conditions ≈ 2/3
  const xT = 0.7
  const N = 2.73e-3
  
  return N * Cv * Y * Math.sqrt(xT * P1 * P1 / (SG * T))
}

// ============================================================
// RESISTANCE CALCULATIONS (for iterative solver)
// ============================================================

/**
 * Calculate valve/orifice resistance from Cd and area
 * For incompressible flow: ΔP = R × Q × |Q|
 * where R = ρ / (2 × Cd² × A²)
 */
function valveResistanceFromCdA(Cd, area, fluid = DEFAULT_FLUID) {
  if (!Cd || Cd <= 0 || !area || area <= 0) return Infinity
  const CdA = Cd * area
  return fluid.density / (2 * CdA * CdA)
}

/**
 * Calculate valve resistance from CdA product
 */
function valveResistanceFromCdAProduct(CdA, fluid = DEFAULT_FLUID) {
  if (!CdA || CdA <= 0) return Infinity
  return fluid.density / (2 * CdA * CdA)
}

/**
 * Calculate valve resistance from Cv
 * For liquids: Q = Cv × 7.599×10⁻⁷ × √(ΔP/SG)
 * Rearranging: ΔP = SG × Q² / (Cv × 7.599×10⁻⁷)²
 */
function valveResistanceFromCv(Cv, fluid = DEFAULT_FLUID) {
  if (!Cv || Cv <= 0) return Infinity
  const SG = fluid.density / 998
  const cvSI = Cv * 7.599e-7
  return SG / (cvSI * cvSI)
}

/**
 * Legacy: Convert Cv to K factor
 */
function valveKFromCv(Cv, pipeDiameter) {
  if (!Cv || Cv <= 0) return 0
  const d4 = Math.pow(pipeDiameter, 4)
  return 1.156e9 * d4 / (Cv * Cv)
}

/**
 * Calculate orifice K factor from diameter
 * K = (1 - β⁴) / (Cd² × β⁴)
 * where β = d_orifice / D_pipe
 */
function orificeKFromDiameter(orificeDiameter, pipeDiameter, Cd = 0.62) {
  if (orificeDiameter <= 0 || orificeDiameter >= pipeDiameter) return 0
  const beta = orificeDiameter / pipeDiameter
  const beta4 = Math.pow(beta, 4)
  return (1 - beta4) / (Cd * Cd * beta4)
}

/**
 * Calculate orifice K factor from beta ratio
 */
function orificeK(orificeRatio, Cd = 0.62) {
  if (orificeRatio <= 0 || orificeRatio >= 1) return 0
  const beta4 = Math.pow(orificeRatio, 4)
  return (1 - beta4) / (Cd * Cd * beta4)
}

/**
 * Get effective CdA for a valve based on specification mode
 */
function getValveCdA(valve, pipeDiameter, pipeArea) {
  if (!valve || !valve.specMode || valve.specMode === 'none') {
    return null
  }
  
  switch (valve.specMode) {
    case 'cd_diameter': {
      const valveDiameter = valve.diameter || pipeDiameter
      const valveArea = Math.PI * Math.pow(valveDiameter / 2, 2)
      return (valve.Cd || 0.62) * valveArea
    }
    case 'cd_area': {
      return (valve.Cd || 0.62) * (valve.area || pipeArea)
    }
    case 'cda': {
      return valve.CdA || 0
    }
    case 'cv': {
      // Convert Cv to approximate CdA
      // Cv ≈ 24.6 × CdA (for CdA in in², Cv in GPM/√psi)
      // In SI: CdA_m² ≈ Cv × 2.6×10⁻⁵
      return (valve.Cv || 0) * 2.6e-5
    }
    default:
      return null
  }
}

/**
 * Calculate total resistance for a pipe with components
 */
function pipeResistance(pipe, fluid = DEFAULT_FLUID) {
  const pipeArea = Math.PI * Math.pow(pipe.diameter / 2, 2)
  
  // 1. Pipe friction: K = f × L / D
  const f = 0.02  // Initial estimate
  const K_friction = f * (pipe.length / pipe.diameter)
  const R_friction = K_friction * fluid.density / (2 * pipeArea * pipeArea)
  
  // 2. Valve resistance
  let R_valve = 0
  if (pipe.valve && pipe.valve.specMode && pipe.valve.specMode !== 'none') {
    const specMode = pipe.valve.specMode
    
    if (specMode === 'cd_diameter') {
      const valveDiameter = pipe.valve.diameter || pipe.diameter
      const valveArea = Math.PI * Math.pow(valveDiameter / 2, 2)
      R_valve = valveResistanceFromCdA(pipe.valve.Cd || 0.62, valveArea, fluid)
    } else if (specMode === 'cd_area') {
      R_valve = valveResistanceFromCdA(pipe.valve.Cd || 0.62, pipe.valve.area || pipeArea, fluid)
    } else if (specMode === 'cda') {
      R_valve = valveResistanceFromCdAProduct(pipe.valve.CdA || 0, fluid)
    } else if (specMode === 'cv') {
      R_valve = valveResistanceFromCv(pipe.valve.Cv || 0, fluid)
    }
  } else if (pipe.valve && pipe.valve.Cv > 0) {
    R_valve = valveResistanceFromCv(pipe.valve.Cv, fluid)
  }
  
  // 3. Orifice resistance
  let K_orifice = 0
  if (pipe.orifice) {
    if (pipe.orifice.diameter > 0) {
      K_orifice = orificeKFromDiameter(pipe.orifice.diameter, pipe.diameter, pipe.orifice.Cd || 0.62)
    } else if (pipe.orifice.ratio > 0 && pipe.orifice.ratio < 1) {
      K_orifice = orificeK(pipe.orifice.ratio, pipe.orifice.Cd || 0.62)
    }
  }
  const R_orifice = K_orifice * fluid.density / (2 * pipeArea * pipeArea)
  
  return R_friction + R_valve + R_orifice
}

// ============================================================
// NETWORK SOLVER
// ============================================================

/**
 * Solve the fluid network
 * 
 * For compressible (gas) flow, this solver tracks both pressure AND temperature
 * at each node. Temperature changes due to isentropic expansion:
 *   T₂ = T₁ × (P₂/P₁)^((γ-1)/γ)
 * 
 * Local fluid properties (density, viscosity) are calculated at each node's
 * actual P and T conditions.
 * 
 * @param {Array} nodes - Array of node objects
 * @param {Array} pipes - Array of pipe objects
 * @param {object} fluid - Fluid properties (from getFluidProperties)
 * @returns {object} Solution results including P and T at each node
 */
export function solveNetwork(nodes, pipes, fluid = DEFAULT_FLUID) {
  if (nodes.length < 2 || pipes.length === 0) {
    return { success: false, error: 'Need at least 2 nodes and 1 pipe' }
  }
  
  const boundaryNodes = nodes.filter(n => n.type === 'boundary')
  const internalNodes = nodes.filter(n => n.type === 'junction')
  
  if (boundaryNodes.length < 1) {
    return { success: false, error: 'Need at least 1 boundary node with fixed pressure' }
  }
  
  // Get inlet conditions (highest pressure boundary)
  const inletNode = boundaryNodes.reduce((max, n) => n.pressure > max.pressure ? n : max, boundaryNodes[0])
  const inletPressure = inletNode.pressure
  const inletTemperature = fluid.temperature || 293.15  // K
  const gamma = fluid.gamma || 1.4  // For gases
  const isCompressible = fluid.type === 'gas'
  
  // Initialize pressures
  const avgPressure = boundaryNodes.reduce((sum, n) => sum + n.pressure, 0) / boundaryNodes.length
  const pressures = {}
  nodes.forEach(node => {
    pressures[node.id] = node.type === 'boundary' ? node.pressure : avgPressure
  })
  
  // Initialize temperatures (for compressible flow)
  const temperatures = {}
  nodes.forEach(node => {
    if (node.type === 'boundary') {
      // Boundary nodes: calculate T from P using isentropic relation from inlet
      if (isCompressible) {
        temperatures[node.id] = isentropicTemperature(inletTemperature, inletPressure, node.pressure, gamma)
      } else {
        temperatures[node.id] = inletTemperature
      }
    } else {
      temperatures[node.id] = inletTemperature  // Initial guess
    }
  })
  
  // Initialize flow rates
  const flowRates = {}
  const chokedStatus = {}
  pipes.forEach(pipe => {
    flowRates[pipe.id] = 0
    chokedStatus[pipe.id] = { isChoked: false, flowRegime: 'unknown' }
  })
  
  // Node connectivity
  const nodeConnections = {}
  nodes.forEach(node => {
    nodeConnections[node.id] = []
  })
  pipes.forEach(pipe => {
    nodeConnections[pipe.fromNode].push({ pipe, direction: 1 })
    nodeConnections[pipe.toNode].push({ pipe, direction: -1 })
  })
  
  // Iterative solver
  const maxIterations = 150
  const tolerance = 1e-6
  let converged = false
  
  // Store local fluid properties at each node (updated each iteration)
  const localFluids = {}
  
  for (let iter = 0; iter < maxIterations; iter++) {
    let maxError = 0
    
    // For compressible flow, update temperatures at each node based on pressure
    if (isCompressible) {
      nodes.forEach(node => {
        const P_node = pressures[node.id]
        // Calculate temperature using isentropic relation from inlet
        temperatures[node.id] = isentropicTemperature(inletTemperature, inletPressure, P_node, gamma)
        // Calculate local fluid properties at this P and T
        localFluids[node.id] = getLocalFluidProperties(fluid, P_node, temperatures[node.id])
      })
    } else {
      // For incompressible flow, properties are constant
      nodes.forEach(node => {
        localFluids[node.id] = fluid
      })
    }
    
    // Update flow rates
    pipes.forEach(pipe => {
      const P1 = pressures[pipe.fromNode]
      const P2 = pressures[pipe.toNode]
      const dP = P1 - P2
      
      // Get local fluid at upstream node (where flow enters)
      const upstreamNode = dP >= 0 ? pipe.fromNode : pipe.toNode
      const localFluid = localFluids[upstreamNode] || fluid
      
      const pipeArea = Math.PI * Math.pow(pipe.diameter / 2, 2)
      
      // Check for restrictions (valve/orifice) that might cause choking
      const valveCdA = getValveCdA(pipe.valve, pipe.diameter, pipeArea)
      const hasRestriction = valveCdA !== null || (pipe.orifice && pipe.orifice.diameter > 0)
      
      if (hasRestriction && (localFluid.type === 'gas' || (P2 < (localFluid.vaporPressure || 0)))) {
        // Use restriction flow model with choke detection
        const effectiveCdA = valveCdA || (pipe.orifice?.Cd || 0.62) * Math.PI * Math.pow((pipe.orifice?.diameter || pipe.diameter) / 2, 2)
        
        const result = restrictionMassFlow(
          1.0,  // Cd already in CdA
          effectiveCdA,
          Math.max(P1, P2),
          Math.min(P1, P2),
          localFluid  // Use LOCAL fluid properties
        )
        
        const massFlow = dP >= 0 ? result.massFlow : -result.massFlow
        const Q = massFlow / localFluid.density
        
        flowRates[pipe.id] = Q
        chokedStatus[pipe.id] = { isChoked: result.isChoked, flowRegime: result.flowRegime }
      } else {
        // Standard resistance-based calculation for unchoked flow
        const R = pipeResistance(pipe, localFluid)  // Use LOCAL fluid properties
        const Q = Math.sign(dP) * Math.sqrt(Math.abs(dP) / (R + 1e-10))
        flowRates[pipe.id] = Q
        chokedStatus[pipe.id] = { isChoked: false, flowRegime: localFluid.type === 'gas' ? 'subsonic_gas' : 'incompressible' }
      }
    })
    
    // Update internal node pressures
    internalNodes.forEach(node => {
      const connections = nodeConnections[node.id]
      if (connections.length === 0) return
      
      let flowSum = 0
      let dFlowdP = 0
      const localFluid = localFluids[node.id] || fluid
      
      connections.forEach(({ pipe, direction }) => {
        const Q = flowRates[pipe.id] * direction
        flowSum += Q
        
        // Don't adjust pressure for choked pipes (flow is fixed)
        if (!chokedStatus[pipe.id].isChoked) {
          const R = pipeResistance(pipe, localFluid)
          const absQ = Math.abs(flowRates[pipe.id])
          if (absQ > 1e-10) {
            dFlowdP += 1 / (2 * R * absQ)
          } else {
            dFlowdP += 1e6
          }
        }
      })
      
      if (Math.abs(dFlowdP) > 1e-10) {
        const correction = -flowSum / dFlowdP * 0.5
        pressures[node.id] += correction
        // Prevent negative absolute pressures
        pressures[node.id] = Math.max(100, pressures[node.id])
        maxError = Math.max(maxError, Math.abs(flowSum))
      }
    })
    
    if (maxError < tolerance) {
      converged = true
      break
    }
  }
  
  // Build results
  const results = {
    success: converged,
    fluid: fluid.name,
    fluidType: fluid.type,
    isCompressible,
    inletConditions: {
      pressure: inletPressure,
      temperature: inletTemperature,
      temperatureC: inletTemperature - 273.15,
    },
    nodes: {},
    pipes: {},
  }
  
  nodes.forEach(node => {
    const P = pressures[node.id]
    const T = temperatures[node.id]
    const localFluid = localFluids[node.id] || fluid
    
    results.nodes[node.id] = {
      pressure: P,
      pressureKPa: P / 1000,
      pressurePsi: P * 0.000145038,
      temperature: T,
      temperatureC: T - 273.15,
      // Local fluid properties at this node
      density: localFluid.density,
      viscosity: localFluid.viscosity,
    }
  })
  
  pipes.forEach(pipe => {
    const Q = flowRates[pipe.id]
    const area = Math.PI * Math.pow(pipe.diameter / 2, 2)
    const velocity = Q / area
    
    // Get local fluid at upstream node for accurate mass flow
    const P1 = pressures[pipe.fromNode]
    const P2 = pressures[pipe.toNode]
    const upstreamNode = P1 >= P2 ? pipe.fromNode : pipe.toNode
    const localFluid = localFluids[upstreamNode] || fluid
    const massFlow = Q * localFluid.density
    
    // Temperature change across this pipe
    const T1 = temperatures[pipe.fromNode]
    const T2 = temperatures[pipe.toNode]
    const deltaT = T2 - T1
    
    results.pipes[pipe.id] = {
      flowRate: Q,                              // m³/s
      flowRateLPM: Q * 60000,                   // L/min
      massFlowRate: massFlow,                   // kg/s
      velocity: velocity,                        // m/s
      pressureDrop: P1 - P2,
      isChoked: chokedStatus[pipe.id].isChoked,
      flowRegime: chokedStatus[pipe.id].flowRegime,
      // Temperature information (important for compressible flow)
      upstreamTemp: T1,
      downstreamTemp: T2,
      tempDropC: isCompressible ? -deltaT : 0,  // Positive means cooling
      // Local density at upstream (used for mass flow)
      upstreamDensity: localFluid.density,
    }
  })
  
  if (!converged) {
    results.error = 'Solver did not converge - check network connectivity'
  }
  
  return results
}

// ============================================================
// EXPORTS
// ============================================================

export { 
  // Fundamental
  reynolds, 
  frictionFactor,
  
  // Flow calculations
  incompressibleMassFlow,
  chokedLiquidMassFlow,
  compressibleMassFlowUnchoked,
  chokedGasMassFlow,
  restrictionMassFlow,
  
  // Cv-based
  cvLiquidFlow,
  cvGasFlowUnchoked,
  cvGasFlowChoked,
  
  // Resistance
  valveResistanceFromCdA,
  valveResistanceFromCdAProduct,
  valveResistanceFromCv,
  valveKFromCv, 
  orificeK, 
  orificeKFromDiameter, 
  pipeResistance,
  
  // Utilities
  getValveCdA,
}

export default solveNetwork
