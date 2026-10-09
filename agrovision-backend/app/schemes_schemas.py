from typing import Optional

from pydantic import BaseModel


class SchemeItem(BaseModel):
    name: str
    level: str
    state: Optional[str] = None
    description: Optional[str] = None
    benefits: Optional[str] = None
    eligibility: Optional[str] = None
    application_process: Optional[str] = None
    official_url: str
    source: str


class SchemesResponse(BaseModel):
    crop: str
    location: str
    state: Optional[str] = None
    schemes: list[SchemeItem]
    source: str = "Government sources"
