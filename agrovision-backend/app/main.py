import os
import logging
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from app.mandi_service_fixed import get_current_prices, get_price_history

logger = logging.getLogger(__name__)
from app.model import predict_image
from app.schemas import PredictionResponse
from app.schemas_history import PredictionHistoryItem
from app.schemes_schemas import SchemesResponse
from app.crops_schemas import CropCreate, CropItem
from app.crops_service import init_crops_db, list_crops, create_crop, delete_crop
from app.serpapi_service import (
    search_agricultural_information,
    search_weather,
)
from app.schemes_service import search_schemes
from app.location_service import search_locations, ProviderUnavailableError
# ============================================================
# Load environment variables
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


# ============================================================
# Prediction history storage
# ============================================================

import sqlite3
from datetime import datetime, timezone

DB_PATH = BASE_DIR / "agrovision.db"


def init_history_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS prediction_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT,
                class_name TEXT NOT NULL,
                plant TEXT NOT NULL,
                disease TEXT NOT NULL,
                confidence REAL NOT NULL,
                is_healthy INTEGER NOT NULL,
                location TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def save_prediction_history(result, location=""):
    created_at = datetime.now(timezone.utc).isoformat()

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute(
            """
            INSERT INTO prediction_history
            (filename, class_name, plant, disease, confidence, is_healthy, location, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                result.get("filename"),
                result.get("class_name", ""),
                result.get("plant", ""),
                result.get("disease", ""),
                float(result.get("confidence", 0)),
                1 if result.get("is_healthy", False) else 0,
                location,
                created_at,
            ),
        )
        conn.commit()
        return cursor.lastrowid, created_at


def get_prediction_history(limit=50):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT id, filename, class_name, plant, disease,
                   confidence, is_healthy, location, created_at
            FROM prediction_history
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return [
        {
            "id": row["id"],
            "filename": row["filename"],
            "class_name": row["class_name"],
            "plant": row["plant"],
            "disease": row["disease"],
            "confidence": row["confidence"],
            "is_healthy": bool(row["is_healthy"]),
            "location": row["location"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]


# ============================================================
# FastAPI application
# ============================================================

app = FastAPI(
    title="AgroVision AI API",
    description="Plant disease detection and agricultural information backend",
    version="1.0.0",
)


@app.on_event("startup")
def startup():
    init_history_db()
    init_crops_db()



# ============================================================
# CORS
# ============================================================

FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Configuration
# ============================================================

ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

MAX_FILE_SIZE = 10 * 1024 * 1024


# ============================================================
# Health Check
# ============================================================

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "AgroVision AI",
        "model": "loaded",
    }


@app.get("/api/schemes", response_model=SchemesResponse)
def government_schemes(
    crop: str = Query(..., min_length=1, max_length=100),
    location: str = Query(..., min_length=2, max_length=160),
):
    try:
        return search_schemes(crop.strip(), location.strip())
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve government scheme information right now. Please try again.",
        ) from exc


@app.get("/api/locations/search")
async def location_search(q: str = Query(..., min_length=2, max_length=80)):
    try:
        locations = await run_in_threadpool(search_locations, q)
        return {"query": q, "locations": locations}
    except ProviderUnavailableError as exc:
        raise HTTPException(
            status_code=503,
            detail="Location search temporarily unavailable",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Location search temporarily unavailable",
        ) from exc


# ============================================================
# Plant Disease Prediction
# ============================================================

@app.post("/api/predict", response_model=PredictionResponse)
async def predict(
    file: UploadFile = File(...),
    location: str = Form("")
):

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG, and WEBP images are supported.",
        )

    data = await file.read()

    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image must be smaller than 10 MB.",
        )

    try:
        result = predict_image(data)

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not process image: {exc}",
        ) from exc

    # -----------------------------------------
    # INVALID / NON-PLANT IMAGE
    # -----------------------------------------

    if not result.get("is_plant", False):
        raise HTTPException(
            status_code=422,
            detail=result.get(
                "message",
                "Please upload a clear plant or leaf image.",
            ),
        )

    result["filename"] = file.filename

    # Save successful plant predictions for the History page.
    history_id, created_at = save_prediction_history(result, location.strip())

    result["history_id"] = history_id
    result["created_at"] = created_at

    return result


# ============================================================
# Prediction History
# ============================================================

@app.get("/api/history", response_model=list[PredictionHistoryItem])
async def prediction_history(
    limit: int = Query(50, ge=1, le=200),
):
    try:
        return get_prediction_history(limit)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load prediction history: {exc}",
        ) from exc




# ============================================================
# My Crops
# ============================================================

@app.get("/api/crops", response_model=list[CropItem])
async def crops_list():
    try:
        return list_crops()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not load crops: {exc}") from exc


@app.post("/api/crops", response_model=CropItem)
async def crops_create(crop: CropCreate):
    if not crop.name.strip() or not crop.crop_type.strip() or not crop.location.strip():
        raise HTTPException(
            status_code=400,
            detail="Crop name, crop type, and location are required.",
        )

    if crop.health_status not in {"Healthy", "Monitoring", "Needs Attention"}:
        raise HTTPException(status_code=400, detail="Invalid health status.")

    try:
        return create_crop(crop)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not create crop: {exc}") from exc


@app.delete("/api/crops/{crop_id}")
async def crops_delete(crop_id: int):
    try:
        deleted = delete_crop(crop_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Crop not found.")
        return {"message": "Crop deleted successfully", "id": crop_id}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not delete crop: {exc}") from exc


# ============================================================
# Agricultural Information using SerpApi
# ============================================================

@app.get("/api/agriculture")
async def agriculture_info(
    disease: str = Query(...),
    location: str = Query(...),
):
    try:
        return await run_in_threadpool(
            search_agricultural_information,
            disease=disease,
            location=location,
        )
    except Exception as exc:
        logger.warning("Agricultural endpoint caught unexpected error: %s", type(exc).__name__)
        return {
            "available": False,
            "message": "Agricultural information is temporarily unavailable.",
            "sources": [],
            "location": location,
            "disease": disease,
        }


# ============================================================
# Weather using SerpApi
# ============================================================

@app.get("/api/weather")
async def weather_info(
    location: str = Query(...),
    name: str | None = Query(None),
    state: str | None = Query(None),
    country: str | None = Query(None),
    latitude: float | None = Query(None),
    longitude: float | None = Query(None),
):
    try:
        return await run_in_threadpool(
            search_weather,
            location,
            name=name,
            state=state,
            country=country,
            latitude=latitude,
            longitude=longitude,
        )
    except Exception as exc:
        return {
            "location": location,
            "weather": None,
            "forecast": [],
            "message": "Weather information is currently unavailable for this location.",
        }


# ============================================================
# Current Crop Prices using AGMARKNET
# ============================================================

@app.get("/api/prices")
async def crop_prices(
    location: str = Query(...),
    commodity: str | None = Query(None),
    latitude: float | None = Query(None),
    longitude: float | None = Query(None),
):
    try:
        return await run_in_threadpool(
            get_current_prices,
            location=location,
            commodity=commodity,
            latitude=latitude,
            longitude=longitude,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.error(f"[PRICES] Error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=502,
            detail="Market data is temporarily unavailable. Please try again.",
        ) from exc


# ============================================================
# Historical Crop Prices using AGMARKNET
# ============================================================

@app.get("/api/prices/history")
async def crop_price_history(
    location: str = Query(...),
    commodity: str = Query(...),
    days: int = Query(
        30,
        ge=7,
        le=90,
    ),
    latitude: float | None = Query(None),
    longitude: float | None = Query(None),
):
    try:
        return await run_in_threadpool(
            get_price_history,
            location=location,
            commodity=commodity,
            days=days,
            latitude=latitude,
            longitude=longitude,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.error(f"[HISTORY] Error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=502,
            detail="Market data is temporarily unavailable. Please try again.",
        ) from exc


