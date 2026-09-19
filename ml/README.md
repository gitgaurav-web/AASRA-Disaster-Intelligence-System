# 🧠 AASRA ML Engine — Multi-Hazard Disaster Risk Prediction

> Production-grade machine learning subsystem for the **AASRA (आसरा)** Disaster Decision Support System.  
> Predicts real-time disaster severity risk (`Critical`, `High`, `Moderate`, `Low`) based on hazard kinematics, geographical exposure, meteorological telemetry, emergency mobilization indicators, and continuous impact modeling.

---

## 📊 1. Dataset Overview

The ML pipeline is trained on real-world global disaster historical records from the **EM-DAT (Emergency Events Database)** maintained by CRED (Centre for Research on the Epidemiology of Disasters), Université catholique de Louvain:

- **Source File**: `ml/public_emdat_custom_request_2026-09-18_7e9944dd-e2be-4019-8216-3965f57a20dd.xlsx`
- **Total Historical Events**: 18,033 records
- **Valid Events with Ground Truth Impact**: **17,116 records** (1900–2026)
- **Train / Test Split**: 80% Train (**13,692 samples**) / 20% Holdout Test (**3,424 samples**) stratified across disaster risk tiers.

### Continuous Severity Score & Quartile Discretization
To derive ground truth risk tiers objectively from multi-dimensional disaster aftermaths (fatalities, injuries, homelessness, total affected, and economic damage), a composite percentile impact score $S_i \in [0, 1]$ is computed:
$$S_i = \frac{1}{3}\text{Rank}(\text{Total Deaths}) + \frac{1}{3}\text{Rank}(\text{Total Affected}) + \frac{1}{3}\text{Rank}(\text{Total Damage Adjusted USD})$$

The severity score is discretized into 4 balanced, highly distinguishable risk tiers:
- **Low Risk** ($S_i \le 0.312$): Localized events manageable with standard municipal response.
- **Moderate Risk** ($0.312 < S_i \le 0.486$): Sub-district level disruption requiring district administration mobilization.
- **High Risk** ($0.486 < S_i \le 0.684$): Major regional disaster requiring SDRF deployment and inter-district shelters.
- **Critical Risk** ($S_i > 0.684$): Catastrophic event requiring national declaration, NDRF battalions, and air evacuation corridors.

---

## 🔬 2. Feature Engineering 2.0 (57 Features)

The pipeline extracts **57 high-signal domain features** across 6 distinct categories:

### A. Hazard Kinematics & Physical Attributes (8 Features)
- `disaster_group`, `disaster_subgroup`, `disaster_type`, `disaster_subtype`
- `is_rapid_onset`: Binary indicator distinguishing rapid-onset hazards (flash floods, earthquakes, landslides, storm surges) from slow-onset hazards (droughts, extreme heat).
- `magnitude_scale`, `magnitude_zscore`, `magnitude_log`

### B. Emergency Response & International Mobilization (5 Features)
- `declaration`: Official governmental state of emergency declaration.
- `appeal`: National request for international humanitarian assistance.
- `ofda_response`: Direct intervention from USAID / BHA (Bureau for Humanitarian Assistance).
- `emergency_response_score`: Composite escalation score $\in [0, 3]$.
- `has_international_aid`: Flag for bilateral or multilateral international deployment.

### C. Geospatial & Climatological Exposure (12 Features)
- `country`, `subregion`, `region`, `country_disaster`, `subregion_disaster`
- `latitude`, `longitude`, `abs_latitude` (distance from equator)
- `is_northern_hemisphere`, `is_tropical` ($|\text{Lat}| \le 23.5^\circ$)
- `has_coords`: Telemetry availability flag

### D. Location NLP & Terrain Clues (7 Features)
- `location_word_count`: Granularity of geographic descriptive text.
- `location_district_count`: Number of distinct districts mentioned.
- `has_admin_units`: Presence of formal administrative codes (ADM1/ADM2).
- `is_coastal_keyword`: Coastal terms detected (coast, beach, bay, port, island, gulf).
- `is_mountain_keyword`: Mountainous terrain terms detected (mountain, hill, ghat, valley, slope, peak).
- `is_urban_keyword`: Urban vulnerability terms detected (city, metro, municipal, urban).

### E. Temporal & Duration Dynamics (11 Features)
- `start_year`, `elapsed_years`, `start_decade`, `start_quarter`, `season`
- `duration_days`: Net event active duration.
- `duration_log`: Log-transformed duration $\ln(1 + \text{days})$.
- `is_multi_day`: Flag indicating protracted disaster events.
- `month_sin`, `month_cos`, `day_sin`, `day_cos`: Cyclical seasonal embeddings.

### F. Macroeconomic Context & Frequency Encoding (14 Features)
- `cpi`: Historical Consumer Price Index at time of disaster occurrence.
- `cpi_log`: Log-scaled macroeconomic price index.
- `magnitude_cpi_interaction`: Interaction of physical hazard energy with economic asset density.
- `duration_response_interaction`: Interaction of duration with emergency response mobilization.
- `country_freq`, `disaster_subtype_freq`, `country_disaster_freq`

---

## 🏗️ 3. Architecture: Grand Super-Ensemble with Dual-Task Ordinal Regression

Disaster risk prediction is inherently an **ordinal ranking problem** rather than an unordered nominal classification. Standard multi-class classifiers treat misclassifying `Critical` as `Low` with the same penalty as misclassifying `Critical` as `High`.

To overcome this fundamental limitation, AASRA introduces a **Dual-Task Architecture**:

- **Continuous Percentile Regression**: 3 dedicated continuous gradient boosted regressors (`XGBRegressor`, `CatBoostRegressor`, `LGBMRegressor`) predict continuous percentile impact scores.
- **Gaussian CDF Ordinal Probability Calibration**: Translates continuous impact into calibrated class probabilities:
  $$P(\text{Low}) = \Phi\left(\frac{q_{25} - \hat{S}}{\sigma}\right)$$
  $$P(\text{Moderate}) = \Phi\left(\frac{q_{50} - \hat{S}}{\sigma}\right) - \Phi\left(\frac{q_{25} - \hat{S}}{\sigma}\right)$$
  $$P(\text{High}) = \Phi\left(\frac{q_{75} - \hat{S}}{\sigma}\right) - \Phi\left(\frac{q_{50} - \hat{S}}{\sigma}\right)$$
  $$P(\text{Critical}) = 1 - \Phi\left(\frac{q_{75} - \hat{S}}{\sigma}\right)$$
  where $q_{25} = 0.312, q_{50} = 0.486, q_{75} = 0.684$, and bandwidth $\sigma = 0.15$.
- **6-Way Nelder-Mead Soft Voting**: Blends probability distributions from Tuned XGBoost, CatBoost, LightGBM, ExtraTrees, Random Forest, and the Dual-Task Regressors.

---

## 📈 4. Benchmark Scorecard & Evaluation

Strict holdout test evaluation (**3,424 real-world disaster records**, zero data leakage):

### Overall Model Comparison
| Model | Overall Accuracy | Macro ROC-AUC | Macro F1-Score | Critical Precision |
| :--- | :---: | :---: | :---: | :---: |
| **Random Forest (Baseline)** | 47.49% | 0.7327 | 0.4701 | 62.18% |
| **Tuned XGBoost** | 46.96% | 0.7342 | 0.4633 | 61.11% |
| **Tuned CatBoost** | 47.87% | 0.7351 | 0.4721 | 62.76% |
| **Tuned LightGBM** | 46.85% | 0.7335 | 0.4630 | 61.80% |
| **Grand Super-Ensemble (Production)** | **48.57%** | **0.7395** | **0.4845** | **64.61%** |

### Per-Class Performance (Grand Super-Ensemble)
| Risk Tier | Precision | Recall | F1-Score | Support |
| :--- | :---: | :---: | :---: | :---: |
| **Critical** | **64.61%** | 63.85% | **0.6423** | 852 |
| **High** | **37.54%** | 36.63% | **0.3708** | 860 |
| **Low** | **53.95%** | 58.18% | **0.5599** | 856 |
| **Moderate** | **37.32%** | 35.75% | **0.3652** | 856 |
| **Macro Average** | **48.36%** | **48.60%** | **0.4845** | 3,424 |
| **Weighted Average** | **48.32%** | **48.57%** | **0.4842** | 3,424 |

---

## 💻 5. Usage & API Reference

### Python In-Code Inference
```python
from ml.ml_engine import predict_risk_ml

# Predict multi-hazard risk for Chamoli flood scenario
result = predict_risk_ml(
    disaster_type="Flood",
    disaster_subtype="Riverine flood",
    country="India",
    subregion="Southern Asia",
    region="Asia",
    magnitude=7.2,
    magnitude_scale="Richter",
    location_text="Chamoli district slope, Uttarakhand",
    latitude=30.41,
    longitude=79.32,
    precipitation=45.0,
    wind_speed=22.0,
)

print("Predicted Tier:", result["predicted_risk_level"])
print("Model Confidence:", result["confidence"])
print("Class Probabilities:", result["confidence_by_class"])
```

### Retraining Pipeline
To retrain all standalone and ensemble models from the raw EM-DAT dataset:
```bash
# From workspace root:
backend\.venv\Scripts\python.exe -u ml/train_model.py
```
This automatically produces:
- `ml/ensemble_risk_model.pkl`: Production Grand Super-Ensemble binary.
- `ml/xgboost_risk_model.pkl`, `ml/catboost_risk_model.pkl`, `ml/lightgbm_risk_model.pkl`, `ml/risk_model.pkl`.
- `ml/label_encoders.pkl`: Categorical encoders and frequency mappings.
- `ml/training_metadata.json`: Full evaluation reports, confusion matrices, and feature lists.

---

## 📦 6. Serialized Artifacts Inventory

| Artifact | File Size | Description |
| :--- | :--- | :--- |
| `ml/ensemble_risk_model.pkl` | ~60 MB | Full 6-way soft-voting Grand Super-Ensemble with dual-task continuous regressor |
| `ml/xgboost_risk_model.pkl` | ~3.8 MB | Tuned multi-class XGBoost model |
| `ml/catboost_risk_model.pkl` | ~1.6 MB | Tuned CatBoost model |
| `ml/lightgbm_risk_model.pkl` | ~4.9 MB | Tuned LightGBM model |
| `ml/risk_model.pkl` | ~18 MB | Tuned Random Forest baseline model |
| `ml/label_encoders.pkl` | ~2.5 MB | Frequency dictionaries and Scikit-Learn label encoders |
| `ml/real_training_data.csv` | ~7.2 MB | Cleaned, 57-feature engineered EM-DAT dataset |
| `ml/training_metadata.json` | ~12 KB | Official metrics, confusion matrices, and hyperparameter logs |
