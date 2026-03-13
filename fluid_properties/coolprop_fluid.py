"""
CoolProp-based fluid properties: two properties → third and more.

Ideal gas: PV = nRT  =>  P, T, ρ (density) are related.
CoolProp uses full equations of state; this module wraps PropsSI
so you can pass any two of (P, T, D) and get the third plus viscosity, etc.

Units: P [Pa], T [K], D [kg/m³].
"""

try:
    from CoolProp.CoolProp import PropsSI
except ImportError:
    PropsSI = None

# Map common names to CoolProp fluid names
FLUID_ALIASES = {
    'water': 'Water',
    'air': 'Air',
    'co2': 'CO2',
    'n2': 'Nitrogen',
    'o2': 'Oxygen',
    'he': 'Helium',
    'h2': 'Hydrogen',
    'methane': 'Methane',
    'r134a': 'R134a',
    'ammonia': 'Ammonia',
    'ethanol': 'Ethanol',
    'propylene': 'Propylene',
    'argon': 'Argon',
}


def _normalize_fluid(fluid: str) -> str:
    f = fluid.strip().lower()
    return FLUID_ALIASES.get(f, fluid)


def get_property(
    output: str,
    fluid: str,
    *,
    P: float = None,
    T: float = None,
    D: float = None,
    Q: float = None,
) -> float:
    """
    Get one fluid property given two state variables.

    Args:
        output: One of 'P', 'T', 'D', 'V' (viscosity), 'H', 'S', 'C', 'M' (mol mass), etc.
        fluid: CoolProp fluid name (e.g. 'Water', 'Air', 'CO2').
        P: Pressure [Pa] (optional).
        T: Temperature [K] (optional).
        D: Density [kg/m³] (optional).
        Q: Vapor quality 0..1 (optional, for two-phase).

    Returns:
        Output property in SI (P in Pa, T in K, D in kg/m³, V in Pa·s, etc.).

    Raises:
        ValueError: If not exactly two of P, T, D (or Q for two-phase) are provided.
    """
    if PropsSI is None:
        raise RuntimeError("CoolProp is not installed. Install with: pip install CoolProp")

    fluid = _normalize_fluid(fluid)
    inputs = []
    if P is not None:
        inputs.append(('P', P))
    if T is not None:
        inputs.append(('T', T))
    if D is not None:
        inputs.append(('D', D))
    if Q is not None:
        inputs.append(('Q', Q))

    if len(inputs) != 2:
        raise ValueError("Exactly two state variables must be given (e.g. P and T, or T and D)")

    (k1, v1), (k2, v2) = inputs
    return PropsSI(output, k1, v1, k2, v2, fluid)


def get_fluid_properties(
    fluid: str,
    *,
    P: float = None,
    T: float = None,
    D: float = None,
    Q: float = None,
    extras: bool = True,
) -> dict:
    """
    Get pressure, temperature, density, and optionally viscosity/enthalpy from two state variables.

    PV = nRT relates P, T, and ρ (ρ = 1/v = P/(R*T) for ideal gas). CoolProp uses
    full EOS; given any two of P, T, D we get the third and other properties.

    Args:
        fluid: CoolProp fluid name (e.g. 'Water', 'Air', 'CO2').
        P: Pressure [Pa].
        T: Temperature [K].
        D: Density [kg/m³].
        Q: Vapor quality (optional).
        extras: If True, also compute viscosity, enthalpy, specific heat.

    Returns:
        Dict with at least 'P', 'T', 'D'; if extras, also 'viscosity', 'enthalpy', 'Cp', etc.
    """
    if PropsSI is None:
        raise RuntimeError("CoolProp is not installed. Install with: pip install CoolProp")

    fluid = _normalize_fluid(fluid)
    out = {}
    (k1, v1), (k2, v2) = _two_inputs(P, T, D, Q)

    for key, prop in [('P', 'P'), ('T', 'T'), ('D', 'D')]:
        if key not in (k1, k2):
            out[key] = PropsSI(prop, k1, v1, k2, v2, fluid)
        else:
            out[key] = v1 if k1 == key else v2

    if extras:
        try:
            out['viscosity'] = PropsSI('V', k1, v1, k2, v2, fluid)  # Pa·s
        except Exception:
            out['viscosity'] = None
        try:
            out['enthalpy'] = PropsSI('H', k1, v1, k2, v2, fluid)  # J/kg
        except Exception:
            out['enthalpy'] = None
        try:
            out['Cp'] = PropsSI('C', k1, v1, k2, v2, fluid)  # J/(kg·K)
        except Exception:
            out['Cp'] = None

    return out


def _two_inputs(P, T, D, Q):
    inputs = []
    if P is not None:
        inputs.append(('P', float(P)))
    if T is not None:
        inputs.append(('T', float(T)))
    if D is not None:
        inputs.append(('D', float(D)))
    if Q is not None:
        inputs.append(('Q', float(Q)))
    if len(inputs) != 2:
        raise ValueError("Exactly two of P, T, D (or Q) must be provided")
    return inputs[0], inputs[1]


if __name__ == '__main__':
    # Example: two properties → third
    # Water at 1 bar, 20°C → density
    rho = get_property('D', 'Water', P=101325, T=293.15)
    print(f"Water at 1 bar, 20°C: density = {rho:.2f} kg/m³")

    # Air at 2 bar, 300 K → density
    rho = get_property('D', 'Air', P=2e5, T=300)
    print(f"Air at 2 bar, 300 K: density = {rho:.4f} kg/m³")

    # From T and D get P (e.g. ideal gas P = ρ*R*T/M)
    P = get_property('P', 'Air', T=300, D=1.2)
    print(f"Air at 300 K, 1.2 kg/m³: P = {P/1000:.2f} kPa")

    # Full properties
    props = get_fluid_properties('Water', P=101325, T=293.15)
    print("Water 1 bar 20°C:", props)
