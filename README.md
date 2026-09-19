# 🚨 AASRA — Disaster Intelligence & Multi-Hazard Decision Support System

> **AASRA (आसरा)** is a unified AI-powered multi-hazard disaster decision support system (DSS) and citizen safety network engineered for early warning, dynamic risk scoring, shelter allocation gap analysis, automated CAP alerts, and real-time tactical dispatch.

---

## 🌟 Key Features

### 1. 🗺️ Multi-Hazard GIS Risk Intelligence Map
- **Interactive Geospatial Visualizer**: Real-time Leaflet GIS canvas plotting habitations, dynamic risk screening buffers (Critical, High, Moderate), and active relief shelters across Indian districts.
- **Dynamic Risk Score Algorithm**: Mathematical formula evaluating:
  $$\text{Risk Score} = w_1 \cdot \text{Hazard Exposure} + w_2 \cdot \text{Vulnerability} + w_3 \cdot \text{Population Exposure} + w_4 \cdot (1 - \text{Accessibility})$$
- **Evacuation Route Optimization**: Safe transit corridors computed between high-risk hamlets and suitable shelters avoiding active hazard buffers.

### 2. 📢 Advanced Omnichannel Emergency Alerts & Broadcast
- **Multilingual Web Speech Voice TTS**: Automated voice announcements in **Hindi (hi-IN)** and **Indian English (en-IN)** with automated emergency alarm sirens.
- **Geo-fencing Reach Calculator**: Dynamic slider (5 km to 50 km) estimating real-time population reach and targeted habitations.
- **OASIS CAP v1.2 XML Feed**: Instant generation and download of standardized Common Alerting Protocol XML documents compliant with NDMA SACHET and WMO alerts.
- **Omnichannel Broadcast Simulator**:
  - 📡 **Cell Broadcast (WEA / Emergency Alerts)**: Direct cell tower push simulations.
  - 💬 **Bulk SMS (Govt DLT Gateways)**: SMS route with tracking.
  - 🤖 **WhatsApp Citizen Bot**: Interactive SOS chat simulator.
  - 🌐 **OASIS CAP 1.2 Feed**: Official XML alert payloads.
- **Fullscreen Citizen Red Alert Drill**: Takeover warning screen with blinking emergency beacons and audible siren drill.

### 3. 🛡️ Immediate Relocation Priority & Shelter Allocation Gap
- **Capacitated Shelter Allocation**: Prioritizes structurally vetted shelters in the same administrative district with positive intake headroom.
- **Explicit Allocation Gap Warning**: Visually flags when habitations exceed shelter capacity and computes the exact population deficit requiring second-tier relief camps.

### 4. 🚒 Rescue Teams & Resource Dispatch (NDRF / SDRF / Civil Defence)
- **Fleet & Battalion Tracker**: Live tracking of NDRF battalions, Quick Response Teams (QRT), and medical brigades.
- **Readiness Badges**: Available, Dispatched, On-Site, and Standby status filters.
- **Tactical Dispatch Modal**: Rapid deployment assigning target locations, GPS coordinators, and transport priority.

### 5. 📋 Unified Command & Incident Management
- **National & District Commander Switcher**: Dual-view dashboard filtering telemetry between NDMA central overview and granular district-level controls.
- **Incident Escalation Matrix**: Log, triage, verify, and resolve multi-hazard distress calls in real time.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend UI** | React 18, Vite, Tailwind CSS v3, Lucide Icons |
| **Mapping & GIS** | Leaflet, React-Leaflet, GeoJSON, OpenStreetMap CartoDB |
| **Backend API** | FastAPI (Python 3.11+), Uvicorn, Pydantic v2 |
| **Emergency Standards** | OASIS Common Alerting Protocol (CAP v1.2), Web Speech API, Web Audio API |
| **Analytics & ML** | Real EM-DAT dataset (17,116 records), Grand Super-Ensemble (Dual-Task XGBoost, CatBoost, LightGBM, ExtraTrees, Random Forest), Nelder-Mead Optimization |
| **Mobile Application** | Capacitor 6, Android Studio, Native Notch/Gesture Safe Area Support |

---

## 🧠 Machine Learning: Grand Super-Ensemble & Dual-Task Ordinal Regression

The ML engine predicts real-time disaster severity risk (`Critical`, `High`, `Moderate`, `Low`) based on real-world global disaster historical records from the **EM-DAT** database (17,116 validated events).

### Performance Benchmarks (Strict Holdout Test Set: 3,424 Samples)
| Metric | Baseline Random Forest | Tuned CatBoost | Tuned XGBoost | Grand Super-Ensemble |
| :--- | :---: | :---: | :---: | :---: |
| **Overall Accuracy** | 47.49% | 47.87% | 46.96% | **48.57%** |
| **Macro ROC-AUC** | 0.7327 | 0.7351 | 0.7342 | **0.7395 (~74.0%)** |
| **Macro F1-Score** | 0.4701 | 0.4721 | 0.4633 | **0.4845** |
| **Critical Precision** | 62.18% | 62.76% | 61.11% | **64.61%** |
| **Critical F1-Score** | 0.6254 | 0.6438 | 0.6339 | **0.6423** |

- **Feature Engineering 2.0**: Extracts **57 domain features** across hazard kinematics (`is_rapid_onset`), official emergency response declarations (`Declaration`, `Appeal`, `OFDA`), location terrain clues (coastal, mountain, urban), and cyclical seasonal dynamics.
- **Dual-Task Ordinal Modeling**: Incorporates continuous percentile severity regressors calibrated via Gaussian Cumulative Distribution Functions (CDF) to penalize severe rank inversions.
- **Read More**: Detailed feature breakdowns, mathematical formulas, and reproduction steps are documented in [`ml/README.md`](ml/README.md).

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **Python**: `v3.11` or higher
- **Git**: Installed on your system
- **Android Studio & SDK**: (Optional, for running or building native mobile APK)

### 1. Clone the Repository
```bash
git clone https://github.com/gitgaurav-web/DIASTRA-Disaster-Intelligence-System.git
cd DIASTRA-Disaster-Intelligence-System
```

### 2. Frontend Setup (Web)
```bash
# Install dependencies
npm install

# Start local Vite development server
npm run dev
```
> The frontend application will be live at: **`http://localhost:5173`**

### 3. Backend Setup (FastAPI)
```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
# Windows (PowerShell):
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Linux / macOS:
# python3 -m venv .venv
# source .venv/bin/activate

# Install Python requirements
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload --port 8000
```
> Interactive API Documentation (Swagger UI): **`http://127.0.0.1:8000/docs`**  
> Complete backend guide & route index: [`backend/README.md`](backend/README.md)

### 4. Mobile Application (Android APK)
The repository includes complete native Android build support via Capacitor:
```bash
# Build frontend web bundle
npm run build

# Sync assets to native Android project
npx cap sync android

# Open project in Android Studio
npx cap open android
```
- **Direct APK Build**: You can assemble the debug APK directly via `./gradlew assembleDebug` in the `android/` directory.
- **Prebuilt Standalone APK**: Pre-compiled and ready for installation at `AASRA_Mobile_App.apk` (and on your Desktop).

---

## 👥 Team Members & Contributors

<div align="center">

| Avatar | Member | Role | GitHub Profile |
| :---: | :--- | :--- | :---: |
| <img src="https://github.com/gitgaurav-web.png" width="65px" style="border-radius:50%;" alt="Gaurav"/> | **Gaurav** | 💻 Team Member / Full Stack | [@gitgaurav-web](https://github.com/gitgaurav-web) |
| <img src="https://github.com/indraprakash-756.png" width="65px" style="border-radius:50%;" alt="Indraprakash"/> | **Indra Prakash** | 💻 Team Member / Developer | [@indraprakash-756](https://github.com/indraprakash-756) |
| <img src="https://github.com/kanishkajoshi32161.png" width="65px" style="border-radius:50%;" alt="Kanishka"/> | **Kanishka Joshi** | 💻 Team Member / Developer | [@kanishkajoshi32161](https://github.com/kanishkajoshi32161) |
| <img src="https://github.com/kavya-DD.png" width="65px" style="border-radius:50%;" alt="Kavya"/> | **Kavya** | 💻 Team Member / Developer | [@kavya-DD](https://github.com/kavya-DD) |
| <img src="https://github.com/Manas-uk.png" width="65px" style="border-radius:50%;" alt="Manas"/> | **Manas Singh** | 💻 Team Member / Developer | [@Manas-uk](https://github.com/Manas-uk) |
| <img src="https://github.com/utsaw-ik.png" width="65px" style="border-radius:50%;" alt="Utsaw"/> | **Utsaw** | 👑 Team Lead / Developer | [@utsaw-ik](https://github.com/utsaw-ik) |

</div>

---

## ⚖️ License & Disclaimer

- **Educational & SIH Prototype**: Red-zone risk screening buffers and hazard data serve decision support purposes. Official field interventions require validation from respective **SDMA / NDMA / CWC / IMD** authorities.
- Built with ❤️ for Disaster Preparedness & Smart Decision Making.
