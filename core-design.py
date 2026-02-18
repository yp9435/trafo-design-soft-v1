import math
# 60 KVA Transformer Design Example (Star Connected)
# Core Design Function
def core_design (kva, k, lv_voltage):
    """
    To Caculate the core design of a transformer based on the given parameters.
    @param kva: The power rating of the transformer in kVA.
    @param k: A design constant that influences the volts per turn calculation.
    @param lv_voltage: The low voltage side voltage of the transformer.
    @return: A dictionary containing volts per turn, LV turns, net core area, gross core area, and revised flux density.
    """
    # Constants
    freq = 50 
    magnetic_flux_density = 1.4 # Tesla
    stacking_factor = 0.96

    # Step 1 : Volts per turn
    volts_per_turn = k * math.sqrt(kva)

    # Step 2 : LV Turns per Phase
    lv_voltage_per_phase = lv_voltage / math.sqrt(3) # for star connection
    lv_turns_per_phase = math.ceil(lv_voltage_per_phase / volts_per_turn) # need to round this to nearest higher integer

    # Step 3 Recalculation of Volts per Turn
    volts_per_turn = (lv_voltage / math.sqrt(3)) / lv_turns_per_phase

    # Step 4 : Net Core Area
    net_core_area_m2 = volts_per_turn / (4.44 * freq * magnetic_flux_density)
    net_core_area = math.ceil(net_core_area_m2 * 10**6) # convert to mm^2 and round it up

    # Step 5 : Gross Core Area
    gross_core_area = math.ceil(net_core_area / stacking_factor)
    gross_core_area = math.ceil(gross_core_area / 100) * 100 # round up to nearest 100 mm^2


    core_breadth = math.sqrt(gross_core_area/2) # Assuming a square core for simplicity
    core_height = gross_core_area / core_breadth

    # Step 6 : Revised Magnetic Flux Density
    revised_flux_density = volts_per_turn / (4.44 * freq * gross_core_area * 10**-6) # convert back to Tesla

    return {"Volts per turn": volts_per_turn,"LV turns per phase": lv_turns_per_phase,"Net core area (mm^2)": net_core_area,"Gross core area (mm^2)": gross_core_area,"Revised flux density (T)": revised_flux_density, "core breadth (mm)": core_breadth, "core height (mm)": core_height}


# Main
if __name__ == "__main__":
    kva = float(input("Enter kVA: "))
    k = float(input("Enter k value: "))
    lv_voltage = float(input("Enter LV Voltage: "))

    result = core_design(kva, k, lv_voltage)

    print("\nCore Design Results")
    for key, value in result.items():
        print(f"{key}: {value:.4f}")