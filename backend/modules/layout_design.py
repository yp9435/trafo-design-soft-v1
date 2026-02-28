"""
Layout Design Module for Dry Transformers.

Derives all key dimensional measurements from TransformerDesignEngine output.
Returns measurements organised by view: front, top (enclosure), and side.
"""

# Default clearance

layout_default_clearances = {
    "enclosure_clearance_side": 50,
    "enclosure_clearance_end": 50,
    "base_plate_thickness": 25,
    "core_foot_insulation": 10,
    "octc_to_cover": 100,
    "inter_phase_gap": 9,
    "enclosure_wall": 10,
    "num_phases": 3,
}

# Helper Functions

def get_attribute_value(object_data, *attribute_names, default=None):
    """
    Fetch attribute value from Pydantic model or dictionary.

    Tries attribute names in order.

    @param object_data: Source object or dictionary
    @param attribute_names: Possible attribute keys
    @param default: Default value if not found
    @return: Attribute value or default
    """
    for attribute_name in attribute_names:
        if hasattr(object_data, attribute_name):
            return getattr(object_data, attribute_name)

        if isinstance(object_data, dict) and attribute_name in object_data:
            return object_data[attribute_name]

    return default


def round_dimension(value, decimal_places=1):
    """
    Round layout dimension.

    @param value: Numeric value
    @param decimal_places: Number of decimal places
    @return: Rounded value
    """
    return round(value, decimal_places)


# LayoutDesigner
class LayoutDesigner:
    """
    Compute transformer layout dimensions from design results.

    @param design_results: Dictionary from TransformerDesignEngine
    @param clearances: Optional dictionary to override default clearances
    """

    def __init__(self, design_results: dict, clearances: dict = None):
        self.design_results = design_results
        self.clearance_config = {**layout_default_clearances, **(clearances or {})}

    def generate(self) -> dict:
        """
        Generate complete layout views.

        @return: Dictionary containing front, side and top views
        """
        front_view_data = self.generate_front_view()
        side_view_data = self.generate_side_view()
        top_view_data = self.generate_top_view(front_view_data, side_view_data)

        return {
            "front_view": front_view_data,
            "side_view": side_view_data,
            "top_view": top_view_data,
        }

    # Front View
    def generate_front_view(self) -> dict:
        """
        Front elevation looking at the limb face.

        Key dimensions:
        L = Window height
        A = Limb center-to-center distance
        D = Core tongue width

        @return: Front view dimension dictionary
        """
        core_results = self.design_results["core"]
        final_core_results = self.design_results["final_core"]
        hv_results = self.design_results["hv"]

        core_tongue_width = round_dimension(final_core_results["tongue_width"])
        limb_center_distance = round_dimension(final_core_results["center_distance"])
        core_window_height = round_dimension(final_core_results["window_height"])

        yoke_depth = core_tongue_width

        hv_outer_width = hv_results["winding_outer_dimensions"][0]
        hv_outer_height = hv_results["winding_outer_dimensions"][1]

        overall_core_width = round_dimension(
            limb_center_distance * (self.clearance_config["num_phases"] - 1)
            + 2 * yoke_depth
            + hv_outer_width
        )

        overall_core_height = round_dimension(
            core_window_height + 2 * yoke_depth
        )

        return {
            "L_window_height_mm": core_window_height,
            "A_limb_center_to_center_mm": limb_center_distance,
            "D_core_tongue_width_mm": core_tongue_width,
            "yoke_depth_mm": yoke_depth,
            "hv_winding_outer_width_mm": hv_outer_width,
            "hv_winding_outer_height_mm": hv_outer_height,
            "overall_core_width_mm": overall_core_width,
            "overall_core_height_mm": overall_core_height,
        }

    # Side View
    def generate_side_view(self) -> dict:
        """
        Side elevation.

        Stack from bottom to top:
        core foot insulation
        bottom yoke
        window height
        top yoke
        OCTC clearance

        @return: Side view dimension dictionary
        """
        final_core_results = self.design_results["final_core"]

        yoke_height = round_dimension(final_core_results["tongue_width"])
        window_height = round_dimension(final_core_results["window_height"])

        core_foot_height = self.clearance_config["core_foot_insulation"]
        octc_clearance_to_cover = self.clearance_config["octc_to_cover"]

        active_height = round_dimension(
            core_foot_height + yoke_height + window_height + yoke_height
        )

        total_height_to_cover = round_dimension(
            active_height + octc_clearance_to_cover
        )

        hv_results = self.design_results["hv"]
        lv2_results = self.design_results["lv2"]
        lv1_results = self.design_results["lv1"]

        hv_radial_depth = hv_results["winding_outer_dimensions"][0]
        lv2_radial_depth = lv2_results["winding_outer_dimensions"][0]
        lv1_radial_depth = lv1_results["winding_outer_dimensions"][0]

        return {
            "core_foot_with_insulation_mm": core_foot_height,
            "bottom_yoke_mm": yoke_height,
            "window_height_mm": window_height,
            "top_yoke_mm": yoke_height,
            "octc_to_cover_mm": octc_clearance_to_cover,
            "active_height_mm": active_height,
            "total_height_to_cover_mm": total_height_to_cover,
            "lv1_radial_depth_mm": lv1_radial_depth,
            "lv2_radial_depth_mm": lv2_radial_depth,
            "hv_radial_depth_mm": hv_radial_depth,
        }

    # Top View (Enclosure)
    def generate_top_view(self, front_view_data: dict, side_view_data: dict) -> dict:
        """
        Top-view enclosure layout.

        @param front_view_data: Output from front view calculation
        @param side_view_data: Output from side view calculation
        @return: Top view dimension dictionary
        """
        final_core_results = self.design_results["final_core"]
        hv_results = self.design_results["hv"]

        number_of_phases = self.clearance_config["num_phases"]
        end_clearance = self.clearance_config["enclosure_clearance_end"]
        side_clearance = self.clearance_config["enclosure_clearance_side"]
        base_plate_thickness = self.clearance_config["base_plate_thickness"]
        inter_phase_gap = self.clearance_config["inter_phase_gap"]

        hv_outer_width = hv_results["winding_outer_dimensions"][0]
        hv_outer_depth = hv_outer_width

        limb_center_distance = final_core_results["center_distance"]

        enclosure_length = round_dimension(
            end_clearance
            + hv_outer_width * number_of_phases
            + inter_phase_gap * (number_of_phases - 1)
            + end_clearance
        )

        enclosure_width = round_dimension(
            hv_outer_depth
            + side_clearance
            + side_clearance
            + base_plate_thickness
        )

        enclosure_height = side_view_data["total_height_to_cover_mm"]

        phase_pitch = round_dimension(hv_outer_width + inter_phase_gap)

        return {
            "enclosure_length_mm": enclosure_length,
            "enclosure_width_mm": enclosure_width,
            "enclosure_height_mm": enclosure_height,
            "length_breakdown": {
                "end_clearance_each_side_mm": end_clearance,
                "hv_od_width_per_phase_mm": hv_outer_width,
                "inter_phase_gap_mm": inter_phase_gap,
                "formula_str": "End Clearance + HV Outer Width X Number of Phases + Inter Phase Gap X (Number of Phases - 1) + End Clearance = Enclosure Length",
                "formula": f"{end_clearance} + {hv_outer_width}×{number_of_phases} + {inter_phase_gap}×{number_of_phases-1} + {end_clearance} = {enclosure_length}",
            },
            "width_breakdown": {
                "hv_od_radial_depth_mm": hv_outer_depth,
                "clearance_each_side_mm": side_clearance,
                "base_plate_thickness_mm": base_plate_thickness,
                "formula_str": "HV Outer Depth + Side Clearance + Side Clearance + Base Plate Thickness = Enclosure Width",
                "formula": f"{hv_outer_depth} + {side_clearance} + {side_clearance} + {base_plate_thickness} = {enclosure_width}",
            },
            "height_breakdown": {
                "core_foot_insulation_mm": side_view_data["core_foot_with_insulation_mm"],
                "window_height_mm": side_view_data["window_height_mm"],
                "top_yoke_mm": side_view_data["top_yoke_mm"],
                "bottom_yoke_mm": side_view_data["bottom_yoke_mm"],
                "octc_to_cover_mm": side_view_data["octc_to_cover_mm"],
                "formula_str": "Core Foot with Insulation + Window Height + (2 X Top Yoke) + OCTC To Cover = Enclosure Height",
                "formula": (
                    f"{side_view_data['core_foot_with_insulation_mm']} + "
                    f"{side_view_data['window_height_mm']} + "
                    f"2×{side_view_data['top_yoke_mm']} + "
                    f"{side_view_data['octc_to_cover_mm']} = {enclosure_height}"
                ),
            },
            "phase_pitch_mm": phase_pitch,
            "center_to_center_mm": limb_center_distance,
            "num_phases": number_of_phases,
        }