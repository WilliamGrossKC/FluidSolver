/**
 * Fluid properties: CoolProp (WASM) when available, otherwise constants.js.
 * Use for app and consistent property source.
 */

import { getFluidProperties as getFluidPropertiesConstants, FLUID_DATA } from './constants'

// Map our fluid keys to CoolProp fluid name (only fluids CoolProp supports)
const COOLPROP_FLUID_MAP = {
  water: 'Water',
  air: 'Air',
  co2: 'CO2',
  n2: 'Nitrogen',
  o2: 'Oxygen',
  he: 'Helium',
  h2: 'Hydrogen',
  methane: 'Methane',
  ethanol: 'Ethanol',
  r134a: 'R134a',
  ammonia: 'Ammonia',
  argon: 'Argon',
}

let coolPropModule = null
let coolPropInitPromise = null

/**
 * Initialize CoolProp WASM (call once at app load).
 * @returns {Promise<boolean>} true if loaded, false on error
 */
export async function initCoolProp() {
  if (coolPropModule) return true
  if (coolPropInitPromise) return coolPropInitPromise
  coolPropInitPromise = (async () => {
    try {
      const { default: init } = await import('coolprop-wasm/simple')
      const instance = await init()
      coolPropModule = instance
      return true
    } catch (e) {
      console.warn('CoolProp WASM not available, using built-in fluid properties:', e?.message)
      return false
    }
  })()
  return coolPropInitPromise
}

/**
 * Whether CoolProp is loaded and can be used.
 */
export function isCoolPropReady() {
  return coolPropModule != null
}

/**
 * Get fluid properties from CoolProp (sync once CoolProp is loaded).
 * Only for fluids in COOLPROP_FLUID_MAP; otherwise returns null so caller can fall back.
 * @param {string} fluidKey - our key (e.g. 'water', 'air')
 * @param {number} T_K - temperature (K)
 * @param {number} P_Pa - pressure (Pa)
 * @returns {object|null} fluid object or null if not supported / error
 */
export function getFluidPropertiesCoolProp(fluidKey, T_K, P_Pa) {
  if (!coolPropModule) return null
  const coolPropName = COOLPROP_FLUID_MAP[fluidKey]
  if (!coolPropName) return null

  const base = FLUID_DATA[fluidKey]
  if (!base) return null

  try {
    const T = Math.max(200, Math.min(2000, T_K))
    const P = Math.max(100, Math.min(1e8, P_Pa))

    const density = coolPropModule.PropsSI('D', 'T', T, 'P', P, coolPropName)
    const viscosity = coolPropModule.PropsSI('V', 'T', T, 'P', P, coolPropName)

    if (base.type === 'gas') {
      const Cp = coolPropModule.PropsSI('C', 'T', T, 'P', P, coolPropName)
      const Cv = coolPropModule.PropsSI('O', 'T', T, 'P', P, coolPropName)
      const gamma = Cp / Cv
      const M = base.molecularWeight ?? 0.02897

      return {
        name: `${base.name} (${(T_K - 273.15).toFixed(0)}°C)`,
        type: 'gas',
        density,
        viscosity,
        gamma,
        molecularWeight: M,
        specificGasConstant: 8.314462 / M,
        temperature: T_K,
        pressure: P_Pa,
        Tref: base.Tref,
        sutherlandS: base.sutherlandS,
        muRef: base.muRef,
        description: base.description + ' (CoolProp)',
      }
    } else {
      let vaporPressure = 2339
      try {
        vaporPressure = coolPropModule.PropsSI('P', 'Q', 0, 'T', T, coolPropName)
      } catch (_) {}

      return {
        name: `${base.name} (${(T_K - 273.15).toFixed(0)}°C)`,
        type: 'liquid',
        density,
        viscosity,
        vaporPressure,
        temperature: T_K,
        pressure: P_Pa,
        description: base.description + ' (CoolProp)',
      }
    }
  } catch (_) {
    return null
  }
}

/**
 * Get fluid properties: use CoolProp when ready and supported, else constants (sync).
 * For async CoolProp, call getFluidPropertiesCoolProp and use result when resolved.
 * @param {string} fluidKey
 * @param {number} T_K
 * @param {number} P_Pa
 * @param {object|null} coolPropFluid - if provided (from async getFluidPropertiesCoolProp), use it; else use constants
 * @returns {object} fluid object for solver
 */
export function getFluidProperties(fluidKey, T_K, P_Pa = 101325, coolPropFluid = null) {
  if (coolPropFluid != null) return coolPropFluid
  return getFluidPropertiesConstants(fluidKey, T_K, P_Pa)
}

export { getFluidPropertiesConstants, FLUID_DATA }
