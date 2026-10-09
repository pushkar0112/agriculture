# AgroVision AI — FastAPI Backend

## Setup (Python 3.11 recommended)

```powershell
py -3.11 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If PowerShell blocks activation, run the server without activation:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

## Run

```powershell
uvicorn app.main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs
Health: http://127.0.0.1:8000/api/health

## Prediction

`POST /api/predict` with multipart form field `file`.

The model expects RGB images resized to 224x224 and uses MobileNetV2 preprocessing.
