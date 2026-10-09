from pydantic import BaseModel
from typing import Optional


class CropCreate(BaseModel):
    name: str
    crop_type: str
    location: str
    planting_date: Optional[str] = None
    health_status: str = "Healthy"
    notes: Optional[str] = None


class CropItem(CropCreate):
    id: int
    created_at: str
