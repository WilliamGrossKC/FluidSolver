# Fluid properties (CoolProp)

Given **two** of pressure (P), temperature (T), or density (D), compute the **third** and other properties. Uses the CoolProp library (equation of state; ideal gas is a special case PV = nRT).

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install CoolProp
```

Or from project root: `pip install -r validation/requirements.txt` (includes CoolProp).

## Usage

```python
from fluid_properties import get_fluid_properties, get_property

# One output from two inputs
density_kg_m3 = get_property('D', 'Water', P=101325, T=293.15)   # 1 bar, 20°C
pressure_Pa   = get_property('P', 'Air',   T=300, D=1.2)

# Full property dict (P, T, D, viscosity, enthalpy, Cp)
props = get_fluid_properties('CO2', P=100e5, T=298.15)
# props['P'], props['T'], props['D'], props['viscosity'], etc.
```

Units: **P** [Pa], **T** [K], **D** [kg/m³].
