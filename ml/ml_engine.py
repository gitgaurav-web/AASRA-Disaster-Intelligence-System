"""
ml_engine.py
=============
Loads the trained models (Grand Super-Ensemble, Advanced Tuned XGBoost, LightGBM, CatBoost, and Random Forest Baseline)
and exposes predict_risk_ml() for inference across the DSS platform.
"""

import math
from pathlib import Path
import joblib
import numpy as np
import pandas as pd

ML_DIR = Path(__file__).resolve().parent
MODEL_PATH = ML_DIR / "risk_model.pkl"
XGBOOST_MODEL_PATH = ML_DIR / "xgboost_risk_model.pkl"
LIGHTGBM_MODEL_PATH = ML_DIR / "lightgbm_risk_model.pkl"
CATBOOST_MODEL_PATH = ML_DIR / "catboost_risk_model.pkl"
ENSEMBLE_MODEL_PATH = ML_DIR / "ensemble_risk_model.pkl"
ENCODERS_PATH = ML_DIR / "label_encoders.pkl"


_baseline_model = None
_xgboost_model = None
_lightgbm_model = None
_catboost_model = None
_ensemble_model = None
_encoders = None
_load_error = None


def _load():
    global _baseline_model, _xgboost_model, _lightgbm_model, _catboost_model, _ensemble_model, _encoders, _load_error
    try:
        _baseline_model = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else None
        _xgboost_model = joblib.load(XGBOOST_MODEL_PATH) if XGBOOST_MODEL_PATH.exists() else None
        _lightgbm_model = joblib.load(LIGHTGBM_MODEL_PATH) if LIGHTGBM_MODEL_PATH.exists() else None
        _catboost_model = joblib.load(CATBOOST_MODEL_PATH) if CATBOOST_MODEL_PATH.exists() else None
        _ensemble_model = joblib.load(ENSEMBLE_MODEL_PATH) if ENSEMBLE_MODEL_PATH.exists() else _xgboost_model
        _encoders = joblib.load(ENCODERS_PATH) if ENCODERS_PATH.exists() else None
    except Exception as exc:  # noqa: BLE001
        _load_error = str(exc)


_load()


def ml_model_available() -> bool:
    return _baseline_model is not None and _xgboost_model is not None and _encoders is not None


def _prepare_features(
    disaster_type: str,
    disaster_subtype: str = "Unknown",
    country: str = "Unknown",
    subregion: str = "Unknown",
    region: str = "Unknown",
    magnitude: float = 0.0,
    magnitude_scale: str = "Unknown",
    start_year: int = 2026,
    start_month: int = 6,
    start_day: int = 15,
    duration_days: float = 1.0,
    latitude: float = 0.0,
    longitude: float = 0.0,
    origin: str = "Unknown",
    associated_types: str = "None",
    declaration: str = "No",
    appeal: str = "No",
    ofda_response: str = "No",
    event_name: str = None,
    disaster_group: str = "Unknown",
    disaster_subgroup: str = "Unknown",
    cpi: float = 56.0,
    location_text: str = "",
) -> pd.DataFrame:
    scale_stats = _encoders.get("scale_stats", {}) if _encoders else {}
    stats = scale_stats.get(magnitude_scale, {"mean": 0.0, "std": 1.0})
    std = stats["std"] if stats["std"] > 0 else 1.0
    magnitude_zscore = float((magnitude - stats["mean"]) / std) if magnitude is not None else 0.0
    magnitude_log = float(np.log1p(max(0.0, float(magnitude or 0.0))))
    magnitude_missing = 1 if (magnitude is None or magnitude <= 0) else 0

    duration_clamped = max(1.0, min(365.0, float(duration_days or 1.0)))
    duration_log = float(np.log1p(duration_clamped))

    year = int(start_year or 2026)
    month = int(start_month or 6)
    day = int(start_day or 15)
    elapsed_years = max(0, 2026 - year)
    start_decade = (year // 10) * 10
    start_quarter = (month - 1) // 3 + 1

    month_sin = float(np.sin(2 * math.pi * month / 12))
    month_cos = float(np.cos(2 * math.pi * month / 12))
    day_sin = float(np.sin(2 * math.pi * day / 31))
    day_cos = float(np.cos(2 * math.pi * day / 31))

    lat = float(latitude or 0.0)
    lon = float(longitude or 0.0)
    has_coords = 1 if (lat != 0.0 or lon != 0.0) else 0
    is_northern_hemisphere = 1 if lat > 0 else 0

    has_event_name = 1 if event_name else 0
    disaster_multi_hazard = 1 if (associated_types and associated_types != "None") else 0

    loc_str = str(location_text or "")
    location_word_count = len(loc_str.split()) if loc_str else 0
    location_district_count = len(loc_str.split(",")) if loc_str else 0
    has_admin_units = 1 if location_district_count > 1 else 0

    # Default frequency priors
    country_freq = float(np.log1p(100.0))
    subtype_freq = float(np.log1p(50.0))
    country_disaster_freq = float(np.log1p(25.0))

    row = {
        "disaster_group": str(disaster_group or "Unknown"),
        "disaster_subgroup": str(disaster_subgroup or "Unknown"),
        "disaster_type": str(disaster_type or "Unknown"),
        "disaster_subtype": str(disaster_subtype or "Unknown"),
        "country": str(country or "Unknown"),
        "subregion": str(subregion or "Unknown"),
        "region": str(region or "Unknown"),
        "magnitude_scale": str(magnitude_scale or "Unknown"),
        "origin": str(origin or "Unknown"),
        "associated_types": str(associated_types or "None"),
        "declaration": str(declaration or "No"),
        "appeal": str(appeal or "No"),
        "ofda_response": str(ofda_response or "No"),
        "country_disaster": f"{country}_{disaster_type}",
        "subregion_disaster": f"{subregion}_{disaster_type}",
        "type_scale": f"{disaster_type}_{magnitude_scale}",
        "magnitude_zscore": magnitude_zscore,
        "magnitude_log": magnitude_log,
        "magnitude_missing": magnitude_missing,
        "duration_log": duration_log,
        "start_year": year,
        "elapsed_years": elapsed_years,
        "start_decade": start_decade,
        "start_quarter": start_quarter,
        "month_sin": month_sin,
        "month_cos": month_cos,
        "day_sin": day_sin,
        "day_cos": day_cos,
        "cpi": float(cpi or 56.0),
        "cpi_missing": 0,
        "has_coords": has_coords,
        "latitude": lat,
        "longitude": lon,
        "is_northern_hemisphere": is_northern_hemisphere,
        "has_event_name": has_event_name,
        "disaster_multi_hazard": disaster_multi_hazard,
        "location_word_count": location_word_count,
        "location_district_count": location_district_count,
        "has_admin_units": has_admin_units,
        "country_freq": country_freq,
        "disaster_subtype_freq": subtype_freq,
        "country_disaster_freq": country_disaster_freq,
    }
    return pd.DataFrame([row])


def predict_risk_ml(
    disaster_type: str,
    disaster_subtype: str = "Unknown",
    country: str = "Unknown",
    subregion: str = "Unknown",
    region: str = "Unknown",
    magnitude: float = 0.0,
    magnitude_scale: str = "Unknown",
    start_year: int = 2026,
    start_month: int = 6,
    start_day: int = 15,
    duration_days: float = 1.0,
    latitude: float = 0.0,
    longitude: float = 0.0,
    origin: str = "Unknown",
    associated_types: str = "None",
    declaration: str = "No",
    appeal: str = "No",
    ofda_response: str = "No",
    event_name: str = None,
    disaster_group: str = "Unknown",
    disaster_subgroup: str = "Unknown",
    cpi: float = 56.0,
    location_text: str = "",
) -> dict:
    """Predict disaster impact severity using the multi-model super-ensemble."""
    if not ml_model_available():
        raise RuntimeError(f"ML model not available: {_load_error or 'unknown load error'}")

    target_encoder = _encoders["target"]

    X = _prepare_features(
        disaster_type=disaster_type,
        disaster_subtype=disaster_subtype,
        country=country,
        subregion=subregion,
        region=region,
        magnitude=magnitude,
        magnitude_scale=magnitude_scale,
        start_year=start_year,
        start_month=start_month,
        start_day=start_day,
        duration_days=duration_days,
        latitude=latitude,
        longitude=longitude,
        origin=origin,
        associated_types=associated_types,
        declaration=declaration,
        appeal=appeal,
        ofda_response=ofda_response,
        event_name=event_name,
        disaster_group=disaster_group,
        disaster_subgroup=disaster_subgroup,
        cpi=cpi,
        location_text=location_text,
    )

    def format_prediction(model):
        if model is None:
            return None
        predicted_idx = int(model.predict(X)[0])
        label = str(target_encoder.inverse_transform([predicted_idx])[0])
        probabilities = model.predict_proba(X)[0]
        confidence_by_class = {
            str(cls): round(float(prob), 3)
            for cls, prob in zip(target_encoder.classes_, probabilities)
        }
        return {
            "predicted_risk_level": label,
            "confidence": confidence_by_class[label],
            "confidence_by_class": confidence_by_class,
        }

    baseline = format_prediction(_baseline_model)
    xgboost = format_prediction(_xgboost_model)
    ensemble = format_prediction(_ensemble_model) if _ensemble_model else xgboost

    return {
        **ensemble,
        "model": "Grand Super-Ensemble (XGBoost + LightGBM + CatBoost + Random Forest)",
        "xgboost_standalone": {**xgboost, "model": "Tuned XGBClassifier"},
        "baseline": {**baseline, "model": "RandomForestClassifier"},
        "note": "Trained on real EM-DAT records with hierarchical taxonomy, unit-scale normalization, and multi-model soft voting.",
    }
