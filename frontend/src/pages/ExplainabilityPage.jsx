import React from 'react';
import { Eye, TrendingUp, TrendingDown, Layers, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ExplainabilityPage() {
  const topFeatures = [
    { feature: 'rainfall_cumulative_mm', modality: 'weather', score: 0.2442, color: '#3b82f6', desc: 'Total monsoon precipitation supplying paddy submergence and root-zone water balance' },
    { feature: 'ndvi_anomaly', modality: 'satellite', score: 0.1734, color: '#10b981', desc: 'Standardized departure from district multi-year vegetative baseline' },
    { feature: 'ndvi_mean', modality: 'satellite', score: 0.0887, color: '#10b981', desc: 'Chlorophyll canopy greenness during reproductive heading phase' },
    { feature: 'evi_mean', modality: 'satellite', score: 0.0839, color: '#10b981', desc: 'Enhanced Vegetation Index mitigating atmospheric and canopy saturation noise' },
    { feature: 'temp_min_deg_c', modality: 'weather', score: 0.0688, color: '#3b82f6', desc: 'Nighttime minimum temperature controlling respiratory biomass consumption' },
    { feature: 'historical_yield_3yr_mean', modality: 'historical', score: 0.0500, color: '#f59e0b', desc: 'Rolling 3-year prior agricultural productivity momentum' },
    { feature: 'sown_area_ha', modality: 'historical', score: 0.0387, color: '#f59e0b', desc: 'Gross district harvested acreage baseline' },
    { feature: 'historical_yield_lag1', modality: 'historical', score: 0.0368, color: '#f59e0b', desc: 'Autoregressive prior-year harvest productivity level' },
    { feature: 'soil_clay_pct', modality: 'soil', score: 0.0302, color: '#8b5cf6', desc: 'Topsoil clay proportion governing moisture and nutrient retention capacity' },
    { feature: 'temp_max_deg_c', modality: 'weather', score: 0.0294, color: '#3b82f6', desc: 'Daytime maximum temperature driving evaporative crop water demand' },
  ];

  const modalityBreakdown = [
    { mod: 'Weather & Climate', share: 41.8, color: 'bg-blue-500', text: 'text-blue-400' },
    { mod: 'Satellite Vegetation', share: 35.7, color: 'bg-emerald-500', text: 'text-emerald-400' },
    { mod: 'Historical Agricultural', share: 15.0, color: 'bg-amber-500', text: 'text-amber-400' },
    { mod: 'Soil Edaphic', share: 7.5, color: 'bg-purple-500', text: 'text-purple-400' },
  ];

  return (
    <div className="space-y-8 py-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Explainable AI (XAI) &amp; Feature Attributions</h1>
        <p className="text-slate-400 text-sm mt-1">
          Demystifying the neural multimodal predictions through game-theoretically grounded Shapley Additive Explanations (SHAP).
        </p>
      </div>

      {/* Modality Share Bar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Layers className="h-5 w-5 text-emerald-400" />
            <span>Aggregate Modality Contribution Share</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">Total Influence: 100%</span>
        </div>

        {/* Stacked bar */}
        <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden flex shadow-inner">
          {modalityBreakdown.map((m, i) => (
            <div
              key={i}
              className={`${m.color} h-full transition-all duration-700`}
              style={{ width: `${m.share}%` }}
              title={`${m.mod}: ${m.share}%`}
            ></div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
          {modalityBreakdown.map((m, i) => (
            <div key={i} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-2">
                <span className={`h-2.5 w-2.5 rounded-full ${m.color}`}></span>
                <span className="text-xs text-slate-300 font-medium">{m.mod}</span>
              </div>
              <div className={`text-lg font-bold font-mono mt-1 ${m.text}`}>{m.share}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Global Feature Ranking */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Eye className="h-5 w-5 text-emerald-400" />
            <span>Global Feature Importance Ranking (SHAP Mean |&phi;|)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Relative magnitude of model sensitivity across all test districts</p>
        </div>

        <div className="space-y-3">
          {topFeatures.map((f, i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2 font-mono">
                  <span className="text-slate-500 font-bold w-4">{i + 1}.</span>
                  <span className="text-white font-bold">{f.feature}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 capitalize">{f.modality}</span>
                </div>
                <span className="font-mono font-bold text-emerald-400">{(f.score * 100).toFixed(1)}%</span>
              </div>

              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(f.score / topFeatures[0].score) * 100}%`, backgroundColor: f.color }}
                ></div>
              </div>
              <p className="text-[11px] text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Case Studies */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-800/80 border border-rose-500/30 rounded-3xl p-6 space-y-3 shadow-xl">
          <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
            <AlertCircle className="h-5 w-5" />
            <span>Case Study: Severe Monsoon Drought &amp; Heat Shock</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            During anomalous drought conditions (e.g. 2009 &amp; 2015), the cross-modal attention dynamically elevated weather and satellite weights to <strong>71.4%</strong>. The model identified rainfall deficit (-35%) and 16 extreme heat days as dominant negative contributors, depressing predicted yield from the 2.85 t/ha base down to <strong>1.48 t/ha</strong>.
          </p>
        </div>

        <div className="bg-slate-800/80 border border-emerald-500/30 rounded-3xl p-6 space-y-3 shadow-xl">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
            <ShieldCheck className="h-5 w-5" />
            <span>Case Study: High-Input Irrigated Agro-Ecosystem</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            In districts with &gt;95% tubewell irrigation (e.g., Ludhiana, Punjab), the model gracefully decoupled rainfall anomalies from yield failure. High vegetative NDVI (0.74) and soil organic carbon act as dominant positive contributors, yielding a predicted productivity of <strong>4.32 t/ha</strong> with minimal uncertainty (&plusmn;0.18 t/ha).
          </p>
        </div>
      </div>

      {/* Non-Causality Ethics Disclaimer */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start space-x-3">
        <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-white">Scientific Interpretability Notice:</strong> Feature contributions denote associative model sensitivity and mathematical game-theoretic influence relative to the training distribution. While consistent with agronomic principles (Peng et al. 2004, Lobell et al. 2015), they describe model representation influence rather than proving isolated mechanical physical causality.
        </div>
      </div>
    </div>
  );
}
