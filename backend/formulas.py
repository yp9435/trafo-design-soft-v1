import math


class Formulas:
    """
    Collection of basic electrical and design formulas for transformer design. 
    Only contains reusable formula functions called by other modules.
    """

    def __init__(self):
        # Set design constants
        pass
    
    # Basic Electrical Formulas

    def initial_volts_per_turn(self, design_constant_k: float, kva_rating: float) -> float:
        """
        Calculate initial volts per turn using empirical formula.

        @param design_constant_k: Design constant (depends on transformer type)
        @param kva_rating: Transformer rating in kVA
        @return: Initial volts per turn
        """
        return design_constant_k * math.sqrt(kva_rating)

    def volts_per_turn(self, phase_voltage: float, turns_per_phase: float) -> float:
        """
        Calculate actual volts per turn.

        @param phase_voltage: Voltage per phase (V)
        @param turns_per_phase: Number of turns per phase
        @return: Volts per turn
        """
        return phase_voltage / turns_per_phase

    # Voltage & Current (Star / Delta)

    def phase_voltage(self, line_voltage: float, connection_type: str) -> float:
        """
        Convert line voltage to phase voltage.

        @param line_voltage: Line voltage (V)
        @param connection_type: 'Y' for Star, 'D' for Delta
        @return: Phase voltage
        """
        if connection_type.upper() == 'Y':
            return line_voltage / math.sqrt(3)
        elif connection_type.upper() == 'D':
            return line_voltage
        else:
            raise ValueError("Connection type must be 'Y' or 'D'")

    def phase_current(self, kva_rating: float, line_voltage: float, connection_type: str) -> float:
        """
        Calculate current per phase.

        @param kva_rating: Transformer rating in kVA
        @param line_voltage: Line voltage (V)
        @param connection_type: 'Y' for Star, 'D' for Delta
        @return: Phase current (A)
        """
        line_current = (kva_rating * 1000) / (math.sqrt(3) * line_voltage)

        if connection_type.upper() == 'Y':
            return line_current
        elif connection_type.upper() == 'D':
            return line_current / math.sqrt(3)
        else:
            raise ValueError("Connection type must be 'Y' or 'D'")

    # Core Area Calculations

    def net_core_area(self, volts_per_turn: float, frequency: float, max_flux_density: float) -> float:
        """
        Calculate net core area.

        Formula: A_net = E / (4.44 * f * B)

        @param volts_per_turn: Volts per turn
        @param frequency: Supply frequency (Hz)
        @param max_flux_density: Maximum flux density (Tesla)
        @return: Net core area (mm^2)
        """
        area_m2 = volts_per_turn / (4.44 * frequency * max_flux_density)
        return area_m2 * 1e6  # convert m^2 to mm^2

    def gross_core_area(self, net_core_area: float) -> float:
        """
        Calculate gross core area including stacking factor.
        Result is rounded to nearest 1000 mm^2.

        @param net_core_area: Net core area (mm^2)
        @return: Gross core area (mm^2)
        """
        stacking_factor = 0.96
        gross_area = net_core_area / stacking_factor
        return math.ceil(gross_area / 1000) * 1000

    # Core Dimensions

    def core_dimensions(self, gross_core_area: float) -> tuple:
        """
        Calculate core cross-section dimensions.

        Assumption: Rectangular stepped core
        b = sqrt(A/2)
        l = A / b

        @param gross_core_area: Gross core area (mm^2)
        @return: (tongue, stack) in mm -> (breadth, length) of core cross-section
        """
        tongue = math.sqrt(gross_core_area / 2)
        stack = gross_core_area / tongue
        return tongue, stack
    
    # Turns Calculation

    def turns_per_phase(self, phase_voltage: float, volts_per_turn: float) -> int:
        """
        Calculate turns per phase.

        @param phase_voltage: Voltage per phase (V)
        @param volts_per_turn: Volts per turn
        @return: Turns per phase (rounded)
        """
        return round(phase_voltage / volts_per_turn)

    def number_of_layers(self, turns_per_phase: int, estimated_turns_per_layer: int = 25) -> int:
        """
        Estimate number of layers.

        Practical method:
        Layers = turns / estimated turns per layer

        @param turns_per_phase: Total turns per phase
        @param estimated_turns_per_layer: Design assumption (default 25)
        @return: Number of layers (minimum 1)
        """
        layers = math.ceil(turns_per_phase / estimated_turns_per_layer)
        return max(layers, 1)

    def turns_per_layer(self, turns_per_phase: int, number_of_layers: int) -> int:
        """
        Calculate turns per layer.

        @param turns_per_phase: Total turns
        @param number_of_layers: Number of layers
        @return: Turns per layer (rounded)
        """
        return math.ceil(turns_per_phase / number_of_layers)

    # Conductor Area

    def conductor_area(self, phase_current: float, current_density: float) -> float:
        """
        Calculate net conductor area.

        @param phase_current: Current per phase (A)
        @param current_density: Current density (A/mm^2)
        @return: Conductor area (mm^2)
        """
        return phase_current / current_density
    
    # Need to check these 2 formulas once.

    def single_conductor_area(self, conductor_diameter: float) -> float:
        """
        Calculate area of a single round conductor.

        @param conductor_diameter: Diameter of conductor (mm)
        @return: Area (mm^2)
        """
        return math.pi * (conductor_diameter ** 2) / 4

    def parallel_conductors(self, required_area: float, single_conductor_area: float) -> int:
        """
        Calculate number of parallel conductors.

        @param required_area: Net conductor area (mm^2)
        @param single_conductor_area: Area of one conductor (mm^2)
        @return: Number of parallel conductors
        """
        return math.ceil(required_area / single_conductor_area)

    # Window & Winding Dimensions

    def window_height(self, tongue_dimension: float, height_factor: float = 2.2) -> float:
        """
        Estimate window height.

        @param tongue_dimension: Core tongue width (mm)
        @param height_factor: Design factor (2 to 2.5)
        @return: Window height (mm)
        """
        return round(tongue_dimension * height_factor)

    def end_clearance(self, window_height: float) -> float:
        """
        Estimate end clearance based on design practice.

        Approx rule: ~9% of window height

        @param window_height: Window height (mm)
        @return: End clearance (mm)
        """
        return round(window_height * 0.09)

    def winding_length(self, window_height: float, end_clearance: float) -> float:
        """
        Calculate available winding length.

        @param window_height: Window height (mm)
        @param end_clearance: End clearance (mm)
        @return: Winding length (mm)
        """
        return window_height - (2 * end_clearance)

    # Conductor Dimensions

    def conductor_breadth(self, winding_length: float, turns_per_layer: int, axial_parallel: int = 1) -> float:
        """
        Calculate conductor breadth (B).

        @param winding_length: Available winding length (mm)
        @param turns_per_layer: Turns per layer
        @param axial_parallel: Parallel conductors in axial direction
        @return: Breadth (mm)
        """
        return (winding_length / (turns_per_layer + 1)) * axial_parallel

    def insulated_conductor_breadth(self, breadth: float, insulation_thickness: float = 0.1) -> float:
        """
        Add insulation to conductor breadth.

        @param breadth: Bare breadth (mm)
        @param insulation_thickness: Insulation thickness (mm)
        @return: Insulated breadth (mm)
        """
        return breadth + insulation_thickness

    def estimated_conductor_height(self, net_conductor_area: float, breadth: float) -> float:
        """
        Estimate conductor height.

        @param net_conductor_area: Net conductor area (mm^2)
        @param breadth: Breadth (mm)
        @return: Height (mm)
        """
        return net_conductor_area / breadth

    # Corner Radius Reduction (From Table)

    def corner_radius_reduction(self, breadth: float, height: float) -> float:
        """
        Get reduction in area due to corner radius.
        Based on given design table.

        @param breadth: Conductor breadth B (mm)
        @param height: Conductor height h (mm)
        @return: Reduction area (mm^2)
        """

        if 5.0 <= breadth <= 12.5 and height <= 1.70:
            return 0.215
        elif 5.0 <= breadth <= 16.0 and 1.70 < height <= 2.24:
            return 0.363
        elif 5.0 <= breadth <= 16.0 and 2.36 <= height <= 3.55:
            return 0.550
        elif 5.0 <= breadth <= 16.0 and 3.75 <= height <= 5.60:
            return 0.860
        elif 6.3 <= breadth <= 16.0 and 6.30 <= height <= 10.0:
            return 1.340
        else:
            return 0.0  # No reduction if outside table range

    def gross_conductor_area(self, net_area: float, reduction: float) -> float:
        """
        Calculate gross conductor area.

        @param net_area: Net conductor area (mm^2)
        @param reduction: Reduction due to corner radius (mm^2)
        @return: Gross conductor area (mm^2)
        """
        return net_area + reduction

    # Conductor Height (Final)

    def conductor_height(self, gross_area: float, breadth: float) -> float:
        """
        Calculate conductor height and round to nearest 0.1 mm.

        @param gross_area: Gross conductor area (mm^2)
        @param breadth: Conductor breadth (mm)
        @return: Rounded conductor height (mm)
        """
        height = gross_area / breadth
        return round(height, 1)

    def insulated_conductor_height(self, height: float, insulation_thickness: float = 0.1) -> float:
        """
        Add insulation to conductor height.

        @param height: Bare height (mm)
        @param insulation_thickness: Insulation thickness (mm)
        @return: Insulated height (mm)
        """
        return height + insulation_thickness

    def total_cross_section_area(self, breadth: float, height: float) -> float:
        """
        Calculate actual conductor cross-sectional area.

        @param breadth: Conductor breadth (mm)
        @param height: Conductor height (mm)
        @return: Total area (mm^2)
        """
        return breadth * height

    def current_density_verification(self, phase_current: float, total_area: float) -> float:
        """
        Verify actual current density.

        @param phase_current: Current per phase (A)
        @param total_area: Actual conductor area (mm^2)
        @return: Current density (A/mm^2)
        """
        return phase_current / total_area

    # Inter Layer Insulation

    def interlayer_insulation(self,volts_per_turn: float,turns_per_layer: int,conductor_insulation: float = 0.1) -> float:
        """
        Calculate interlayer insulation thickness.

        Formula:
        ((Vpt * 2 * 2 * Turns_per_layer) / 8000) - conductor insulation

        If result is negative -> return 0 (not required).

        @param volts_per_turn: Volts per turn
        @param turns_per_layer: Turns per layer
        @param conductor_insulation: Conductor insulation thickness (mm)
        @return: Interlayer insulation (mm)
        """
        insulation = ((volts_per_turn * 4 * turns_per_layer) / 8000) - conductor_insulation
        return max(insulation, 0)

    # Radial Thickness

    def radial_thickness(self,insulated_height: float,radial_parallel: int,number_of_layers: int,interlayer_insulation: float) -> float:
        """
        Calculate radial build of winding.
        Result rounded to nearest whole mm (design tolerance).

        @param insulated_height: Insulated conductor height (mm)
        @param radial_parallel: Parallel conductors in radial direction
        @param number_of_layers: Number of layers
        @param interlayer_insulation: Interlayer insulation (mm)
        @return: Radial thickness (mm)
        """
        thickness = (insulated_height * radial_parallel * number_of_layers + interlayer_insulation * (number_of_layers - 1))
        return math.ceil(thickness)

    # Winding Dimensions

    def winding_inner_dimensions(self,core_width: float,core_height: float,core_to_lv_clearance: float) -> tuple:
        """
        Calculate inner dimensions of LV winding.

        @param core_width: Core width (mm)
        @param core_height: Core height (mm)
        @param core_to_lv_clearance: Clearance on one side (mm)
        @return: (inner_width, inner_height)
        """
        inner_width = core_width + (2 * core_to_lv_clearance)
        inner_height = core_height + (2 * core_to_lv_clearance)
        return inner_width, inner_height

    def winding_outer_dimensions(self,inner_width: float,inner_height: float,radial_thickness: float) -> tuple:
        """
        Calculate outer dimensions of winding.

        @param inner_width: Inner width (mm)
        @param inner_height: Inner height (mm)
        @param radial_thickness: Radial build (mm)
        @return: (outer_width, outer_height)
        """
        outer_width = inner_width + (2 * radial_thickness)
        outer_height = inner_height + (2 * radial_thickness)
        return outer_width, outer_height

    # Mean Length of Turn (MLT)

    def mean_length_of_turn(self,inner_width: float,inner_height: float,outer_width: float,outer_height: float,radial_thickness: float = 8) -> float:
        """
        Calculate mean length of one turn (meters).

        Formula:
        (sum of inner + outer dimensions - 2*radial_thickness + 2*pi*radial_thickness)

        @return: Mean length per turn (meters)
        """
        length_mm = (
            inner_width + inner_height + outer_width + outer_height
            - (2 * radial_thickness)
            + (2 * math.pi * radial_thickness)
        )
        return length_mm / 1000  # convert to meters

    # Wire Length

    def total_wire_length(
        self,
        mean_turn_length: float,
        turns_per_phase: int,
        parallel_conductors: int,
        number_of_phases: int = 3,
        tolerance_factor: float = 1.01
    ) -> float:
        """
        Calculate total wire length.
        Rounded to nearest 100 meters.

        @return: Total wire length (meters)
        """
        length = (
            mean_turn_length
            * turns_per_phase
            * parallel_conductors
            * number_of_phases
            * tolerance_factor
        )
        return math.ceil(length / 100) * 100

    # Resistance Calculation

    def resistance_per_phase_75C(
        self,
        resistivity_75: float,
        mean_turn_length: float,
        turns_per_phase: int,
        total_area: float
    ) -> float:
        """
        Calculate resistance per phase at 75°C.

        @param resistivity_75: Resistivity at 75°C (Ohm·mm^2/m)
        @param mean_turn_length: Length per turn (m)
        @param turns_per_phase: Turns per phase
        @param total_area: Conductor area (mm^2)
        @return: Resistance at 75°C (Ohm)
        """
        total_length = mean_turn_length * turns_per_phase
        return (resistivity_75 * total_length) / total_area

    def resistance_at_temperature(
        self,
        resistance_75: float,
        absolute_temp_constant: float,
        room_temperature: float
    ) -> float:
        """
        Convert resistance from 75°C to room temperature.

        Formula:
        R = R75 * (K + T_room) / (K + 75)

        @param resistance_75: Resistance at 75°C
        @param absolute_temp_constant: 234.5 (Cu) or 228 (Al)
        @param room_temperature: Room temp (°C)
        @return: Resistance at room temperature
        """
        return resistance_75 * ((absolute_temp_constant + room_temperature) / (absolute_temp_constant + 75))

    # Material Properties

    def get_conductor_density(self, material: str) -> float:
        """
        Get conductor density (g/cm^3).

        @param material: 'Cu' or 'Al'
        @return: Density
        """
        material = material.lower()
        if material == "cu":
            return 8.9
        elif material == "al":
            return 2.7
        else:
            raise ValueError("Material must be 'Cu' or 'Al'")

    # Weight Calculations

    def bare_weight(
        self,
        mean_turn_length: float,
        turns_per_phase: int,
        conductor_area: float,
        number_of_phases: int,
        density_g_per_cm3: float
    ) -> float:
        """
        Calculate bare conductor weight.

        Formula:
        LMT × turns × area × phases × density × 10^-3

        @return: Bare weight (kg)
        """
        return (
            mean_turn_length
            * turns_per_phase
            * conductor_area
            * number_of_phases
            * density_g_per_cm3
            * 1e-3
        )

    def insulated_weight(
        self,
        bare_weight: float,
        breadth: float,
        height: float,
        insulated_breadth: float,
        insulated_height: float,
        insulation_density: float,
        conductor_density: float
    ) -> float:
        """
        Calculate insulated weight.

        @return: Insulated weight (kg)
        """
        bare_area = breadth * height
        insulated_area = insulated_breadth * insulated_height

        factor = (((insulated_area - bare_area) / bare_area) * (insulation_density / conductor_density)) + 1

        return bare_weight * factor

    def procurement_weight(self, insulated_weight: float, tolerance: float = 0.05) -> float:
        """
        Add procurement tolerance.

        @param insulated_weight: Insulated weight (kg)
        @param tolerance: Percentage (default 5%)
        @return: Procurement weight (kg)
        """
        return insulated_weight * (1 + tolerance)

    # Stray Loss Factor 

    def get_stray_loss_factor(self, material: str, conductor_shape: str) -> float:
        """
        Get stray loss factor based on material and conductor type.

        @param material: 'Cu' or 'Al'
        @param conductor_shape: 'strip' or 'round'
        @return: Stray loss factor
        """
        material = material.lower()
        conductor_shape = conductor_shape.lower()

        table = {
            ("cu", "strip"): 0.9622,
            ("cu", "round"): 0.80,
            ("al", "strip"): 0.76,
            ("al", "round"): 0.63
        }

        key = (material, conductor_shape)
        if key not in table:
            raise ValueError("Invalid material or conductor shape")

        return table[key]

    # Stray Loss Calculation - Need to check this formula once

    def stray_loss_percentage(
        self,
        breadth: float,
        insulated_breadth: float,
        height: float,
        turns_per_layer: int,
        parallel_conductors: int,
        radial_parallel: int,
        number_of_layers: int,
        stray_loss_factor: float
    ) -> float:
        """
        Calculate stray loss percentage.

        @return: Stray loss (%)
        """

        ratio_term = math.sqrt(
            (breadth * turns_per_layer * parallel_conductors) /
            ((insulated_breadth * turns_per_layer * parallel_conductors) - 0.1)
        )

        height_term = (height / 10) ** 4

        radial_term = ((radial_parallel * number_of_layers) - 0.2) / 9

        stray_loss = ratio_term * stray_loss_factor * height_term * radial_term * 100

        return stray_loss

    # Load Loss

    def get_load_loss_factor(self, material: str) -> float:
        """
        Get Load loss factor at 75°C.

        @param material: 'Cu' or 'Al'
        @return: Factor
        """
        material = material.lower()
        if material == "cu":
            return 2.4
        elif material == "al":
            return 12.79
        else:
            raise ValueError("Material must be 'Cu' or 'Al'")

    def load_loss(
        self,
        bare_weight: float,
        current_density: float,
        load_loss_factor: float,
        stray_loss_percentage: float
    ) -> float:
        """
        Calculate load loss.

        stray_loss_percentage should be given in %.

        @return: Load loss (W)
        """
        stray_multiplier = 1 + (stray_loss_percentage / 100)

        return (
            load_loss_factor
            * bare_weight
            * (current_density ** 2)
            * stray_multiplier
        )

    # Heat Dissipation Factor 

    def get_heat_dissipation_factor(self, cooling_type: str) -> float:
        """
        Get heat dissipation factor.

        @param cooling_type:
            'oil_duct'
            'oil_no_duct'
            'dry_outer'
            'dry_inner'
        @return: Factor
        """
        table = {
            "oil_duct": 60,
            "oil_no_duct": 55,
            "dry_outer": 8,
            "dry_inner": 6
        }

        if cooling_type not in table:
            raise ValueError("Invalid cooling type")

        return table[cooling_type]

    # Winding Temperature Gradient

    def winding_temperature_gradient(
        self,
        load_loss: float,
        number_of_phases: int,
        heat_dissipation_factor: float,
        winding_length_m: float,
        mean_turn_length_m: float,
        surface_effectiveness: float = 0.75,
        number_of_surfaces: int = 2
    ) -> float:
        """
        Calculate winding temperature gradient.

        @return: Temperature rise (°C approx)
        """

        cooling_area = (
            number_of_phases
            * surface_effectiveness
            * number_of_surfaces
            * heat_dissipation_factor
            * (winding_length_m * mean_turn_length_m)
        )

        return load_loss / cooling_area
