import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Award, Layers, Scale, AlertCircle, Database, CheckCircle2 } from 'lucide-react';
import { getBenchmarkData } from '../api/client';

export default function BenchmarkPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getBenchmarkData().then((res) => setData(res));
  }, []);

  const xgboostAblationList = [
    { id: 'Exp_A', name: 'Weather Only', modalities: 'Weather', mae: 0.9132, rmse: 1.1055, r2: 0.2081 },
    { id: 'Exp_B', name: 'Satellite Only', modalities: 'Satellite', mae: 0.5335, rmse: 0.7025, r2: 0.6802 },
    { id: 'Exp_C', name: 'Soil Only', modalities: 'Soil', mae: 0.4073, rmse: 0.5045, r2: 0.8351 },
    { id: 'Exp_D', name: 'Weather + Soil', modalities: 'Weather + Soil', mae: 0.3368, rmse: 0.4214, r2: 0.8849 },
    { id: 'Exp_E', name: 'Satellite + Weather', modalities: 'Satellite + Weather', mae: 0.5022, rmse: 0.6579, r2: 0.7195 },
    { id: 'Exp_F', name: 'Biophysical All', modalities: 'Satellite + Weather + Soil', mae: 0.3632, rmse: 0.4696, r2: 0.8571 },
    { id: 'Exp_G', name: 'Full (+History)', modalities: 'Sat + Wea + Soil + Hist', mae: 0.2014, rmse: 0.2641, r2: 0.9548 },
  ];

  const fusionNetAblationList = [
    { id: 'Exp_FN-A', name: 'Weather Only (FusionNet)', modalities: 'Weather', mae: 1.2050, rmse: 1.4140, r2: -0.2957 },
    { id: 'Exp_FN-B', name: 'Satellite Only (FusionNet)', modalities: 'Satellite', mae: 0.5793, rmse: 0.6971, r2: 0.6851 },
    { id: 'Exp_FN-C', name: 'Soil Only (FusionNet)', modalities: 'Soil', mae: 0.5578, rmse: 0.6361, r2: 0.7378 },
    { id: 'Exp_FN-D', name: 'Weather + Soil (FusionNet)', modalities: 'Weather + Soil', mae: 0.3941, rmse: 0.4521, r2: 0.8676 },
    { id: 'Exp_FN-E', name: 'Satellite + Weather (FusionNet)', modalities: 'Satellite + Weather', mae: 0.4456, rmse: 0.5351, r2: 0.8145 },
    { id: 'Exp_FN-F', name: 'Biophysical All (FusionNet)', modalities: 'Satellite + Weather + Soil', mae: 0.3532, rmse: 0.4191, r2: 0.8862 },
    { id: 'Exp_FN-G', name: 'FusionNet Full (+History)', modalities: 'Sat + Wea + Soil + Hist', mae: 0.2774, rmse: 0.3217, r2: 0.9329 },
  ];

  const baselinesList = [
    { name: 'Naive District Mean', type: 'Heuristic Baseline', mae: 0.4043, rmse: 0.5015, r2: 0.8371 },
    { name: 'Ridge Linear Regression', type: 'L2 Regularized Linear', mae: 0.2303, rmse: 0.2921, r2: 0.9447 },
    { name: 'Random Forest', type: 'Bagged Trees (150 trees)', mae: 0.2134, rmse: 0.2878, r2: 0.9463 },
    { name: 'XGBoost Regressor (Baseline)', type: 'Gradient Boosted Trees (200 trees)', mae: 0.2073, rmse: 0.2733, r2: 0.9516 },
    { name: 'Full-feature XGBoost (Exp G)', type: 'Gradient Boosted Trees (180 trees, depth 5)', mae: 0.2014, rmse: 0.2641, r2: 0.9548 },
    { name: 'Deep Tabular MLP', type: '3-Layer Neural Baseline', mae: 0.4074, rmse: 0.4676, r2: 0.8583 },
    { name: 'ClimateRice-FusionNet', type: 'Cross-Modal Attention + MC-Dropout', mae: 0.2774, rmse: 0.3217, r2: 0.9329 },
  ];

  const observationalList = [
    { name: 'ClimateRice-FusionNet', type: 'Multimodal Attention Network', mae: 0.3366, rmse: 0.4711, r2: 0.6803, coverage: '44.44% (calibrated: 83.33%)' },
    { name: 'Ridge Regression', type: 'L2 Linear Baseline', mae: 0.3502, rmse: 0.4771, r2: 0.6720, coverage: 'N/A' },
    { name: 'XGBoost Regressor', type: 'Gradient Boosted Trees', mae: 0.3699, rmse: 0.5332, r2: 0.5904, coverage: 'N/A' },
    { name: 'Random Forest', type: 'Bagged Tree Ensemble', mae: 0.3932, rmse: 0.5559, r2: 0.5548, coverage: 'N/A' },
    { name: 'Historical District Mean', type: 'Naive Mean Baseline', mae: 0.6222, rmse: 0.9022, r2: -0.1727, coverage: 'N/A' },
  ];

  return (
    <div className="space-y-8 py-6 sm:py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <Layers className="h-3.5 w-3.5" />
          <span>Dual Empirical Evaluation (Observational + Calibrated Benchmark)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-2">
          Model Benchmarks &amp; Modality Ablation Matrix
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-3xl leading-relaxed">
          Rigorous experimental evaluation across two parallel tracks: 
          (1) <strong>Genuine Observational Dataset (DES APY, N=303)</strong> evaluating real-world accuracy, and 
          (2) <strong>Calibrated Semi-Synthetic Benchmark (N=504)</strong> evaluating controlled 7-phase modality ablations and cross-modal attention dynamics.
        </p>
      </div>

      {/* Primary Observational Results Highlight (F1 & F2 Lead Story) */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/80 pb-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-emerald-800 uppercase tracking-wider">
                Primary Ground Truth Evaluation (Lead Story)
              </span>
              <h2 className="text-lg font-bold text-stone-900">
                Genuine Observational Dataset Results (DES APY + NASA POWER, N = 303)
              </h2>
            </div>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-900 font-mono font-bold px-3 py-1 rounded-full self-start sm:self-auto">
            Real Observations: 2000–2014
          </span>
        </div>

        <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
          Evaluated against 15 years of official district-level crop statistics from India&apos;s Directorate of Economics and Statistics (DES APY) 
          coupled with NASA POWER daily meteorology and SoilGrids pedometrics across 24 representative districts:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono bg-white rounded-xl border border-emerald-200/80 overflow-hidden">
            <thead className="bg-emerald-100/60 text-emerald-950 font-bold border-b border-emerald-200">
              <tr>
                <th className="py-2.5 px-3">Model Architecture</th>
                <th className="py-2.5 px-3">Model Family</th>
                <th className="py-2.5 px-3">Test MAE (t/ha)</th>
                <th className="py-2.5 px-3">Test RMSE (t/ha)</th>
                <th className="py-2.5 px-3">Test R² Score</th>
                <th className="py-2.5 px-3">Interval Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100 text-stone-800">
              {observationalList.map((m, idx) => (
                <tr key={idx} className={idx === 0 ? 'bg-emerald-50/50 font-semibold' : ''}>
                  <td className="py-2.5 px-3 text-stone-900">{m.name}</td>
                  <td className="py-2.5 px-3 text-stone-600 font-sans">{m.type}</td>
                  <td className="py-2.5 px-3 text-emerald-800 font-bold">{m.mae.toFixed(4)}</td>
                  <td className="py-2.5 px-3 text-stone-700">{m.rmse.toFixed(4)}</td>
                  <td className="py-2.5 px-3 text-emerald-800 font-bold">{m.r2.toFixed(4)}</td>
                  <td className="py-2.5 px-3 text-stone-600">{m.coverage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-stone-600 italic leading-relaxed">
          *On real observational data, <strong>ClimateRice-FusionNet achieves R² = 0.6803 and MAE = 0.3366 t/ha (RMSE: 0.4711 t/ha)</strong>, outperforming traditional gradient boosting (XGBoost MAE: 0.3699 t/ha, R²: 0.5904). 
          Uncalibrated predictive intervals achieve 44.44% (16/36) coverage on raw observations due to unobserved farm-level noise; split-conformal recalibration lifts held-out test coverage to 83.33% (5-split cross-validation mean: 90.56% ± 2.83%).
        </p>
      </div>

      {/* Extended Observational Panel (recorded yields to 2024) */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div>
          <span className="text-xs font-mono font-bold text-emerald-800 uppercase tracking-wider">
            Extended Observational Panel — Recorded Yields to 2024 (N = 427)
          </span>
          <p className="text-xs text-stone-600 leading-relaxed mt-2">
            The original 303-record panel (2000–2014) was extended with <strong>recorded</strong> DES yields from the
            India Data Portal APY compilation (+100 district-years to 2022) and its UPAG compilation (+24 to 2024,
            admitted only after 96/96 cross-source agreement on 2015–2022). Twelve districts now run continuously
            2000–2024. Extension gates: vintage match on all 216 overlapping district-years, (district, state)
            identity joins, and complete recorded lag chains — no simulated yields anywhere in the panel.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider">
                <th className="py-2 px-2">Held-Out Window</th>
                <th className="py-2 px-2">FusionNet MAE</th>
                <th className="py-2 px-2">FusionNet R²</th>
                <th className="py-2 px-2">Best Model</th>
                <th className="py-2 px-2">Coverage (uncal. → conformal)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              <tr>
                <td className="py-2 px-2">2013–2014 (train ≤2010, n=36)</td>
                <td className="py-2 px-2 font-bold text-emerald-800">0.3366</td>
                <td className="py-2 px-2 font-bold text-emerald-800">0.6803</td>
                <td className="py-2 px-2">FusionNet</td>
                <td className="py-2 px-2">44.44% → 83.33% (m = 2.4858)</td>
              </tr>
              <tr>
                <td className="py-2 px-2">2019–2022 (train ≤2016, n=48)</td>
                <td className="py-2 px-2">0.4485</td>
                <td className="py-2 px-2">0.4195</td>
                <td className="py-2 px-2">Ridge (0.3845)</td>
                <td className="py-2 px-2">45.83% → 87.50% (m = 2.6090)</td>
              </tr>
              <tr>
                <td className="py-2 px-2">2021–2024 (train ≤2018, n=48)</td>
                <td className="py-2 px-2 font-bold text-emerald-800">0.3454</td>
                <td className="py-2 px-2 font-bold text-emerald-800">0.5666</td>
                <td className="py-2 px-2">FusionNet</td>
                <td className="py-2 px-2">56.25% → 85.42% (m = 3.1339)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-stone-600 italic leading-relaxed">
          Holdouts are reported separately, never averaged: each uses a different training window, and the two
          later windows cover the 12 extended districts. Recorded district yields end at 2024 — the newest
          published compilations end at agricultural year 2024-25 — so 2025–2026 appear in the Predict studio
          only as clearly labelled model estimates built from observed NASA POWER weather.
        </p>
      </div>

      {/* Hypothesis Confirmation Card (Benchmark) */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-stone-100 text-emerald-700 flex items-center justify-center border border-stone-200">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-emerald-800 uppercase tracking-wider">
              Controlled Modality Ablation (calibrated semi-synthetic benchmark, N=504)
            </span>
            <h2 className="text-lg font-bold text-stone-900">
              Multimodal Feature Integration Confirmed (p = 2.54 × 10⁻⁷)
            </h2>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
          Controlled ablation confirms that fusing satellite, weather, soil, and historical momentum yields a statistically decisive error reduction over single-modality configurations:
        </p>

        <div className="grid sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 font-mono text-xs">
            <span className="text-stone-500 text-[10px] uppercase font-sans">Mean Error Reduction</span>
            <div className="text-lg font-bold text-emerald-800 mt-1">0.2652 t/ha</div>
            <span className="text-stone-500 text-[10px]">vs Satellite Only (p &lt;&lt; 0.05)</span>
          </div>

          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 font-mono text-xs">
            <span className="text-stone-500 text-[10px] uppercase font-sans">Paired t-test p-value</span>
            <div className="text-lg font-bold text-emerald-800 mt-1">2.54 &times; 10⁻⁷</div>
            <span className="text-emerald-700 text-[10px]">Statistically Significant (H1 Accepted)</span>
          </div>

          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 font-mono text-xs">
            <span className="text-stone-500 text-[10px] uppercase font-sans">Model Comparison (Tabular vs DL)</span>
            <div className="text-sm font-bold text-stone-800 mt-1">XGBoost &lt; FusionNet Error</div>
            <span className="text-stone-500 text-[10px]">p = 0.0019 (Tabular ML achieves lower MAE)</span>
          </div>
        </div>
      </div>

      {/* Feature Ablation Chart */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Feature-Modality Ablation via XGBoost (calibrated semi-synthetic benchmark, N=504)
            </h3>
            <p className="text-xs text-stone-500">Marginal predictive value as environmental modalities are coupled</p>
          </div>
          <span className="text-xs text-stone-500 font-mono">Lower error is better &darr;</span>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={xgboostAblationList} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '0.75rem', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="mae" name="MAE (t/ha)" fill="#047857" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rmse" name="RMSE (t/ha)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dual Ablation Tables Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Table 1 */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              1. Modality Ablation — XGBoost (calibrated benchmark, N=504)
            </h3>
            <p className="text-xs text-stone-500">Tabular gradient boosting progression across modality combinations</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-stone-50 text-stone-700 border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Experiment</th>
                  <th className="py-2.5 px-3">MAE</th>
                  <th className="py-2.5 px-3">RMSE</th>
                  <th className="py-2.5 px-3">R² Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {xgboostAblationList.map((exp) => (
                  <tr key={exp.id} className={exp.id === 'Exp_G' ? 'bg-emerald-50/60 font-semibold' : ''}>
                    <td className="py-2.5 px-3 text-stone-900">{exp.name}</td>
                    <td className="py-2.5 px-3 text-emerald-800 font-bold">{exp.mae.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-stone-700">{exp.rmse.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-stone-900 font-bold">{exp.r2.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2 */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              2. Modality Ablation — FusionNet (calibrated benchmark, N=504)
            </h3>
            <p className="text-xs text-stone-500">Deep cross-modal neural attention network progression</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-stone-50 text-stone-700 border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Experiment</th>
                  <th className="py-2.5 px-3">MAE</th>
                  <th className="py-2.5 px-3">RMSE</th>
                  <th className="py-2.5 px-3">R² Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {fusionNetAblationList.map((exp) => (
                  <tr key={exp.id} className={exp.id === 'Exp_FN-G' ? 'bg-emerald-50/60 font-semibold' : ''}>
                    <td className="py-2.5 px-3 text-stone-900">{exp.name}</td>
                    <td className="py-2.5 px-3 text-emerald-800 font-bold">{exp.mae.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-stone-700">{exp.rmse.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-stone-900 font-bold">{exp.r2.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Model Family Benchmarks */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              All Model Families Comparison (calibrated semi-synthetic benchmark, N=504, 26 features)
            </h3>
            <p className="text-xs text-stone-500">Evaluating tree-based ensembles, linear baselines, and neural architectures</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-stone-50 text-stone-700 border-b border-stone-200">
              <tr>
                <th className="py-3 px-3">Model Architecture</th>
                <th className="py-3 px-3">Complexity</th>
                <th className="py-3 px-3">Test MAE (t/ha)</th>
                <th className="py-3 px-3">Test RMSE (t/ha)</th>
                <th className="py-3 px-3">Test R² Score</th>
                <th className="py-3 px-3">Key Functional Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {baselinesList.map((m, i) => (
                <tr key={i} className={m.name.includes('Fusion') ? 'bg-emerald-50/60 font-semibold' : ''}>
                  <td className="py-2.5 px-3 text-stone-900 font-bold">{m.name}</td>
                  <td className="py-2.5 px-3 text-stone-600 font-sans">{m.type}</td>
                  <td className="py-2.5 px-3 text-emerald-800 font-bold">{m.mae.toFixed(4)}</td>
                  <td className="py-2.5 px-3 text-stone-700">{m.rmse.toFixed(4)}</td>
                  <td className="py-2.5 px-3 text-stone-900 font-bold">{m.r2.toFixed(4)}</td>
                  <td className="py-2.5 px-3 text-stone-600 font-sans">
                    {m.name.includes('Fusion') ? 'Cross-modal dynamic attention & MC uncertainty' : (m.name.includes('XGB') ? 'Strongest numerical point predictor on tabular features' : 'Comparison baseline')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 space-y-1.5 leading-relaxed">
          <div className="font-bold text-stone-900 flex items-center space-x-1.5">
            <Scale className="h-4 w-4 text-emerald-700" />
            <span>Scientific Model Selection Analysis</span>
          </div>
          <p>
            On tabular panel features, gradient boosted trees (Full-feature XGBoost, MAE: 0.2014 t/ha) achieve lower numerical point error than deep learning. 
            However, <strong>ClimateRice-FusionNet (MAE: 0.2774 t/ha on benchmark, 0.3366 t/ha on observational)</strong> provides: 
            (1) <em>end-to-end differentiable cross-modal attention</em> that dynamically reweights environmental signals during heat/drought shocks, and 
            (2) <em>MC Dropout epistemic predictive intervals</em>, communicating prediction uncertainty to agricultural decision-makers.
          </p>
        </div>
      </div>
    </div>
  );
}
