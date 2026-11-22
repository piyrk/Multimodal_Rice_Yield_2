import React, { useState } from 'react';
import {
  Sprout,
  CloudRain,
  Droplets,
  Bug,
  LineChart,
  Info,
  Volume2,
  Square,
  Mic
} from 'lucide-react';
import seasonEstimatesData from '../data/seasonEstimates.json';
import {
  VOICE_LANGS,
  speakText,
  stopSpeech,
  speechSupported,
  recognitionSupported,
  buildSummary,
  WATER_ACTIONS
} from '../utils/voice';
import TalkPanel from '../components/TalkPanel';

const { _meta: SEASON_META, recorded_actuals: RECORDED_ACTUALS, ...SEASON_ESTIMATES } = seasonEstimatesData;

export default function DashboardPage() {
  const districts = Object.keys(SEASON_ESTIMATES['2026'] || {});
  const [selectedDistrict, setSelectedDistrict] = useState('Krishna');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [voiceLang, setVoiceLang] = useState('en-IN');
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState('');

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
      ? { key: 'critical', label: 'Needs water — critical', action: 'Irrigate now, especially at flowering. Do not let the field dry out.', color: 'bg-rose-50 text-rose-800 border-rose-200' }
      : (row.consecutive_dry_days >= 8 || anom < 0)
      ? { key: 'moderate', label: 'Watch — moderate', action: 'Use controlled AWD: let water drop about 10 cm below the surface before re-flooding.', color: 'bg-amber-50 text-amber-800 border-amber-200' }
      : { key: 'comfortable', label: 'Comfortable', action: 'Rainfall has been sufficient. Keep drainage channels clear to avoid waterlogging.', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };

  // Kharif runs Jun-Oct: once the selected season has ended, the water
  // status is that season's record — it must not read as a live instruction
  // ("Irrigate now" after harvest would be wrong advice).
  const nowDate = new Date();
  const seasonEnded = Number(selectedYear) < nowDate.getFullYear() ||
    (Number(selectedYear) === nowDate.getFullYear() && nowDate.getMonth() > 9);
  const seasonOverAction = 'Season complete — the status above is this season\'s water record, kept for review. No irrigation action applies after harvest.';
  const seasonOverSpeech = {
    en: seasonOverAction,
    hi: 'Woh season pura ho chuka hai, isliye ye us season ke paani ka record hai, live salah nahi hai.',
    te: 'ఆ సీజన్ పూర్తయిపోయింది, కాబట్టి ఇది ఆ సీజన్ నీటి రికార్డు మాత్రమే, ప్రత్యక్ష సూచన కాదు.',
  };

  const handleListen = () => {
    if (speaking) {
      stopSpeech();
      setSpeaking(false);
      return;
    }
    const actions = seasonEnded ? seasonOverSpeech : WATER_ACTIONS[water.key];
    const text = buildSummary(voiceLang, {
      district: selectedDistrict,
      year: selectedYear,
      estimate: row.precomputed_estimate_t_ha,
      low: row.precomputed_interval_low,
      high: row.precomputed_interval_high,
      rainfallMm: row.rainfall_cumulative_mm,
      anomalyPct: anom,
      dryDays: row.consecutive_dry_days,
      waterKey: water.key,
      waterActionEn: actions.en,
      waterActionHi: actions.hi,
      waterActionTe: actions.te,
      blast, bph, blb
    });
    if (speakText(text, voiceLang)) {
      setSpeaking(true);
      setVoiceNote('');
      const ms = Math.max(6000, text.length * 95);
      setTimeout(() => setSpeaking(false), ms);
    } else {
      setVoiceNote('Speech is not supported in this browser.');
    }
  };

  const handleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setVoiceNote('Voice input needs Chrome — speech recognition is not available in this browser.');
      return;
    }
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    setListening(true);
    setVoiceNote('Listening… say a district name, e.g. "Krishna".');
    rec.onresult = (e) => {
      const heard = Array.from(e.results[0]).map((a) => a.transcript.toLowerCase().trim());
      const match = districts.find((d) =>
        heard.some((h) => h.includes(d.toLowerCase()) || d.toLowerCase().includes(h.replace(/ district$/, '')))
      );
      if (match) {
        setSelectedDistrict(match);
        setVoiceNote(`Heard you — district set to ${match}.`);
      } else {
        setVoiceNote(`Heard "${e.results[0][0].transcript}" — that does not match a district. Try again.`);
      }
    };
    rec.onerror = () => { setListening(false); setVoiceNote('Could not hear clearly — try again in a quiet place.'); };
    rec.onend = () => setListening(false);
    rec.start();
  };

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
          {['2026', '2025', '2024', '2023', '2022'].map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                selectedYear === y ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Kharif {y}{y <= '2024' ? ' (recorded)' : ''}
            </button>
          ))}
        </div>
        <span className="text-xs text-stone-500 sm:ml-auto">{row.agro_ecological_zone}</span>
      </div>

      {/* Voice bar — listen to the dashboard, or pick the district by voice */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center space-x-1.5">
          <Volume2 className="h-4 w-4" /> <span>Listen / Bolkar chunein</span>
        </span>
        <select
          value={voiceLang}
          onChange={(e) => setVoiceLang(e.target.value)}
          className="bg-white border border-emerald-300 rounded-lg px-3 py-1.5 text-xs font-bold text-stone-900 focus:ring-2 focus:ring-emerald-600 cursor-pointer"
        >
          {VOICE_LANGS.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
        <button
          onClick={handleListen}
          disabled={!speechSupported()}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 flex items-center space-x-1.5"
        >
          {speaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          <span>{speaking ? 'Stop' : 'Listen to this dashboard'}</span>
        </button>
        <button
          onClick={handleMic}
          disabled={!recognitionSupported()}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-emerald-600 text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 flex items-center space-x-1.5"
        >
          <Mic className="h-3.5 w-3.5" />
          <span>{listening ? 'Listening…' : 'Say district name'}</span>
        </button>
        <span className="text-[11px] text-emerald-900/70 sm:ml-auto">
          {voiceNote || 'Voice uses your browser’s built-in speech — Chrome works best; Hindi/Telugu voices depend on your device.'}
        </span>
      </div>

      {/* Talk panel — Phase 1 voice Q&A over the same measured data */}
      <TalkPanel
        districts={districts}
        district={selectedDistrict}
        year={selectedYear}
        data={SEASON_ESTIMATES}
        recordedActuals={RECORDED_ACTUALS}
        voiceLang={voiceLang}
        onDistrictChange={setSelectedDistrict}
        onYearChange={setSelectedYear}
      />

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
            {selectedYear <= '2024'
              ? <>A model <strong>estimate</strong> from that season's measured weather and satellite inputs. The official recorded yield for Kharif {selectedYear} is published — see the comparison in the tracker below.</>
              : <>This is a season <strong>estimate</strong> from measured weather — not a recorded official yield.</>}
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
            <div className="flex justify-between"><span className="text-stone-600">Days measured</span><strong className="font-mono">{row.weather_provenance?.match(/(?:valid )?(\d+)\/153/)?.[1] || '153'} of 153</strong></div>
          </div>
        </div>

        {/* Water */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-1.5">
            <Droplets className="h-4 w-4 text-emerald-700" /> <span>Water Advice</span>
          </span>
          <p><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${water.color}`}>{water.label}{seasonEnded ? ' — season over' : ''}</span></p>
          <p className="text-xs text-stone-700 leading-relaxed">{seasonEnded ? seasonOverAction : water.action}</p>
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
          released. For Kharif 2022–2024 the comparison is already live for the 12 districts in the recorded
          panel; 2025–2026 rows fill in as DES publishes those seasons' finals.
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
              {[['2026', row2026], ['2025', row2025],
                ['2024', SEASON_ESTIMATES['2024']?.[selectedDistrict]],
                ['2023', SEASON_ESTIMATES['2023']?.[selectedDistrict]],
                ['2022', SEASON_ESTIMATES['2022']?.[selectedDistrict]]].filter(([, r]) => r).map(([y, r]) => {
                const actual = RECORDED_ACTUALS?.[y]?.[selectedDistrict];
                const diff = actual !== undefined ? (r.precomputed_estimate_t_ha - actual).toFixed(2) : null;
                const inRange = actual !== undefined && actual >= r.precomputed_interval_low && actual <= r.precomputed_interval_high;
                return (
                  <tr key={y}>
                    <td className="py-2.5 px-3 font-semibold text-stone-900">Kharif {y}</td>
                    <td className="py-2.5 px-3 font-mono">{r.precomputed_estimate_t_ha} ({r.precomputed_interval_low} – {r.precomputed_interval_high})</td>
                    <td className="py-2.5 px-3 font-mono">{actual !== undefined ? actual : (y >= '2025' ? 'Awaited — DES finals not yet published' : 'Not in the recorded panel for this district')}</td>
                    <td className="py-2.5 px-3">{diff !== null ? `${diff > 0 ? '+' : ''}${diff} t/ha — ${inRange ? 'actual inside our range' : 'actual outside our range'}` : '—'}</td>
                  </tr>
                );
              })}
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
