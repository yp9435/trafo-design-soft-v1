from pydantic import ValidationError
from input_model import TransformerDesignInput


# Test 1

print("\nTest 1")

try:
    data = TransformerDesignInput(
        transformer_kva=60,
        frequency=50,
        flux_density=1.4,
        k_value=0.62,
        lv1={
            "voltage": 190,
            "kva_rating": 5,
            "conductor_current_density": 2.5,
            "conductor_material": "CU",
            "connection_type": "Y"
        },
        lv2={
            "voltage": 415,
            "kva_rating": 55,
            "conductor_current_density": 2.8,
            "conductor_material": "CU",
            "connection_type": "Y"
        },
        hv={
            "voltage": 750,
            "kva_rating": 60,
            "conductor_current_density": 3.0,
            "conductor_material": "CU",
            "connection_type": "Y"
        }
    )

    print("OOO Validation Passed")
    print(data)

except ValidationError as e:
    print("XXX Validation Failed")
    print(e)


# Test 2

print("\nTest 2")

try:
    data = TransformerDesignInput(
        transformer_kva=60,
        frequency=50,
        flux_density=1.4,
        k_value=0.62,
        lv1={
            "voltage": 190,
            "kva_rating": 5,
            "conductor_current_density": 2.5,
            "conductor_material": "CU",
            "connection_type": "Y"
        },
        lv2={
            "voltage": 415,
            "kva_rating": 35,   
            "conductor_current_density": 2.8,
            "conductor_material": "CU",
            "connection_type": "Y"
        },
        hv={
            "voltage": 750,
            "kva_rating": 60,
            "conductor_current_density": 3.0,
            "conductor_material": "CU",
            "connection_type": "Y"
        }
    )

    print("OOO Validation Passed")
    print(data)

except ValidationError as e:
    print("XXX Validation Failed")
    print(e)


# Test 3 

print("\n Test 3")

try:
    data = TransformerDesignInput(
        transformer_kva=60,
        frequency=50,
        flux_density=1.4,
        k_value=0.62,
        lv1={
            "voltage": 190,
            "kva_rating": 5,
            "conductor_current_density": 7,
            "conductor_material": "CU",
            "connection_type": "Y"
        },
        lv2={
            "voltage": 415,
            "kva_rating": 55,
            "conductor_current_density": 2.8,
            "conductor_material": "CU",
            "connection_type": "Y"
        },
        hv={
            "voltage": 750,
            "kva_rating": 60,
            "conductor_current_density": 3.0,
            "conductor_material": "CU",
            "connection_type": "Y"
        }
    )

    print("OOO Validation Passed")
    print(data)

except ValidationError as e:
    print("XXX Validation Failed")
    print(e)