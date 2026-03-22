# Fluid solver — test scope & limitations

## What the suite **does** validate

- **Liquids (incompressible)**: Orifice / valve / pipe resistance formulas, ISO-style ṁ for restrictions, Darcy–Weisbach friction, **volumetric KCL at every internal node**, and **constant Q along a single series path** (e.g. boundary → valve node → orifice node → boundary), matching the GUI wiring.
- **Compressible (gas)**: Isentropic T(P), choked vs unchoked restriction formulas, single-pipe gas networks, temperature/density trends.
- **GFSSP-style spot checks**: Choked mass flow formula, rough Darcy–Weisbach consistency for a high-ΔP water line.

## What is **not** tightly validated (important for rocket-class use)

1. **Compressible multi-segment networks**  
   Flow is updated **per pipe** with local ρ(T,P); **mass flow is not strictly enforced equal on adjacent pipe segments** at an internal junction. A specialist expecting strict ṁ continuity for gas feedlines should treat compressible results as **qualitative** until the solver couples segments with a proper compressible nodal formulation.

2. **Transient / waterhammer / heat transfer**  
   Steady state only.

3. **Detailed nozzle / plume physics**  
   Lumped restrictions (Cv, CdA, orifice K), not area–Mach integration.

4. **Plot vs physics**  
   Pressure-vs-distance plots interpolate within pipes; large losses at valve/orifice **nodes** can look smeared along pipe length.

## Running tests

```bash
npm run test:run
```

When adding features, extend **Part 14** (`Series line topology — GUI-equivalent`) for any new restriction topology the app supports.

## App MVP topology

The React app enforces **one connected straight line** (no junction nodes, no branching, no loops) via `validateMvpLinearNetwork` before solve, and **incompressible liquids only** (gas is hidden from the fluid picker; `runSolver` blocks gas). **Physical geometry** (orifice **d < D**, valve port **≤ pipe**, etc.) is enforced inside `solveNetwork` via `validatePipePhysicalConstraints` so bad data cannot “solve” silently.

The core `solveNetwork` still accepts gas and richer graphs for **unit tests** and future use.

## CI/CD and infrastructure TODOs

- **CI pipeline**: set up a proper CI run (Vitest + any validation scripts) on every push / PR. Tooling TBD (GitHub Actions vs Jenkins), but this should gate merges to main once we are out of early beta.
- **Jenkins documentation**: we will need internal docs that cover how Jenkins jobs trigger builds/tests for this repo, how secrets are managed, and how failures surface back to the team.
- **Cloudflare integration**: when designing CI, explicitly document where Cloudflare sits in the flow (GitHub → CI → artifact → Cloudflare, or GitHub → Cloudflare Pages/Workers). We need a note on any constraints Cloudflare will impose on the build/publish steps before wiring Jenkins into that path.
