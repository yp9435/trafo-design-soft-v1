import formulas


class FinalCoreDesign:
    """
    Final core calculations: weight, loss, enclosure, and active part weight.

    This class depends on the outputs of CoreDesign and all three WindingDesign
    runs (lv1, lv2, hv), plus transformer-level core material inputs.

    Attributes:
        core_results    : dict output from CoreDesign.design()
        core_inputs     : namespace/object with fields:
                            .material    - 'CRGO' or 'CRNO'
                            .grade       - 'M4', 'M3', or '23ZDMH'
        lv1_results     : dict output from WindingDesign.design() for LV1
        lv2_results     : dict output from WindingDesign.design() for LV2
        hv_results      : dict output from WindingDesign.design() for HV
    """

    def __init__(self, core_results, core_inputs, lv1_results, lv2_results, hv_results):
        self.core_results = core_results
        self.core_inputs  = core_inputs
        self.lv1_results  = lv1_results
        self.lv2_results  = lv2_results
        self.hv_results   = hv_results
        self.f = formulas.Formulas()

    def design(self):
        f  = self.f
        cr = self.core_results
        ci = self.core_inputs

        # Unpack core results                                                  
        core_dimensions = cr["core_dimensions"]   
        net_core_area   = cr["net_core_area"]     
        
        tongue_width     = core_dimensions[0]     
        center_distance  = self.hv_results["winding_outer_dimensions"][1]     # centre-to-centre limb distance (mm)

        window_height = f.window_height(tongue_width)   # mm

        # Core geometry                                                        
        core_length = f.core_length(
            tongue_width,
            window_height,
            center_distance
        )

        # Core material properties                                             
        density = f.core_density(ci.core_material.material)

        build_factor = f.core_build_factor(
            tongue_width,           
        )

        specific_loss = f.specific_core_loss(
            ci.core_material.grade,
            ci.flux_density
        )

        # Core weight and loss                                                 
        core_weight = f.core_weight(
            core_length,
            net_core_area,
            density
        )

        core_loss = f.core_loss(
            core_weight,
            specific_loss,
            build_factor
        )

        # Enclosure (tank) dimensions                                          
        hv_outer_width  = self.hv_results["winding_outer_dimensions"][0]   # mm
        hv_outer_height = self.hv_results["winding_outer_dimensions"][1]   # mm

        tank_length, tank_width, tank_height = f.enclosure_dimensions(
            hv_outer_width,
            hv_outer_height,
            core_length
        )

        # Overall transformer dimensions                                       
        overall_length, overall_width, overall_height = f.overall_transformer_dimensions(
            tank_length,
            tank_width,
            tank_height
        )

        # Active part weight                                                   
        lv1_bare_weight       = self.lv1_results["bare_weight"]
        lv2_bare_weight       = self.lv2_results["bare_weight"]
        hv_bare_weight        = self.hv_results["bare_weight"]

        insulation_weight = (
            (self.lv1_results["insulated_weight"] - self.lv1_results["bare_weight"])
            + (self.lv2_results["insulated_weight"] - self.lv2_results["bare_weight"])
            + (self.hv_results["insulated_weight"]  - self.hv_results["bare_weight"])
        )

        active_part_weight = f.active_part_weight(
            core_weight,
            lv1_bare_weight,
            lv2_bare_weight,
            hv_bare_weight,
            insulation_weight
        )

        # Return all results                                                   
        return {
            "tongue_width":         tongue_width,
            "center_distance":      center_distance,
            "window_height":        window_height,
            "core_length":          core_length,
            "density":              density,
            "build_factor":         build_factor,
            "specific_loss":        specific_loss,
            "core_weight":          core_weight,
            "core_loss":            core_loss,
            "tank_length":          tank_length,
            "tank_width":           tank_width,
            "tank_height":          tank_height,
            "overall_length":       overall_length,
            "overall_width":        overall_width,
            "overall_height":       overall_height,
            "lv1_bare_weight":      lv1_bare_weight,
            "lv2_bare_weight":      lv2_bare_weight,
            "hv_bare_weight":       hv_bare_weight,
            "insulation_weight":    insulation_weight,
            "active_part_weight":   active_part_weight,
        }