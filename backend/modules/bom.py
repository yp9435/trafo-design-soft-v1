# modules/bom.py 
"""
Bill of Materials generator for dry transformers.

Market prices (INR/kg) sourced Feb 2026:
  - Copper (CU):   ₹1,184  (MCX/BankBazaar, Feb 2026)
  - Aluminium (AL): ₹309   (MCX/BankBazaar, Feb 2026)
  - CRGO M4:        ₹100   (IndiaMART supplier listings, Feb 2026)
  - CRGO M3:        ₹110   (M3 ~10% premium over M4, industry standard)
  - CRGO 23ZDMH:    ₹160   (Hi-B grade premium, industry estimates)
  - CRGO generic:   ₹95    (baseline fallback)
  - AMORPHOUS:      ₹350   (approx 3.5× CRGO; supplier/market estimates)
"""

# Market price table  - need to update periodically with fresh quotes

conductor_prices = {
    # code: (price_per_kg, source)
    "CU": (1184.0, "MCX India Feb-2026"),
    "AL": (309.0,  "MCX India Feb-2026"),
}

core_prices = {
    # grade / material key: (price_per_kg, source)
    "M4":       (100.0, "IndiaMART supplier listings Feb-2026"),
    "M3":       (110.0, "Industry estimate Feb-2026"),
    "23ZDMH":   (160.0, "Hi-B grade estimate Feb-2026"),
    "AMORPHOUS": (350.0, "Supplier/market estimate Feb-2026"),
    "GENERIC":  (95.0,  "Fallback baseline Feb-2026"),
}


# Helpers

def conductor_price(conductor_material_code: str):
    """
    Get conductor market price based on material.

    @param conductor_material_code: 'CU' or 'AL'
    @return: (price_per_kg, price_source)
    """
    material_code_upper = conductor_material_code.upper()

    if material_code_upper not in conductor_prices:
        raise ValueError(
            f"Unknown conductor material '{conductor_material_code}'. "
            f"Supported: {list(conductor_prices)}"
        )

    price_per_kg, price_source = conductor_prices[material_code_upper]
    return price_per_kg, price_source


def core_price(core_material: str, core_grade: str = None):
    """
    Get core material price based on material grade.

    @param core_material: Core material type (CRGO / AMORPHOUS)
    @param core_grade: Steel grade (M4, M3, 23ZDMH)
    @return: (price_per_kg, price_source)
    """
    lookup_key = (core_grade or core_material).upper()

    if lookup_key in core_prices:
        price_per_kg, price_source = core_prices[lookup_key]
    else:
        price_per_kg, price_source = core_prices["GENERIC"]
        lookup_key = "GENERIC"

    return price_per_kg, f"{lookup_key}:{price_source}"


def line_item(weight_kg: float, material_code: str, price_per_kg: float, price_source: str):
    """
    Create a BOM line item.

    @param weight_kg: Material weight in kilograms
    @param material_code: Material description/code
    @param price_per_kg: Unit price (INR/kg)
    @param price_source: Market/source reference
    @return: Dictionary containing BOM line item details
    """
    return {
        "material":      material_code,
        "weight_kg":     round(weight_kg, 3),
        "price_per_kg":  price_per_kg,
        "price_source":  price_source,
        "cost_inr":      round(weight_kg * price_per_kg, 2),
    }

# BOMGenerator

class BOMGenerator:
    """
    Generate a Bill of Materials from TransformerDesignEngine output.

    Args:
        design_results: dict produced by TransformerDesignEngine
        input_data:     original TransformerDesignInput (Pydantic model or dict)
    """

    def __init__(self, design_results: dict, input_data):
        self.design_results = design_results
        self.input_data = input_data

    def generate(self) -> dict:
        final_core = self.design_results["final_core"]
        lv1_winding = self.design_results["lv1"]
        lv2_winding = self.design_results["lv2"]
        hv_winding = self.design_results["hv"]

        # Material Choices
        def get_winding_conductor_material(
            winding_name,
            conductor_attribute="conductor_material",
            default_material="CU"
        ):
            """
            Fetch conductor material for a given winding from input data.

            @param winding_name: 'lv1', 'lv2', or 'hv'
            @param conductor_attribute: Attribute name to read
            @param default_material: Default material if not found
            @return: Conductor material code
            """
            winding_object = getattr(self.input_data, winding_name, None) or {}

            if hasattr(winding_object, conductor_attribute):
                return getattr(winding_object, conductor_attribute)

            if isinstance(winding_object, dict):
                return winding_object.get(conductor_attribute, default_material)

            return default_material

        lv1_conductor_material = get_winding_conductor_material("lv1")
        lv2_conductor_material = get_winding_conductor_material("lv2")
        hv_conductor_material = get_winding_conductor_material("hv")

        core_material = getattr(
            getattr(self.input_data, "core_material", None),
            "material",
            "CRGO"
        )
        core_grade = getattr(
            getattr(self.input_data, "core_material", None),
            "grade",
            None
        )
        # Prices
        lv1_price_per_kg, lv1_price_source = conductor_price(lv1_conductor_material)
        lv2_price_per_kg, lv2_price_source = conductor_price(lv2_conductor_material)
        hv_price_per_kg, hv_price_source = conductor_price(hv_conductor_material)
        core_price_per_kg, core_price_source = core_price(core_material, core_grade)

        # Line Items
        lv1_line_item = line_item(
            lv1_winding["procurement_weight"],
            lv1_conductor_material,
            lv1_price_per_kg,
            lv1_price_source
        )
        lv2_line_item = line_item(
            lv2_winding["procurement_weight"],
            lv2_conductor_material,
            lv2_price_per_kg,
            lv2_price_source
        )
        hv_line_item = line_item(
            hv_winding["procurement_weight"],
            hv_conductor_material,
            hv_price_per_kg,
            hv_price_source
        )
        core_description = f"CRGO-{core_grade}" if core_grade else core_material
        core_line_item = line_item(
            final_core["core_weight"],
            core_description,
            core_price_per_kg,
            core_price_source
        )

        # Summary
        total_conductor_weight_kg = (lv1_line_item["weight_kg"] + lv2_line_item["weight_kg"] + hv_line_item["weight_kg"])
        total_conductor_cost_inr = (lv1_line_item["cost_inr"] + lv2_line_item["cost_inr"] + hv_line_item["cost_inr"])
        total_cost_inr = total_conductor_cost_inr + core_line_item["cost_inr"]
        active_part_weight = final_core.get("active_part_weight",final_core["core_weight"] + total_conductor_weight_kg)
        enclosure_weight_kg = round(active_part_weight * 0.20, 3)

        return {
            "currency": "INR",
            "windings": {
                "lv1": lv1_line_item,
                "lv2": lv2_line_item,
                "hv":  hv_line_item,
                "total_conductor_kg":   round(total_conductor_weight_kg, 3),
                "total_conductor_cost": round(total_conductor_cost_inr, 2),
            },
            "core":                   core_line_item,
            "insulation_kg":          final_core.get("insulation_weight"),
            "active_part_weight_kg":  round(active_part_weight, 3),
            "enclosure_weight_kg":    enclosure_weight_kg,
            "total_cost_inr":         round(total_cost_inr, 2),
        }