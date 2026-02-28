import formulas
class CoreDesign:
    """ 
    Class for designing the core of a transformer based on the input parameters.
    Attributes:
        inputs: An instance of the Inputs class containing the necessary parameters for core design.
    Methods:
        design: Calculates and returns them in a dictionary.
    """
    def __init__(self, inputs):
        self.inputs = inputs
        self.formulas = formulas.Formulas()

    def design(self):

        initial_vpt = self.formulas.initial_volts_per_turn(
            self.inputs.k_value,
            self.inputs.transformer_kva
        )

        lv_winding = min(
            [self.inputs.lv1, self.inputs.lv2],
            key=lambda w: w.voltage
        )

        phase_voltage = self.formulas.phase_voltage(
            lv_winding.voltage,
            lv_winding.connection_type
        )

        turns_per_phase = self.formulas.turns_per_phase(
            phase_voltage,
            initial_vpt
        )

        if turns_per_phase <= 0:
            raise ValueError("Invalid turns calculated")

        volts_per_turn = self.formulas.volts_per_turn(
            phase_voltage,
            turns_per_phase
        )

        net_core_area = self.formulas.net_core_area(
            volts_per_turn,
            self.inputs.frequency,
            self.inputs.flux_density
        )

        gross_core_area = self.formulas.gross_core_area(net_core_area)

        core_dimensions = self.formulas.core_dimensions(gross_core_area)

        return {
            "initial_volts_per_turn": initial_vpt,
            "phase_voltage": phase_voltage,
            "turns_per_phase": turns_per_phase,
            "volts_per_turn": volts_per_turn,
            "net_core_area": net_core_area,
            "gross_core_area": gross_core_area,
            "core_dimensions": core_dimensions
        }