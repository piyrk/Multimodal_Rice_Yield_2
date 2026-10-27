import React from 'react';
import { Eye, TrendingUp, TrendingDown, Layers, ShieldCheck, AlertCircle, Info } from 'lucide-react';

export default function ExplainabilityPage() {
  const topFeatures = [
    { feature: 'rainfall_cumulative_mm', modality: 'weather', score: 0.2442, color: '#0284c7', desc: 'Total monsoon precipitation supplying paddy submergence and root-zone water balance' },
    { feature: 'ndvi_anomaly', modality: 'satellite', score: 0.1734, color: '#059669', desc: 'Standardized departure from district multi-year vegetative baseline' },
    { feature: 'ndvi_mean', modality: 'satellite', score: 0.0887, color: '#059669', desc: 'Chlorophyll canopy greenness during reproductive heading phase' },
    { feature: 'evi_mean', modality: 'satellite', score: 0.0839, color: '#059669', desc: 'Enhanced Vegetation Index mitigating atmospheric and canopy saturation noise' },
    { feature: 'temp_min_deg_c', modality: 'weather', score: 0.0688, color: '#0284c7', desc: 'Nighttime minimum temperature controlling respiratory biomass consumption' },
    { feature: 'historical_yield_3yr_mean', modality: 'historical', score: 0.0500, color: '#d97706', desc: 'Rolling 3-year prior agricultural productivity momentum' },
    { feature: 'sown_area_ha', modality: 'historical', score: 0.0387, color: '#d97706', desc: 'Gross district harvested acreage baseline' },
    { feature: 'historical_yield_lag1', modality: 'historical', score: 0.0368, color: '#d97706', desc: 'Autoregressive prior-year harvest productivity level' },
    { feature: 'soil_clay_pct', modality: 'soil', score: 0.0302, color: '#7c3aed', desc: 'Topsoil clay proportion governing moisture and nutrient retention capacity' },
    { feature: 'temp_max_deg_c', modality: 'weather', score: 0.0294, color: '#0284c7', desc: 'Daytime maximum temperature driving evaporative crop water demand' },
  ];

  const modalityBreakdown = [
    { mod: 'Weather & Climate', share: 41.8, color: 'bg-sky-500', barColor: '#0284c7', text: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' },
    { mod: 'Satellite Vegetation', share: 35.7, color: 'bg-emerald-500', barColor: '#059669', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    { mod: 'Historical Agricultural', share: 15.0, color: 'bg-amber-500', barColor: '#d97706', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    { mod: 'Soil Edaphic', share: 7.5, color: 'bg-purple-500', barColor: '#7c3aed', text: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-stone-200 pb-5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
          <Eye className="w-3.5 h-3.5 text-emerald-700" />
          Explainable AI (XAI)
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
          Model Interpretability &amp; Feature Attributions
        </h1>
        <p className="text-sm text-stone-600 mt-1 max-w-3xl">
          Demystifying multimodal deep representations and decision trees using game-theoretically grounded Shapley Additive Explanations (SHAP) across 26 environmental indicators.
        </p>
      </div>

      {/* Aggregate Modality Share */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-600" />
              Aggregate Modality Contribution Share
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">Partition of global SHAP feature importance across the 4 environmental domains</p>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-stone-100 text-stone-700 rounded-lg self-start sm:self-auto">
            Total Sensitivity: 100%
          </span>
        </div>

        {/* Stacked Progress Bar */}
        <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden flex shadow-inner">
          {modalityBreakdown.map((m, i) => (
            <div
              key={i}
              className={`${m.color} h-full transition-all duration-700`}
              style={{ width: `${m.share}%` }}
              title={`${m.mod}: ${m.share}%`}
            />
          ))}
        </div>

        {/* Breakdown Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {modalityBreakdown.map((m, i) => (
            <div key={i} className={`p-4 rounded-xl border ${m.bg}`}>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${m.color}`} />
                <span className="text-xs font-medium text-stone-700 truncate">{m.mod}</span>
              </div>
              <div className={`text-xl font-bold font-mono mt-2 ${m.text}`}>{m.share}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Global Feature Ranking */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="border-b border-stone-100 pb-4">
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Global Feature Importance Ranking (SHAP Mean |&phi;|)
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">Relative magnitude of model sensitivity across test observations</p>
        </div>

        <div className="space-y-3">
          {topFeatures.map((f, i) => (
            <div key={i} className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-stone-400 font-bold w-4">{i + 1}.</span>
                  <span className="text-stone-900 font-semibold">{f.feature}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-200/70 text-stone-700 capitalize font-sans">
                    {f.modality}
                  </span>
                </div>
                <span className="font-mono font-bold text-stone-900">{(f.score * 100).toFixed(1)}%</span>
              </div>

              <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(f.score / topFeatures[0].score) * 100}%`, backgroundColor: f.color }}
                />
              </div>
              <p className="text-[11px] text-stone-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Real-World Case Studies */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-sm space-y-2.5">
          <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Case Study: Severe Monsoon Drought &amp; Heat Shock</span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            During anomalous drought conditions (e.g. 2009 &amp; 2015), the cross-modal attention dynamically elevated weather and satellite weights to <strong>71.4%</strong>. The model identified rainfall deficit (-35%) and 16 extreme heat days as dominant negative contributors, depressing predicted yield from the 2.85 t/ha base down to <strong>1.48 t/ha</strong>.
          </p>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-2.5">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Case Study: High-Input Irrigated Agro-Ecosystem</span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            In districts with &gt;95% canal/tubewell irrigation (e.g., Ludhiana, Karnal), the model gracefully decoupled rainfall anomalies from yield failure. High vegetative NDVI (0.74) and soil organic carbon act as dominant positive contributors, predicting productivity of <strong>4.32 t/ha</strong> with minimal uncertainty (&plusmn;0.18 t/ha).
          </p>
        </div>
      </div>

      {/* Non-Causality Scientific Ethics Notice */}
      <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-3">
        <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Scientific Interpretability Notice:</strong> Feature contributions denote associative model sensitivity and mathematical game-theoretic influence relative to the training distribution. While consistent with agronomic principles (Peng et al. 2004, Lobell et al. 2015), they describe statistical representation influence rather than proving isolated mechanical physical causality.
        </div>
      </div>
    </div>
  );
}
