/**
 * Constants for the Fluid Network Solver
 */

// Pipe materials with roughness values (in meters)
// Reference: Engineering Toolbox, Crane TP-410
export const PIPE_MATERIALS = {
  steel_commercial: {
    name: 'Commercial Steel',
    roughness: 0.000045,  // 0.045 mm
    description: 'Standard commercial steel pipe'
  },
  steel_riveted: {
    name: 'Riveted Steel',
    roughness: 0.003,     // 3 mm
    description: 'Riveted steel, rough surface'
  },
  steel_stainless: {
    name: 'Stainless Steel',
    roughness: 0.000015,  // 0.015 mm
    description: 'Smooth stainless steel'
  },
  iron_cast: {
    name: 'Cast Iron',
    roughness: 0.00026,   // 0.26 mm
    description: 'New cast iron'
  },
  iron_ductile: {
    name: 'Ductile Iron',
    roughness: 0.00012,   // 0.12 mm
    description: 'Ductile iron with cement lining'
  },
  iron_galvanized: {
    name: 'Galvanized Iron',
    roughness: 0.00015,   // 0.15 mm
    description: 'Galvanized iron pipe'
  },
  copper: {
    name: 'Copper',
    roughness: 0.0000015, // 0.0015 mm
    description: 'Smooth drawn copper tubing'
  },
  pvc: {
    name: 'PVC',
    roughness: 0.0000015, // 0.0015 mm
    description: 'PVC plastic pipe'
  },
  hdpe: {
    name: 'HDPE',
    roughness: 0.000007,  // 0.007 mm
    description: 'High-density polyethylene'
  },
  concrete: {
    name: 'Concrete',
    roughness: 0.003,     // 3 mm (varies widely)
    description: 'Concrete pipe (rough)'
  },
  concrete_smooth: {
    name: 'Concrete (Smooth)',
    roughness: 0.0003,    // 0.3 mm
    description: 'Smooth-finished concrete'
  },
  glass: {
    name: 'Glass',
    roughness: 0.0000015, // 0.0015 mm
    description: 'Glass tubing'
  },
  custom: {
    name: 'Custom',
    roughness: 0.000045,  // Default to commercial steel
    description: 'User-defined roughness'
  }
}

// Valve specification modes
// Valves can be specified by Cd + geometry, Cd*A product, or Cv
export const VALVE_SPEC_MODES = {
  cd_diameter: {
    name: 'Cd & Diameter',
    description: 'Discharge coefficient and valve diameter',
    inputs: ['Cd', 'diameter'],
    hasUnits: true,  // diameter has units
  },
  cd_area: {
    name: 'Cd & Area',
    description: 'Discharge coefficient and flow area',
    inputs: ['Cd', 'area'],
    hasUnits: true,  // area has units
  },
  cda: {
    name: 'Cd×A',
    description: 'Product of discharge coefficient and area (m²)',
    inputs: ['CdA'],
    hasUnits: true,  // CdA has units of area
  },
  cv: {
    name: 'Cv',
    description: 'Flow coefficient (US GPM at 1 psi drop)',
    inputs: ['Cv'],
    hasUnits: false,  // Cv is dimensionless
  }
}

// Common Cd values for reference
// Reference: Crane TP-410, engineering handbooks
export const TYPICAL_CD_VALUES = {
  sharp_edge: {
    name: 'Sharp-Edged Orifice',
    Cd: 0.62,
    description: 'Standard sharp-edge orifice plate'
  },
  rounded_entry: {
    name: 'Rounded Entry',
    Cd: 0.98,
    description: 'Well-rounded entrance, r/d > 0.15'
  },
  nozzle: {
    name: 'Flow Nozzle',
    Cd: 0.95,
    description: 'ASME flow nozzle'
  },
  venturi: {
    name: 'Venturi',
    Cd: 0.98,
    description: 'Standard Venturi tube'
  },
  gate_valve_open: {
    name: 'Gate Valve (Open)',
    Cd: 0.95,
    description: 'Fully open gate valve'
  },
  ball_valve_open: {
    name: 'Ball Valve (Open)',
    Cd: 0.97,
    description: 'Fully open ball valve'
  },
  globe_valve_open: {
    name: 'Globe Valve (Open)',
    Cd: 0.55,
    description: 'Fully open globe valve'
  },
  butterfly_valve_open: {
    name: 'Butterfly Valve (Open)',
    Cd: 0.75,
    description: 'Fully open butterfly valve'
  }
}

/**
 * Fluid Library with Temperature-Dependent Properties
 * 
 * Base fluids are defined with reference properties and correlation coefficients.
 * Use getFluidProperties(fluidKey, T, P) to get properties at any temperature.
 * 
 * References:
 * - NIST Chemistry WebBook
 * - Crane Technical Paper 410
 * - Perry's Chemical Engineers' Handbook
 * - IAPWS-IF97 (water properties)
 */

// Universal gas constant
const R_UNIVERSAL = 8.314462  // J/(mol·K)

/**
 * Base fluid definitions
 * 
 * For liquids:
 * - Tref: Reference temperature (K)
 * - rhoRef: Density at Tref (kg/m³)
 * - muRef: Viscosity at Tref (Pa·s)
 * - Tmin/Tmax: Valid temperature range (K)
 * - Correlations for temperature dependence
 * 
 * For gases:
 * - Ideal gas behavior assumed (density from ideal gas law)
 * - Sutherland's law for viscosity
 */
export const FLUID_DATA = {
  // ==================== LIQUIDS ====================
  water: {
    name: 'Water',
    type: 'liquid',
    Tref: 293.15,           // 20°C
    Tmin: 273.15,           // 0°C (freezing)
    Tmax: 373.15,           // 100°C (boiling at 1 atm)
    rhoRef: 998.2,          // kg/m³ at 20°C
    muRef: 0.001002,        // Pa·s at 20°C
    // Antoine equation coefficients for vapor pressure (Pa)
    // log10(Pv) = A - B/(C + T)  where T in °C, Pv in mmHg
    antoine: { A: 8.07131, B: 1730.63, C: 233.426 },
    description: 'Pure water'
  },
  seawater: {
    name: 'Seawater (3.5%)',
    type: 'liquid',
    Tref: 293.15,
    Tmin: 271.15,           // Slightly lower freezing point
    Tmax: 373.15,
    rhoRef: 1025,
    muRef: 0.00108,
    antoine: { A: 8.07131, B: 1730.63, C: 233.426 },  // Approximate as water
    description: 'Seawater at 3.5% salinity'
  },
  ethanol: {
    name: 'Ethanol',
    type: 'liquid',
    Tref: 293.15,
    Tmin: 159.0,            // Melting point
    Tmax: 351.5,            // Boiling point
    rhoRef: 789,
    muRef: 0.00109,
    antoine: { A: 8.20417, B: 1642.89, C: 230.300 },
    description: 'Pure ethanol (ethyl alcohol)'
  },
  methanol: {
    name: 'Methanol',
    type: 'liquid',
    Tref: 293.15,
    Tmin: 175.5,
    Tmax: 337.8,
    rhoRef: 792,
    muRef: 0.000544,
    antoine: { A: 7.89750, B: 1474.08, C: 229.13 },
    description: 'Pure methanol (methyl alcohol)'
  },
  hydraulic_oil: {
    name: 'Hydraulic Oil (ISO 32)',
    type: 'liquid',
    Tref: 313.15,           // 40°C reference for oils
    Tmin: 253.15,           // -20°C
    Tmax: 373.15,           // 100°C
    rhoRef: 860,
    muRef: 0.032,
    // Low vapor pressure, not temperature sensitive for our purposes
    fixedVaporPressure: 100,  // Pa
    description: 'ISO 32 hydraulic oil'
  },
  diesel: {
    name: 'Diesel Fuel',
    type: 'liquid',
    Tref: 293.15,
    Tmin: 253.15,
    Tmax: 473.15,
    rhoRef: 850,
    muRef: 0.003,
    fixedVaporPressure: 500,
    description: 'Diesel fuel (No. 2)'
  },
  gasoline: {
    name: 'Gasoline',
    type: 'liquid',
    Tref: 293.15,
    Tmin: 233.15,
    Tmax: 473.15,
    rhoRef: 750,
    muRef: 0.0006,
    fixedVaporPressure: 60000,  // High volatility
    description: 'Gasoline (petrol)'
  },
  kerosene: {
    name: 'Kerosene (Jet-A)',
    type: 'liquid',
    Tref: 293.15,
    Tmin: 233.15,
    Tmax: 573.15,
    rhoRef: 800,
    muRef: 0.00164,
    fixedVaporPressure: 1000,
    description: 'Kerosene / Jet-A fuel'
  },
  
  // ==================== CRYOGENIC LIQUIDS ====================
  liquid_nitrogen: {
    name: 'Liquid Nitrogen',
    type: 'liquid',
    Tref: 77.35,            // Boiling point at 1 atm
    Tmin: 63.15,            // Triple point
    Tmax: 77.35,
    rhoRef: 808,
    muRef: 0.000158,
    fixedVaporPressure: 101325,
    description: 'LN2 at saturation'
  },
  liquid_oxygen: {
    name: 'Liquid Oxygen',
    type: 'liquid',
    Tref: 90.19,            // Boiling point at 1 atm
    Tmin: 54.36,
    Tmax: 90.19,
    rhoRef: 1141,
    muRef: 0.000189,
    fixedVaporPressure: 101325,
    description: 'LOX at saturation'
  },
  liquid_hydrogen: {
    name: 'Liquid Hydrogen',
    type: 'liquid',
    Tref: 20.28,            // Boiling point at 1 atm
    Tmin: 13.8,
    Tmax: 20.28,
    rhoRef: 70.8,
    muRef: 0.0000132,
    fixedVaporPressure: 101325,
    description: 'LH2 at saturation'
  },
  
  // ==================== GASES ====================
  air: {
    name: 'Air',
    type: 'gas',
    molecularWeight: 0.02897,   // kg/mol
    gamma: 1.40,                // Cp/Cv
    // Sutherland's law constants for viscosity
    // μ = μ_ref * (T/T_ref)^1.5 * (T_ref + S) / (T + S)
    muRef: 0.0000182,
    Tref: 293.15,
    sutherlandS: 110.4,         // Sutherland constant (K)
    description: 'Dry air'
  },
  nitrogen: {
    name: 'Nitrogen',
    type: 'gas',
    molecularWeight: 0.02802,
    gamma: 1.40,
    muRef: 0.0000176,
    Tref: 293.15,
    sutherlandS: 111,
    description: 'Nitrogen gas (N₂)'
  },
  oxygen: {
    name: 'Oxygen',
    type: 'gas',
    molecularWeight: 0.032,
    gamma: 1.40,
    muRef: 0.0000203,
    Tref: 293.15,
    sutherlandS: 127,
    description: 'Oxygen gas (O₂)'
  },
  helium: {
    name: 'Helium',
    type: 'gas',
    molecularWeight: 0.004003,
    gamma: 1.66,                // Monatomic
    muRef: 0.0000196,
    Tref: 293.15,
    sutherlandS: 79.4,
    description: 'Helium (He)'
  },
  hydrogen: {
    name: 'Hydrogen',
    type: 'gas',
    molecularWeight: 0.002016,
    gamma: 1.41,
    muRef: 0.0000088,
    Tref: 293.15,
    sutherlandS: 72,
    description: 'Hydrogen gas (H₂)'
  },
  carbon_dioxide: {
    name: 'Carbon Dioxide',
    type: 'gas',
    molecularWeight: 0.04401,
    gamma: 1.30,
    muRef: 0.0000147,
    Tref: 293.15,
    sutherlandS: 240,
    description: 'Carbon dioxide (CO₂)'
  },
  methane: {
    name: 'Methane',
    type: 'gas',
    molecularWeight: 0.01604,
    gamma: 1.32,
    muRef: 0.0000110,
    Tref: 293.15,
    sutherlandS: 164,
    description: 'Methane (CH₄) / Natural gas'
  },
  argon: {
    name: 'Argon',
    type: 'gas',
    molecularWeight: 0.03995,
    gamma: 1.67,                // Monatomic
    muRef: 0.0000223,
    Tref: 293.15,
    sutherlandS: 144,
    description: 'Argon (Ar)'
  },
  steam: {
    name: 'Steam',
    type: 'gas',
    molecularWeight: 0.01802,
    gamma: 1.33,
    muRef: 0.0000122,
    Tref: 373.15,               // Reference at 100°C
    sutherlandS: 673,
    description: 'Water vapor (steam)'
  },
  propane: {
    name: 'Propane',
    type: 'gas',
    molecularWeight: 0.04410,
    gamma: 1.13,
    muRef: 0.0000080,
    Tref: 293.15,
    sutherlandS: 200,
    description: 'Propane (C₃H₈)'
  },
}

/**
 * Calculate water density using polynomial correlation
 * Valid for 0-100°C at 1 atm
 * Source: IAPWS-IF97 simplified
 * 
 * @param {number} T - Temperature in Kelvin
 * @returns {number} Density in kg/m³
 */
function waterDensity(T) {
  const Tc = T - 273.15  // Convert to Celsius
  // Polynomial fit: ρ = a0 + a1*T + a2*T² + a3*T³ + a4*T⁴
  // Coefficients from curve fit to NIST data
  const a0 = 999.83
  const a1 = 0.05332
  const a2 = -0.007564
  const a3 = 0.00004323
  const a4 = -0.0000001673
  return a0 + a1*Tc + a2*Tc*Tc + a3*Tc*Tc*Tc + a4*Tc*Tc*Tc*Tc
}

/**
 * Calculate water viscosity using Vogel equation
 * μ = A * exp(B / (T - C))
 * 
 * @param {number} T - Temperature in Kelvin
 * @returns {number} Dynamic viscosity in Pa·s
 */
function waterViscosity(T) {
  // Vogel equation coefficients for water
  const A = 2.414e-5   // Pa·s
  const B = 247.8      // K
  const C = 140.0      // K
  return A * Math.pow(10, B / (T - C))
}

/**
 * Calculate vapor pressure using Antoine equation
 * log10(Pv_mmHg) = A - B / (C + T_celsius)
 * 
 * @param {object} antoine - Antoine coefficients {A, B, C}
 * @param {number} T - Temperature in Kelvin
 * @returns {number} Vapor pressure in Pa
 */
function antoineVaporPressure(antoine, T) {
  const Tc = T - 273.15
  const log10Pv_mmHg = antoine.A - antoine.B / (antoine.C + Tc)
  const Pv_mmHg = Math.pow(10, log10Pv_mmHg)
  return Pv_mmHg * 133.322  // Convert mmHg to Pa
}

/**
 * Calculate gas density using ideal gas law
 * ρ = PM / RT
 * 
 * @param {number} P - Pressure in Pa
 * @param {number} T - Temperature in Kelvin
 * @param {number} M - Molecular weight in kg/mol
 * @returns {number} Density in kg/m³
 */
function idealGasDensity(P, T, M) {
  return (P * M) / (R_UNIVERSAL * T)
}

/**
 * Calculate gas viscosity using Sutherland's law
 * μ = μ_ref * (T/T_ref)^1.5 * (T_ref + S) / (T + S)
 * 
 * @param {number} T - Temperature in Kelvin
 * @param {number} muRef - Reference viscosity (Pa·s)
 * @param {number} Tref - Reference temperature (K)
 * @param {number} S - Sutherland constant (K)
 * @returns {number} Dynamic viscosity in Pa·s
 */
function sutherlandViscosity(T, muRef, Tref, S) {
  return muRef * Math.pow(T / Tref, 1.5) * (Tref + S) / (T + S)
}

/**
 * Calculate liquid density with temperature correction
 * Uses linear thermal expansion approximation for non-water liquids
 * 
 * @param {object} fluid - Fluid data object
 * @param {number} T - Temperature in Kelvin
 * @returns {number} Density in kg/m³
 */
function liquidDensity(fluid, T) {
  if (fluid.name === 'Water' || fluid.name === 'Seawater (3.5%)') {
    const rho = waterDensity(T)
    // Seawater is ~2.7% denser
    return fluid.name === 'Water' ? rho : rho * 1.027
  }
  
  // For other liquids, use linear thermal expansion
  // ρ(T) = ρ_ref / (1 + β(T - T_ref))
  // Typical β ≈ 0.001 /K for organic liquids
  const beta = 0.001
  return fluid.rhoRef / (1 + beta * (T - fluid.Tref))
}

/**
 * Calculate liquid viscosity with temperature correction
 * Uses Arrhenius-type relationship
 * 
 * @param {object} fluid - Fluid data object
 * @param {number} T - Temperature in Kelvin
 * @returns {number} Dynamic viscosity in Pa·s
 */
function liquidViscosity(fluid, T) {
  if (fluid.name === 'Water' || fluid.name === 'Seawater (3.5%)') {
    const mu = waterViscosity(T)
    // Seawater is ~8% more viscous
    return fluid.name === 'Water' ? mu : mu * 1.08
  }
  
  // Arrhenius relationship: μ = A * exp(B/T)
  // Derived from reference point: B = T_ref * ln(μ_ref / A)
  // Simplified: μ(T) = μ_ref * exp(E/R * (1/T - 1/T_ref))
  // Using effective activation energy ratio E/R ≈ 2000K for most organics
  const ER = 2000
  return fluid.muRef * Math.exp(ER * (1/T - 1/fluid.Tref))
}

/**
 * Get complete fluid properties at specified temperature and pressure
 * 
 * @param {string} fluidKey - Key from FLUID_DATA
 * @param {number} T - Temperature in Kelvin
 * @param {number} P - Pressure in Pa (default 101325 = 1 atm)
 * @returns {object} Fluid properties object ready for solver
 */
export function getFluidProperties(fluidKey, T, P = 101325) {
  const fluid = FLUID_DATA[fluidKey]
  if (!fluid) {
    throw new Error(`Unknown fluid: ${fluidKey}`)
  }
  
  // Clamp temperature to valid range
  const Tmin = fluid.Tmin || 200
  const Tmax = fluid.Tmax || 500
  const Tclamped = Math.max(Tmin, Math.min(Tmax, T))
  
  if (fluid.type === 'gas') {
    // Gas properties
    const density = idealGasDensity(P, Tclamped, fluid.molecularWeight)
    const viscosity = sutherlandViscosity(Tclamped, fluid.muRef, fluid.Tref, fluid.sutherlandS)
    const specificGasConstant = R_UNIVERSAL / fluid.molecularWeight
    
    return {
      name: `${fluid.name} (${(T - 273.15).toFixed(0)}°C)`,
      type: 'gas',
      density,
      viscosity,
      gamma: fluid.gamma,
      molecularWeight: fluid.molecularWeight,
      specificGasConstant,
      temperature: T,
      pressure: P,
      // Include reference values needed for local property calculations
      Tref: fluid.Tref,
      sutherlandS: fluid.sutherlandS,
      muRef: fluid.muRef,
      description: fluid.description
    }
  } else {
    // Liquid properties
    const density = liquidDensity(fluid, Tclamped)
    const viscosity = liquidViscosity(fluid, Tclamped)
    
    let vaporPressure
    if (fluid.fixedVaporPressure !== undefined) {
      vaporPressure = fluid.fixedVaporPressure
    } else if (fluid.antoine) {
      vaporPressure = antoineVaporPressure(fluid.antoine, Tclamped)
    } else {
      vaporPressure = 2339  // Default to water at 20°C
    }
    
    return {
      name: `${fluid.name} (${(T - 273.15).toFixed(0)}°C)`,
      type: 'liquid',
      density,
      viscosity,
      vaporPressure,
      temperature: T,
      pressure: P,
      description: fluid.description
    }
  }
}

/**
 * Legacy FLUIDS object for backward compatibility
 * Maps old keys to new system
 */
export const FLUIDS = Object.fromEntries(
  Object.entries(FLUID_DATA).map(([key, fluid]) => {
    const T = fluid.Tref || 293.15
    return [key, getFluidProperties(key, T)]
  })
)

// Default fluid
export const DEFAULT_FLUID = getFluidProperties('water', 293.15)

/**
 * Critical pressure ratio for choked flow in gases
 * P2/P1_critical = (2/(γ+1))^(γ/(γ-1))
 * 
 * Below this ratio, flow is choked (sonic at throat)
 * 
 * @param {number} gamma - Specific heat ratio (Cp/Cv)
 * @returns {number} Critical pressure ratio
 */
export function criticalPressureRatio(gamma) {
  return Math.pow(2 / (gamma + 1), gamma / (gamma - 1))
}

/**
 * Calculate downstream temperature for isentropic expansion
 * 
 * For an ideal gas undergoing isentropic (reversible, adiabatic) expansion:
 * T₂/T₁ = (P₂/P₁)^((γ-1)/γ)
 * 
 * This is used for compressible flow in pipes where gas expands
 * as it flows from high pressure to low pressure regions.
 * 
 * Physical meaning:
 * - When gas pressure drops, temperature also drops
 * - This is why spray cans get cold when used
 * - The γ (gamma) determines how much cooling occurs
 * 
 * @param {number} T1 - Upstream temperature (K)
 * @param {number} P1 - Upstream pressure (Pa)
 * @param {number} P2 - Downstream pressure (Pa)
 * @param {number} gamma - Specific heat ratio (Cp/Cv), typically 1.4 for air
 * @returns {number} Downstream temperature (K)
 */
export function isentropicTemperature(T1, P1, P2, gamma = 1.4) {
  if (P1 <= 0 || P2 <= 0 || T1 <= 0) {
    return T1  // Invalid inputs, return upstream temp
  }
  const pressureRatio = P2 / P1
  const exponent = (gamma - 1) / gamma
  return T1 * Math.pow(pressureRatio, exponent)
}

/**
 * Calculate gas density at given P and T using ideal gas law
 * 
 * ρ = PM/(RT)
 * 
 * Where:
 * - P = pressure (Pa)
 * - M = molecular weight (kg/mol)
 * - R = universal gas constant = 8.314 J/(mol·K)
 * - T = temperature (K)
 * 
 * @param {number} P - Pressure (Pa)
 * @param {number} T - Temperature (K)
 * @param {number} M - Molecular weight (kg/mol)
 * @returns {number} Density (kg/m³)
 */
export function gasDensityAtPT(P, T, M) {
  if (T <= 0 || P <= 0) return 0
  return (P * M) / (R_UNIVERSAL * T)
}

/**
 * Get updated fluid properties at a new local P and T
 * This is used in the solver to calculate properties at each node
 * 
 * @param {object} baseFluid - The base fluid object with molecular weight, gamma, etc.
 * @param {number} localP - Local pressure (Pa)
 * @param {number} localT - Local temperature (K)
 * @returns {object} Fluid object with updated density, viscosity
 */
export function getLocalFluidProperties(baseFluid, localP, localT) {
  if (baseFluid.type !== 'gas') {
    // For liquids, properties don't change significantly with pressure
    // (incompressible), but we could add temperature effects if needed
    return { ...baseFluid, pressure: localP, temperature: localT }
  }
  
  // For gases, recalculate density and viscosity at local conditions
  const density = gasDensityAtPT(localP, localT, baseFluid.molecularWeight)
  const viscosity = sutherlandViscosity(
    localT, 
    baseFluid.viscosity || FLUID_DATA[getFluidKey(baseFluid)]?.muRef || 0.0000182,
    baseFluid.Tref || 293.15,
    baseFluid.sutherlandS || 110.4
  )
  
  return {
    ...baseFluid,
    density,
    viscosity,
    pressure: localP,
    temperature: localT,
    name: `${baseFluid.name?.split(' (')[0] || 'Gas'} (${(localT - 273.15).toFixed(0)}°C, ${(localP/1000).toFixed(0)} kPa)`
  }
}

/**
 * Helper to get fluid key from a fluid object (for looking up reference data)
 */
function getFluidKey(fluid) {
  const baseName = fluid.name?.split(' (')[0]?.toLowerCase() || ''
  for (const [key, data] of Object.entries(FLUID_DATA)) {
    if (data.name.toLowerCase().includes(baseName) || baseName.includes(data.name.toLowerCase())) {
      return key
    }
  }
  return 'air'  // Default fallback
}

/**
 * Check if liquid flow is choked (cavitating)
 * Occurs when downstream pressure drops below vapor pressure
 * 
 * @param {number} P2 - Downstream pressure (Pa)
 * @param {number} Pv - Vapor pressure (Pa)
 * @returns {boolean} True if flow is choked
 */
export function isLiquidChoked(P2, Pv) {
  return P2 <= Pv
}

/**
 * Check if gas flow is choked (sonic)
 * Occurs when pressure ratio exceeds critical ratio
 * 
 * @param {number} P1 - Upstream pressure (Pa)
 * @param {number} P2 - Downstream pressure (Pa)
 * @param {number} gamma - Specific heat ratio
 * @returns {boolean} True if flow is choked
 */
export function isGasChoked(P1, P2, gamma) {
  const criticalRatio = criticalPressureRatio(gamma)
  return (P2 / P1) <= criticalRatio
}

// Unit conversion factors
export const UNITS = {
  // Length
  mm_to_m: 0.001,
  m_to_mm: 1000,
  inch_to_m: 0.0254,
  m_to_inch: 39.3701,
  
  // Pressure
  kPa_to_Pa: 1000,
  Pa_to_kPa: 0.001,
  psi_to_Pa: 6894.76,
  Pa_to_psi: 0.000145038,
  bar_to_Pa: 100000,
  Pa_to_bar: 0.00001,
  
  // Flow rate
  lpm_to_m3s: 1 / 60000,
  m3s_to_lpm: 60000,
  gpm_to_m3s: 0.0000630902,
  m3s_to_gpm: 15850.3,
  
  // Cv to SI: Q(m³/s) = Cv * sqrt(ΔP(Pa)) * 2.4e-5
  // Derived from: Cv = Q(GPM) / sqrt(ΔP(psi))
  cv_factor: 2.4e-5,
}
