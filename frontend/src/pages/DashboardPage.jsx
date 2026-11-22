import React, { useState } from 'react';
import {
  Sprout,
  CloudRain,
  Droplets,
  Bug,
  LineChart,
  Info
} from 'lucide-react';
import seasonEstimatesData from '../data/seasonEstimates.json';

const { _meta: SEASON_META, ...SEASON_ESTIMATES } = seasonEstimatesData;

export default function DashboardPage() {
  const districts = Object.keys(SEASON_ESTIMATES['2026'] || {});
  const [selectedDistrict, setSelectedDistrict] = useState('Krishna');
  const [selectedYear, setSelectedYear] = useState('2026');

  const row = SEASON_ESTIMATES[selectedYear]?.[selectedDistrict];
  const row2025 = SEASON_ESTIMATES['2025']?.[selectedDistrict];
  const row2026 = SEASON_ESTIMATES['2026']?.[selectedDistrict];
  if (!row) return null;

  const anom = row.rainfall_anomaly_pct;
  const rainLabel =
    anom <= -20 ? 'Well below normal' :
    anom < 0 ? 'Below normal' :
    anom <= 10 ? 'Near normal' : 'Above normal';
  const rainColor =
    anom <= -20 ? 'text-rose-700' :
    anom < 0 ? 'text-amber-700' : 'text-emerald-700';

  // Same published thresholds as the Advisory page
  const water =
    (row.consecutive_dry_days >= 12 || anom <= -20)
      ? { label: 'Needs water — critical', action: 'Irrigate now, especially at flowering. Do not let the field dry out.', color: 'bg-rose-50 text-rose-800 border-rose-200' }
      : (row.consecutive_dry_days >= 8 || anom < 0)
      ? { label: 'Watch — moderate', action: 'Use controlled AWD: let water drop about 10 cm below the surface before re-flooding.', color: 'bg-amber-50 text-amber-800 border-amber-200' }
      : { label: 'Comfortable', action: 'Rainfall has been sufficient. Keep drainage channels clear to avoid waterlogging.', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };

  const blast = (row.temp_min_deg_c <= 24.5 && row.relative_humidity_pct >= 80.0) ? 'Elevated' : 'Low';
  const bph = (row.temp_min_deg_c >= 23.5 && row.temp_max_deg_c <= 34.5 && row.relative_humidity_pct >= 76.0) ? 'High' : 'Moderate';
  const blb = (row.relative_humidity_pct >= 82.0 && row.temp_max_deg_c >= 32.0) ? 'Elevated' : 'Low';
  const riskColor = (r) =>
    r === 'High' || r === 'Elevated' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900';

  return (
    <div className="space-y-8 py-6 sm:py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <Sprout className="h-3.5 w-3.5" />
          <span>Project 19 — Objective 5: Farmer Dashboard</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-2">
          Farmer Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-3xl leading-relaxed">
          Your district's season at a glance — expected harvest, rainfall, water needs and pest watch,
          from this season's measured weather (NASA POWER, data as of {SEASON_META?.generated_on}).
        </p>
      </div>

      {/* Selectors */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">District:</span>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 cursor-pointer"
          >
            {districts.map((d) => (
              <option key={d} value={d}>{d} ({SEASON_ESTIMATES['2026'][d].state_name})</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Season:</span>
          {['2026', '2025'].map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                selectedYear === y ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Kharif {y}{y === '2026' ? ' (completed)' : ''}
            </button>
          ))}
        </div>
        <span className="text-xs text-stone-500 sm:ml-auto">{row.agro_ecological_zone}</span>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Expected harvest */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-1.5">
            <LineChart className="h-4 w-4 text-emerald-700" /> <span>Expected Harvest — Kharif {selectedYear}</span>
          </span>
          <p className="text-4xl font-extrabold text-stone-900">
            {row.precomputed_estimate_t_ha} <span className="text-base font-bold text-stone-500">tonnes / hectare</span>
          </p>
          <p className="text-xs text-stone-600">
            Likely range: <strong>{row.precomputed_interval_low} – {row.precomputed_interval_high} t/ha</strong> (calibrated interval).
            District's recorded baseline: {row.historical_yield_3yr_mean} t/ha (3-year mean).
          </p>
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
            This is a season <strong>estimate</strong> from measured weather — not a recorded official yield.
          </p>
        </div>

        {/* Season weather */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-1.5">
            <CloudRain className="h-4 w-4 text-emerald-700" /> <span>Season Weather — Jun to Oct {selectedYear}</span>
          </span>
          <div className="space-y-1.5 text-sm pt-1">
            <div className="flex justify-between"><span className="text-stone-600">Total rainfall</span><strong className="font-mono">{row.rainfall_cumulative_mm} mm</strong></div>
            <div className="flex justify-between"><span className="text-stone-600">Compared to normal</span><strong className={`font-mono ${rainColor}`}>{anom > 0 ? `+${anom}` : anom}% — {rainLabel}</strong></div>
            <div className="flex justify-between"><span className="text-stone-600">Longest dry spell</span><strong className="font-mono">{row.consecutive_dry_days} days</strong></div>
            <div className="flex justify-between"><span className="text-stone-600">Very hot days (35°C+)</span><strong className="font-mono">{row.extreme_heat_days} days</strong></div>
            <div className="flex justify-between"><span className="text-stone-600">Days measured</span><strong className="font-mono">{row.weather_provenance?.match(/valid (\d+)\/153/)?.[1] || '153'} of 153</strong></div>
          </div>
        </div>

        {/* Water */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-1.5">
            <Droplets className="h-4 w-4 text-emerald-700" /> <span>Water Advice</span>
          </span>
          <p><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${water.color}`}>{water.label}</span></p>
          <p className="text-xs text-stone-700 leading-relaxed">{water.action}</p>
          <p className="text-[11px] text-stone-500">Full schedule: Advisory page → Water &amp; Irrigation.</p>
        </div>

        {/* Pest watch */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-1.5">
            <Bug className="h-4 w-4 text-emerald-700" /> <span>Pest &amp; Disease Watch</span>
          </span>
          <div className="space-y-1.5 text-sm pt-1">
            <div className="flex justify-between items-center"><span className="text-stone-600">Rice Blast</span><span className={`px-2 py-0.5 rounded text-[11px] font-bold ${riskColor(blast)}`}>{blast} risk</span></div>
            <div className="flex justify-between items-center"><span className="text-stone-600">Brown Plant Hopper</span><span className={`px-2 py-0.5 rounded text-[11px] font-bold ${riskColor(bph)}`}>{bph} risk</span></div>
            <div className="flex justify-between items-center"><span className="text-stone-600">Bacterial Leaf Blight</span><span className={`px-2 py-0.5 rounded text-[11px] font-bold ${riskColor(blb)}`}>{blb} risk</span></div>
          </div>
          <p className="text-[11px] text-stone-500">Weather-window warnings for scouting — not a diagnosis. Details: Advisory page → Pest &amp; Disease.</p>
        </div>
      </div>

      {/* Estimate vs Actual tracker */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-stone-900">Estimate vs Actual — {selectedDistrict}</h3>
        <p className="text-xs text-stone-600 leading-relaxed">
          We publish our estimate first, then compare it with the official recorded yield (DES) when it is
          released. Official recorded yields currently end at Kharif 2024; the rows below fill in as DES
          publishes each season's finals.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                <th className="py-2.5 px-3">Season</th>
                <th className="py-2.5 px-3">Our estimate (t/ha)</th>
                <th className="py-2.5 px-3">Official actual (DES)</th>
                <th className="py-2.5 px-3">Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {[['2025', row2025], ['2026', row2026]].map(([y, r]) => (
                <tr key={y}>
                  <td className="py-2.5 px-3 font-semibold text-stone-900">Kharif {y}</td>
                  <td className="py-2.5 px-3 font-mono">{r.precomputed_estimate_t_ha} ({r.precomputed_interval_low} – {r.precomputed_interval_high})</td>
                  <td className="py-2.5 px-3">Awaited — DES finals not yet published</td>
                  <td className="py-2.5 px-3">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-stone-500 flex items-start space-x-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{row.weather_provenance}. {SEASON_META?.satellite_note}</span>
        </p>
      </div>
    </div>
  );
}
