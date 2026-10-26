import React from 'react';
import { Satellite, CloudRain, Mountain, History, CheckCircle, ArrowRight, ShieldCheck, Database, Award, Cpu } from 'lucide-react';

export default function OverviewPage({ onExplore }) {
  return (
    <div className="space-y-8 py-6">
      {/* Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-emerald-950/40 border border-slate-700/60 p-8 sm:p-10 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>AI for Climate Resilience in Indian Agriculture &bull; Calibrated Semi-Synthetic Benchmark</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Climate-Aware Multimodal Modeling for <span className="text-emerald-400">Rice Yield Prediction</span>
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            A research-oriented platform integrating satellite vegetative indices, meteorological anomalies, digital pedometrics, and multi-decadal agricultural records to rigorously evaluate multimodal feature fusion, traditional ML baselines, and cross-modal neural attention.
          </p>
          <div className="pt-2 flex flex-wrap gap-4">
            <button
              onClick={onExplore}
              className="inline-flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <span>Launch Yield Predictor</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            <div className="inline-flex items-center space-x-2 bg-slate-800/80 border border-slate-700 px-4 py-3 rounded-xl text-xs text-slate-300">
              <Cpu className="h-4 w-4 text-emerald-400" />
              <span>Target: <strong>Tonnes / Hectare (t/ha)</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Best Test R²</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono">0.9548</span>
            <span className="text-xs text-emerald-400/80 font-medium">95.5% Var</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">Model: Full-feature XGBoost</p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">FusionNet Test R²</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-teal-400 font-mono">0.9329</span>
            <span className="text-xs text-slate-400">MAE 0.2774</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">ClimateRice-FusionNet</p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Hypothesis H1 Status</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-emerald-400">ACCEPTED</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">p = 2.54e-07 vs Satellite Only</p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Dataset Status</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-amber-400 font-mono">504 rows</span>
          </div>
          <p className="text-xs text-amber-400/80 mt-1">Calibrated Semi-Synthetic</p>
        </div>
      </div>

      {/* Research Question & Hypothesis Card */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/30">
            <Award className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Central Research Question &amp; Experimental Findings</h2>
        </div>
        
        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-700/60 font-mono text-sm text-emerald-300 leading-relaxed">
          &ldquo;Can integrating satellite, weather, soil, and historical agricultural information improve rice-yield prediction, and how does a multimodal deep-learning architecture compare with strong traditional machine-learning baselines?&rdquo;
        </div>

        <div className="grid md:grid-cols-2 gap-4 pt-2">
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>Multimodal Feature Integration (H1 Validated)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Multimodal feature integration significantly improves prediction relative to selected single-modality configurations. Fusing satellite, weather, soil, and historical lags reduces error by <strong>0.2652 t/ha</strong> compared to satellite alone (paired t-test p = 2.54e-07).
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              <span>Model Comparison (XGBoost vs FusionNet)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              XGBoost achieves lower test error than ClimateRice-FusionNet on this benchmark (MAE: 0.2014 vs 0.2774 t/ha). FusionNet provides complementary architectural capabilities: differentiable cross-modal attention and MC Dropout predictive intervals (empirical coverage = 95.83%).
            </p>
          </div>
        </div>
      </div>

      {/* 4 Modalities Grid */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Input Modalities & Scientific Variables</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Satellite className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-base">1. Satellite (5)</h3>
            <p className="text-xs text-slate-400">MODIS MOD13Q1 / Sentinel-2 optical composites at reproductive heading stages.</p>
            <ul className="text-xs text-slate-300 space-y-1 font-mono">
              <li>• ndvi_mean</li>
              <li>• ndvi_peak</li>
              <li>• evi_mean (high biomass)</li>
              <li>• ndwi_mean (water index)</li>
              <li>• ndvi_anomaly (Z-score)</li>
            </ul>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <CloudRain className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-base">2. Weather (10)</h3>
            <p className="text-xs text-slate-400">NASA POWER agroclimatology & climate shock anomaly metrics.</p>
            <ul className="text-xs text-slate-300 space-y-1 font-mono">
              <li>• rainfall_cumulative_mm</li>
              <li>• rainfall_anomaly_pct</li>
              <li>• temp_min / max / mean</li>
              <li>• extreme_heat_days (&gt;35°C)</li>
              <li>• consecutive_dry_days</li>
              <li>• solar_rad &amp; humidity</li>
            </ul>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Mountain className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-base">3. Soil Edaphic (7)</h3>
            <p className="text-xs text-slate-400">ISRIC SoilGrids 2.0 digital soil mapping at 0–30 cm root-zone depth.</p>
            <ul className="text-xs text-slate-300 space-y-1 font-mono">
              <li>• soil_ph (acidity/alkali)</li>
              <li>• organic_carbon (SOC)</li>
              <li>• soil_nitrogen (cg/kg)</li>
              <li>• clay_pct &amp; sand_pct</li>
              <li>• avail_water_capacity</li>
              <li>• cation_exchange (CEC)</li>
            </ul>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <History className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-base">4. Historical (4)</h3>
            <p className="text-xs text-slate-400">DES GoI / ICRISAT official district-level agricultural momentum.</p>
            <ul className="text-xs text-slate-300 space-y-1 font-mono">
              <li>• historical_yield_lag1</li>
              <li>• historical_yield_lag2</li>
              <li>• historical_3yr_mean</li>
              <li>• sown_area_hectares</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Strict Leakage Prevention Protocol */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-6 space-y-3">
        <h3 className="font-bold text-white flex items-center space-x-2">
          <Database className="h-5 w-5 text-emerald-400" />
          <span>Strict Temporal Partitioning & Zero Leakage Guarantee</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Random K-fold cross-validation erroneously leaks macro-climate trends and technological progression into evaluation. <strong>ClimateRice-AI enforces strict temporal holdout</strong>:
        </p>
        <div className="grid sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700 text-xs">
            <span className="text-slate-400 uppercase font-mono text-[10px]">Training Partition</span>
            <div className="font-bold text-white text-sm mt-0.5">Years 2000 – 2014</div>
            <span className="text-emerald-400 font-mono">360 records (71.4%)</span>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700 text-xs">
            <span className="text-slate-400 uppercase font-mono text-[10px]">Validation Partition</span>
            <div className="font-bold text-white text-sm mt-0.5">Years 2015 – 2016</div>
            <span className="text-amber-400 font-mono">48 records (9.5%)</span>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700 text-xs">
            <span className="text-slate-400 uppercase font-mono text-[10px]">Held-Out Test Partition</span>
            <div className="font-bold text-white text-sm mt-0.5">Years 2017 – 2020</div>
            <span className="text-sky-400 font-mono">96 records (19.1%)</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 italic">
          *All preprocessing standardizers and missing-value imputers are fit strictly on the Training Set and applied downstream without refitting.
        </p>
      </div>
    </div>
  );
}
