from input_model import TransformerDesignInput
from modules.core_design import CoreDesign
from modules.winding_design import WindingDesign
from modules.final_core_design import FinalCoreDesign
from modules.rating_plate import RatingPlateGenerator
from modules.bom import BOMGenerator

inputs = TransformerDesignInput(
    transformer_kva=60,
    frequency=50,
    flux_density=1.4,
    k_value=0.62,
    lv1={
        "voltage": 190,
        "kva_rating": 5,
        "conductor_current_density": 1.45,
        "conductor_material": "CU",
        "connection_type": "Y",
        "axial_parallel": 1,    
        "radial_parallel": 1 
    },
    lv2={
        "voltage": 415,
        "kva_rating": 55,
        "conductor_current_density": 1.45,
        "conductor_material": "CU",
        "connection_type": "Y",
        "axial_parallel": 1,    
        "radial_parallel": 5 
    },
    hv={
        "voltage": 750,
        "kva_rating": 60,
        "conductor_current_density": 1.4,
        "conductor_material": "CU",
        "connection_type": "Y",
        "axial_parallel": 1,    
        "radial_parallel": 1 
    },
    core_material={
        "material": "CRGO",
        "grade": "M4",
    }
)


core = CoreDesign(inputs)
core_results = core.design()


print("\n--- Core Design Output ---")
for key, value in core_results.items():
    print(f"{key}: {value}")
    

# LV1  – sits directly on the core, small clearance
lv1_design = WindingDesign(
    winding_inputs=inputs.lv1,
    core_results=core_results,
    clearance_to_core=5          # mm, tight to core for low-voltage winding
)
lv1_results = lv1_design.design()

print("\n--- LV1 Design Output ---")
for key, value in lv1_results.items():
    print(f"{key}: {value}")

# LV2  – sits outside LV1, needs gap + LV1 radial thickness
lv2_clearance = lv1_results["radial_thickness"] + 10   # LV1 build + inter-winding gap
lv2_design = WindingDesign(
    winding_inputs=inputs.lv2,
    core_results=core_results,
    clearance_to_core=lv2_clearance
)
lv2_results = lv2_design.design()

print("\n--- LV2 Design Output ---")
for key, value in lv2_results.items():
    print(f"{key}: {value}")

# HV  – outermost, sits outside LV2
hv_clearance = lv2_clearance + lv2_results["radial_thickness"] + 15
hv_design = WindingDesign(
    winding_inputs=inputs.hv,
    core_results=core_results,
    clearance_to_core=hv_clearance
)
hv_results = hv_design.design()

print("\n--- HV Design Output ---")
for key, value in hv_results.items():
    print(f"{key}: {value}")

final_core = FinalCoreDesign(
    core_results  = core_results,
    core_inputs   = inputs,
    lv1_results   = lv1_results,
    lv2_results   = lv2_results,
    hv_results    = hv_results
)
final_core_results = final_core.design()

print("\n--- Final Core Design Output ---")
for key, value in final_core_results.items():
    print(f"{key}: {value}")
    
# Step 6: BOM Details

bom_generator = BOMGenerator(
    design_results=final_core_results,
)
bom_results = bom_generator.generate()
print("\n--- BOM Output ---")
for key, value in bom_results.items():
    print(f"{key}: {value}")

# Step 7: Rating Plate Details
Rating_Plate_details = RatingPlateGenerator(
    design_data   = inputs,
)
Rating_Plate_results = Rating_Plate_details.generate()
print("\n--- Rating Plate Output ---")
for key, value in Rating_Plate_results.items():
    print(f"{key}: {value}")
