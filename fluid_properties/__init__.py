"""
Fluid properties via CoolProp (PV = nRT and full equation of state).

Given any two of pressure (P), temperature (T), or density (D),
compute the third and other properties (viscosity, enthalpy, etc.).

Uses CoolProp's PropsSI: state is defined by two state variables;
all other properties follow from the equation of state.
"""

from .coolprop_fluid import get_fluid_properties, get_property, FLUID_ALIASES

__all__ = ['get_fluid_properties', 'get_property', 'FLUID_ALIASES']
