import formulas

class WindingDesign:
    """
    Generic winding design class for LV1, LV2, or HV windings.
    
    Attributes:
        winding_inputs : winding-specific input object (lv1, lv2, or hv namespace)
        core_results   : dict output from CoreDesign.design()
        clearance_to_core : radial clearance from core to winding inner surface (mm)
    """

    def __init__(self, winding_inputs, all_inputs, core_results, clearance_to_core):
        self.all_inputs = all_inputs
        self.winding_inputs = winding_inputs
        self.core_results   = core_results
        self.clearance_to_core = clearance_to_core
        self.f = formulas.Formulas()

    def design(self):
        ai = self.all_inputs
        f  = self.f
        wi = self.winding_inputs
        cr = self.core_results

        #  Unpack core results                                                
        core_dimensions  = cr["core_dimensions"]   # (width, height) in mm
        volts_per_turn   = cr["volts_per_turn"]

        #  Phase quantities                                                    
        voltage_per_phase = f.phase_voltage(
            wi.voltage,
            wi.connection_type
        )
        
        turns_per_phase  = f.turns_per_phase(voltage_per_phase, volts_per_turn)

        current_per_phase = f.phase_current(
            wi.kva_rating,
            wi.voltage,
            wi.connection_type
        )

        #  Layer / turn geometry                                               
        # number_of_layers = f.number_of_layers(turns_per_phase)
        number_of_layers = wi.number_of_layers
        number_of_ducts = f.number_of_ducts(number_of_layers)

        turns_per_layer  = f.turns_per_layer(turns_per_phase, number_of_layers)

        #  Window & winding length                                             
        window_height = ai.window_height if ai.window_height is not None else f.window_height(core_dimensions[0])        
        end_clearance   = f.end_clearance_voltage_based(voltage_per_phase)
        winding_length  = f.winding_length(window_height, end_clearance)

        axial_parallel  = wi.axial_parallel   # int, default 1
        radial_parallel = wi.radial_parallel  # int, default 1

        # Total parallel conductors
        total_parallel = axial_parallel * radial_parallel

        conductor_area = f.conductor_area(
            current_per_phase,
            wi.conductor_current_density
        )

        conductor_breadth = f.conductor_breadth(
            winding_length,
            turns_per_layer,
            axial_parallel         
        )

        insulated_conductor_breadth = f.insulated_conductor_breadth(conductor_breadth)

        estimated_conductor_height  = f.estimated_conductor_height(
            conductor_area,
            conductor_breadth
        )

        corner_radius_reduction     = f.corner_radius_reduction(
            conductor_breadth,
            estimated_conductor_height
        )

        gross_conductor_area        = f.gross_conductor_area(
            conductor_area,
            corner_radius_reduction
        )

        conductor_height            = f.conductor_height(
            gross_conductor_area,
            conductor_breadth,
            radial_parallel
        )

        insulated_conductor_height  = f.insulated_conductor_height(conductor_height)

        total_conductor_cross_sectional_area = f.total_cross_section_area(
            conductor_breadth,
            conductor_height
        )

        current_density_final = f.current_density_verification(
            current_per_phase / total_parallel,
            total_conductor_cross_sectional_area
        )

        #  Insulation                                                          
        interlayer_insulation_thickness = f.interlayer_insulation(
            volts_per_turn,
            turns_per_layer
        )

        #  Radial thickness                                                    
        radial_thickness = f.radial_thickness(
            insulated_conductor_height,
            radial_parallel,
            number_of_layers,
            interlayer_insulation_thickness,
            number_of_ducts
        )

        #  Winding dimensions                                                  
        winding_inner_dimensions = f.winding_inner_dimensions(
            core_dimensions[0],
            core_dimensions[1],
            self.clearance_to_core
        )

        winding_outer_dimensions = f.winding_outer_dimensions(
            winding_inner_dimensions[0],
            winding_inner_dimensions[1],
            radial_thickness
        )

        mean_length_of_turn = f.mean_length_of_turn(
            winding_inner_dimensions[0],
            winding_inner_dimensions[1],
            winding_outer_dimensions[0],
            winding_outer_dimensions[1],
            radial_thickness
        )

        #  Wire length, resistance, weight   
                                          
        total_wire_length = f.total_wire_length(
            mean_length_of_turn,
            turns_per_phase,
            parallel_conductors=total_parallel
        )

        resistance_per_phase_75C = f.resistance_per_phase_75C(
            wi.conductor_material,
            mean_length_of_turn,
            turns_per_phase,
            conductor_area          
        )

        resistance_at_room_temperature = f.resistance_at_temperature(
            resistance_per_phase_75C,
            wi.conductor_material,
            room_temperature=35
        )

        conductor_density = f.get_conductor_density(wi.conductor_material)

        bare_weight = f.bare_weight(
            mean_length_of_turn,
            turns_per_phase,
            conductor_area,
            3,                      # 3 phases
            conductor_density
        )

        insulated_weight = f.insulated_weight(
            bare_weight,
            conductor_breadth,
            conductor_height,
            insulated_conductor_breadth,
            insulated_conductor_height,
            conductor_density
        )

        procurement_weight = f.procurement_weight(insulated_weight)

        #  Losses                                                              
        stray_loss_factor = f.get_stray_loss_factor(wi.conductor_material, "strip")

        stray_loss_percentage = f.stray_loss_percentage(
            conductor_breadth,
            insulated_conductor_breadth,
            conductor_height,
            turns_per_layer,
            parallel_conductors=total_parallel,
            radial_parallel=radial_parallel,
            number_of_layers=number_of_layers,
            stray_loss_factor=stray_loss_factor
        )

        load_loss_factor = f.get_load_loss_factor(wi.conductor_material)

        load_loss = f.load_loss(
            bare_weight,
            current_density_final,
            load_loss_factor,
            stray_loss_percentage
        )

        #  Thermal                                                             
        heat_dissipation_factor = f.get_heat_dissipation_factor("dry_inner")

        winding_temperature_gradient = f.winding_temperature_gradient(
            load_loss,
            3,
            heat_dissipation_factor,
            winding_length / 1000,  # convert to m
            mean_length_of_turn
        )

        #  Return all results                                                  
        return {
            "voltage_per_phase":                    voltage_per_phase,
            "current_per_phase":                    current_per_phase,
            "number_of_layers":                     number_of_layers,
            "number_of_ducts":                      number_of_ducts,
            "turns_per_phase":                      turns_per_phase,
            "turns_per_layer":                      turns_per_layer,
            "conductor_area":                       conductor_area,
            "window_height":                        window_height,
            "end_clearance":                        end_clearance,
            "winding_length":                       winding_length,
            "conductor_breadth":                    conductor_breadth,
            "insulated_conductor_breadth":          insulated_conductor_breadth,
            "estimated_conductor_height":           estimated_conductor_height,
            "corner_radius_reduction":              corner_radius_reduction,
            "gross_conductor_area":                 gross_conductor_area,
            "conductor_height":                     conductor_height,
            "insulated_conductor_height":           insulated_conductor_height,
            "total_conductor_cross_sectional_area": total_conductor_cross_sectional_area,
            "current_density_verification":         current_density_final,
            "interlayer_insulation_thickness":      interlayer_insulation_thickness,
            "radial_thickness":                     radial_thickness,
            "winding_inner_dimensions":             winding_inner_dimensions,
            "winding_outer_dimensions":             winding_outer_dimensions,
            "mean_length_of_turn":                  mean_length_of_turn,
            "total_wire_length":                    total_wire_length,
            "resistance_per_phase_75C":             resistance_per_phase_75C,
            "resistance_at_room_temperature":       resistance_at_room_temperature,
            "conductor_density":                    conductor_density,
            "bare_weight":                          bare_weight,
            "insulated_weight":                     insulated_weight,
            "procurement_weight":                   procurement_weight,
            "stray_loss_factor":                    stray_loss_factor,
            "stray_loss_percentage":                stray_loss_percentage,
            "load_loss_factor":                     load_loss_factor,
            "load_loss":                            load_loss,
            "heat_dissipation_factor":              heat_dissipation_factor,
            "winding_temperature_gradient":         winding_temperature_gradient,
        }