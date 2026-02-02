# Discharge Coefficient

*From Wikipedia, the free encyclopedia*

In a nozzle or other constriction, the **discharge coefficient** (also known as **coefficient of discharge** or **efflux coefficient**) is the ratio of the actual discharge to the ideal discharge, i.e., the ratio of the mass flow rate at the discharge end of the nozzle to that of an ideal nozzle which expands an identical working fluid from the same initial conditions to the same exit pressures.

## Mathematical Definition

The discharge coefficient may be related to the mass flow rate of a fluid through a straight tube of constant cross-sectional area through the following:

```
C_d = ṁ / (ρ·V̇) = ṁ / (ρ·A·u) = ṁ / (A·√(2·ρ·ΔP))
```

Or equivalently:

```
C_d = Q_exp / Q_ideal
```

Where:

| Symbol | Description | Units |
|--------|-------------|-------|
| **C_d** | Discharge coefficient through the constriction | dimensionless |
| **ṁ** | Mass flow rate of fluid through constriction | kg/s |
| **ρ** | Density of fluid | kg/m³ |
| **V̇** | Volumetric flow rate of fluid through constriction | m³/s |
| **A** | Cross-sectional area of flow constriction | m² |
| **u** | Velocity of fluid through constriction | m/s |
| **ΔP** | Pressure drop across constriction | Pa |

## Purpose

This parameter is useful for determining the irrecoverable losses associated with a certain piece of equipment (constriction) in a fluid system, or the "resistance" that piece of equipment imposes upon the flow.

## Flow Resistance

The flow resistance, often expressed as a dimensionless parameter k, is related to the discharge coefficient through the equation:

```
k = 1 / C_d²
```

This may be obtained by substituting ΔP in the aforementioned equation with the resistance k multiplied by the dynamic pressure of the fluid, q.

## Example in Open Channel Flow

Due to complex behavior of fluids around structures such as orifices, gates, and weirs, some assumptions are made for the theoretical analysis of the stage-discharge relationship.

### Gates Example

For gates, the pressure at the gate opening is non-hydrostatic which is difficult to model. Engineers assume that the pressure is zero at the gate opening, and the following equation is obtained for discharge:

**Theoretical (ideal) discharge:**
```
Q = A_0 · √(2·g·H_1)
```

**Actual discharge with coefficient:**
```
Q = C_d · A_0 · √(2·g·H_1)
```

Where:
- **Q**: discharge (m³/s)
- **A_0**: area of flow (m²)
- **g**: acceleration due to gravity (9.81 m/s²)
- **H_1**: head just upstream of the gate (m)
- **C_d**: discharge coefficient (dimensionless, typically 0.6-0.9)

## Typical Values

| Device Type | Typical C_d Range |
|-------------|-------------------|
| Sharp-edged orifice | 0.60 - 0.65 |
| Rounded entrance orifice | 0.95 - 0.99 |
| Venturi meter | 0.98 - 0.99 |
| Nozzle | 0.92 - 0.98 |
| Sluice gate | 0.55 - 0.70 |
| Weir (broad-crested) | 0.85 - 0.95 |

## Applications in Pipe Flow

In pipe network analysis, discharge coefficients are used to model:

1. **Valves**: Partially open valves have discharge coefficients less than 1
2. **Fittings**: Elbows, tees, and reducers introduce losses
3. **Orifice plates**: Used for flow measurement
4. **Nozzles**: Control flow rates and velocities

## Relationship to Other Coefficients

### Velocity Coefficient (C_v)
The ratio of actual velocity to theoretical velocity:
```
C_v = v_actual / v_theoretical
```

### Contraction Coefficient (C_c)
The ratio of the area of the contracted jet to the area of the orifice:
```
C_c = A_contracted / A_orifice
```

### Relationship
```
C_d = C_v × C_c
```

## See Also

- Flow coefficient
- Orifice plate
- Venturi effect
- Bernoulli's principle

## References

1. Sam Mannan, Frank P. Lee, *Lee's Loss Prevention in the Process Industries: Hazard Identification, Assessment and Control*, Volume 1, Elsevier Butterworth Heinemann, 2005. ISBN 978-0750678575.

## External Links

- [Mass Flow Choking](https://www.grc.nasa.gov/www/k-12/airplane/mflchk.html) - NASA Glenn Research Center

---
*Source: https://en.wikipedia.org/wiki/Discharge_coefficient*
