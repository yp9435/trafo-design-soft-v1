import math
from datetime import date


# Connection constants

vector_symbol_map = {
    ("D", "Y"): "Dy11",
    ("Y", "D"): "Yd11",
    ("Y", "Y"): "Yy0",
    ("D", "D"): "Dd0",
}

connection_voltage_factor = {
    "Y": math.sqrt(3),
    "D": 1.0,
}


# Helper

def calculate_line_voltage(phase_voltage: float, connection_type: str) -> float:
    """
    Convert phase voltage to line voltage.

    @param phase_voltage: Phase voltage value
    @param connection_type: 'Y' or 'D'
    @return: Line voltage
    """
    return phase_voltage * connection_voltage_factor.get(connection_type.upper(), 1.0)


def calculate_line_current(kva_rating: float, line_voltage: float, number_of_phases: int = 3) -> float:
    """
    Calculate line current for three-phase transformer.

    @param kva_rating: kVA rating of winding
    @param line_voltage: Line voltage
    @param number_of_phases: Number of phases
    @return: Line current (Amps)
    """
    return (kva_rating * 1000) / (math.sqrt(number_of_phases) * line_voltage)


def get_phase_label(number_of_phases: int, connection_type: str) -> str:
    """
    Generate phase label string.

    @param number_of_phases: Number of phases
    @param connection_type: Connection type
    @return: Phase label string (e.g., '3Ø')
    """
    return f"{number_of_phases}Ø"


def get_attribute_value(source_object, attribute_name, default_value=None):
    """
    Fetch attribute from object or dictionary.

    @param source_object: Pydantic model or dictionary
    @param attribute_name: Attribute key
    @param default_value: Default if not found
    @return: Attribute value
    """
    if hasattr(source_object, attribute_name):
        return getattr(source_object, attribute_name)

    if isinstance(source_object, dict):
        return source_object.get(attribute_name, default_value)

    return default_value

class RatingPlateGenerator:
    """
    Generate transformer rating plate data.

    @param design_results: Dictionary from TransformerDesignEngine
    @param input_data: Original TransformerDesignInput
    @param company_info: Optional company override
    @param impedance_pct: Impedance percentage string
    @param num_phases: Number of phases
    """

    default_company_details = {
        "name": "BHAVITRON POWERTEC PRIVATE LIMITED",
        "address": "13, ELECTRICAL INDUSTRIAL ESTATE, KAKKALUR – 602 003, TAMIL NADU",
        "spec_no": "ICF/ELEC/160",
    }

    def __init__(
        self,
        design_results: dict,
        input_data,
        company_info: dict = None,
        impedance_pct: str = "<5%",
        num_phases: int = 3,
    ):
        self.design_results = design_results
        self.input_data = input_data
        self.company_details = {**self.default_company_details, **(company_info or {})}
        self.impedance_percentage = impedance_pct
        self.number_of_phases = num_phases

    def generate(self) -> dict:
        """
        Generate rating plate data.

        @return: Rating plate dictionary
        """
        input_parameters = self.input_data

        # Winding Connections
        hv_connection = get_attribute_value(
            get_attribute_value(input_parameters, "hv", {}), "connection_type", "Y"
        ).upper()

        lv1_connection = get_attribute_value(
            get_attribute_value(input_parameters, "lv1", {}), "connection_type", "Y"
        ).upper()

        lv2_connection = get_attribute_value(
            get_attribute_value(input_parameters, "lv2", {}), "connection_type", "Y"
        ).upper()

        # KVA Values
        hv_kva = get_attribute_value(get_attribute_value(input_parameters, "hv", {}), "kva_rating", 0)
        lv1_kva = get_attribute_value(get_attribute_value(input_parameters, "lv1", {}), "kva_rating", 0)
        lv2_kva = get_attribute_value(get_attribute_value(input_parameters, "lv2", {}), "kva_rating", 0)

        frequency_hz = get_attribute_value(input_parameters, "frequency", 50)
        total_transformer_kva = get_attribute_value(input_parameters, "transformer_kva", hv_kva)

        # Phase Voltage
        hv_phase_voltage = self.design_results["hv"]["voltage_per_phase"]
        lv1_phase_voltage = self.design_results["lv1"]["voltage_per_phase"]
        lv2_phase_voltage = self.design_results["lv2"]["voltage_per_phase"]

        hv_line_voltage = round(calculate_line_voltage(hv_phase_voltage, hv_connection), 1)
        lv1_line_voltage = round(calculate_line_voltage(lv1_phase_voltage, lv1_connection), 1)
        lv2_line_voltage = round(calculate_line_voltage(lv2_phase_voltage, lv2_connection), 1)

        # Current
        hv_line_current = round(
            calculate_line_current(hv_kva, hv_line_voltage, self.number_of_phases), 1
        )
        lv1_line_current = round(
            calculate_line_current(lv1_kva, lv1_line_voltage, self.number_of_phases), 1
        )
        lv2_line_current = round(
            calculate_line_current(lv2_kva, lv2_line_voltage, self.number_of_phases), 1
        )

        # Parallel Conductor
        def get_parallel_conductor_count(winding_name):
            winding_data = get_attribute_value(input_parameters, winding_name, {})
            axial_parallel = get_attribute_value(winding_data, "axial_parallel", 1)
            radial_parallel = get_attribute_value(winding_data, "radial_parallel", 1)
            return axial_parallel * radial_parallel

        hv_wire_count = get_parallel_conductor_count("hv")
        lv1_wire_count = get_parallel_conductor_count("lv1")
        lv2_wire_count = get_parallel_conductor_count("lv2")

        # Vector Group
        vector_group = vector_symbol_map.get(
            (hv_connection, lv2_connection),
            f"{hv_connection}{lv2_connection.lower()}11"
        )

        full_vector_symbol = (
            f"{vector_group} "
            f"{lv1_connection}{lv2_connection.lower()}11 "
            f"(D{'iii' if hv_connection=='D' else 'ii'} "
            f"{'iii' if lv1_connection=='Y' else 'ii'})"
        )

        # Weight from BOM
        bom_data = self.design_results.get("bom", {})
        active_part_weight = bom_data.get(
            "active_part_weight_kg",
            self.design_results["final_core"].get("active_part_weight")
        )
        enclosure_weight = bom_data.get("enclosure_weight_kg", 0)

        total_weight = round((active_part_weight or 0) + (enclosure_weight or 0), 0)
        weight_display = f"< {int(round(total_weight / 50) * 50) + 50} KG"

        return {
            "manufacturer": self.company_details["name"],
            "address": self.company_details["address"],
            "type": "ISOLATION TRANSFORMER",
            "spec_no": self.company_details["spec_no"],

            "rating_kva": f"{total_transformer_kva} KVA",
            "impedance_percentage": self.impedance_percentage,
            "frequency_hz": f"{frequency_hz} HZ",

            "primary": {
                "label": "PRIMARY",
                "voltage_v": hv_line_voltage,
                "current_a": hv_line_current,
                "connection": hv_connection,
                "kva": hv_kva,
                "num_wires": hv_wire_count,
                "display": f"{hv_line_voltage}V AC, {hv_line_current}A, {hv_connection}, "
                           f"{get_phase_label(self.number_of_phases, hv_connection)}"
                           f"{hv_wire_count if hv_wire_count > 1 else ''}",
            },

            "secondary_1": {
                "label": "SECONDARY 1",
                "voltage_v": lv1_line_voltage,
                "current_a": lv1_line_current,
                "connection": lv1_connection,
                "kva": lv1_kva,
                "num_wires": lv1_wire_count,
                "display": f"{lv1_kva} KVA, {lv1_line_voltage}V AC, {lv1_line_current}A, "
                           f"{lv1_connection}, "
                           f"{get_phase_label(self.number_of_phases, lv1_connection)}"
                           f"{lv1_wire_count if lv1_wire_count > 1 else ''}",
            },

            "secondary_2": {
                "label": "SECONDARY 2",
                "voltage_v": lv2_line_voltage,
                "current_a": lv2_line_current,
                "connection": lv2_connection,
                "kva": lv2_kva,
                "num_wires": lv2_wire_count,
                "display": f"{lv2_kva} KVA, {lv2_line_voltage}V AC, {lv2_line_current}A, "
                           f"{lv2_connection}, "
                           f"{get_phase_label(self.number_of_phases, lv2_connection)}"
                           f"{lv2_wire_count if lv2_wire_count > 1 else ''}",
            },

            "sl_no": None,
            "mfg_year": str(date.today().year),
            "weight": weight_display,
            "vector_symbol": full_vector_symbol,
        }