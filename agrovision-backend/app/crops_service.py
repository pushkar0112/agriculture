from pathlib import Path
import sqlite3
from datetime import datetime, timezone

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "agrovision.db"


def init_crops_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS crops (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                crop_type TEXT NOT NULL,
                location TEXT NOT NULL,
                planting_date TEXT,
                health_status TEXT NOT NULL DEFAULT 'Healthy',
                notes TEXT,
                created_at TEXT NOT NULL
            )
        """)
        conn.commit()


def list_crops():
    init_crops_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM crops ORDER BY id DESC"
        ).fetchall()
        return [dict(row) for row in rows]


def create_crop(data):
    init_crops_db()
    created_at = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute(
            """
            INSERT INTO crops
                (name, crop_type, location, planting_date, health_status, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data.name.strip(),
                data.crop_type.strip(),
                data.location.strip(),
                data.planting_date or None,
                data.health_status.strip() or "Healthy",
                data.notes.strip() if data.notes else None,
                created_at,
            ),
        )
        conn.commit()
        crop_id = cursor.lastrowid

    return {
        "id": crop_id,
        "name": data.name.strip(),
        "crop_type": data.crop_type.strip(),
        "location": data.location.strip(),
        "planting_date": data.planting_date or None,
        "health_status": data.health_status.strip() or "Healthy",
        "notes": data.notes.strip() if data.notes else None,
        "created_at": created_at,
    }


def delete_crop(crop_id: int):
    init_crops_db()
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("DELETE FROM crops WHERE id = ?", (crop_id,))
        conn.commit()
        return cursor.rowcount > 0
