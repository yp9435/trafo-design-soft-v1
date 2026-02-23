from pydantic import BaseModel, Field, model_validator
from typing import Literal

# Individual Winding Input Model

class WindingInput(BaseModel):
    voltage: float = Field(
        ..., 
        ge=10, le=50000,
        description="Line voltage in Volts (10V – 50kV)"
    )

    kva_rating: float = Field(
        ..., 
        gt=0.1, le=10000,
        description="Power rating in kVA (0.1 – 10000)"
    )

    conductor_current_density: float = Field(
        ..., 
        gt=0.5, le=5.0,
        description="Current density in A/mm²"
    )

    conductor_material: Literal["CU", "AL"] = Field(
        ..., 
        description="Conductor material: Copper (CU) or Aluminium (AL)"
    )

    connection_type: Literal["D", "Y"] = Field(
        ..., 
        description="Connection type: Delta (D) or Star (Y)"
    )

    # Material-based validation
    @model_validator(mode="after")
    def validate_current_density(self):
        J = self.conductor_current_density

        if self.conductor_material == "CU":
            if not (1.0 <= J <= 4.0):
                raise ValueError(
                    "Copper current density should be between 1.0 and 4.0 A/mm²"
                )

        if self.conductor_material == "AL":
            if not (1.0 <= J <= 3.0):
                raise ValueError(
                    "Aluminium current density should be between 1.0 and 3.0 A/mm²"
                )

        return self


# Full Transformer Input Model 

class TransformerDesignInput(BaseModel):
    transformer_kva: float = Field(
        ..., gt=0.1, le=10000,
        description="Overall transformer rating in kVA"
    )
    frequency: float = Field(
        ..., 
        ge=45, le=65,
        description="Operating frequency in Hz (45 – 65)"
    )

    flux_density: float = Field(
        ..., 
        ge=1.0, le=1.8,
        description="Flux density in Tesla (1.0 – 1.8, CRGO typical)"
    )

    k_value: float = Field(
        ..., 
        ge=0.4, le=0.8,
        description="Design constant K (0.4 – 0.8)"
    )

    lv1: WindingInput = Field(..., description="LV1 winding details")
    lv2: WindingInput = Field(..., description="LV2 winding details")
    hv: WindingInput = Field(..., description="HV winding details")
    
    @model_validator(mode="after")
    def validate_kva_balance(self):
        total_lv = self.lv1.kva_rating + self.lv2.kva_rating

        if abs(total_lv - self.transformer_kva) > 0.05 * self.transformer_kva:
            raise ValueError(
                f"LV kVA mismatch: LV total = {total_lv} kVA, "
                f"Transformer rating = {self.transformer_kva} kVA"
            )

        if abs(self.hv.kva_rating - self.transformer_kva) > 0.05 * self.transformer_kva:
            raise ValueError(
                f"HV kVA ({self.hv.kva_rating}) should match transformer rating "
                f"({self.transformer_kva})"
            )

        return self