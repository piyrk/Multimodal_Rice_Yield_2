import React from 'react';
import { ArrowRight, Satellite, CloudRain, Sprout, History, Layers, BarChart2, ShieldCheck, ArrowDown } from 'lucide-react';

export default function HomePage({ onNavigate }) {
  const modalities = [
    {
      icon: Satellite,
      title: 'Satellite',
      badge: 'Season Context',
      description: 'Measured vegetation and land-surface indicators (MODIS NDVI, EVI, NDWI) tracked each season on the Farmer Dashboard as context. The deployed model predicts from weather, soil, and historical branches; satellite was a fourth branch in the earlier benchmark model.',
    },
    {
      icon: CloudRain,
      title: 'Weather',
      badge: 'Hydroclimatic',
      description: 'Precipitation, thermal extrema, nighttime minimums, and stress metrics (monsoon anomaly, extreme heat days >= 35°C, dry spells).',
    },
    {
      icon: Sprout,
      title: 'Soil',
      badge: 'Edaphic Profile',
      description: 'Physicochemical soil properties governing nutrient holding and root-zone water retention (pH, organic carbon, nitrogen, clay %).',
    },
    {
      icon: History,
      title: 'Historical',
      badge: 'Agricultural Momentum',
      description: 'Prior-year production baselines, district multi-year moving averages, and total cultivated acreage trends.',
    },
  ];

  const steps = [
    {
      num: '01',
      title: 'Input Data',
      desc: 'Enter district environmental conditions across weather, soil, and historical features (satellite indices are carried as measured season context).',
    },
    {
      num: '02',
      title: 'Multimodal Processing',
      desc: 'Dedicated neural encoders extract normalized representation vectors for each distinct modality.',
    },
    {
      num: '03',
      title: 'Prediction',
      desc: 'Cross-modal attention weights branches dynamically to infer expected rice yield (tonnes/hectare).',
    },
    {
      num: '04',
      title: 'Explainability + Uncertainty',
      desc: 'Monte Carlo Dropout generates predictive intervals, and cross-modal attention weights show how the deployed model weighed each input branch (SHAP analysis for the benchmark model is on the Explainability page).',
    },
  ];

  return (
    <div className="space-y-16 py-8 sm:py-12">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3 py-1 rounded-full text-xs font-semibold">
          <span>Live Season · Kharif 2026 — 25 Districts</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-stone-900 tracking-tight leading-tight">
          Climate-Aware Multimodal <br className="hidden sm:block" />
          <span className="text-emerald-700">Rice Yield Prediction</span>
        </h1>

        <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-2xl mx-auto">
          Predict rice yield using weather, soil, and historical agricultural information with dynamic cross-modal attention and calibrated predictive intervals — with measured satellite vegetation data tracked alongside as season context.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigate('predict')}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-6 py-3 rounded-lg shadow-sm transition-colors text-sm"
          >
            <span>Predict Rice Yield</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            onClick={() => onNavigate('about')}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 font-semibold px-6 py-3 rounded-lg transition-colors text-sm"
          >
            <span>Learn About the Model</span>
          </button>
        </div>

        {/* Trust strip: the numbers a first-time visitor should see */}
        <div className="flex flex-wrap items-stretch justify-center gap-y-3 pt-4 text-center">
          {[
            ['25', 'districts served'],
            ['427', 'recorded panel records'],
            ['85.42%', 'calibrated coverage'],
            ['2024', 'recorded data through'],
          ].map(([num, label], i) => (
            <div key={label} className={`px-5 ${i > 0 ? 'border-l border-stone-200' : ''}`}>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-800 font-mono">{num}</div>
              <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 4 Modality Cards */}
      <section className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">Heterogeneous Input Modalities</h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Four scientifically grounded environmental sources harmonized into unified panel records — the deployed model predicts from weather, soil and historical; satellite is measured season context.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modalities.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div
                key={idx}
                className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-3 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                    {m.badge}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">{m.title}</h3>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">{m.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-10 shadow-sm space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Pipeline Flow</span>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">How It Works</h2>
          <p className="text-xs sm:text-sm text-stone-500">
            End-to-end processing pipeline from environmental inputs to calibrated predictions.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((s, idx) => (
            <div key={idx} className="space-y-2 relative">
              <div className="text-2xl font-extrabold text-emerald-700 font-mono">{s.num}</div>
              <h3 className="text-sm font-bold text-stone-900">{s.title}</h3>
              <p className="text-xs text-stone-600 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <span>Grounded in validated biophysical crop response functions (Peng et al., Lobell et al.).</span>
          <button
            onClick={() => onNavigate('predict')}
            className="text-emerald-700 font-semibold hover:underline flex items-center space-x-1"
          >
            <span>Open Prediction Studio</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
}
