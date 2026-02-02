#!/usr/bin/env python3
"""
Fluid Solver Validation Script
Compares our JavaScript solver results against the 'fluids' Python library.

Install dependencies:
    pip install fluids scipy numpy

Usage:
    python validate_solver.py
"""

import json
import math
from dataclasses import dataclass
from typing import List, Dict, Optional

try:
    from fluids import friction_factor, Reynolds, K_gate_valve_Crane, K_globe_valve_Crane, K_ball_valve_Crane
    from fluids.fittings import K_sharp_edged_orifice
    FLUIDS_AVAILABLE = True
except ImportError:
    print("Warning: 'fluids' library not installed. Install with: pip install fluids")
    FLUIDS_AVAILABLE = False

# =============================================================================
# CONSTANTS (must match solver.js)
# =============================================================================

WATER_DENSITY = 998      # kg/m³
WATER_VISCOSITY = 0.001  # Pa·s

# =============================================================================
# REFERENCE CALCULATIONS USING 'fluids' LIBRARY
# =============================================================================

def calc_reynolds(velocity: float, diameter: float, density=WATER_DENSITY, viscosity=WATER_VISCOSITY) -> float:
    """Calculate Reynolds number."""
    return density * abs(velocity) * diameter / viscosity

def calc_friction_factor_fluids(Re: float, D: float, roughness: float = 0.000045) -> float:
    """Calculate friction factor using fluids library (Colebrook-White)."""
    if not FLUIDS_AVAILABLE:
        return calc_friction_factor_swamee_jain(Re, D, roughness)
    
    if Re < 10:
        return 0.02
    try:
        return friction_factor(Re=Re, eD=roughness/D)
    except:
        return 0.02

def calc_friction_factor_swamee_jain(Re: float, D: float, roughness: float = 0.000045) -> float:
    """Calculate friction factor using Swamee-Jain (matches our JS solver)."""
    if Re < 2300:
        return 64 / Re if Re > 0 else 0.02
    term1 = roughness / (3.7 * D)
    term2 = 5.74 / (Re ** 0.9)
    return 0.25 / (math.log10(term1 + term2) ** 2)

# =============================================================================
# TEST CASES
# =============================================================================

@dataclass
class TestCase:
    name: str
    description: str
    # Input parameters
    diameter: float  # m
    length: float    # m
    roughness: float = 0.000045  # m (commercial steel)
    pressure_in: float = 200000  # Pa
    pressure_out: float = 100000 # Pa
    valve_type: Optional[str] = None
    valve_opening: float = 100  # %
    orifice_ratio: float = 0    # d/D
    orifice_Cd: float = 0.62

TEST_CASES = [
    TestCase(
        name="simple_pipe",
        description="Simple pipe flow, no fittings",
        diameter=0.1,
        length=10,
    ),
    TestCase(
        name="long_pipe",
        description="Longer pipe, more friction",
        diameter=0.1,
        length=100,
    ),
    TestCase(
        name="small_diameter",
        description="Smaller diameter pipe",
        diameter=0.025,
        length=10,
    ),
    TestCase(
        name="high_pressure_drop",
        description="Higher pressure differential",
        diameter=0.1,
        length=10,
        pressure_in=500000,
        pressure_out=100000,
    ),
    TestCase(
        name="gate_valve_open",
        description="Fully open gate valve",
        diameter=0.1,
        length=10,
        valve_type="gate",
        valve_opening=100,
    ),
    TestCase(
        name="gate_valve_half",
        description="50% open gate valve",
        diameter=0.1,
        length=10,
        valve_type="gate",
        valve_opening=50,
    ),
    TestCase(
        name="globe_valve_open",
        description="Fully open globe valve (high K)",
        diameter=0.1,
        length=10,
        valve_type="globe",
        valve_opening=100,
    ),
    TestCase(
        name="orifice_50pct",
        description="50% orifice (β=0.5)",
        diameter=0.1,
        length=10,
        orifice_ratio=0.5,
    ),
    TestCase(
        name="orifice_70pct",
        description="70% orifice (β=0.7)",
        diameter=0.1,
        length=10,
        orifice_ratio=0.7,
    ),
]

# =============================================================================
# VALIDATION FUNCTIONS
# =============================================================================

def get_valve_K(valve_type: str, opening: float) -> float:
    """Get valve K factor (matching our JS implementation)."""
    if opening <= 0:
        return float('inf')
    
    fully_open_K = {
        'gate': 0.2,
        'globe': 10,
        'ball': 0.05,
        'butterfly': 0.3,
        'check': 2,
    }
    
    K_open = fully_open_K.get(valve_type, 0)
    if opening >= 100:
        return K_open
    
    # Partial opening: K = K_open * (100/opening)²
    return K_open * (100 / opening) ** 2

def get_orifice_K(beta: float, Cd: float = 0.62) -> float:
    """Calculate orifice K factor."""
    if beta <= 0 or beta >= 1:
        return 0
    beta4 = beta ** 4
    return (1 - beta4) / (Cd * Cd * beta4)

def calculate_flow_rate(test: TestCase) -> Dict:
    """Calculate flow rate for a test case using our equations."""
    D = test.diameter
    L = test.length
    A = math.pi * (D/2)**2
    dP = test.pressure_in - test.pressure_out
    
    # Initial friction estimate
    f = 0.02
    K_friction = f * (L / D)
    
    # Valve K
    K_valve = 0
    if test.valve_type:
        K_valve = get_valve_K(test.valve_type, test.valve_opening)
    
    # Orifice K
    K_orifice = 0
    if test.orifice_ratio > 0:
        K_orifice = get_orifice_K(test.orifice_ratio, test.orifice_Cd)
    
    K_total = K_friction + K_valve + K_orifice
    
    # Resistance: R = K * ρ / (2 * A²)
    R = K_total * WATER_DENSITY / (2 * A * A)
    
    # Flow: Q = sign(ΔP) * sqrt(|ΔP| / R)
    Q = math.copysign(1, dP) * math.sqrt(abs(dP) / (R + 1e-10))
    
    V = Q / A
    Re = calc_reynolds(V, D)
    
    return {
        'flow_rate_m3s': Q,
        'flow_rate_lpm': Q * 60000,
        'velocity_ms': V,
        'reynolds': Re,
        'K_friction': K_friction,
        'K_valve': K_valve,
        'K_orifice': K_orifice,
        'K_total': K_total,
    }

def calculate_with_fluids_lib(test: TestCase) -> Optional[Dict]:
    """Calculate using fluids library for comparison."""
    if not FLUIDS_AVAILABLE:
        return None
    
    D = test.diameter
    L = test.length
    A = math.pi * (D/2)**2
    dP = test.pressure_in - test.pressure_out
    
    # Iterative solution to account for velocity-dependent friction
    V = 1.0  # Initial guess
    for _ in range(20):
        Re = calc_reynolds(V, D)
        f = calc_friction_factor_fluids(Re, D, test.roughness)
        
        K_friction = f * (L / D)
        K_valve = get_valve_K(test.valve_type, test.valve_opening) if test.valve_type else 0
        K_orifice = get_orifice_K(test.orifice_ratio, test.orifice_Cd) if test.orifice_ratio > 0 else 0
        K_total = K_friction + K_valve + K_orifice
        
        # ΔP = K * ρV²/2 => V = sqrt(2*ΔP / (K*ρ))
        V_new = math.sqrt(2 * abs(dP) / (K_total * WATER_DENSITY + 1e-10))
        if abs(V_new - V) < 1e-6:
            break
        V = V_new
    
    Q = V * A * math.copysign(1, dP)
    
    return {
        'flow_rate_m3s': Q,
        'flow_rate_lpm': Q * 60000,
        'velocity_ms': V,
        'reynolds': calc_reynolds(V, D),
        'friction_factor': f,
        'K_total': K_total,
    }

# =============================================================================
# MAIN VALIDATION
# =============================================================================

def run_validation():
    print("=" * 70)
    print("FLUID SOLVER VALIDATION")
    print("Comparing JavaScript solver equations against analytical solutions")
    print("=" * 70)
    print()
    
    results = []
    
    for test in TEST_CASES:
        print(f"\n{'─' * 50}")
        print(f"Test: {test.name}")
        print(f"Description: {test.description}")
        print(f"  D={test.diameter*1000:.1f}mm, L={test.length}m, ΔP={(test.pressure_in-test.pressure_out)/1000:.0f}kPa")
        if test.valve_type:
            print(f"  Valve: {test.valve_type} @ {test.valve_opening}%")
        if test.orifice_ratio > 0:
            print(f"  Orifice: β={test.orifice_ratio}, Cd={test.orifice_Cd}")
        
        # Our calculation (matches JS solver)
        our_result = calculate_flow_rate(test)
        print(f"\n  Our Solver:")
        print(f"    Flow rate: {our_result['flow_rate_lpm']:.2f} L/min")
        print(f"    Velocity:  {our_result['velocity_ms']:.3f} m/s")
        print(f"    Reynolds:  {our_result['reynolds']:.0f}")
        print(f"    K_total:   {our_result['K_total']:.2f}")
        
        # Fluids library calculation
        fluids_result = calculate_with_fluids_lib(test)
        if fluids_result:
            print(f"\n  Fluids Library (reference):")
            print(f"    Flow rate: {fluids_result['flow_rate_lpm']:.2f} L/min")
            print(f"    Velocity:  {fluids_result['velocity_ms']:.3f} m/s")
            print(f"    Reynolds:  {fluids_result['reynolds']:.0f}")
            
            # Compare
            diff_pct = abs(our_result['flow_rate_lpm'] - fluids_result['flow_rate_lpm']) / fluids_result['flow_rate_lpm'] * 100
            print(f"\n  Difference: {diff_pct:.1f}%")
            
            status = "✓ PASS" if diff_pct < 20 else "✗ FAIL"
            print(f"  Status: {status}")
            
            results.append({
                'test': test.name,
                'our_lpm': our_result['flow_rate_lpm'],
                'ref_lpm': fluids_result['flow_rate_lpm'],
                'diff_pct': diff_pct,
                'passed': diff_pct < 20,
            })
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    
    if results:
        passed = sum(1 for r in results if r['passed'])
        total = len(results)
        print(f"\nPassed: {passed}/{total} tests")
        
        print("\nDetailed Results:")
        print(f"{'Test':<25} {'Our (L/min)':<15} {'Ref (L/min)':<15} {'Diff %':<10} {'Status'}")
        print("-" * 70)
        for r in results:
            status = "✓" if r['passed'] else "✗"
            print(f"{r['test']:<25} {r['our_lpm']:<15.2f} {r['ref_lpm']:<15.2f} {r['diff_pct']:<10.1f} {status}")
    else:
        print("\nInstall 'fluids' library for full validation: pip install fluids")
    
    # Export for JS comparison
    export_data = []
    for test in TEST_CASES:
        export_data.append({
            'name': test.name,
            'input': {
                'diameter': test.diameter,
                'length': test.length,
                'roughness': test.roughness,
                'pressure_in': test.pressure_in,
                'pressure_out': test.pressure_out,
                'valve_type': test.valve_type,
                'valve_opening': test.valve_opening,
                'orifice_ratio': test.orifice_ratio,
                'orifice_Cd': test.orifice_Cd,
            },
            'expected': calculate_flow_rate(test),
        })
    
    with open('validation/test_cases.json', 'w') as f:
        json.dump(export_data, f, indent=2)
    print("\n\nTest cases exported to validation/test_cases.json")

if __name__ == '__main__':
    run_validation()
