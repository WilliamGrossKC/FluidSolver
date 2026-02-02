/**
 * Fluid Network Solver
 * Uses Darcy-Weisbach equation for pipe friction
 * Supports valves and orifices
 */

// Fluid properties (water at 20°C)
const FLUID = {
  density: 998,      // kg/m³
  viscosity: 0.001,  // Pa·s
}

/**
 * Calculate Reynolds number
 */
function reynolds(velocity, diameter, fluid = FLUID) {
  return (fluid.density * Math.abs(velocity) * diameter) / fluid.viscosity
}

/**
 * Calculate Darcy friction factor using Swamee-Jain approximation
 * (explicit approximation of Colebrook-White equation)
 */
function frictionFactor(Re, diameter, roughness = 0.000045) {
  if (Re < 2300) {
    // Laminar flow
    return Re > 0 ? 64 / Re : 0.02
  }
  // Turbulent flow - Swamee-Jain equation
  const term1 = roughness / (3.7 * diameter)
  const term2 = 5.74 / Math.pow(Re, 0.9)
  return 0.25 / Math.pow(Math.log10(term1 + term2), 2)
}

/**
 * Get valve loss coefficient (K) based on type and opening percentage
 * Reference: Crane Technical Paper 410
 */
function valveK(valveType, openingPercent) {
  if (openingPercent <= 0) return Infinity // Fully closed
  if (openingPercent >= 100) {
    // Fully open K values
    const fullyOpenK = {
      gate: 0.2,      // Gate valve - low loss when open
      globe: 10,      // Globe valve - higher loss, good for throttling
      ball: 0.05,     // Ball valve - very low loss when open
      butterfly: 0.3, // Butterfly valve
      check: 2,       // Check valve
      none: 0,        // No valve
    }
    return fullyOpenK[valveType] || 0
  }
  
  // Partially open - K increases as valve closes
  // Using exponential relationship: K = K_open * (100/opening)^2
  const fullyOpenK = valveK(valveType, 100)
  const factor = Math.pow(100 / openingPercent, 2)
  return fullyOpenK * factor
}

/**
 * Calculate orifice pressure drop
 * Uses discharge coefficient (Cd) approach
 * ΔP = (ρ/2) * (Q / (Cd * A_orifice))²
 */
function orificeK(orificeRatio, Cd = 0.62) {
  if (orificeRatio <= 0 || orificeRatio >= 1) return 0
  // Beta = d_orifice / d_pipe (orificeRatio)
  // K = (1 - β⁴) / (Cd² * β⁴)
  const beta4 = Math.pow(orificeRatio, 4)
  return (1 - beta4) / (Cd * Cd * beta4)
}

/**
 * Calculate total resistance coefficient K for a pipe with valve/orifice
 * ΔP = K * (ρ/2) * V² = K * (ρ/2) * (Q/A)²
 */
function pipeResistance(pipe, fluid = FLUID) {
  const area = Math.PI * Math.pow(pipe.diameter / 2, 2)
  const g = 9.81
  
  // 1. Pipe friction resistance
  // K_friction = f * L / D
  const f = 0.02 // Initial estimate
  const K_friction = f * (pipe.length / pipe.diameter)
  
  // 2. Valve resistance (if present)
  let K_valve = 0
  if (pipe.valve && pipe.valve.type !== 'none') {
    K_valve = valveK(pipe.valve.type, pipe.valve.opening)
  }
  
  // 3. Orifice resistance (if present)
  let K_orifice = 0
  if (pipe.orifice && pipe.orifice.ratio > 0 && pipe.orifice.ratio < 1) {
    K_orifice = orificeK(pipe.orifice.ratio, pipe.orifice.Cd || 0.62)
  }
  
  // Total K
  const K_total = K_friction + K_valve + K_orifice
  
  // Convert to resistance: ΔP = R * Q * |Q|
  // R = K * ρ / (2 * A²)
  return K_total * fluid.density / (2 * area * area)
}

/**
 * Build the system matrix for the network
 * Uses node-branch incidence matrix approach
 */
function buildSystem(nodes, pipes) {
  // Separate boundary and internal nodes
  const boundaryNodes = nodes.filter(n => n.type === 'boundary')
  const internalNodes = nodes.filter(n => n.type === 'junction')
  
  // Create node ID to index mapping
  const nodeIndex = {}
  nodes.forEach((node, i) => {
    nodeIndex[node.id] = i
  })
  
  const internalIndex = {}
  internalNodes.forEach((node, i) => {
    internalIndex[node.id] = i
  })
  
  return {
    boundaryNodes,
    internalNodes,
    nodeIndex,
    internalIndex,
    pipes,
  }
}

/**
 * Solve the network using iterative method
 * For each internal node: Σ(inflows) = Σ(outflows)
 */
export function solveNetwork(nodes, pipes) {
  if (nodes.length < 2 || pipes.length === 0) {
    return { success: false, error: 'Need at least 2 nodes and 1 pipe' }
  }
  
  const boundaryNodes = nodes.filter(n => n.type === 'boundary')
  const internalNodes = nodes.filter(n => n.type === 'junction')
  
  if (boundaryNodes.length < 1) {
    return { success: false, error: 'Need at least 1 boundary node with fixed pressure' }
  }
  
  // Initialize pressures: boundaries are fixed, internals start at average
  const avgPressure = boundaryNodes.reduce((sum, n) => sum + n.pressure, 0) / boundaryNodes.length
  const pressures = {}
  nodes.forEach(node => {
    pressures[node.id] = node.type === 'boundary' ? node.pressure : avgPressure
  })
  
  // Initialize flow rates
  const flowRates = {}
  pipes.forEach(pipe => {
    flowRates[pipe.id] = 0
  })
  
  // Create node-to-pipe connectivity
  const nodeConnections = {}
  nodes.forEach(node => {
    nodeConnections[node.id] = []
  })
  pipes.forEach(pipe => {
    nodeConnections[pipe.fromNode].push({ pipe, direction: 1 })  // outflow positive
    nodeConnections[pipe.toNode].push({ pipe, direction: -1 })   // inflow negative
  })
  
  // Iterative solver (simplified Hardy-Cross style)
  const maxIterations = 100
  const tolerance = 1e-6
  let converged = false
  
  for (let iter = 0; iter < maxIterations; iter++) {
    let maxError = 0
    
    // Update flow rates based on pressure differences
    pipes.forEach(pipe => {
      const p1 = pressures[pipe.fromNode]
      const p2 = pressures[pipe.toNode]
      const dP = p1 - p2  // Pressure difference (Pa)
      
      // Q = sign(ΔP) * sqrt(|ΔP| / K)
      const K = pipeResistance(pipe)
      const Q = Math.sign(dP) * Math.sqrt(Math.abs(dP) / (K + 1e-10))
      
      flowRates[pipe.id] = Q
    })
    
    // Update internal node pressures to satisfy mass conservation
    internalNodes.forEach(node => {
      const connections = nodeConnections[node.id]
      if (connections.length === 0) return
      
      // Sum of flows into node (should be zero at steady state)
      let flowSum = 0
      let dFlowdP = 0  // Derivative for Newton-Raphson
      
      connections.forEach(({ pipe, direction }) => {
        const Q = flowRates[pipe.id] * direction
        flowSum += Q
        
        // Derivative: dQ/dP ≈ 1/(2*K*|Q|) for Q = sqrt(ΔP/K)
        const K = pipeResistance(pipe)
        const absQ = Math.abs(flowRates[pipe.id])
        if (absQ > 1e-10) {
          dFlowdP += 1 / (2 * K * absQ)
        } else {
          dFlowdP += 1e6  // Large value for near-zero flow
        }
      })
      
      // Newton-Raphson pressure correction
      if (Math.abs(dFlowdP) > 1e-10) {
        const correction = -flowSum / dFlowdP * 0.5  // Under-relax for stability
        pressures[node.id] += correction
        maxError = Math.max(maxError, Math.abs(flowSum))
      }
    })
    
    if (maxError < tolerance) {
      converged = true
      break
    }
  }
  
  // Calculate final results
  const results = {
    success: converged,
    nodes: {},
    pipes: {},
  }
  
  nodes.forEach(node => {
    results.nodes[node.id] = {
      pressure: pressures[node.id],
      pressureKPa: pressures[node.id] / 1000,
    }
  })
  
  pipes.forEach(pipe => {
    const Q = flowRates[pipe.id]
    const area = Math.PI * Math.pow(pipe.diameter / 2, 2)
    const velocity = Q / area
    
    results.pipes[pipe.id] = {
      flowRate: Q,                    // m³/s
      flowRateLPM: Q * 60000,         // L/min
      velocity: velocity,              // m/s
      pressureDrop: pressures[pipe.fromNode] - pressures[pipe.toNode],
    }
  })
  
  if (!converged) {
    results.error = 'Solver did not converge - check network connectivity'
  }
  
  return results
}

export default solveNetwork
