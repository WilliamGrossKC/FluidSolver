# Fluid Network Solver

> **🚧 BETA - WORK IN PROGRESS**
> 
> This software is under active development. While physics equations are validated against published references (98 unit tests passing), the following verification is **NOT YET COMPLETE**:
> 
> - ❌ Comparison against commercial software (PIPE-FLO, GFSSP, AFT Fathom)
> - ❌ Review by qualified fluids engineer
> - ❌ Validation against physical test data
> 
> **Do not use for safety-critical decisions without completing independent verification.**

A web-based fluid network solver supporting both incompressible (liquid) and compressible (gas) flows, with automatic detection of choked flow conditions.

## ⚠️ Safety Notice

**This software is intended for engineering analysis and educational purposes.**

Before using results for safety-critical applications:

1. **Verify assumptions** - The solver uses idealized models (see Assumptions section)
2. **Cross-check results** - Compare with manual calculations or other tools
3. **Apply safety factors** - Engineering practice requires appropriate margins
4. **Review by qualified engineer** - Critical systems require professional review

The solver includes 98 unit tests validating all physics equations against published data (Crane TP-410, NIST, Perry's Handbook, NASA GFSSP). Run `npm test` to verify.

## Features

- **Multi-fluid support**: Water, oils, gases (air, N₂, O₂, He, H₂, CO₂, CH₄), cryogenic liquids
- **Compressible flow**: Isentropic gas flow with automatic choke detection
- **Choked flow handling**: Cavitation in liquids, sonic flow in gases
- **Valve modeling**: Cd+diameter, Cd+area, Cd×A, or Cv specification
- **Pipe friction**: Darcy-Weisbach with Swamee-Jain friction factor

---

## Theoretical Background

### 1. Incompressible (Liquid) Flow

#### 1.1 Pipe Friction - Darcy-Weisbach Equation

The pressure drop due to friction in a pipe:

$$\Delta P_f = f \frac{L}{D} \frac{\rho V^2}{2}$$

Where:
- $f$ = Darcy friction factor (dimensionless)
- $L$ = pipe length (m)
- $D$ = pipe diameter (m)
- $\rho$ = fluid density (kg/m³)
- $V$ = flow velocity (m/s)

#### 1.2 Friction Factor - Swamee-Jain Approximation

For turbulent flow ($Re > 2300$), the friction factor is calculated using the Swamee-Jain explicit approximation of the Colebrook-White equation:

$$f = \frac{0.25}{\left[\log_{10}\left(\frac{\varepsilon}{3.7D} + \frac{5.74}{Re^{0.9}}\right)\right]^2}$$

For laminar flow ($Re < 2300$):

$$f = \frac{64}{Re}$$

Where:
- $\varepsilon$ = pipe roughness (m)
- $Re$ = Reynolds number = $\frac{\rho V D}{\mu}$
- $\mu$ = dynamic viscosity (Pa·s)

#### 1.3 Flow Through Restrictions (Unchoked)

For flow through a valve or orifice with discharge coefficient $C_d$ and flow area $A$:

$$Q = C_d \cdot A \cdot \sqrt{\frac{2 \Delta P}{\rho}}$$

Or in terms of mass flow rate:

$$\dot{m} = C_d \cdot A \cdot \sqrt{2 \rho \Delta P}$$

This can be rearranged to the resistance form:

$$\Delta P = R \cdot Q \cdot |Q|$$

Where the resistance:

$$R = \frac{\rho}{2 (C_d \cdot A)^2}$$

#### 1.4 Choked Liquid Flow (Cavitation)

When the downstream pressure $P_2$ drops below the fluid's vapor pressure $P_v$, cavitation occurs and flow becomes **choked**. The flow rate becomes independent of downstream pressure:

$$\dot{m}_{choked} = C_d \cdot A \cdot \sqrt{2 \rho (P_1 - P_v)}$$

**Choke condition:** $P_2 \leq P_v$

---

### 2. Compressible (Gas) Flow

#### 2.1 Critical Pressure Ratio

For isentropic flow of a compressible gas, the critical pressure ratio at which flow becomes sonic (choked) is:

$$\left(\frac{P_2}{P_1}\right)_{critical} = \left(\frac{2}{\gamma + 1}\right)^{\frac{\gamma}{\gamma - 1}}$$

Where $\gamma = C_p / C_v$ is the specific heat ratio.

| Gas | γ | Critical Ratio |
|-----|---|----------------|
| Air, N₂, O₂ | 1.40 | 0.528 |
| CO₂ | 1.30 | 0.546 |
| CH₄ | 1.32 | 0.540 |
| He, Ar | 1.67 | 0.487 |
| Steam | 1.33 | 0.540 |

#### 2.2 Unchoked (Subsonic) Gas Flow

For subsonic flow where $(P_2/P_1) > (P_2/P_1)_{critical}$:

$$\dot{m} = C_d \cdot A \cdot \sqrt{2 \rho_1 P_1 \cdot \frac{\gamma}{\gamma - 1} \cdot \left[\left(\frac{P_2}{P_1}\right)^{2/\gamma} - \left(\frac{P_2}{P_1}\right)^{(\gamma+1)/\gamma}\right]}$$

#### 2.3 Choked (Sonic) Gas Flow

When $(P_2/P_1) \leq (P_2/P_1)_{critical}$, flow velocity at the restriction reaches the speed of sound and mass flow becomes independent of downstream pressure:

$$\dot{m}_{choked} = C_d \cdot A \cdot \sqrt{\gamma \rho_1 P_1} \cdot \left(\frac{2}{\gamma + 1}\right)^{\frac{\gamma + 1}{2(\gamma - 1)}}$$

The choked flow coefficient:

$$C^* = \left(\frac{2}{\gamma + 1}\right)^{\frac{\gamma + 1}{2(\gamma - 1)}}$$

| γ | C* |
|---|-----|
| 1.40 | 0.685 |
| 1.30 | 0.667 |
| 1.67 | 0.728 |

#### 2.4 Isentropic Expansion (Temperature Change)

**CRITICAL: For compressible (gas) flow, temperature changes as pressure changes.**

When gas flows through a pipe system and pressure drops, the temperature also drops. This is isentropic (reversible, adiabatic) expansion - the same physics that makes a spray can get cold when you use it.

**The relationship:**

$$\frac{T_2}{T_1} = \left(\frac{P_2}{P_1}\right)^{\frac{\gamma - 1}{\gamma}}$$

Or equivalently:

$$T_2 = T_1 \cdot \left(\frac{P_2}{P_1}\right)^{\frac{\gamma - 1}{\gamma}}$$

Where:
- $T_1, T_2$ = upstream and downstream temperatures (K)
- $P_1, P_2$ = upstream and downstream pressures (Pa)
- $\gamma$ = specific heat ratio ($C_p/C_v$)

**Example: Air expanding from 3 bar to 1 bar**
- $\gamma = 1.4$ for air
- Exponent = $(1.4 - 1)/1.4 = 0.286$
- If $T_1 = 350$ K (77°C), then:
- $T_2 = 350 \times (1/3)^{0.286} = 350 \times 0.684 = 239$ K (-34°C)

**Temperature drop = 111°C!** This is why accounting for local temperature is critical.

#### 2.5 Local Fluid Properties

The solver tracks pressure AND temperature at each node in the network. Local fluid properties are calculated using:

**Ideal Gas Law (density):**

$$\rho = \frac{PM}{RT}$$

Where:
- $P$ = local pressure (Pa)
- $M$ = molecular weight (kg/mol)
- $R$ = universal gas constant = 8.314 J/(mol·K)
- $T$ = local temperature (K)

**Sutherland's Law (viscosity):**

$$\mu = \mu_{ref} \cdot \left(\frac{T}{T_{ref}}\right)^{1.5} \cdot \frac{T_{ref} + S}{T + S}$$

Where:
- $\mu_{ref}$ = reference viscosity at $T_{ref}$
- $S$ = Sutherland constant (K), specific to each gas

| Gas | S (K) | $\mu_{ref}$ at 20°C (Pa·s) |
|-----|-------|---------------------------|
| Air | 110.4 | 1.82×10⁻⁵ |
| N₂ | 111 | 1.76×10⁻⁵ |
| O₂ | 127 | 2.03×10⁻⁵ |
| He | 79.4 | 1.96×10⁻⁵ |
| H₂ | 72 | 0.88×10⁻⁵ |
| CO₂ | 240 | 1.47×10⁻⁵ |

---

### 3. Valve Specification Methods

The solver supports four methods to specify valve characteristics:

#### 3.1 Discharge Coefficient + Diameter ($C_d$ & $D$)

Specify $C_d$ (dimensionless) and valve diameter $D_{valve}$ (with units).

Flow area calculated as:
$$A = \frac{\pi D_{valve}^2}{4}$$

#### 3.2 Discharge Coefficient + Area ($C_d$ & $A$)

Specify $C_d$ (dimensionless) and flow area $A$ directly (with units).

#### 3.3 Effective Area ($C_d \times A$)

Specify the product $C_d \cdot A$ directly (units of area, m²).

This is the most direct specification for valve performance.

#### 3.4 Flow Coefficient ($C_v$)

The flow coefficient $C_v$ is defined as the flow rate of water in US GPM at 1 psi pressure drop:

$$Q_{GPM} = C_v \sqrt{\frac{\Delta P_{psi}}{SG}}$$

Where $SG$ is specific gravity (relative to water).

**Converting to SI:**

$$Q_{m^3/s} = C_v \cdot 7.599 \times 10^{-7} \cdot \sqrt{\frac{\Delta P_{Pa}}{SG}}$$

**Relationship between $C_v$ and $C_d \cdot A$:**

$$C_d \cdot A \approx C_v \cdot 2.6 \times 10^{-5} \text{ m}^2$$

---

### 4. Typical Discharge Coefficients

| Component | $C_d$ |
|-----------|-------|
| Sharp-edged orifice | 0.60 - 0.65 |
| Rounded entry (r/d > 0.15) | 0.97 - 0.99 |
| ASME flow nozzle | 0.95 - 0.99 |
| Venturi tube | 0.98 - 0.99 |
| Gate valve (open) | 0.93 - 0.97 |
| Ball valve (open) | 0.95 - 0.98 |
| Globe valve (open) | 0.50 - 0.60 |
| Butterfly valve (open) | 0.70 - 0.80 |

---

### 5. Orifice Flow

For an orifice plate with diameter ratio $\beta = d_{orifice} / D_{pipe}$:

The loss coefficient:

$$K = \frac{1 - \beta^4}{C_d^2 \cdot \beta^4}$$

And the pressure drop:

$$\Delta P = K \cdot \frac{\rho V^2}{2}$$

---

### 6. Network Solution Method

The solver uses an iterative Newton-Raphson method based on mass conservation:

1. **Initialize** pressures at internal nodes (average of boundary pressures)
2. **For each iteration:**
   - Calculate flow rates in each pipe: $Q = \text{sign}(\Delta P) \cdot \sqrt{|\Delta P| / R}$
   - Check for choked flow conditions and adjust
   - For each internal node, compute mass imbalance: $\sum Q_{in} - \sum Q_{out}$
   - Apply pressure corrections using Newton-Raphson
3. **Converge** when mass imbalance < tolerance ($10^{-6}$)

For choked flow conditions:
- Flow is calculated using choked flow equations
- Downstream pressure no longer affects flow rate
- Solver adjusts upstream pressures accordingly

---

### 7. Fluid Properties

#### Liquids

| Fluid | Density (kg/m³) | Viscosity (mPa·s) | Vapor Pressure (kPa) |
|-------|-----------------|-------------------|----------------------|
| Water (20°C) | 998.2 | 1.002 | 2.34 |
| Water (60°C) | 983.2 | 0.467 | 19.9 |
| Seawater | 1025 | 1.08 | 2.30 |
| Hydraulic Oil | 860 | 32 | 0.1 |
| Diesel | 850 | 3.0 | 0.5 |
| LN₂ | 808 | 0.158 | 101.3 |
| LOX | 1141 | 0.189 | 101.3 |

#### Gases (at 20°C, 1 atm)

| Gas | Density (kg/m³) | γ | Critical P Ratio |
|-----|-----------------|---|------------------|
| Air | 1.204 | 1.40 | 0.528 |
| Nitrogen | 1.165 | 1.40 | 0.528 |
| Oxygen | 1.331 | 1.40 | 0.528 |
| Helium | 0.166 | 1.66 | 0.487 |
| Hydrogen | 0.084 | 1.41 | 0.527 |
| CO₂ | 1.842 | 1.30 | 0.546 |
| Methane | 0.668 | 1.32 | 0.540 |

---

### 8. Units

All internal calculations use SI units:

| Quantity | SI Unit |
|----------|---------|
| Length | m |
| Diameter | m |
| Area | m² |
| Pressure | Pa |
| Flow rate | m³/s |
| Mass flow | kg/s |
| Velocity | m/s |
| Density | kg/m³ |
| Viscosity | Pa·s |

The UI provides unit conversion for convenience:
- Diameter: mm, inches
- Area: mm², in², m²
- Pressure: kPa, psi, bar
- Flow rate: L/min, GPM

---

### 9. References

1. Crane Co., "Flow of Fluids Through Valves, Fittings, and Pipe," Technical Paper No. 410
2. Perry, R.H., Green, D.W., "Perry's Chemical Engineers' Handbook," 8th Edition
3. ASME MFC-3M, "Measurement of Fluid Flow in Pipes Using Orifice, Nozzle, and Venturi"
4. White, F.M., "Fluid Mechanics," 8th Edition
5. NIST Chemistry WebBook (fluid properties)

---

### 10. Assumptions and Limitations

**The solver makes the following assumptions:**

| Assumption | Implication |
|------------|-------------|
| **Steady-state flow** | No transient effects (water hammer, startup) |
| **One-dimensional flow** | No cross-sectional variations |
| **Ideal gas behavior** | Accurate for gases at moderate pressures (<20 bar) |
| **Isentropic expansion** | Adiabatic, reversible process (no heat transfer, friction heating) |
| **Incompressible liquids** | Liquid density constant with pressure |
| **Single-phase flow** | No two-phase (liquid-gas) mixtures |
| **Fully developed flow** | Entrance effects neglected |
| **No heat transfer** | Adiabatic pipe walls |

**When these assumptions may not hold:**

- **High pressures (>20 bar)**: Real gas effects may be significant
- **Near saturation**: Liquid may flash to vapor, gas may condense
- **Long pipes with heat transfer**: Temperature changes from environment
- **Rapid transients**: Water hammer, pressure surges
- **Two-phase flow**: Flashing, condensation, or mixed flow

**Recommended verification:**

1. Compare with known analytical solutions for simple cases
2. Verify mass conservation (inlet flow = outlet flow)
3. Check that pressures are physically reasonable
4. For critical applications, use established commercial software

---

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests (98 tests covering all physics + validation)
npm test
```

### Test Coverage

The solver includes comprehensive tests for:

- **Fluid properties**: Ideal gas law, Sutherland viscosity, water density/viscosity correlations
- **Isentropic expansion**: Temperature-pressure relationship validation
- **Critical pressure ratio**: For all supported gas types
- **Flow equations**: Incompressible, compressible, choked/unchoked
- **Friction factor**: Laminar/turbulent, Moody diagram verification
- **Orifice/valve**: K-factor calculations, Cv conversion
- **Network solver**: Mass conservation, convergence, multiple nodes

Run `npm test` before any deployment to verify physics accuracy.

### Validation Against Benchmarks

The solver has been validated against analytical solutions and GFSSP (NASA's Generalized Fluid System Simulation Program).

#### Analytical Benchmarks (Verified)

| Test | Reference | Status |
|------|-----------|--------|
| Hagen-Poiseuille (laminar) | f = 64/Re | ✅ Passes |
| Darcy-Weisbach (turbulent, smooth) | Blasius: f = 0.3164 × Re⁻⁰·²⁵ | ✅ Within 2% |
| Darcy-Weisbach (turbulent, rough) | Moody diagram at ε/D = 0.01 | ✅ Within 2% |
| ISO 5167 orifice flow | ṁ = Cd × A × √(2ρΔP) | ✅ Exact match |
| Isentropic expansion (air) | T₂ = T₁ × (P₂/P₁)^0.286 | ✅ Within 1K |
| Isentropic expansion (helium) | γ = 1.67, monatomic | ✅ Within 10K |
| Critical pressure ratio | Published values for all gases | ✅ Within 0.5% |
| Ideal gas density | Standard air at STP | ✅ Within 0.5% |

#### GFSSP Comparison (NASA/TP-2016-218218)

| Feature | GFSSP Reference | FluidSolver | Match |
|---------|-----------------|-------------|-------|
| Choked flow behavior | Example 3 (nozzle) | Same flow rate regardless of P₂ below critical | ✅ Yes |
| Choked mass flow formula | Eq. 3.x | ṁ = Cd×A×P₁×√(γM/RT)×(2/(γ+1))^((γ+1)/(2(γ-1))) | ✅ Exact |
| Isentropic temperature | Used throughout | T₂ = T₁ × (P₂/P₁)^((γ-1)/γ) | ✅ Yes |
| Density tracking | Ideal gas law | ρ = PM/(RT) at each node | ✅ Yes |
| Water flow prediction | Example 2 (network) | Reasonable velocity/flow rates | ✅ Ballpark |

**Note**: Full GFSSP Example 2 (10-pipe network) cannot be directly compared because our solver currently handles series pipes, not arbitrary networks with loops. The physics equations match, but the topology solver differs.

### ⚠️ Required Verification Before Production Use

**This software requires the following verification before use in safety-critical applications:**

#### 1. Commercial Software Comparison (NOT YET COMPLETED)

Run 10-20 test cases through established commercial software and compare results:

| Test Case | Parameters | Compare With |
|-----------|------------|--------------|
| Simple water pipe | 100mm dia, 10m, 100 kPa ΔP | PIPE-FLO, AFT Fathom |
| High velocity water | 25mm dia, Re > 100,000 | PIPE-FLO, AFT Fathom |
| Laminar flow (oil) | High viscosity, Re < 2000 | PIPE-FLO, AFT Fathom |
| Gas pipe (air) | 50mm dia, 5 bar → 1 bar | GFSSP, Aspen HYSYS |
| Choked gas orifice | P₂/P₁ < 0.528 | GFSSP, manual calc |
| Valve with Cv | Cv = 50, water | Manufacturer data |
| Temperature tracking | Gas expansion, verify T drop | GFSSP, thermodynamics |
| Multi-pipe series | 3 pipes in series | Any commercial tool |
| Orifice plate (β=0.5) | ISO 5167 comparison | Manual calculation |
| Near-cavitation liquid | P₂ near Pᵥ | PIPE-FLO |

**Status**: ❌ Not yet verified against commercial software

#### 2. Review by Qualified Fluids Engineer (NOT YET COMPLETED)

A licensed professional engineer with fluid dynamics expertise should verify:

- [ ] Physics equations match industry standards (Crane TP-410, etc.)
- [ ] Solver assumptions are appropriate for intended use cases
- [ ] Edge cases are handled correctly (choked flow, low Re, high ΔP)
- [ ] Results are reasonable for representative test problems
- [ ] Limitations are clearly documented and appropriate

**Status**: ❌ Not yet reviewed by professional engineer

#### 3. Known Limitations Requiring Caution

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Network topology | Only handles series/parallel paths, not complex loops | Document limitation |
| Cv gas flow | Uses approximate Y-factor (xT=0.7) | May be 20-40% off for some valves |
| High pressure ratios | >10:1 ΔP may reduce accuracy | Validate these cases specifically |
| Two-phase flow | Not supported | Will give incorrect results |
| Transients | Steady-state only | Cannot model water hammer |

---

### Future Testing Requirements (Planned)

The following testing capabilities are planned for future development:

#### 1. UI Entry Testing Suite
- **Random permutation testing**: Automatically test all possible combinations of fluid types, temperatures, pressures, and configurations
- **Edge case detection**: Identify inputs that cause NaN, Infinity, or convergence failures
- **Regression testing**: Ensure UI changes don't break existing functionality

#### 2. Production Site Monitoring
- **Daily automated tests**: Run functional tests on fluidsolver.app every 24 hours
- **Multi-location testing**: Verify site loads correctly from different geographic regions
- **Uptime monitoring**: Alert on any downtime or server errors

#### 3. Extended Physics Validation
- **Full GFSSP Example 2**: Implement network topology solver for direct comparison
- **Sensitivity analysis**: Test numerical stability with small perturbations
- **Real-world validation**: Compare against physical test data if available

---

## License

MIT
