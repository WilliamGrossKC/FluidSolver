# Valve and Orifice Specification (Internal)

This document describes how valves and orifices are specified and used in the fluid network solver.

---

## 1. Valve specification modes

The solver supports four ways to define a valve’s flow resistance. All are converted internally to an effective **Cd×A** (discharge coefficient × area) for flow calculations.

| Mode | Inputs | Description |
|------|--------|-------------|
| **Cd & Diameter** | Cd, diameter (mm or in) | Discharge coefficient and geometric diameter; area = π(D/2)². |
| **Cd & Area** | Cd, area (mm², in², or m²) | Discharge coefficient and flow area. |
| **Cd×A** | Cd×A (m²) | Effective flow area product directly. |
| **Cv** | Cv | Valve flow coefficient (US GPM at 1 psi ΔP). |

- **Fluid is system-wide**: the same fluid (and thus density, viscosity) is used for all pipes and valves.
- **Multiple valves on one pipe**: the **most restrictive** (smallest effective Cd×A) is used.

---

## 2. Discharge coefficient (Cd)

- **Definition**: Cd = (actual mass flow) / (ideal inviscid mass flow through same area).
- **Range**: 0 to 1 (typically 0.5–0.99).
- **Typical values** (see also `TYPICAL_CD_VALUES` in `src/constants.js`):

| Type | Cd | Notes |
|------|-----|--------|
| Sharp-edged orifice | 0.60–0.65 | Standard orifice plate |
| Rounded entry | ~0.98 | r/d > 0.15 |
| Flow nozzle | ~0.95 | ASME style |
| Venturi | ~0.98 | |
| Gate valve (open) | ~0.95 | |
| Ball valve (open) | ~0.97 | |
| Globe valve (open) | ~0.55 | More restrictive |
| Butterfly (open) | ~0.75 | |

---

## 3. Flow equations

### 3.1 Unchoked liquid (incompressible)

$$Q = C_d \cdot A \cdot \sqrt{\frac{2\,\Delta P}{\rho}}$$

Mass flow: \(\dot{m} = C_d \cdot A \cdot \sqrt{2\,\rho\,\Delta P}\).

### 3.2 Choked liquid (cavitation)

When downstream pressure drops to vapor pressure, flow is limited:

$$\dot{m}_{choked} = C_d \cdot A \cdot \sqrt{2\,\rho\,(P_1 - P_v)}$$

### 3.3 Unchoked gas (compressible)

Isentropic expansion; mass flow depends on P₁, P₂, γ, ρ₁. See `compressibleMassFlowUnchoked()` in `solver.js`.

### 3.4 Choked gas

When P₂/P₁ ≤ critical pressure ratio \((2/(\gamma+1))^{\gamma/(\gamma-1)}\), flow is sonic at the restriction and independent of P₂. See `chokedGasMassFlow()` in `solver.js`.

---

## 4. Cv (flow coefficient)

- **Definition**: Volumetric flow (US GPM) of water at 60°F through the valve at 1 psi pressure drop.
- **Liquid (SI)**:
  $$Q = C_v \cdot 7.599\times 10^{-7} \cdot \sqrt{\frac{\Delta P}{SG}}$$
  with SG = ρ/998 (specific gravity relative to water).
- **Gas**: Uses expansion factor Y and critical pressure ratio xT; see `cvGasFlowUnchoked` and `cvGasFlowChoked` in `solver.js`.
- **Conversion to resistance**: For incompressible flow, ΔP = R·Q·|Q| with  
  R = SG / (Cv × 7.599×10⁻⁷)² (see `valveResistanceFromCv`).

---

## 5. Orifices

Orifices are specified by:

- **Diameter** (mm or in): orifice bore; β = d_orifice / D_pipe.
- **Cd**: discharge coefficient (default 0.62 for sharp-edged).

Pressure loss is modeled via K-factor:

$$K = \frac{1 - \beta^4}{C_d^2 \cdot \beta^4}$$

Then ΔP = K × (ρV²/2) with pipe velocity V. See `orificeKFromDiameter()` in `solver.js`.

---

## 6. Implementation reference

| Item | File | Functions / constants |
|------|------|------------------------|
| Spec modes | `src/constants.js` | `VALVE_SPEC_MODES` |
| Typical Cd | `src/constants.js` | `TYPICAL_CD_VALUES` |
| CdA from valve spec | `src/solver.js` | `getValveCdA()` |
| Pipe resistance | `src/solver.js` | `pipeResistance()`, `valveResistanceFromCdA`, `valveResistanceFromCv`, etc. |
| Restriction flow | `src/solver.js` | `restrictionMassFlow()`, choked/unchoked liquid and gas |
| UI (valve/orifice props) | `src/App.jsx` | Component properties panel (spec mode, Cd, diameter, area, CdA, Cv) |

---

## 7. Units summary

- **Pressure**: Internal SI (Pa). UI can display psi, bar, or kPa (default display: **psi**).
- **Length/area**: Diameter and area can be entered in mm, in, mm², in², m²; converted to m and m² for solver.
- **Cv**: Dimensionless; flow in GPM at 1 psi ΔP for water.
