/**
 * CoolProp WebAssembly TypeScript Definitions
 * 
 * Comprehensive TypeScript definitions for the CoolProp WASM module,
 * providing type-safe access to all thermodynamic calculation capabilities.
 * 
 * @version 6.6.0
 * @author CoolProp Team
 * @license MIT
 */

declare module 'coolprop-wasm' {
    /**
     * Main CoolProp module interface
     */
    export interface CoolPropModule {
        // High-level API functions
        PropsSI(output: string, name1: string, value1: number, name2: string, value2: number, fluid: string): number;
        Props1SI(fluid: string, output: string): number;
        F2K(temp_F: number): number;
        
        // Configuration functions
        get_global_param_string(param: string): string;
        get_fluid_param_string(fluid: string, param: string): string;
        
        // Mixture functions
        apply_simple_mixing_rule(identifier1: string, identifier2: string, rule: string): void;
        get_mixture_binary_pair_data(CAS1: string, CAS2: string, key: string): number;
        add_fluids_as_JSON(backend: string, fluids_string: string): void;
        
        // Humid air functions
        HAPropsSI(output: string, name1: string, value1: number, name2: string, value2: number, name3: string, value3: number): number;
        
        // Factory functions
        factory(backend: string, fluids: string): AbstractState;
        create_abstract_state(backend: string, fluids: string): AbstractStateWrapper;
        
        // Vector constructors
        VectorDouble: new() => VectorDouble;
        VectorString: new() => VectorString;
        
        // Enum interfaces (actual WASM structure)
        readonly parameters: ParametersEnum;
        readonly input_pairs: InputPairsEnum;
        readonly phases: PhasesEnum;
        
        // Constants for input pairs
        readonly QT_INPUTS: InputPairs.QT_INPUTS;
        readonly PQ_INPUTS: InputPairs.PQ_INPUTS;
        readonly QSmolar_INPUTS: InputPairs.QSmolar_INPUTS;
        readonly QSmass_INPUTS: InputPairs.QSmass_INPUTS;
        readonly HmolarQ_INPUTS: InputPairs.HmolarQ_INPUTS;
        readonly HmassQ_INPUTS: InputPairs.HmassQ_INPUTS;
        readonly DmolarQ_INPUTS: InputPairs.DmolarQ_INPUTS;
        readonly DmassQ_INPUTS: InputPairs.DmassQ_INPUTS;
        readonly PT_INPUTS: InputPairs.PT_INPUTS;
        readonly DmassT_INPUTS: InputPairs.DmassT_INPUTS;
        readonly DmolarT_INPUTS: InputPairs.DmolarT_INPUTS;
        readonly HmolarT_INPUTS: InputPairs.HmolarT_INPUTS;
        readonly HmassT_INPUTS: InputPairs.HmassT_INPUTS;
        readonly SmolarT_INPUTS: InputPairs.SmolarT_INPUTS;
        readonly SmassT_INPUTS: InputPairs.SmassT_INPUTS;
        readonly TUmolar_INPUTS: InputPairs.TUmolar_INPUTS;
        readonly TUmass_INPUTS: InputPairs.TUmass_INPUTS;
        readonly DmassP_INPUTS: InputPairs.DmassP_INPUTS;
        readonly DmolarP_INPUTS: InputPairs.DmolarP_INPUTS;
        readonly HmassP_INPUTS: InputPairs.HmassP_INPUTS;
        readonly HmolarP_INPUTS: InputPairs.HmolarP_INPUTS;
        readonly PSmass_INPUTS: InputPairs.PSmass_INPUTS;
        readonly PSmolar_INPUTS: InputPairs.PSmolar_INPUTS;
        readonly PUmass_INPUTS: InputPairs.PUmass_INPUTS;
        readonly PUmolar_INPUTS: InputPairs.PUmolar_INPUTS;
        readonly HmassSmass_INPUTS: InputPairs.HmassSmass_INPUTS;
        readonly HmolarSmolar_INPUTS: InputPairs.HmolarSmolar_INPUTS;
        readonly SmassUmass_INPUTS: InputPairs.SmassUmass_INPUTS;
        readonly SmolarUmolar_INPUTS: InputPairs.SmolarUmolar_INPUTS;
        readonly DmassHmass_INPUTS: InputPairs.DmassHmass_INPUTS;
        readonly DmolarHmolar_INPUTS: InputPairs.DmolarHmolar_INPUTS;
        readonly DmassSmass_INPUTS: InputPairs.DmassSmass_INPUTS;
        readonly DmolarSmolar_INPUTS: InputPairs.DmolarSmolar_INPUTS;
        readonly DmassUmass_INPUTS: InputPairs.DmassUmass_INPUTS;
        readonly DmolarUmolar_INPUTS: InputPairs.DmolarUmolar_INPUTS;
    }

    /**
     * Vector types for WASM interface
     */
    export interface VectorDouble {
        size(): number;
        get(index: number): number;
        set(index: number, value: number): void;
        push_back(value: number): void;
        resize(size: number): void;
        delete(): void;
    }

    export interface VectorString {
        size(): number;
        get(index: number): string;
        set(index: number, value: string): void;
        push_back(value: string): void;
        resize(size: number): void;
        delete(): void;
    }

    /**
     * Enum value wrapper (Emscripten enum binding)
     */
    export interface EnumValue {
        readonly value: number;
    }

    /**
     * CoolProp parameters enumeration
     * Maps to the CoolProp::parameters enum in C++
     * Note: Access the numeric value using .value property
     */
    export interface ParametersEnum {
        /** Gas constant */
        readonly igas_constant: EnumValue;
        /** Molar mass */
        readonly imolar_mass: EnumValue;
        /** Acentric factor */
        readonly iacentric_factor: EnumValue;
        /** Reducing molar density */
        readonly irhomolar_reducing: EnumValue;
        /** Critical molar density */
        readonly irhomolar_critical: EnumValue;
        /** Reducing temperature */
        readonly iT_reducing: EnumValue;
        /** Critical temperature */
        readonly iT_critical: EnumValue;
        /** Reducing mass density */
        readonly irhomass_reducing: EnumValue;
        /** Critical mass density */
        readonly irhomass_critical: EnumValue;
        /** Critical pressure */
        readonly iP_critical: EnumValue;
        /** Reducing pressure */
        readonly iP_reducing: EnumValue;
        /** Triple point temperature */
        readonly iT_triple: EnumValue;
        /** Triple point pressure */
        readonly iP_triple: EnumValue;
        /** Minimum temperature */
        readonly iT_min: EnumValue;
        /** Maximum temperature */
        readonly iT_max: EnumValue;
        /** Maximum pressure */
        readonly iP_max: EnumValue;
        /** Minimum pressure */
        readonly iP_min: EnumValue;
        /** Dipole moment */
        readonly idipole_moment: EnumValue;
        /** Temperature */
        readonly iT: EnumValue;
        /** Pressure */
        readonly iP: EnumValue;
        /** Quality (vapor fraction) */
        readonly iQ: EnumValue;
        /** Reciprocal reduced temperature (Tc/T) */
        readonly iTau: EnumValue;
        /** Reduced density (rho/rhoc) */
        readonly iDelta: EnumValue;
        /** Molar density */
        readonly iDmolar: EnumValue;
        /** Molar enthalpy */
        readonly iHmolar: EnumValue;
        /** Molar entropy */
        readonly iSmolar: EnumValue;
        /** Molar heat capacity at constant pressure */
        readonly iCpmolar: EnumValue;
        /** Ideal gas molar heat capacity at constant pressure */
        readonly iCp0molar: EnumValue;
        /** Molar heat capacity at constant volume */
        readonly iCvmolar: EnumValue;
        /** Molar internal energy */
        readonly iUmolar: EnumValue;
        /** Molar Gibbs energy */
        readonly iGmolar: EnumValue;
        /** Molar Helmholtz energy */
        readonly iHelmholtzmolar: EnumValue;
        /** Mass density */
        readonly iDmass: EnumValue;
        /** Mass enthalpy */
        readonly iHmass: EnumValue;
        /** Mass entropy */
        readonly iSmass: EnumValue;
        /** Mass heat capacity at constant pressure */
        readonly iCpmass: EnumValue;
        /** Ideal gas mass heat capacity at constant pressure */
        readonly iCp0mass: EnumValue;
        /** Mass heat capacity at constant volume */
        readonly iCvmass: EnumValue;
        /** Mass internal energy */
        readonly iUmass: EnumValue;
        /** Mass Gibbs energy */
        readonly iGmass: EnumValue;
        /** Mass Helmholtz energy */
        readonly iHelmholtzmass: EnumValue;
        /** Viscosity */
        readonly iviscosity: EnumValue;
        /** Thermal conductivity */
        readonly iconductivity: EnumValue;
        /** Surface tension */
        readonly isurface_tension: EnumValue;
        /** Prandtl number */
        readonly iPrandtl: EnumValue;
        /** Speed of sound */
        readonly ispeed_sound: EnumValue;
        /** Isothermal compressibility */
        readonly iisothermal_compressibility: EnumValue;
        /** Isobaric expansion coefficient */
        readonly iisobaric_expansion_coefficient: EnumValue;
        /** Isentropic expansion coefficient */
        readonly iisentropic_expansion_coefficient: EnumValue;
        /** Residual Helmholtz energy */
        readonly ialphar: EnumValue;
        /** Ideal gas Helmholtz energy */
        readonly ialpha0: EnumValue;
        /** Second virial coefficient */
        readonly iBvirial: EnumValue;
        /** Third virial coefficient */
        readonly iCvirial: EnumValue;
        /** Temperature derivative of second virial coefficient */
        readonly idBvirial_dT: EnumValue;
        /** Temperature derivative of third virial coefficient */
        readonly idCvirial_dT: EnumValue;
        /** Compressibility factor */
        readonly iZ: EnumValue;
        /** Phase identification parameter */
        readonly iPIP: EnumValue;
        /** Phase */
        readonly iPhase: EnumValue;
    }

    /**
     * Input pairs enumeration for state specification
     * Maps to the CoolProp::input_pairs enum in C++
     * Note: Access the numeric value using .value property
     */
    export interface InputPairsEnum {
        /** Quality and temperature */
        readonly QT_INPUTS: EnumValue;
        /** Pressure and quality */
        readonly PQ_INPUTS: EnumValue;
        /** Quality and molar entropy */
        readonly QSmolar_INPUTS: EnumValue;
        /** Quality and mass entropy */
        readonly QSmass_INPUTS: EnumValue;
        /** Molar enthalpy and quality */
        readonly HmolarQ_INPUTS: EnumValue;
        /** Mass enthalpy and quality */
        readonly HmassQ_INPUTS: EnumValue;
        /** Molar density and quality */
        readonly DmolarQ_INPUTS: EnumValue;
        /** Mass density and quality */
        readonly DmassQ_INPUTS: EnumValue;
        /** Pressure and temperature */
        readonly PT_INPUTS: EnumValue;
        /** Mass density and temperature */
        readonly DmassT_INPUTS: EnumValue;
        /** Molar density and temperature */
        readonly DmolarT_INPUTS: EnumValue;
        /** Molar enthalpy and temperature */
        readonly HmolarT_INPUTS: EnumValue;
        /** Mass enthalpy and temperature */
        readonly HmassT_INPUTS: EnumValue;
        /** Molar entropy and temperature */
        readonly SmolarT_INPUTS: EnumValue;
        /** Mass entropy and temperature */
        readonly SmassT_INPUTS: EnumValue;
        /** Temperature and molar internal energy */
        readonly TUmolar_INPUTS: EnumValue;
        /** Temperature and mass internal energy */
        readonly TUmass_INPUTS: EnumValue;
        /** Mass density and pressure */
        readonly DmassP_INPUTS: EnumValue;
        /** Molar density and pressure */
        readonly DmolarP_INPUTS: EnumValue;
        /** Mass enthalpy and pressure */
        readonly HmassP_INPUTS: EnumValue;
        /** Molar enthalpy and pressure */
        readonly HmolarP_INPUTS: EnumValue;
        /** Pressure and mass entropy */
        readonly PSmass_INPUTS: EnumValue;
        /** Pressure and molar entropy */
        readonly PSmolar_INPUTS: EnumValue;
        /** Pressure and mass internal energy */
        readonly PUmass_INPUTS: EnumValue;
        /** Pressure and molar internal energy */
        readonly PUmolar_INPUTS: EnumValue;
        /** Mass enthalpy and mass entropy */
        readonly HmassSmass_INPUTS: EnumValue;
        /** Molar enthalpy and molar entropy */
        readonly HmolarSmolar_INPUTS: EnumValue;
        /** Mass entropy and mass internal energy */
        readonly SmassUmass_INPUTS: EnumValue;
        /** Molar entropy and molar internal energy */
        readonly SmolarUmolar_INPUTS: EnumValue;
        /** Mass density and mass enthalpy */
        readonly DmassHmass_INPUTS: EnumValue;
        /** Molar density and molar enthalpy */
        readonly DmolarHmolar_INPUTS: EnumValue;
        /** Mass density and mass entropy */
        readonly DmassSmass_INPUTS: EnumValue;
        /** Molar density and molar entropy */
        readonly DmolarSmolar_INPUTS: EnumValue;
        /** Mass density and mass internal energy */
        readonly DmassUmass_INPUTS: EnumValue;
        /** Molar density and molar internal energy */
        readonly DmolarUmolar_INPUTS: EnumValue;
    }

    /**
     * Phase enumeration
     * Maps to the CoolProp::phases enum in C++
     * Note: Access the numeric value using .value property
     */
    export interface PhasesEnum {
        /** Liquid phase */
        readonly iphase_liquid: EnumValue;
        /** Supercritical phase */
        readonly iphase_supercritical: EnumValue;
        /** Supercritical gas */
        readonly iphase_supercritical_gas: EnumValue;
        /** Supercritical liquid */
        readonly iphase_supercritical_liquid: EnumValue;
        /** Critical point */
        readonly iphase_critical_point: EnumValue;
        /** Gas phase */
        readonly iphase_gas: EnumValue;
        /** Two-phase */
        readonly iphase_twophase: EnumValue;
        /** Unknown phase */
        readonly iphase_unknown: EnumValue;
        /** Phase not imposed */
        readonly iphase_not_imposed: EnumValue;
    }

    /**
     * Backward compatibility: Numeric enum values
     * These provide the actual numeric values for easier use
     */
    export enum Parameters {
        /** Gas constant */
        igas_constant = 0,
        /** Molar mass */
        imolar_mass = 1,
    }

    /**
     * Phase envelope data structure
     * Contains arrays of thermodynamic properties along the phase boundary
     */
    export interface PhaseEnvelopeData {
        /** Temperature array [K] */
        T: number[];
        /** Pressure array [Pa] */
        p: number[];
        /** Vapor molar density array [mol/m³] */
        rhomolar_vap: number[];
        /** Liquid molar density array [mol/m³] */
        rhomolar_liq: number[];
        /** Vapor molar enthalpy array [J/mol] */
        hmolar_vap: number[];
        /** Liquid molar enthalpy array [J/mol] */
        hmolar_liq: number[];
        /** Vapor molar entropy array [J/mol/K] */
        smolar_vap: number[];
        /** Liquid molar entropy array [J/mol/K] */
        smolar_liq: number[];
        /** Quality array [-] */
        Q: number[];
    }

    /**
     * Error context for enhanced error reporting
     */
    export interface ErrorContext {
        /** Operation being performed */
        operation: string;
        /** Backend name */
        backend: string;
        /** Fluid name(s) */
        fluid: string;
        /** Additional information */
        additional_info: string;
        
        /** Convert to string representation */
        to_string(): string;
    }

    /**
     * Error handler utilities
     */
    export interface WASMErrorHandler {
        /** Translate C++ exception to JavaScript error message */
        translateException(error: Error, context: ErrorContext): string;
        /** Get error code string from CoolProp error code */
        getErrorCodeString(code: number): string;
    }

    /**
     * Enhanced memory management wrapper for AbstractState
     * Provides automatic memory management and error handling
     */
    export interface AbstractStateWrapper {
        /** Get the underlying AbstractState pointer */
        get(): AbstractState;
        /** Check if the wrapper contains a valid state */
        is_valid(): boolean;
        /** Get reference count for debugging */
        use_count(): number;
        /** Get backend name */
        get_backend_name(): string;
        /** Get fluid names */
        get_fluid_names(): string;
        
        /** Safe state update with error handling */
        safe_update(input_pair: InputPairs, value1: number, value2: number): void;
        /** Safe property access with error handling */
        safe_keyed_output(key: Parameters): number;
        /** Safe derivative calculation with error handling */
        safe_first_partial_deriv(of: Parameters, wrt: Parameters, constant: Parameters): number;
        
        /** Get total instance count (static method) */
        static get_instance_count(): number;
        /** Clean up orphaned instances (static method) */
        static cleanup_orphaned_instances(): void;
        /** Get memory information (static method) */
        static get_memory_info(): string[];
    }

    /**
     * Main AbstractState interface
     * Provides access to all thermodynamic calculations and properties
     */
    export interface AbstractState {
        // Backend and fluid information
        /** Get backend name */
        backend_name(): string;
        /** Get fluid names */
        fluid_names(): string[];
        /** Get fluid name */
        name(): string;
        /** Get fluid description */
        description(): string;

        // Composition management
        /** Check if using mole fractions */
        using_mole_fractions(): boolean;
        /** Check if using mass fractions */
        using_mass_fractions(): boolean;
        /** Check if using volume fractions */
        using_volu_fractions(): boolean;
        
        /** Set mole fractions */
        set_mole_fractions(fractions: VectorDouble): void;
        /** Set mass fractions */
        set_mass_fractions(fractions: VectorDouble): void;
        /** Set volume fractions */
        set_volu_fractions(fractions: VectorDouble): void;
        
        /** Get mole fractions */
        get_mole_fractions(): number[];
        /** Get mass fractions */
        get_mass_fractions(): number[];
        
        /** Get liquid phase mole fractions (two-phase only) */
        mole_fractions_liquid(): number[];
        /** Get vapor phase mole fractions (two-phase only) */
        mole_fractions_vapor(): number[];

        // Enhanced mixture handling with validation
        /** Safely set mole fractions with validation and normalization */
        safe_set_mole_fractions(fractions: number[]): number[];
        /** Safely set mass fractions with validation and normalization */
        safe_set_mass_fractions(fractions: number[]): number[];
        /** Validate current mixture composition */
        validate_mixture_composition(): boolean;
        /** Get number of mixture components */
        get_mixture_component_count(): number;
        /** Safely get liquid mole fractions with phase validation */
        safe_mole_fractions_liquid(): number[];
        /** Safely get vapor mole fractions with phase validation */
        safe_mole_fractions_vapor(): number[];
        /** Convert mass fractions to mole fractions */
        convert_mass_to_mole_fractions(mass_fractions: number[]): number[];
        /** Convert mole fractions to mass fractions */
        convert_mole_to_mass_fractions(mole_fractions: number[]): number[];

        // State management
        /** Update thermodynamic state */
        update(input_pair: InputPairs, value1: number, value2: number): void;
        /** Get current phase */
        phase(): Phases;
        /** Specify phase for calculations */
        specify_phase(phase: Phases): void;
        /** Remove phase specification */
        unspecify_phase(): void;

        // Basic state properties
        /** Temperature [K] */
        T(): number;
        /** Pressure [Pa] */
        p(): number;
        /** Quality (vapor fraction) [-] */
        Q(): number;
        /** Molar density [mol/m³] */
        rhomolar(): number;
        /** Mass density [kg/m³] */
        rhomass(): number;
        /** Reciprocal reduced temperature (Tc/T) [-] */
        tau(): number;
        /** Reduced density (rho/rhoc) [-] */
        delta(): number;

        // Molecular properties
        /** Molar mass [kg/mol] */
        molar_mass(): number;
        /** Acentric factor [-] */
        acentric_factor(): number;
        /** Gas constant [J/mol/K] */
        gas_constant(): number;
        /** Dipole moment [C⋅m] */
        dipole_moment(): number;

        // Virial coefficients
        /** Second virial coefficient [m³/mol] */
        Bvirial(): number;
        /** Third virial coefficient [m⁶/mol²] */
        Cvirial(): number;
        /** Temperature derivative of second virial coefficient [m³/mol/K] */
        dBvirial_dT(): number;
        /** Temperature derivative of third virial coefficient [m⁶/mol²/K] */
        dCvirial_dT(): number;
        /** Compressibility factor [-] */
        compressibility_factor(): number;

        // Thermodynamic properties
        /** Molar enthalpy [J/mol] */
        hmolar(): number;
        /** Mass enthalpy [J/kg] */
        hmass(): number;
        /** Molar entropy [J/mol/K] */
        smolar(): number;
        /** Mass entropy [J/kg/K] */
        smass(): number;
        /** Molar internal energy [J/mol] */
        umolar(): number;
        /** Mass internal energy [J/kg] */
        umass(): number;
        /** Molar heat capacity at constant pressure [J/mol/K] */
        cpmolar(): number;
        /** Mass heat capacity at constant pressure [J/kg/K] */
        cpmass(): number;
        /** Molar heat capacity at constant volume [J/mol/K] */
        cvmolar(): number;
        /** Mass heat capacity at constant volume [J/kg/K] */
        cvmass(): number;
        /** Molar Gibbs energy [J/mol] */
        gibbsmolar(): number;
        /** Mass Gibbs energy [J/kg] */
        gibbsmass(): number;
        /** Molar Helmholtz energy [J/mol] */
        helmholtzmolar(): number;
        /** Mass Helmholtz energy [J/kg] */
        helmholtzmass(): number;

        // Transport properties
        /** Speed of sound [m/s] */
        speed_sound(): number;
        /** Isothermal compressibility [1/Pa] */
        isothermal_compressibility(): number;
        /** Isobaric expansion coefficient [1/K] */
        isobaric_expansion_coefficient(): number;
        /** Isentropic expansion coefficient [1/K] */
        isentropic_expansion_coefficient(): number;
        /** Viscosity [Pa⋅s] */
        viscosity(): number;
        /** Thermal conductivity [W/m/K] */
        conductivity(): number;
        /** Surface tension [N/m] */
        surface_tension(): number;
        /** Prandtl number [-] */
        Prandtl(): number;

        // Advanced property access
        /** Fugacity coefficient for component i [-] */
        fugacity_coefficient(i: number): number;
        /** Fugacity coefficients for all components [-] */
        fugacity_coefficients(): number[];
        /** Fugacity for component i [Pa] */
        fugacity(i: number): number;
        /** Chemical potential for component i [J/mol] */
        chemical_potential(i: number): number;
        /** Phase identification parameter [-] */
        PIP(): number;

        // Keyed output methods
        /** Get property by parameter key */
        keyed_output(key: Parameters): number;
        /** Get trivial property by parameter key */
        trivial_keyed_output(key: Parameters): number;
        /** Get saturated liquid property by parameter key */
        saturated_liquid_keyed_output(key: Parameters): number;
        /** Get saturated vapor property by parameter key */
        saturated_vapor_keyed_output(key: Parameters): number;

        // Partial derivatives
        /** First partial derivative */
        first_partial_deriv(of: Parameters, wrt: Parameters, constant: Parameters): number;
        /** Second partial derivative */
        second_partial_deriv(of: Parameters, wrt1: Parameters, constant1: Parameters, 
                           wrt2: Parameters, constant2: Parameters): number;
        /** First saturation derivative */
        first_saturation_deriv(of: Parameters, wrt: Parameters): number;
        /** Second saturation derivative */
        second_saturation_deriv(of: Parameters, wrt1: Parameters, wrt2: Parameters): number;
        /** First two-phase derivative */
        first_two_phase_deriv(of: Parameters, wrt: Parameters, constant: Parameters): number;
        /** Second two-phase derivative */
        second_two_phase_deriv(of: Parameters, wrt1: Parameters, constant1: Parameters,
                             wrt2: Parameters, constant2: Parameters): number;

        // Helmholtz energy derivatives (ideal gas part)
        /** Ideal gas Helmholtz energy [-] */
        alpha0(): number;
        /** First tau derivative of ideal gas Helmholtz energy [-] */
        dalpha0_dTau(): number;
        /** First delta derivative of ideal gas Helmholtz energy [-] */
        dalpha0_dDelta(): number;
        /** Second tau derivative of ideal gas Helmholtz energy [-] */
        d2alpha0_dTau2(): number;
        /** Mixed second derivative of ideal gas Helmholtz energy [-] */
        d2alpha0_dDelta_dTau(): number;
        /** Second delta derivative of ideal gas Helmholtz energy [-] */
        d2alpha0_dDelta2(): number;
        /** Third tau derivative of ideal gas Helmholtz energy [-] */
        d3alpha0_dTau3(): number;
        /** Mixed third derivative of ideal gas Helmholtz energy [-] */
        d3alpha0_dDelta_dTau2(): number;
        /** Mixed third derivative of ideal gas Helmholtz energy [-] */
        d3alpha0_dDelta2_dTau(): number;
        /** Third delta derivative of ideal gas Helmholtz energy [-] */
        d3alpha0_dDelta3(): number;

        // Helmholtz energy derivatives (residual part)
        /** Residual Helmholtz energy [-] */
        alphar(): number;
        /** First tau derivative of residual Helmholtz energy [-] */
        dalphar_dTau(): number;
        /** First delta derivative of residual Helmholtz energy [-] */
        dalphar_dDelta(): number;
        /** Second tau derivative of residual Helmholtz energy [-] */
        d2alphar_dTau2(): number;
        /** Mixed second derivative of residual Helmholtz energy [-] */
        d2alphar_dDelta_dTau(): number;
        /** Second delta derivative of residual Helmholtz energy [-] */
        d2alphar_dDelta2(): number;
        /** Third tau derivative of residual Helmholtz energy [-] */
        d3alphar_dTau3(): number;
        /** Mixed third derivative of residual Helmholtz energy [-] */
        d3alphar_dDelta_dTau2(): number;
        /** Mixed third derivative of residual Helmholtz energy [-] */
        d3alphar_dDelta2_dTau(): number;
        /** Third delta derivative of residual Helmholtz energy [-] */
        d3alphar_dDelta3(): number;
        /** Fourth tau derivative of residual Helmholtz energy [-] */
        d4alphar_dTau4(): number;
        /** Mixed fourth derivative of residual Helmholtz energy [-] */
        d4alphar_dDelta_dTau3(): number;
        /** Mixed fourth derivative of residual Helmholtz energy [-] */
        d4alphar_dDelta2_dTau2(): number;
        /** Mixed fourth derivative of residual Helmholtz energy [-] */
        d4alphar_dDelta3_dTau(): number;
        /** Fourth delta derivative of residual Helmholtz energy [-] */
        d4alphar_dDelta4(): number;

        // Phase envelope and saturation calculations
        /** Build phase envelope */
        build_phase_envelope(type?: string): void;
        /** Get phase envelope data */
        get_phase_envelope_data(): PhaseEnvelopeData;
        /** Safely build phase envelope with validation */
        safe_build_phase_envelope(type: string): boolean;
        /** Safely get phase envelope data with validation */
        safe_get_phase_envelope_data(): PhaseEnvelopeData;

        // Ancillary equations and melting line
        /** Calculate melting line property */
        melting_line(param: Parameters, given: Parameters, value: number): number;
        /** Calculate saturation property using ancillary equations */
        saturation_ancillary(param: Parameters, Q: number, given: Parameters, value: number): number;
        /** Safely calculate saturation ancillary with validation */
        safe_saturation_ancillary(param: Parameters, Q: number, given: Parameters, value: number): number;
        /** Safely calculate melting line with validation */
        safe_melting_line(param: Parameters, given: Parameters, value: number): number;

        // Saturation state validation
        /** Validate saturation state consistency */
        validate_saturation_state(): boolean;
        /** Compare ancillary vs full EOS accuracy */
        compare_ancillary_accuracy(param: Parameters, Q: number, given: Parameters, value: number): string;

        // Critical and reducing properties
        /** Critical temperature [K] */
        T_critical(): number;
        /** Critical pressure [Pa] */
        p_critical(): number;
        /** Critical molar density [mol/m³] */
        rhomolar_critical(): number;
        /** Critical mass density [kg/m³] */
        rhomass_critical(): number;
        /** Reducing temperature [K] */
        T_reducing(): number;
        /** Reducing molar density [mol/m³] */
        rhomolar_reducing(): number;
        /** Reducing mass density [kg/m³] */
        rhomass_reducing(): number;

        // Limiting properties
        /** Triple point pressure [Pa] */
        p_triple(): number;
        /** Triple point temperature [K] */
        Ttriple(): number;
        /** Minimum temperature [K] */
        Tmin(): number;
        /** Maximum temperature [K] */
        Tmax(): number;
        /** Maximum pressure [Pa] */
        pmax(): number;

        // Enhanced critical and limiting property methods with validation
        /** Safely get critical temperature with validation */
        safe_T_critical(): number;
        /** Safely get critical pressure with validation */
        safe_p_critical(): number;
        /** Safely get critical molar density with validation */
        safe_rhomolar_critical(): number;
        /** Safely get triple point temperature with validation */
        safe_Ttriple(): number;
        /** Safely get triple point pressure with validation */
        safe_p_triple(): number;
        /** Validate all critical properties */
        validate_critical_properties(): boolean;
        /** Validate property limits */
        validate_property_limits(): boolean;
        /** Get summary of critical properties as JSON string */
        get_critical_properties_summary(): string;

        // Memory management
        /** Clear cached data */
        clear(): void;
    }

    /**
     * Calculation result for complex operations
     */
    export interface CalculationResult {
        /** Whether the calculation succeeded */
        success: boolean;
        /** Calculated value */
        value: number;
        /** Error message if failed */
        error_message: string;
        /** Warning message if applicable */
        warning_message: string;
    }

    /**
     * Type-safe wrapper functions for common operations
     */
    export namespace TypeSafeWrappers {
        /**
         * Create AbstractState with type checking
         * @param backend Backend name (e.g., "HEOS", "REFPROP")
         * @param fluids Fluid name(s), separated by '&' for mixtures
         * @returns AbstractState instance
         */
        export function createState(backend: string, fluids: string): AbstractState;

        /**
         * Update state with type-safe input validation
         * @param state AbstractState instance
         * @param inputPair Input pair specification
         * @param value1 First input value
         * @param value2 Second input value
         */
        export function updateState(
            state: AbstractState, 
            inputPair: InputPairs, 
            value1: number, 
            value2: number
        ): void;

        /**
         * Get property with type checking
         * @param state AbstractState instance
         * @param parameter Parameter to retrieve
         * @returns Property value
         */
        export function getProperty(state: AbstractState, parameter: Parameters): number;

        /**
         * Calculate derivative with type checking
         * @param state AbstractState instance
         * @param of Parameter to differentiate
         * @param wrt Parameter to differentiate with respect to
         * @param constant Parameter held constant
         * @returns Derivative value
         */
        export function getDerivative(
            state: AbstractState,
            of: Parameters,
            wrt: Parameters,
            constant: Parameters
        ): number;

        /**
         * Set mixture composition with validation
         * @param state AbstractState instance
         * @param fractions Mole fractions array
         * @param normalize Whether to normalize fractions to sum to 1
         */
        export function setMixture(
            state: AbstractState,
            fractions: number[],
            normalize?: boolean
        ): void;

        /**
         * Build phase envelope with error handling
         * @param state AbstractState instance
         * @param type Phase envelope type (optional)
         * @returns Phase envelope data
         */
        export function buildPhaseEnvelope(
            state: AbstractState,
            type?: string
        ): PhaseEnvelopeData;

        /**
         * Get critical properties with validation
         * @param state AbstractState instance
         * @returns Critical properties object
         */
        export function getCriticalProperties(state: AbstractState): {
            temperature: number;
            pressure: number;
            density: number;
        };

        /**
         * Validate thermodynamic state
         * @param state AbstractState instance
         * @returns Validation result
         */
        export function validateState(state: AbstractState): {
            valid: boolean;
            phase: Phases;
            warnings: string[];
        };
    }

    /**
     * Generic type support for mixture calculations
     */
    export namespace MixtureTypes {
        /**
         * Mixture component specification
         */
        export interface Component {
            /** Component name */
            name: string;
            /** Mole fraction */
            mole_fraction: number;
            /** Mass fraction (optional, calculated if not provided) */
            mass_fraction?: number;
        }

        /**
         * Mixture specification
         */
        export interface MixtureSpec {
            /** Array of components */
            components: Component[];
            /** Backend to use */
            backend?: string;
        }

        /**
         * Create mixture state from specification
         * @param spec Mixture specification
         * @returns AbstractState for the mixture
         */
        export function createMixture(spec: MixtureSpec): AbstractState;

        /**
         * Validate mixture specification
         * @param spec Mixture specification
         * @returns Validation result
         */
        export function validateMixture(spec: MixtureSpec): {
            valid: boolean;
            errors: string[];
            normalized_fractions: number[];
        };

        /**
         * Convert between mass and mole fractions
         * @param fractions Input fractions
         * @param molar_masses Molar masses of components
         * @param from_mass Whether input is mass fractions (true) or mole fractions (false)
         * @returns Converted fractions
         */
        export function convertFractions(
            fractions: number[],
            molar_masses: number[],
            from_mass: boolean
        ): number[];
    }

    /**
     * Utility functions for common calculations
     */
    export namespace Utils {
        /**
         * Convert temperature units
         */
        export function fahrenheitToKelvin(temp_F: number): number;
        export function celsiusToKelvin(temp_C: number): number;
        export function kelvinToCelsius(temp_K: number): number;
        export function kelvinToFahrenheit(temp_K: number): number;

        /**
         * Convert pressure units
         */
        export function barToPascal(pressure_bar: number): number;
        export function pascalToBar(pressure_Pa: number): number;
        export function psiToPascal(pressure_psi: number): number;
        export function pascalToPsi(pressure_Pa: number): number;

        /**
         * Validate input ranges
         */
        export function isValidTemperature(T: number, fluid?: string): boolean;
        export function isValidPressure(P: number, fluid?: string): boolean;
        export function isValidDensity(rho: number): boolean;

        /**
         * Get fluid information
         */
        export function getFluidInfo(fluid: string): {
            name: string;
            formula: string;
            molar_mass: number;
            critical_temperature: number;
            critical_pressure: number;
        };

        /**
         * List available fluids for backend
         */
        export function listFluids(backend?: string): string[];

        /**
         * Check if backend supports fluid
         */
        export function supportsFluid(backend: string, fluid: string): boolean;
    }

    // Main module export
    const CoolProp: CoolPropModule;
    export default CoolProp;
}

/**
 * Module loader function type
 */
declare function Module(): Promise<CoolPropModule>;
export = Module;