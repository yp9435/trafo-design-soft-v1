from modules.core_design import CoreDesign
from modules.winding_design import WindingDesign
from modules.final_core_design import FinalCoreDesign
from modules.bom import BOMGenerator
from modules.rating_plate import RatingPlateGenerator

class TransformerDesignEngine:
    def __init__(self, inputs):
        self.inputs = inputs
        self.results = {}

    def run(self):
        # Step 1: Core
        core = CoreDesign(self.inputs)
        core_results = core.design()
        self.results["core"] = core_results

        # Step 2: LV1
        lv1_design = WindingDesign(
            winding_inputs=self.inputs.lv1,
            core_results=core_results,
            clearance_to_core=5          # mm, tight to core for low-voltage winding
        )
        lv1_results = lv1_design.design()
        self.results["lv1"] = lv1_results


        # Step 3: LV2
        lv2_clearance = lv1_results["radial_thickness"] + 10   # LV1 build + inter-winding gap
        lv2_design = WindingDesign(
            winding_inputs=self.inputs.lv2,
            core_results=core_results,
            clearance_to_core=lv2_clearance
        )
        lv2_results = lv2_design.design()
        self.results["lv2"] = lv2_results
        
        # Step 4: HV
        hv_clearance = lv2_clearance + lv2_results["radial_thickness"] + 15
        hv_design = WindingDesign(
            winding_inputs=self.inputs.hv,
            core_results=core_results,
            clearance_to_core=hv_clearance
        )
        hv_results = hv_design.design()
        self.results["hv"] = hv_results

        # Step 5: Final Core Design
        final_core = FinalCoreDesign(
            core_results  = core_results,
            core_inputs   = self.inputs,
            lv1_results   = lv1_results,
            lv2_results   = lv2_results,
            hv_results    = hv_results
        )
        final_core_results = final_core.design()
        self.results["final_core"] = final_core_results
        
        # Step 6: BOM Details
        self.results["bom"] = BOMGenerator(design_results=self.results, input_data=self.inputs).generate()
        
        """ Step 6: BOM Details
        BOM_details = BOMGenerator(
            design_data   = self.inputs,
            rates = 4.5
        )
        BOM_results = BOM_details.generate()
        self.results["bom_details"] = BOM_results
        
        # Step 7: Rating Plate Details
        Rating_Plate_details = RatingPlateGenerator(
            design_data   = self.inputs,
        )
        Rating_Plate_results = Rating_Plate_details.generate()
        self.results["rating_plate_details"] = Rating_Plate_results"""

        return self.results