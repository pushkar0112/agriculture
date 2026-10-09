from pydantic import BaseModel
from typing import Optional


class PredictionResponse(BaseModel):
    valid_image: bool = True
    is_plant: bool = True

    class_name: str

    plant: str
    disease: str
    confidence: float
    is_healthy: bool

    validator_confidence: Optional[float] = None
    validator_label: Optional[str] = None

    filename: Optional[str] = None

class PredictionHistoryItem(BaseModel):
    id: int
    filename: Optional[str] = None
    class_name: str
    plant: str
    disease: str
    confidence: float
    is_healthy: bool
    location: Optional[str] = None
    created_at: str
