import sys
sys.path.insert(0, ".")
import joblib
import torch
import numpy as np
from src.preprocessing.pipeline import DataSplit
from src.models.multimodal_fusion import ClimateRiceFusionNet
from src.training.trainer import ModelTrainer
from src.evaluation.metrics import compute_regression_metrics

bundle = joblib.load("data/processed/splits_bundle.joblib")
train_split: DataSplit = bundle["train"]
val_split: DataSplit = bundle["val"]
test_split: DataSplit = bundle["test"]
modalities = bundle["modalities"]

trainer = ModelTrainer()

exp_configs = [
    ("Exp_FN_Weather_Only", ["weather"]),
    ("Exp_FN_Satellite_Only", ["satellite"]),
    ("Exp_FN_Soil_Only", ["soil"]),
    ("Exp_FN_Weather_Soil", ["weather", "soil"]),
    ("Exp_FN_Satellite_Weather", ["satellite", "weather"]),
    ("Exp_FN_Biophysical_All", ["satellite", "weather", "soil"]),
    ("Exp_FN_Full_Multimodal", ["satellite", "weather", "soil", "historical"]),
]

results = {}
for exp_id, mods in exp_configs:
    sub_dims = {m: len(modalities[m]) for m in mods}
    sub_train = DataSplit(
        df_raw=train_split.df_raw,
        X_dict={m: train_split.X_dict[m] for m in mods},
        X_flat=None,
        y=train_split.y,
        districts=train_split.districts,
        years=train_split.years,
        feature_names=[]
    )
    sub_val = DataSplit(
        df_raw=val_split.df_raw,
        X_dict={m: val_split.X_dict[m] for m in mods},
        X_flat=None,
        y=val_split.y,
        districts=val_split.districts,
        years=val_split.years,
        feature_names=[]
    )
    
    fn = ClimateRiceFusionNet(modality_dims=sub_dims, embed_dim=24, dense_hidden=[64, 32], dropout=0.20)
    fn, history, _ = trainer.train_fusion_net(fn, sub_train, sub_val, batch_size=64, lr=0.001, max_epochs=70, patience=10)
    
    with torch.no_grad():
        test_inputs = {m: torch.tensor(test_split.X_dict[m], dtype=torch.float32).to(trainer.device) for m in mods}
        preds, stds, _ = fn.predict_with_uncertainty(test_inputs, num_mc_samples=50)
        preds_np = preds.cpu().numpy()
        
    met = compute_regression_metrics(test_split.y, preds_np)
    results[exp_id] = met
    print(f"{exp_id:30s} -> MAE: {met['mae']:.4f} | RMSE: {met['rmse']:.4f} | R2: {met['r2']:.4f}")
