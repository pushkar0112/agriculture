# AgroVision AI 🌱

AgroVision AI is a web application designed to help farmers access plant disease predictions and useful agricultural information in one place. It combines a React frontend with a FastAPI backend and a machine-learning model for plant/leaf image classification.

## Features

- **Plant disease detection:** Upload a JPG, PNG, or WEBP plant/leaf image to receive a model prediction.
- **Prediction history:** Review previous successful predictions.
- **My Crops:** Add, view, and delete crop records.
- **Agricultural information:** Search for information related to a detected disease and location.
- **Weather information:** Retrieve weather details for a location when the configured provider is available.
- **Crop prices:** Look up current market-price information by location and commodity when the data provider is available.
- **Government schemes:** Search for relevant agricultural schemes by crop and location.
- **Location search:** Search for locations used by supported features.

> **Important:** AI predictions and external data may be incomplete or incorrect. Use predictions as a starting point, not as a substitute for advice from an agricultural expert. Provider-dependent features require valid API keys and an internet connection.

## Tech Stack

### Frontend
- React
- Vite
- JavaScript
- Lucide React icons

### Backend
- Python
- FastAPI
- Uvicorn
- SQLite for local history/crop data
- Keras and TensorFlow for model inference
- Pillow and NumPy for image processing
- SerpApi and optional location-provider configuration for external information

## Project Structure

```text
agriculture-main/
├── agrovision-backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── model.py
│   │   ├── crops_service.py
│   │   ├── crops_schemas.py
│   │   ├── location_service.py
│   │   ├── mandi_service_fixed.py
│   │   ├── schemes_service.py
│   │   ├── schemes_schemas.py
│   │   ├── serpapi_service.py
│   │   ├── schemas.py
│   │   └── schemas_history.py
│   ├── models/
│   │   └── plant_disease_model.keras
│   ├── class_names.json
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── auth/
    │   ├── components/
    │   ├── pages/
    │   ├── App.jsx
    │   ├── api.js
    │   └── main.jsx
    ├── package.json
    └── .env.example
```

## Prerequisites

Install the following before running the project:

- Python 3.11 recommended
- Node.js and npm
- Git (optional, for cloning the repository)

The machine-learning dependencies can take time to install and require sufficient disk space and memory.

## Setup and Run

Open **two terminals**: one for the backend and one for the frontend.

### 1. Configure the backend

In Terminal 1, move into the backend directory:

```bash
cd agriculture-main/agrovision-backend
```

Create and activate a virtual environment.

**Windows PowerShell:**

```powershell
py -3.11 -m venv venv
.\venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, you can use the environment's Python executable directly:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

**macOS/Linux:**

```bash
python3.11 -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Create a local `.env` file from the example:

**Windows PowerShell:**
```powershell
Copy-Item .env.example .env
```

**macOS/Linux:**
```bash
cp .env.example .env
```

Open `.env` and add your own valid API keys for any external services you want to use. Keep real keys private and never commit `.env` to a public repository. Do not assume a sample key in an example file is valid; replace it with your own key.

Start the backend from the `agrovision-backend` directory:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend URLs:

- API base: `http://127.0.0.1:8000`
- Interactive API documentation: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/health`

### 2. Configure the frontend

In Terminal 2, move into the frontend directory:

```bash
cd agriculture-main/frontend
```

Install dependencies:

```bash
npm install
```

Create a local `.env` file:

**Windows PowerShell:**
```powershell
Copy-Item .env.example .env
```

**macOS/Linux:**
```bash
cp .env.example .env
```

The example configures the frontend to use the local backend:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Run the development server:

```bash
npm run dev
```

Open the local URL printed by Vite in your terminal, usually `http://localhost:5173`.

## API Endpoints

The backend includes the following routes. Open `/docs` while the server is running to see the current request and response schemas.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend health check |
| POST | `/api/predict` | Predict from an uploaded plant image; accepts multipart form field `file` and optional `location` |
| GET | `/api/history` | Retrieve prediction history |
| GET | `/api/crops` | List saved crops |
| POST | `/api/crops` | Create a crop record |
| DELETE | `/api/crops/{crop_id}` | Delete a crop record |
| GET | `/api/agriculture` | Search agricultural information by disease and location |
| GET | `/api/weather` | Retrieve weather information for a location |
| GET | `/api/prices` | Retrieve crop-price information for a location and optional commodity |
| GET | `/api/schemes` | Search agricultural schemes by crop and location |
| GET | `/api/locations/search` | Search for locations |

## Plant Image Notes

- Use a clear, well-lit image focused on the plant or leaf.
- The prediction pipeline expects an RGB image resized to `224 × 224` and uses MobileNetV2 preprocessing.
- The backend accepts JPG, PNG, and WEBP images up to 10 MB.
- Results depend on the classes represented in the trained model and the quality of the uploaded image.

## Configuration

Backend settings are read from `agrovision-backend/.env`. The example file documents these variables:

- `SERPAPI_API_KEY` — API key for supported search-based agricultural/weather information.
- `FRONTEND_ORIGINS` — comma-separated list of allowed frontend origins for CORS.
- `LOCATIONIQ_API_KEY` — optional key for the configured location provider, if used by the application.

Frontend settings are read from `frontend/.env`:

- `VITE_API_BASE_URL` — backend base URL.

After changing frontend environment variables, restart the Vite development server.

## Troubleshooting

- **`uvicorn` is not recognized:** Activate the backend virtual environment, or run `python -m uvicorn app.main:app --reload --port 8000`.
- **Model/file not found:** Run the backend from `agrovision-backend` and check that `models/plant_disease_model.keras` and `class_names.json` are present.
- **Frontend cannot connect to backend:** Confirm the backend is running on port `8000` and `VITE_API_BASE_URL` points to it.
- **CORS error:** Check `FRONTEND_ORIGINS` in the backend `.env`. Include the exact origin shown in the browser, such as `http://localhost:5173`.
- **External information is unavailable:** Check the relevant API key, provider quota, internet connection, and provider response. Some integrations may not work without credentials.
- **Dependency installation fails:** Use the recommended Python version and consult the TensorFlow/Keras installation requirements for your operating system.

## Security

- Keep API keys and secrets in local `.env` files.
- Do not publish credentials or commit them to Git.
- Restrict CORS origins appropriately before deployment.
- Add authentication, authorization, rate limiting, and production-grade database/deployment settings before exposing the service publicly.

## License

No license file was identified in the project structure. Add a `LICENSE` file before redistributing the project if you intend to specify reuse terms.
