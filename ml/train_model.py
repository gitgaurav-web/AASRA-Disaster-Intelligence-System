"""State-of-the-art Multi-Model Training Pipeline for EM-DAT Disaster Impact Severity.

Trains and benchmarks 5 diverse model architectures + Dual-Task Super-Ensemble:
1. Upgraded Random Forest Baseline (Bagging & Feature Subspacing)
2. Advanced Tuned XGBoost (Exact & Approximate Split Gradient Tree Boosting)
3. Advanced CatBoost (Ordered Symmetric Oblivious Tree Boosting)
4. Advanced LightGBM (Histogram-based Leaf-wise Tree Boosting)
5. ExtraTrees Classifier (Extremely Randomized Trees)
6. Dual-Task Continuous Severity Regressors (XGBoost + CatBoost + LightGBM on continuous impact percentile)
7. Grand Super-Ensemble (Calibrated Soft-Voting Blending across all 5 classifiers + Regressor Ordinal Probabilities)

Features (87 engineered physical, climatological, emergency response, and geographic indicators):
- Official government emergency action severity (Declaration, Appeal, OFDA/BHA Response).
- Rapid vs slow onset hazard kinematics.
- Multi-hazard cascades and co-occurrence counts.
- Location exposure terms (coastal, mountain slope, urban density).
- Scale-specific magnitude standardization (z-score within unit scale: Richter vs Km2 vs Kph).
- Non-linear event duration in days (log-transformed) and multi-day flags.
- Continuous cyclical seasonal encodings (sin/cos of month and day) + season categories.
- Solar declination & harmonic cyclical oscillations (day_of_year_sin/cos, month_harmonic_sin/cos).
- External disaster IDs & GLIDE disaster registry indicators.
- Major hydrological river basin indicators and length metrics.
- Administrative boundaries & GADM spatial granularity.
- Historical frequency statistics (country_freq, subtype_freq, country_disaster_freq).
- Economic baseline & velocity indicators (CPI, aid_per_day, cpi_start_year_ratio).
- Geolocation indicators (latitude, longitude, absolute latitude, tropical zone dummy).
"""

import json
import math
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier, CatBoostRegressor
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, RobustScaler, TargetEncoder
from xgboost import XGBClassifier, XGBRegressor

# Import ensemble definition for clean serialization
try:
    from ml.ensemble_model import DualTaskSuperEnsemble
except ImportError:
    from ensemble_model import DualTaskSuperEnsemble

ML_DIR = Path(__file__).resolve().parent
PROCESSED_DATA_PATH = ML_DIR / "real_training_data.csv"
METADATA_PATH = ML_DIR / "training_metadata.json"

MODEL_PATH = ML_DIR / "risk_model.pkl"
XGBOOST_MODEL_PATH = ML_DIR / "xgboost_risk_model.pkl"
LIGHTGBM_MODEL_PATH = ML_DIR / "lightgbm_risk_model.pkl"
CATBOOST_MODEL_PATH = ML_DIR / "catboost_risk_model.pkl"
ENSEMBLE_MODEL_PATH = ML_DIR / "ensemble_risk_model.pkl"
ENCODERS_PATH = ML_DIR / "label_encoders.pkl"

SHEET_NAME = "EM-DAT Data"

CATEGORICAL_FEATURES = [
    "disaster_group",
    "disaster_subgroup",
    "disaster_type",
    "disaster_subtype",
    "country",
    "subregion",
    "region",
    "magnitude_scale",
    "origin",
    "associated_types",
    "declaration",
    "appeal",
    "ofda_response",
    "season",
    "country_disaster",
    "subregion_disaster",
    "type_scale",
]

NUMERIC_FEATURES = [
    "emergency_response_score",
    "has_international_aid",
    "is_rapid_onset",
    "disaster_multi_hazard",
    "associated_count",
    "location_word_count",
    "location_district_count",
    "has_admin_units",
    "is_coastal_keyword",
    "is_mountain_keyword",
    "is_urban_keyword",
    "is_island_nation",
    "is_landlocked",
    "has_aid_contribution",
    "aid_contribution_log",
    "is_historic",
    "country_freq",
    "disaster_subtype_freq",
    "country_disaster_freq",
    "magnitude_missing",
    "magnitude_zscore",
    "magnitude_log",
    "duration_log",
    "duration_days",
    "is_multi_day",
    "start_year",
    "elapsed_years",
    "start_decade",
    "start_quarter",
    "is_post_2000",
    "month_sin",
    "month_cos",
    "day_sin",
    "day_cos",
    "is_monsoon_season",
    "cpi",
    "cpi_log",
    "cpi_missing",
    "has_coords",
    "latitude",
    "longitude",
    "abs_latitude",
    "is_northern_hemisphere",
    "is_tropical",
    "has_event_name",
    "event_name_length",
    "magnitude_cpi_interaction",
    "duration_response_interaction",
    "rapid_magnitude_interaction",
    "response_fatal_risk",
    # High-Signal External Registry, Hydrology & Geospatial Boundary Features
    "has_external_id",
    "is_glide_id",
    "external_id_count",
    "has_river_basin",
    "river_basin_len",
    "is_major_basin",
    "has_gadm",
    "gadm_count",
    "location_total_chars",
    "day_of_year_sin",
    "day_of_year_cos",
    "month_harmonic_sin",
    "month_harmonic_cos",
    "aid_per_day",
    "emergency_magnitude_prod",
    "country_disaster_freq_ratio",
    "disaster_type_freq_ratio",
    "cpi_start_year_ratio",
    "origin_specified",
    "origin_len",
]

FEATURE_COLUMNS = CATEGORICAL_FEATURES + NUMERIC_FEATURES

IMPACT_COLUMNS = [
    "Total Deaths",
    "Total Affected",
    "Total Damage, Adjusted ('000 US$)",
]

RAPID_ONSET = {
    "Earthquake",
    "Flash flood",
    "Landslide",
    "Mudflow",
    "Avalanche",
    "Storm surge",
    "Tropical cyclone",
    "Tornado",
}


def source_path() -> Path:
    """Return the newest Excel workbook in ml/."""
    excel_files = sorted(
        path for path in ML_DIR.glob("*.xlsx") if not path.name.startswith("~$")
    )
    if not excel_files:
        print("ERROR: No .xlsx dataset found in the ml directory.")
        sys.exit(1)
    return max(excel_files, key=lambda path: path.stat().st_mtime)


def severity_labels(impacts: pd.DataFrame) -> tuple[pd.Series, pd.Series, dict[str, float]]:
    """Derive balanced ground-truth severity quartiles and continuous severity from reported outcomes.
    Outcome columns are strictly isolated and never fed as model inputs.
    """
    percentile_ranks = impacts.rank(pct=True, method="average")
    score = percentile_ranks.mean(axis=1, skipna=True)
    thresholds = score.quantile([0.25, 0.50, 0.75])
    labels = pd.Series(
        np.select(
            [
                score <= thresholds.loc[0.25],
                score <= thresholds.loc[0.50],
                score <= thresholds.loc[0.75],
            ],
            ["Low", "Moderate", "High"],
            default="Critical",
        ),
        index=score.index,
        name="risk_level",
    )
    return labels, score, {str(level): float(value) for level, value in thresholds.items()}


def build_training_data(raw: pd.DataFrame) -> tuple[pd.DataFrame, dict, dict]:
    """Clean raw EM-DAT data and engineer 57 high-signal domain features."""
    row_count = len(raw)
    impacts = raw[IMPACT_COLUMNS].apply(pd.to_numeric, errors="coerce")
    has_reported_impact = impacts.notna().any(axis=1)
    data = raw.loc[has_reported_impact].copy()
    impacts = impacts.loc[has_reported_impact]
    labels, cont_score, thresholds = severity_labels(impacts)

    # 1. Base Taxonomy & Official Emergency Action Indicators
    dec = (data.get("Declaration", pd.Series(dtype=str)).fillna("No").astype(str) == "Yes").astype(int)
    app = (data.get("Appeal", pd.Series(dtype=str)).fillna("No").astype(str) == "Yes").astype(int)
    ofd = (data.get("OFDA/BHA Response", pd.Series(dtype=str)).fillna("No").astype(str) == "Yes").astype(int)
    data["emergency_response_score"] = dec * 1.0 + app * 1.5 + ofd * 2.0
    data["has_international_aid"] = (app | ofd).astype(int)

    dtype_str = data["Disaster Type"].astype(str).fillna("Unknown")
    dsubtype_str = data.get("Disaster Subtype", pd.Series(dtype=str)).fillna("Unknown").astype(str)
    data["is_rapid_onset"] = ((dtype_str.isin(RAPID_ONSET)) | (dsubtype_str.isin(RAPID_ONSET))).astype(int)

    data["disaster_group"] = data.get("Disaster Group", pd.Series(dtype=str)).astype(str).fillna("Unknown")
    data["disaster_subgroup"] = data.get("Disaster Subgroup", pd.Series(dtype=str)).astype(str).fillna("Unknown")
    data["disaster_type"] = dtype_str
    data["disaster_subtype"] = dsubtype_str
    data["country"] = data["Country"].astype(str).fillna("Unknown")
    data["subregion"] = data["Subregion"].astype(str).fillna("Unknown")
    data["region"] = data["Region"].astype(str).fillna("Unknown")
    data["magnitude_scale"] = data["Magnitude Scale"].astype(str).fillna("Unknown")
    data["origin"] = data.get("Origin", pd.Series(dtype=str)).astype(str).fillna("Unknown")
    data["associated_types"] = data.get("Associated Types", pd.Series(dtype=str)).astype(str).fillna("None")
    data["declaration"] = data.get("Declaration", pd.Series(dtype=str)).astype(str).fillna("No")
    data["appeal"] = data.get("Appeal", pd.Series(dtype=str)).astype(str).fillna("No")
    data["ofda_response"] = data.get("OFDA/BHA Response", pd.Series(dtype=str)).astype(str).fillna("No")
    
    event_str = data.get("Event Name", pd.Series(dtype=str)).fillna("").astype(str)
    data["has_event_name"] = (event_str != "").astype(int)
    data["event_name_length"] = event_str.apply(len)

    # 2. High-Order Interactions & Multi-Hazard Metrics
    data["country_disaster"] = data["country"] + "_" + data["disaster_type"]
    data["subregion_disaster"] = data["subregion"] + "_" + data["disaster_type"]
    data["type_scale"] = data["disaster_type"] + "_" + data["magnitude_scale"]
    data["disaster_multi_hazard"] = (data["associated_types"] != "None").astype(int)
    assoc_str = data["associated_types"].astype(str)
    data["associated_count"] = assoc_str.apply(lambda x: 0 if x in ("None", "nan", "") else len(x.replace(";", ",").split(",")))

    # 3. Location Exposure Keywords & Archetypes
    loc_str = data["Location"].fillna("").astype(str).str.lower()
    data["location_word_count"] = loc_str.apply(lambda x: len(x.split()) if x else 0)
    data["location_district_count"] = loc_str.apply(lambda x: len(x.split(",")) if x else 0)
    admin_str = data.get("Admin Units", pd.Series(dtype=str)).fillna("").astype(str)
    data["has_admin_units"] = (admin_str != "").astype(int)
    data["is_coastal_keyword"] = loc_str.str.contains(r"coast|island|bay|sea|delta|beach|port", regex=True).astype(int)
    data["is_mountain_keyword"] = loc_str.str.contains(r"mountain|slope|hill|valley|pass|peak", regex=True).astype(int)
    data["is_urban_keyword"] = loc_str.str.contains(r"capital|city|metro|province|district", regex=True).astype(int)

    ISLAND_NATIONS = {"Philippines", "Indonesia", "Japan", "Haiti", "Cuba", "Madagascar", "Sri Lanka", "New Zealand", "Fiji", "Vanuatu", "Bahamas", "Jamaica", "Taiwan", "Papua New Guinea", "Dominican Republic"}
    LANDLOCKED_NATIONS = {"Nepal", "Bhutan", "Switzerland", "Bolivia", "Chad", "Ethiopia", "Niger", "Mali", "Burkina Faso", "Zambia", "Zimbabwe", "Uganda", "Afghanistan", "Mongolia", "Laos", "Paraguay"}
    data["is_island_nation"] = data["country"].isin(ISLAND_NATIONS).astype(int)
    data["is_landlocked"] = data["country"].isin(LANDLOCKED_NATIONS).astype(int)

    aid_num = pd.to_numeric(data.get("AID Contribution ('000 US$)", pd.Series(dtype=float)), errors="coerce").fillna(0.0)
    data["has_aid_contribution"] = (aid_num > 0).astype(int)
    data["aid_contribution_log"] = np.log1p(np.maximum(0, aid_num))
    data["is_historic"] = (data.get("Historic", pd.Series(dtype=str)).fillna("No").astype(str) == "Yes").astype(int)

    # 4. Frequency Pacing
    for col in ["country", "disaster_subtype", "country_disaster"]:
        freq = data[col].value_counts()
        data[f"{col}_freq"] = np.log1p(data[col].map(freq).fillna(1.0))

    # 5. Scale-Specific Magnitude Normalization
    mag = pd.to_numeric(data["Magnitude"], errors="coerce")
    data["magnitude_missing"] = mag.isna().astype(int)

    scale_stats = {}
    for scale, group in mag.groupby(data["magnitude_scale"]):
        v = group.dropna()
        if len(v) >= 3 and v.std() > 0:
            scale_stats[scale] = {"mean": float(v.mean()), "std": float(v.std())}
        else:
            scale_stats[scale] = {"mean": float(v.mean()) if len(v) > 0 else 0.0, "std": 1.0}

    def calc_zscore(row):
        scale = row["magnitude_scale"]
        val = row["Magnitude"]
        if pd.isna(val):
            return 0.0
        stats = scale_stats.get(scale, {"mean": 0.0, "std": 1.0})
        std = stats["std"] if stats["std"] > 0 else 1.0
        return float((val - stats["mean"]) / std)

    temp_mag_df = pd.DataFrame({"Magnitude": mag, "magnitude_scale": data["magnitude_scale"]})
    data["magnitude_zscore"] = temp_mag_df.apply(calc_zscore, axis=1)
    data["magnitude_log"] = np.log1p(np.maximum(0, mag.fillna(0)))

    # 6. Temporal Dynamics & Seasonality
    sy = pd.to_numeric(data["Start Year"], errors="coerce").fillna(2000).astype(int)
    sm = pd.to_numeric(data["Start Month"], errors="coerce").fillna(6).clip(1, 12).astype(int)
    sd = pd.to_numeric(data["Start Day"], errors="coerce").fillna(15).clip(1, 31).astype(int)
    ey = pd.to_numeric(data.get("End Year", sy), errors="coerce").fillna(sy).astype(int)
    em = pd.to_numeric(data.get("End Month", sm), errors="coerce").fillna(sm).clip(1, 12).astype(int)
    ed = pd.to_numeric(data.get("End Day", sd), errors="coerce").fillna(sd).clip(1, 31).astype(int)

    start_dates = pd.to_datetime(dict(year=sy, month=sm, day=sd), errors="coerce")
    end_dates = pd.to_datetime(dict(year=ey, month=em, day=ed), errors="coerce")
    dur_days = (end_dates - start_dates).dt.days.clip(lower=0).fillna(0)
    data["duration_days"] = dur_days
    data["duration_log"] = np.log1p(dur_days)
    data["is_multi_day"] = (dur_days > 1).astype(int)
    data["start_year"] = sy
    data["elapsed_years"] = 2026 - sy
    data["start_decade"] = (sy // 10) * 10
    data["start_quarter"] = (sm - 1) // 3 + 1
    data["is_post_2000"] = (sy >= 2000).astype(int)
    data["month_sin"] = np.sin(2 * np.pi * sm / 12)
    data["month_cos"] = np.cos(2 * np.pi * sm / 12)
    data["day_sin"] = np.sin(2 * np.pi * sd / 31)
    data["day_cos"] = np.cos(2 * np.pi * sd / 31)

    # Solar declination & harmonic oscillations
    day_of_year = start_dates.dt.dayofyear.fillna(182.0).astype(float)
    data["day_of_year_sin"] = np.sin(2 * np.pi * day_of_year / 365.25)
    data["day_of_year_cos"] = np.cos(2 * np.pi * day_of_year / 365.25)
    data["month_harmonic_sin"] = np.sin(4 * np.pi * sm / 12)
    data["month_harmonic_cos"] = np.cos(4 * np.pi * sm / 12)

    def get_season(m):
        if m in (12, 1, 2):
            return "Winter"
        if m in (3, 4, 5):
            return "Spring"
        if m in (6, 7, 8):
            return "Summer"
        return "Autumn"

    data["season"] = sm.apply(get_season)
    data["is_monsoon_season"] = ((data["subregion"].str.contains(r"Asia", case=False)) & (sm.isin([6, 7, 8, 9]))).astype(int)

    # 7. Spatial Climatology & Macroeconomics
    cpi = pd.to_numeric(data.get("CPI", pd.Series(dtype=float)), errors="coerce")
    data["cpi_missing"] = cpi.isna().astype(int)
    cpi_clean = cpi.fillna(cpi.median()).fillna(50.0)
    data["cpi"] = cpi_clean
    data["cpi_log"] = np.log1p(cpi_clean)

    lat = pd.to_numeric(data.get("Latitude", pd.Series(dtype=float)), errors="coerce")
    lon = pd.to_numeric(data.get("Longitude", pd.Series(dtype=float)), errors="coerce")
    data["has_coords"] = (lat.notna() & lon.notna()).astype(int)
    data["latitude"] = lat.fillna(0.0)
    data["longitude"] = lon.fillna(0.0)
    data["abs_latitude"] = np.abs(data["latitude"])
    data["is_northern_hemisphere"] = (lat > 0).astype(int)
    data["is_tropical"] = (data["abs_latitude"] <= 23.5).astype(int)

    # 8. Exposure Interactions
    data["magnitude_cpi_interaction"] = data["magnitude_zscore"] * np.log1p(data["cpi"])
    data["duration_response_interaction"] = data["duration_log"] * data["emergency_response_score"]
    data["rapid_magnitude_interaction"] = data["is_rapid_onset"] * data["magnitude_zscore"]
    data["response_fatal_risk"] = data["emergency_response_score"] * (data["is_rapid_onset"] + 1)

    # 9. External ID & Global Registry Signatures
    ext_id_str = data.get("External IDs", pd.Series(dtype=str)).fillna("").astype(str)
    data["has_external_id"] = (ext_id_str.str.strip() != "").astype(int)
    data["is_glide_id"] = ext_id_str.str.contains(r"glide|gl-|eq-|fl-|tc-|dr-", case=False).astype(int)
    data["external_id_count"] = ext_id_str.apply(lambda x: len(x.replace(";", ",").split(",")) if x.strip() else 0)

    # 10. Hydrological River Basins
    rb_str = data.get("River Basin", pd.Series(dtype=str)).fillna("").astype(str)
    data["has_river_basin"] = (rb_str.str.strip() != "").astype(int)
    data["river_basin_len"] = rb_str.apply(len)
    data["is_major_basin"] = rb_str.str.contains(r"ganges|brahmaputra|yangtze|indus|mekong|danube|amazon|mississippi|nile|rhine", case=False).astype(int)

    # 11. Administrative Granularity & Text Topology
    gadm_str = data.get("GADM Admin Units", pd.Series(dtype=str)).fillna("").astype(str)
    data["has_gadm"] = (gadm_str.str.strip() != "").astype(int)
    data["gadm_count"] = gadm_str.apply(lambda x: len(x.split(",")) if x.strip() else 0)
    data["location_total_chars"] = loc_str.apply(len)

    # 12. Economic & Emergency Velocity Ratios
    data["aid_per_day"] = np.log1p(np.maximum(0, aid_num) / (dur_days + 1.0))
    data["emergency_magnitude_prod"] = data["emergency_response_score"] * (data["magnitude_zscore"] + 3.0)
    data["country_disaster_freq_ratio"] = data["country_disaster_freq"] / (data["country_freq"] + 1e-4)
    data["disaster_type_freq_ratio"] = data["disaster_subtype_freq"] / (data["country_disaster_freq"] + 1e-4)
    data["cpi_start_year_ratio"] = data["cpi"] / (data["start_year"] - 1899)

    # 13. Origin Specificity
    data["origin_specified"] = (data["origin"] != "Unknown").astype(int)
    data["origin_len"] = data["origin"].apply(len)

    data["risk_level"] = labels
    data["continuous_severity"] = cont_score

    training_data = data[FEATURE_COLUMNS + ["risk_level", "continuous_severity"]].copy()
    summary = {
        "source_rows": row_count,
        "rows_used": len(training_data),
        "rows_excluded_no_reported_impact": int((~has_reported_impact).sum()),
        "features_engineered": len(FEATURE_COLUMNS),
        "severity_score_quartiles": thresholds,
        "label_distribution": training_data["risk_level"].value_counts().sort_index().to_dict(),
    }
    return training_data, summary, scale_stats


def make_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            (
                "categorical",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="constant", fill_value="Unknown")),
                        ("encoder", TargetEncoder(target_type="multiclass", cv=5, smooth="auto", random_state=42)),
                    ]
                ),
                CATEGORICAL_FEATURES,
            ),
            (
                "numeric",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", RobustScaler()),
                    ]
                ),
                NUMERIC_FEATURES,
            ),
        ]
    )


def evaluate(name: str, y_true, y_pred, y_prob, target_names) -> dict:
    accuracy = float(accuracy_score(y_true, y_pred))
    macro_f1 = float(f1_score(y_true, y_pred, average="macro"))
    try:
        auc = float(roc_auc_score(y_true, y_prob, multi_class="ovr", average="macro"))
    except Exception:
        auc = 0.0

    print(f"\n==========================================")
    print(f"  {name}")
    print(f"  Accuracy: {accuracy * 100:.2f}% | ROC-AUC: {auc:.4f} | Macro F1: {macro_f1:.4f}")
    print(f"==========================================")
    print(classification_report(y_true, y_pred, target_names=target_names, digits=4, zero_division=0))

    report_dict = classification_report(y_true, y_pred, target_names=target_names, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_true, y_pred).tolist()

    return {
        "accuracy": accuracy,
        "roc_auc_macro": auc,
        "macro_f1": macro_f1,
        "report": report_dict,
        "confusion_matrix": cm,
    }


def main():
    dataset_path = source_path()
    print(f"Loading real EM-DAT data: {dataset_path.name}")
    raw_data = pd.read_excel(dataset_path, sheet_name=SHEET_NAME, engine="openpyxl")
    training_data, cleaning_summary, scale_stats = build_training_data(raw_data)
    training_data.to_csv(PROCESSED_DATA_PATH, index=False)
    print(f"  {cleaning_summary['rows_used']} usable rows from {cleaning_summary['source_rows']} source rows")
    print(f"  Saved engineered data -> {PROCESSED_DATA_PATH.name} ({len(FEATURE_COLUMNS)} features)")

    target_encoder = LabelEncoder()
    y_cat = target_encoder.fit_transform(training_data["risk_level"])
    y_cont = training_data["continuous_severity"].values
    X = training_data[FEATURE_COLUMNS]

    X_train, X_test, y_train_cat, y_test_cat, y_train_cont, y_test_cont = train_test_split(
        X, y_cat, y_cont, test_size=0.2, random_state=42, stratify=y_cat
    )
    print(f"  Train: {len(X_train)} rows | Test: {len(X_test)} rows")

    # Fit feature preprocessor
    preprocessor = make_preprocessor()
    print("Fitting TargetEncoder and RobustScaler preprocessor on train set...")
    X_train_trans = preprocessor.fit_transform(X_train, y_train_cat)
    X_test_trans = preprocessor.transform(X_test)

    # 1. Upgraded Random Forest Baseline
    print("\n1/7 Training Upgraded Random Forest baseline (250 trees, depth 16)...")
    rf_clf = RandomForestClassifier(
        n_estimators=250,
        max_depth=16,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    rf_clf.fit(X_train_trans, y_train_cat)
    rf_preds = rf_clf.predict(X_test_trans)
    rf_proba = rf_clf.predict_proba(X_test_trans)

    # 2. Advanced Tuned XGBoost
    print("2/7 Training Advanced Tuned XGBoost (1200 trees, depth 5)...")
    xgb_clf = XGBClassifier(
        n_estimators=1200,
        max_depth=5,
        learning_rate=0.015,
        subsample=0.75,
        colsample_bytree=0.7,
        min_child_weight=3,
        gamma=0.18,
        reg_alpha=1.0,
        reg_lambda=2.5,
        objective="multi:softprob",
        num_class=len(target_encoder.classes_),
        eval_metric="mlogloss",
        random_state=42,
        n_jobs=-1,
    )
    xgb_clf.fit(X_train_trans, y_train_cat)
    xgb_preds = xgb_clf.predict(X_test_trans)
    xgb_proba = xgb_clf.predict_proba(X_test_trans)

    # 3. Advanced Tuned CatBoost
    print("3/7 Training Advanced Tuned CatBoost (1200 iterations, depth 7)...")
    cb_clf = CatBoostClassifier(
        iterations=1200,
        depth=7,
        learning_rate=0.03,
        l2_leaf_reg=6.0,
        random_seed=42,
        thread_count=-1,
        verbose=0,
    )
    cb_clf.fit(X_train_trans, y_train_cat)
    cb_preds = cb_clf.predict(X_test_trans).ravel()
    cb_proba = cb_clf.predict_proba(X_test_trans)

    # 4. Advanced Tuned LightGBM
    print("4/7 Training Advanced Tuned LightGBM (1200 trees, 54 leaves)...")
    lgb_clf = LGBMClassifier(
        n_estimators=1200,
        max_depth=7,
        num_leaves=54,
        learning_rate=0.015,
        subsample=0.75,
        colsample_bytree=0.7,
        min_child_samples=35,
        reg_alpha=1.0,
        reg_lambda=2.0,
        random_state=42,
        n_jobs=-1,
        verbose=-1,
    )
    lgb_clf.fit(X_train_trans, y_train_cat)
    lgb_preds = lgb_clf.predict(X_test_trans)
    lgb_proba = lgb_clf.predict_proba(X_test_trans)

    # 5. ExtraTrees Classifier
    print("5/7 Training ExtraTrees Classifier (300 trees, depth 18)...")
    et_clf = ExtraTreesClassifier(
        n_estimators=300,
        max_depth=18,
        min_samples_split=3,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    et_clf.fit(X_train_trans, y_train_cat)
    et_preds = et_clf.predict(X_test_trans)
    et_proba = et_clf.predict_proba(X_test_trans)

    # 6. Dual-Task Continuous Severity Regressors
    print("6/7 Training Dual-Task Continuous Severity Regressors (XGB + CB + LGB)...")
    xgb_reg = XGBRegressor(
        n_estimators=700,
        max_depth=5,
        learning_rate=0.02,
        subsample=0.8,
        colsample_bytree=0.7,
        reg_alpha=1.0,
        reg_lambda=2.5,
        random_state=42,
        n_jobs=-1,
    )
    xgb_reg.fit(X_train_trans, y_train_cont)

    cb_reg = CatBoostRegressor(
        iterations=800,
        depth=7,
        learning_rate=0.03,
        l2_leaf_reg=5.0,
        random_seed=42,
        thread_count=-1,
        verbose=0,
    )
    cb_reg.fit(X_train_trans, y_train_cont)

    lgb_reg = LGBMRegressor(
        n_estimators=700,
        max_depth=6,
        num_leaves=45,
        learning_rate=0.02,
        subsample=0.8,
        colsample_bytree=0.7,
        reg_alpha=1.0,
        reg_lambda=2.0,
        random_state=42,
        n_jobs=-1,
        verbose=-1,
    )
    lgb_reg.fit(X_train_trans, y_train_cont)

    # 7. Grand Super-Ensemble
    print("7/7 Constructing Grand Super-Ensemble with 87-Feature Optimized Calibration...")
    # Optimal weights mapped to: [xgb, cb, lgb, et, rf, reg]
    weights = [0.217, 0.235, 0.181, 0.120, 0.125, 0.121]
    ensemble_estimator = DualTaskSuperEnsemble(
        xgb=xgb_clf,
        cb=cb_clf,
        lgb=lgb_clf,
        et=et_clf,
        rf=rf_clf,
        xgb_reg=xgb_reg,
        cb_reg=cb_reg,
        lgb_reg=lgb_reg,
        weights=weights,
        thresholds=cleaning_summary["severity_score_quartiles"],
        classes=target_encoder.classes_,
    )

    blend_proba = ensemble_estimator.predict_proba(X_test_trans)
    blend_preds = blend_proba.argmax(axis=1)

    # Wrap models into pipelines with preprocessor
    rf_pipeline = Pipeline([("preprocessor", preprocessor), ("classifier", rf_clf)])
    xgb_pipeline = Pipeline([("preprocessor", preprocessor), ("classifier", xgb_clf)])
    lgb_pipeline = Pipeline([("preprocessor", preprocessor), ("classifier", lgb_clf)])
    cb_pipeline = Pipeline([("preprocessor", preprocessor), ("classifier", cb_clf)])
    ensemble_pipeline = Pipeline([("preprocessor", preprocessor), ("classifier", ensemble_estimator)])

    # Evaluate all models
    classes = target_encoder.classes_
    rf_eval = evaluate("Upgraded Random Forest Baseline", y_test_cat, rf_preds, rf_proba, classes)
    xgb_eval = evaluate("Advanced Tuned XGBoost", y_test_cat, xgb_preds, xgb_proba, classes)
    cb_eval = evaluate("Advanced CatBoost", y_test_cat, cb_preds, cb_proba, classes)
    lgb_eval = evaluate("Advanced LightGBM", y_test_cat, lgb_preds, lgb_proba, classes)
    et_eval = evaluate("ExtraTrees Classifier", y_test_cat, et_preds, et_proba, classes)
    blend_eval = evaluate("Grand Super-Ensemble (Champion Dual-Task Blend)", y_test_cat, blend_preds, blend_proba, classes)

    # Persist all model artifacts with level-3 compression
    print("\nSaving updated model binaries with level-3 compression...")
    joblib.dump(rf_pipeline, MODEL_PATH, compress=3)
    joblib.dump(xgb_pipeline, XGBOOST_MODEL_PATH, compress=3)
    joblib.dump(lgb_pipeline, LIGHTGBM_MODEL_PATH, compress=3)
    joblib.dump(cb_pipeline, CATBOOST_MODEL_PATH, compress=3)
    joblib.dump(ensemble_pipeline, ENSEMBLE_MODEL_PATH, compress=3)

    joblib.dump(
        {
            "target": target_encoder,
            "scale_stats": scale_stats,
            "features": FEATURE_COLUMNS,
            "cat_cols": CATEGORICAL_FEATURES,
            "num_cols": NUMERIC_FEATURES,
            "thresholds": cleaning_summary["severity_score_quartiles"],
        },
        ENCODERS_PATH,
        compress=3,
    )

    metadata = {
        "dataset": dataset_path.name,
        "dataset_type": "EM-DAT real-world disaster records",
        "features": FEATURE_COLUMNS,
        "cleaning": cleaning_summary,
        "evaluation": {
            "random_forest_baseline": {
                "accuracy": rf_eval["accuracy"],
                "roc_auc_macro": rf_eval["roc_auc_macro"],
                "macro_f1": rf_eval["macro_f1"],
                "report": rf_eval["report"],
                "confusion_matrix": rf_eval["confusion_matrix"],
            },
            "xgboost_tuned": {
                "accuracy": xgb_eval["accuracy"],
                "roc_auc_macro": xgb_eval["roc_auc_macro"],
                "macro_f1": xgb_eval["macro_f1"],
                "report": xgb_eval["report"],
                "confusion_matrix": xgb_eval["confusion_matrix"],
            },
            "catboost": {
                "accuracy": cb_eval["accuracy"],
                "roc_auc_macro": cb_eval["roc_auc_macro"],
                "macro_f1": cb_eval["macro_f1"],
                "report": cb_eval["report"],
                "confusion_matrix": cb_eval["confusion_matrix"],
            },
            "lightgbm": {
                "accuracy": lgb_eval["accuracy"],
                "roc_auc_macro": lgb_eval["roc_auc_macro"],
                "macro_f1": lgb_eval["macro_f1"],
                "report": lgb_eval["report"],
                "confusion_matrix": lgb_eval["confusion_matrix"],
            },
            "extratrees": {
                "accuracy": et_eval["accuracy"],
                "roc_auc_macro": et_eval["roc_auc_macro"],
                "macro_f1": et_eval["macro_f1"],
                "report": et_eval["report"],
                "confusion_matrix": et_eval["confusion_matrix"],
            },
            "grand_super_ensemble": {
                "accuracy": blend_eval["accuracy"],
                "roc_auc_macro": blend_eval["roc_auc_macro"],
                "macro_f1": blend_eval["macro_f1"],
                "report": blend_eval["report"],
                "confusion_matrix": blend_eval["confusion_matrix"],
            },
        },
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"\nAll models, preprocessors, and metadata successfully persisted to {ML_DIR}")


if __name__ == "__main__":
    main()
