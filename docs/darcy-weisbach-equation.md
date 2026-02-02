# Darcy–Weisbach Equation

*From Wikipedia, the free encyclopedia*

In fluid dynamics, the **Darcy–Weisbach equation** is an empirical equation that relates the head loss, or pressure loss, due to viscous shear forces along a given length of pipe to the average velocity of the fluid flow for an incompressible fluid. The equation is named after Henry Darcy and Julius Weisbach. Currently, there is no formula more accurate or universally applicable than the Darcy–Weisbach supplemented by the Moody diagram or Colebrook equation.

The Darcy–Weisbach equation contains a dimensionless friction factor, known as the Darcy friction factor. This is also variously called the Darcy–Weisbach friction factor, friction factor, resistance coefficient, or flow coefficient.

## Historical Background

The Darcy-Weisbach equation, combined with the Moody chart for calculating head losses in pipes, is traditionally attributed to Henry Darcy, Julius Weisbach, and Lewis Ferry Moody. However, the development of these formulas and charts also involved other scientists and engineers over its historical development.

Weisbach's formula was proposed in 1845 in the form we still use today:

```
ΔH = f · (L·V²) / (2·g·D)
```

where:
- **ΔH**: head loss
- **L**: length of the pipe
- **D**: diameter of the pipe
- **V**: velocity of the fluid
- **g**: acceleration due to gravity
- **f**: Darcy friction factor

## Pressure-Loss Equation

In a cylindrical pipe of uniform diameter D, flowing full, the pressure loss due to viscous effects Δp is proportional to length L and can be characterized by the Darcy–Weisbach equation:

```
Δp/L = f_D · (ρ/2) · (⟨v⟩²/D_H)
```

where the pressure loss per unit length Δp/L (SI units: Pa/m) is a function of:

- **ρ**: the density of the fluid (kg/m³)
- **D_H**: the hydraulic diameter of the pipe (for a pipe of circular section, this equals D; otherwise D_H = 4A/P for a pipe of cross-sectional area A and perimeter P) (m)
- **⟨v⟩**: the mean flow velocity, experimentally measured as the volumetric flow rate Q per unit cross-sectional wetted area (m/s)
- **f_D**: the Darcy friction factor (also called flow coefficient λ)

For laminar flow in a circular pipe of diameter D_c, the friction factor is inversely proportional to the Reynolds number alone (f_D = 64/Re).

## Head-Loss Formula

The head loss Δh (or h_f) expresses the pressure loss due to friction in terms of the equivalent height of a column of the working fluid:

```
Δp = ρ·g·Δh
```

where:
- **Δh**: The head loss due to pipe friction over the given length of pipe (SI units: m)
- **g**: The local acceleration due to gravity (m/s²)

The Darcy–Weisbach equation can also be written in terms of head loss:

```
S = f_D · (1/2g) · (⟨v⟩²/D)
```

where S = Δh/L is the head loss per length of pipe (dimensionless).

### In Terms of Volumetric Flow

For a full-flowing, circular pipe of diameter D_c:

```
Q = (π/4)·D_c²·⟨v⟩
```

Then the Darcy–Weisbach equation in terms of Q is:

```
S = f_D · (8/π²g) · (Q²/D_c⁵)
```

## Darcy Friction Factor

The friction factor f_D is not a constant: it depends on such things as the characteristics of the pipe (diameter D and roughness height ε), the characteristics of the fluid (its kinematic viscosity ν), and the velocity of the fluid flow ⟨v⟩.

### Laminar Regime

For laminar (smooth) flows, it is a consequence of Poiseuille's law that:

```
f_D = 64/Re
```

where Re is the Reynolds number:

```
Re = (ρ/μ)·⟨v⟩·D = ⟨v⟩·D/ν
```

The regime Re < 2000 demonstrates laminar flow.

### Critical Regime

For Reynolds numbers in the range 2000 < Re < 4000, the flow is unsteady and involves the incipient formation of vortices; it is not well understood.

### Turbulent Regime

For Reynolds number greater than 4000, the flow is turbulent; the resistance to flow follows the Darcy–Weisbach equation: it is proportional to the square of the mean flow velocity.

#### Smooth-Pipe Regime

When the pipe surface is smooth, the friction factor's variation with Re can be modeled by the Kármán–Prandtl resistance equation for turbulent flow in smooth pipes.

#### Rough-Pipe Regime

When the pipe surface's roughness height ε is significant (typically at high Reynolds number), the friction factor departs from the smooth pipe curve, ultimately approaching an asymptotic value.

## Colebrook–White Equation

The Colebrook–White relation fits the friction factor with a function of the form:

```
1/√f_D = -2.00·log(2.51/(Re·√f_D) + ε/(3.7·D))
```

This relation has the correct behavior at extreme values: when roughness Reynolds number is small, it is consistent with smooth pipe flow; when large, it is consistent with rough pipe flow.

## Practical Application

In hydraulic engineering applications, it is typical for the volumetric flow Q within a pipe (productivity) and the head loss per unit length S (power consumption) to be the critical factors. The practical consequence is that, for a fixed volumetric flow rate Q, head loss S **decreases with the inverse fifth power of the pipe diameter, D**.

Doubling the diameter of a pipe roughly doubles the amount of material required per unit length and thus its installed cost. Meanwhile, the head loss is decreased by a factor of 32 (about a 97% reduction).

## Advantages

The Darcy-Weisbach's accuracy and universal applicability makes it the ideal formula for flow in pipes:

- It is based on fundamentals
- It is dimensionally consistent
- It is useful for any fluid, including oil, gas, brine, and sludges
- It can be derived analytically in the laminar flow region
- It is useful in the transition region between laminar flow and fully developed turbulent flow
- The friction factor variation is well documented

## See Also

- Bernoulli's principle
- Friction loss
- Hazen–Williams equation
- Hagen–Poiseuille equation
- Moody diagram
- Colebrook equation

## References

1. Jones, Garr M., ed. (2006). *Pumping Station Design* (3rd ed.). Burlington, MA: Butterworth-Heinemann.
2. Brown, G. O. (2003). "The History of the Darcy-Weisbach Equation for Pipe Flow Resistance". *Environmental and Water Resources History*. American Society of Civil Engineers.

---
*Source: https://en.wikipedia.org/wiki/Darcy–Weisbach_equation*
