# ⚡ AASRA Backend API — Multi-Hazard Decision Support Engine

> High-throughput FastAPI service orchestrating GIS risk layers, real-time meteorological multi-hazard telemetry, official OASIS CAP v1.2 emergency feeds, shelter allocation analytics, and the Grand Super-Ensemble ML model.

---

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
# Windows PowerShell:
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Linux / macOS:
# python3 -m venv .venv
# source .venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 2. Run the Development Server
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
- **API Base URL**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **ReDoc Interactive Reference**: `http://127.0.0.1:8000/redoc`

---

## 📡 REST API Endpoints Overview

### 1. Multi-Hazard Live Telemetry & ML Risk Prediction
- **`GET /api/disaster/live-multi-hazard/{lat}/{lon}`**
  - Fetches live meteorological telemetry (precipitation, wind speed, relative humidity, temperature) from Open-Meteo.
  - Automatically feeds physical parameters into the **Grand Super-Ensemble ML Model**.
  - Returns calculated risk tier (`Critical`, `High`, `Moderate`, `Low`), confidence distribution, and baseline model comparisons.

### 2. GIS Geospatial Intelligence & Shelters
- **`GET /api/gis/habitations`**: Returns all GeoJSON settlements with population, vulnerability, and active hazard exposure buffers.
- **`GET /api/gis/relocation-sites`**: Returns vetted emergency shelters, current occupancy, capacity limits, and intake headroom.
- **`GET /api/gis/red-zones`**: Returns active multi-hazard containment zones and screening buffers.

### 3. Emergency Alerts & OASIS CAP v1.2 Protocol
- **`POST /api/alerts/broadcast`**: Triggers emergency alerts across simulated Cell Broadcast, SMS, and WhatsApp bot channels.
- **`GET /api/alerts/cap/{alert_id}`**: Exports standard OASIS CAP v1.2 XML document formatted for NDMA SACHET and WMO alert syndication.

### 4. Tactical Resource & Rescue Battalion Tracking
- **`GET /api/resources/teams`**: Returns live status and coordinates of NDRF battalions, SDRF units, and medical quick response teams.
- **`POST /api/resources/dispatch`**: Dispatches units to target incident zones with transport priority flags.

### 5. Community Distress & Incident Management
- **`GET /api/community/posts`**: Citizen reports and field incident logs.
- **`POST /api/community/posts`**: Allows citizens and field volunteers to submit geo-tagged distress updates and damage reports.

---

## 📂 Backend Architecture

```
backend/
├── main.py                 # Core FastAPI application & route definitions
├── requirements.txt        # Python dependency declarations
├── aasra_community.db      # SQLite database for community distress logs
└── .venv/                  # Python isolated virtual environment
```
