from pydantic import BaseModel
from typing import Optional


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