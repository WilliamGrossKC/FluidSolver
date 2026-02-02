# FluidSolver

A visual fluid network analysis tool for calculating pressure and flow distribution in pipe systems.

![Status](https://img.shields.io/badge/status-MVP-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## What Is This?

**FluidSolver** is a simplified version of tools like NASA's [GFSSP](https://www.nasa.gov/gfssp/) (Generalized Fluid System Simulation Program). It helps engineers and students understand how fluids flow through pipe networks.

### The Problem It Solves

When you have a network of pipes (like a water distribution system, hydraulic circuit, or process plant), you need to answer:

- **What is the flow rate** through each pipe?
- **What is the pressure** at each junction?
- **How does changing one pipe** affect the rest of the system?

These calculations involve solving simultaneous nonlinear equations - tedious by hand, but perfect for a computer.

### How It Works

1. **Build a network** by placing nodes and connecting them with pipes
2. **Set boundary conditions** - pressures at inlets/outlets (boundary nodes)
3. **Define pipe properties** - diameter, length, roughness
4. **Solve** - the solver calculates pressures and flow rates throughout

## The Physics

### Governing Equations

**Conservation of Mass** (at each junction):
```
Σ(flow in) = Σ(flow out)
```
What flows into a junction must flow out.

**Darcy-Weisbach Equation** (pressure drop in pipes):
```
ΔP = f × (L/D) × (ρV²/2)
```
Where:
- `ΔP` = pressure drop (Pa)
- `f` = Darcy friction factor (dimensionless)
- `L` = pipe length (m)
- `D` = pipe diameter (m)
- `ρ` = fluid density (kg/m³)
- `V` = flow velocity (m/s)

### What Affects Pressure & Flow?

| Factor | Effect on Pressure Drop |
|--------|------------------------|
| **Longer pipes** | ↑ More friction, more drop |
| **Smaller diameter** | ↑↑ Much more drop (D⁵ relationship!) |
| **Rougher pipes** | ↑ Higher friction factor |
| **Higher flow rate** | ↑↑ Quadratic relationship (V²) |
| **Valves** | ↑ Add resistance coefficient K |
| **Fittings** | ↑ Each fitting adds minor losses |

### Flow Resistance Components

**Valves** - Adjustable resistance:
- Gate valve: Low resistance when fully open
- Globe valve: Higher resistance, better flow control
- Ball valve: Quick on/off, low resistance open
- Check valve: Allows flow in one direction only

**Orifices** - Fixed restrictions:
- Sharp-edged: High pressure drop, flow measurement
- Rounded: Lower pressure drop

**Pumps** - Add energy to the system:
- Centrifugal: Pressure rise depends on flow rate
- Positive displacement: Nearly constant flow regardless of pressure

## Using FluidSolver

### Node Types

| Type | Symbol | Description |
|------|--------|-------------|
| **Boundary** | Square (blue) | Fixed pressure - inlets, outlets, tanks |
| **Junction** | Circle (gray) | Internal node - pressure calculated |

### Quick Start

1. **Add boundary nodes** - These are your inlets/outlets with known pressure
2. **Add junction nodes** - Internal connection points
3. **Connect with pipes** - Click Connect, then click two nodes
4. **Set properties** - Click nodes/pipes to edit in the properties panel
5. **Solve** - Click Solve to calculate the network

### Example: Simple Pipe Flow

```
[Boundary 200 kPa] ----pipe---- [Junction] ----pipe---- [Boundary 100 kPa]
```

With a 100 kPa pressure difference, water will flow from high to low pressure. The solver calculates:
- Flow rate through the pipes
- Pressure at the junction (somewhere between 100-200 kPa)

## Technical Details

### Solver Method

Uses an iterative approach similar to Hardy-Cross:
1. Estimate initial pressures
2. Calculate flow rates from pressure differences: `Q ∝ √(ΔP)`
3. Check mass conservation at each junction
4. Adjust pressures to reduce imbalance
5. Repeat until converged

### Friction Factor Calculation

Uses the **Swamee-Jain equation** (explicit approximation of Colebrook-White):

**Laminar flow** (Re < 2300):
```
f = 64 / Re
```

**Turbulent flow** (Re > 2300):
```
f = 0.25 / [log₁₀(ε/3.7D + 5.74/Re^0.9)]²
```

### Assumptions (Current MVP)

- Steady-state flow (no time variation)
- Incompressible fluid (water at 20°C)
- Fully developed flow in pipes
- No heat transfer
- Horizontal pipes (no elevation effects)

## Components

### Valves

Valves add adjustable resistance to pipes. Select a pipe and choose a valve type:

| Valve Type | K (fully open) | Best For |
|------------|----------------|----------|
| Gate | 0.2 | On/off service, low pressure drop |
| Globe | 10 | Throttling, flow control |
| Ball | 0.05 | Quick on/off, very low loss |
| Butterfly | 0.3 | Large pipes, moderate control |
| Check | 2 | Preventing backflow |

**Opening %**: Adjust from 0-100% to throttle flow. K increases quadratically as valve closes.

### Orifices

Orifices are fixed restrictions that create a known pressure drop. Used for flow measurement or pressure reduction.

| Parameter | Description |
|-----------|-------------|
| **Ratio (d/D)** | Orifice diameter / Pipe diameter (0.1 to 0.95) |
| **Cd** | Discharge coefficient (typically 0.6-0.65 for sharp-edge) |

Pressure drop: `ΔP = (ρ/2) × (Q / (Cd × A_orifice))²`

## Future Enhancements

- [ ] **Pumps** - Add pressure/flow sources
- [ ] **Fittings** - Elbows, tees, reducers with K-factors
- [ ] **Multiple fluids** - Select from fluid library
- [ ] **Elevation** - Account for gravity/height differences
- [ ] **Transient analysis** - Water hammer, startup/shutdown
- [ ] **Save/Load** - Export and import network designs

## References

- NASA GFSSP User Manual (docs/gfssp-v6-usermanual.txt)
- [Darcy-Weisbach Equation](docs/darcy-weisbach-equation.md)
- [Discharge Coefficient](docs/discharge-coefficient.md)

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## License

MIT
