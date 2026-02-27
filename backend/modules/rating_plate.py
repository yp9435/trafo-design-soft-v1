from datetime import datetime
import math


class RatingPlateGenerator:
    def __init__(self, inputs, design_data, extra=None):
        """
        inputs: TransformerInput (user input)
        design_data: output of DesignEngine
        extra: optional dict (serial_no, manufacturer, etc.)
        """
        self.inputs = inputs
        self.data = design_data
        self.extra = extra or {}

    def _line_current(self, kva, voltage, connection):
        """
        Calculate line current:
        I = kVA * 1000 / (√3 * V)
        """
        if voltage == 0:
            return 0
        current = (kva * 1000) / (math.sqrt(3) * voltage)
        return round(current, 2)

    def build(self):
        # -------- Basic Info --------
        rating_kva = self.inputs.transformer_kva
        frequency = self.inputs.frequency

        # -------- Primary (Assume LV2 is main secondary / primary as per your system logic if needed adjust) --------
        hv_voltage = self.inputs.hv["voltage"]
        hv_kva = self.inputs.hv["kva_rating"]
        hv_conn = self.inputs.hv["connection_type"]

        hv_current = self._line_current(hv_kva, hv_voltage, hv_conn)

        # -------- Secondary 1 --------
        lv1_voltage = self.inputs.lv1["voltage"]
        lv1_kva = self.inputs.lv1["kva_rating"]
        lv1_conn = self.inputs.lv1["connection_type"]

        lv1_current = self._line_current(lv1_kva, lv1_voltage, lv1_conn)

        # -------- Secondary 2 --------
        lv2_voltage = self.inputs.lv2["voltage"]
        lv2_kva = self.inputs.lv2["kva_rating"]
        lv2_conn = self.inputs.lv2["connection_type"]

        lv2_current = self._line_current(lv2_kva, lv2_voltage, lv2_conn)

        # -------- Vector Group --------
        # You can improve this logic later
        vector_group = f"{hv_conn}{lv1_conn}{lv2_conn}"

        # -------- Impedance --------
        impedance = self.data["final_core"].get("impedance_percent", "<5")

        # -------- Weight --------
        total_weight = self.data["final_core"].get("total_weight_estimate", None)
        if total_weight is None:
            # fallback estimate
            active = self.data["final_core"]["active_part_weight"]
            total_weight = round(active * 1.35, 1)

        # -------- Metadata --------
        serial_no = self.extra.get("serial_no", "AUTO")
        manufacturer = self.extra.get("manufacturer", "Your Company")
        year = self.extra.get("year", datetime.now().year)

        # -------- Final Rating Plate Object --------
        plate = {
            "manufacturer": manufacturer,
            "rating_kva": rating_kva,
            "frequency_hz": frequency,
            "cooling": "ONAN",
            "standard": "IS / IEC",

            "primary": {
                "voltage_v": hv_voltage,
                "current_a": hv_current,
                "connection": hv_conn
            },

            "secondary_1": {
                "kva": lv1_kva,
                "voltage_v": lv1_voltage,
                "current_a": lv1_current,
                "connection": lv1_conn
            },

            "secondary_2": {
                "kva": lv2_kva,
                "voltage_v": lv2_voltage,
                "current_a": lv2_current,
                "connection": lv2_conn
            },

            "vector_group": vector_group,
            "impedance_percent": impedance,

            "serial_no": serial_no,
            "year": year,
            "total_weight_kg": round(total_weight, 1)
        }

        return plate