import numpy as np
from scipy.stats import norm
from sklearn.base import BaseEstimator, ClassifierMixin


class DualTaskSuperEnsemble(BaseEstimator, ClassifierMixin):
    """Super-Ensemble combining diverse multi-class gradient boosted trees
    with dual-task continuous severity regression & calibrated ordinal probabilities.
    """

    def __sklearn_is_fitted__(self):
        return True

    def fit(self, X=None, y=None):
        return self

    def __init__(
        self,
        xgb,
        cb,
        lgb,
        et,
        rf,
        xgb_reg,
        cb_reg,
        lgb_reg,
        weights,
        thresholds,
        classes,
    ):
        self.xgb = xgb
        self.cb = cb
        self.lgb = lgb
        self.et = et
        self.rf = rf
        self.xgb_reg = xgb_reg
        self.cb_reg = cb_reg
        self.lgb_reg = lgb_reg
        self.weights = list(weights)
        self.thresholds = dict(thresholds)
        self.classes = list(classes)
        self.classes_ = np.array(classes)

    @property
    def classes(self):
        return list(getattr(self, "classes_", []))

    @classes.setter
    def classes(self, val):
        self.classes_ = np.array(val)

    def predict_proba(self, X):
        p_xgb = self.xgb.predict_proba(X)
        p_cb = self.cb.predict_proba(X)
        p_lgb = self.lgb.predict_proba(X)
        p_et = self.et.predict_proba(X)
        p_rf = self.rf.predict_proba(X)

        # Dual-task continuous severity regression prediction
        pred_cont = (
            0.40 * self.xgb_reg.predict(X)
            + 0.35 * self.cb_reg.predict(X)
            + 0.25 * self.lgb_reg.predict(X)
        )

        q25 = float(self.thresholds.get("0.25", 0.312))
        q50 = float(self.thresholds.get("0.5", 0.486))
        q75 = float(self.thresholds.get("0.75", 0.684))
        sigma = 0.15

        crit_idx = list(self.classes_).index("Critical")
        high_idx = list(self.classes_).index("High")
        mod_idx = list(self.classes_).index("Moderate")
        low_idx = list(self.classes_).index("Low")

        p_reg = np.zeros((len(X), 4))
        p_reg[:, low_idx] = norm.cdf(q25, loc=pred_cont, scale=sigma)
        p_reg[:, mod_idx] = norm.cdf(q50, loc=pred_cont, scale=sigma) - norm.cdf(q25, loc=pred_cont, scale=sigma)
        p_reg[:, high_idx] = norm.cdf(q75, loc=pred_cont, scale=sigma) - norm.cdf(q50, loc=pred_cont, scale=sigma)
        p_reg[:, crit_idx] = 1.0 - norm.cdf(q75, loc=pred_cont, scale=sigma)
        p_reg = np.clip(p_reg, 1e-6, 1.0)
        p_reg = p_reg / p_reg.sum(axis=1, keepdims=True)

        w = np.array(self.weights) / sum(self.weights)
        blend = (
            w[0] * p_xgb
            + w[1] * p_cb
            + w[2] * p_lgb
            + w[3] * p_et
            + w[4] * p_rf
            + w[5] * p_reg
        )
        return blend

    def predict(self, X):
        proba = self.predict_proba(X)
        return proba.argmax(axis=1)
