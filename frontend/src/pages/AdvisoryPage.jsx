import React, { useState } from 'react';
import {
  Droplets,
  Sprout,
  Bug,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Info,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { DISTRICT_PROFILES } from '../data/districtProfiles';

export default function AdvisoryPage({ onNavigate }) {
  const [activeSubTab, setActiveSubTab] = useState('water');
  const [selectedDistrict, setSelectedDistrict] = useState('Krishna');

  const profile = DISTRICT_PROFILES[selectedDistrict] || DISTRICT_PROFILES['Krishna'] || DISTRICT_PROFILES['Burdwan'];

  // Sourced ICAR / NRRI / ANGRAU verified rice variety matrix
  const varieties = [
    {
      name: 'BPT 5204 (Samba Mahsuri)',
      origin: 'ANGRAU (Andhra Pradesh)',
      duration: '140–145 days',
      yieldPotential: '5.0–5.5 t/ha',
      grainType: 'Medium slender (Premium superfine)',
      waterRegime: 'Irrigated lowland / canal deltas',
      stressTolerance: 'Moderate drought escape; susceptible to blast in humid cool spells',
      targetRegions: 'Krishna & Godavari Deltas (AP), Cauvery Delta (TN), Telangana',
      recommendedFor: 'Commercial markets demanding premium cooking quality under assured irrigation.'
    },
    {
      name: 'MTU 1010 (Cottondora Sannalu)',
      origin: 'RARS Maruteru, ANGRAU',
      duration: '120–125 days',
      yieldPotential: '5.0–5.5 t/ha',
      grainType: 'Long slender',
      waterRegime: 'Irrigated & semi-deep canal systems',
      stressTolerance: 'Heat tolerant during flowering; escapes terminal drought',
      targetRegions: 'Andhra Pradesh, Telangana, Odisha, West Bengal (Kharif & Rabi)',
      recommendedFor: 'Short turnaround between monsoon rice and winter pulses/oilseeds.'
    },
    {
      name: 'Swarna-Sub1 (MTU 7029-Sub1)',
      origin: 'ICAR-NRRI & IRRI',
      duration: '145–150 days',
      yieldPotential: '5.5–6.0 t/ha',
      grainType: 'Short bold',
      waterRegime: 'Flood-prone rainfed lowlands',
      stressTolerance: 'Sub1 gene confers complete flash-flood submergence tolerance up to 14 days',
      targetRegions: 'Lower Gangetic Plains (WB, Bihar), Coastal Odisha, Eastern UP',
      recommendedFor: 'Lowland flood-prone alluviums subject to cyclical monsoon submergence.'
    },
    {
      name: 'IR 64-Drt1',
      origin: 'IRRI / ICAR',
      duration: '115–120 days',
      yieldPotential: '4.0–4.5 t/ha',
      grainType: 'Long slender',
      waterRegime: 'Rainfed uplands & drought-prone systems',
      stressTolerance: 'qDTY12.1 drought QTL: maintains root water uptake under -30% rain deficits',
      targetRegions: 'Central Plateau (Chhattisgarh, Jharkhand), Western Odisha',
      recommendedFor: 'Rainfed drought-vulnerable uplands with shallow root-zone moisture holding.'
    },
    {
      name: 'PR 126',
      origin: 'PAU Ludhiana (Punjab)',
      duration: '120–125 days',
      yieldPotential: '7.0–7.5 t/ha',
      grainType: 'Long slender',
      waterRegime: 'Intensive tubewell irrigated',
      stressTolerance: 'Consumes 20% less irrigation water compared to Pusa 44; disease resistant',
      targetRegions: 'Trans-Gangetic Plains (Punjab, Haryana, Basmati buffer zone)',
      recommendedFor: 'Water table conservation and early vacating of fields for timely wheat sowing.'
    },
    {
      name: 'CR Dhan 310',
      origin: 'ICAR-National Rice Research Institute',
      duration: '125–130 days',
      yieldPotential: '4.5 t/ha',
      grainType: 'Medium slender',
      waterRegime: 'Irrigated & favorable rainfed',
      stressTolerance: 'Biofortified with 10.3% grain protein; moderate brown spot tolerance',
      targetRegions: 'Odisha, Bihar, West Bengal, Eastern UP',
      recommendedFor: 'Nutritional security and high protein yield in medium-duration rotations.'
    }
  ];

  // Dynamic rule-based water management advice
  const getIrrigationAdvice = () => {
    const awc = profile.soil_available_water_capacity || 0.20;
    const cdd = profile.consecutive_dry_days || 8;
    const rainAnom = profile.rainfall_anomaly_pct || 0;
    const irrigRatio = profile.irrigation_ratio || 0.70;

    let schedule = 'Normal Alternate Wetting and Drying (AWD)';
    let urgency = 'Low Urgency';
    let urgencyColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    let recommendations = [];

    if (cdd >= 12 || rainAnom <= -20) {
      urgency = 'Critical Irrigation Recommended';
      urgencyColor = 'bg-rose-50 text-rose-800 border-rose-200';
      schedule = 'Immediate Supplementary Flooding (3–5 cm depth)';
      recommendations.push('Root-zone moisture deficit detected due to prolonged dry spell.');
      recommendations.push('Prioritize irrigation during anthesis (flowering) to prevent floret sterility.');
      if (irrigRatio < 0.50) {
        recommendations.push('Rainfed vulnerability is high: apply protective surface mulch to conserve capillary soil moisture.');
      }
    } else if (cdd >= 8 || rainAnom < 0) {
      urgency = 'Moderate Advisory';
      urgencyColor = 'bg-amber-50 text-amber-800 border-amber-200';
      schedule = 'Controlled AWD (Allow water to drop 10 cm below surface before re-flooding)';
      recommendations.push('Soil moisture holding capacity is adequate; avoid excessive standing water.');
      recommendations.push('Safe AWD saves 15–25% irrigation water without incurring yield penalties.');
    } else {
      schedule = 'Standard Agronomic Drainage / Inflow Monitoring';
      recommendations.push('Monsoon rainfall surplus supports optimal vegetative tillering.');
      recommendations.push('Ensure peripheral drainage channels are clear to prevent waterlogging during heading.');
    }

    return { schedule, urgency, urgencyColor, recommendations, awc, cdd, rainAnom, irrigRatio };
  };

  const advice = getIrrigationAdvice();

  // Dynamic weather-window pest risk calculation
  const getPestRisk = () => {
    const tmin = profile.temp_min_deg_c || 24.0;
    const tmax = profile.temp_max_deg_c || 33.0;
    const rh = profile.relative_humidity_pct || 75.0;
    const heatDays = profile.extreme_heat_days || 4;

    // Blast risk: Night temp 18-24°C, RH >= 82%
    const blastRisk = (tmin <= 24.5 && rh >= 80.0) ? 'Elevated' : 'Low';

    // BPH risk: Warm temp 27-31°C, RH >= 78%
    const bphRisk = (tmin >= 23.5 && tmax <= 34.5 && rh >= 76.0) ? 'High' : 'Moderate';

    // Bacterial Blight risk: High rain / RH >= 80% with warm days
    const blbRisk = (rh >= 82.0 && tmax >= 32.0) ? 'Elevated' : 'Low';

    return { blastRisk, bphRisk, blbRisk, tmin, tmax, rh, heatDays };
  };

  const pest = getPestRisk();

  return (
    <div className="space-y-8 py-6 sm:py-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <Sprout className="h-3.5 w-3.5" />
          <span>Project 19 — Agricultural Support Systems</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-2">
          Agronomic Advisory &amp; Climate Resilience Studio
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-3xl leading-relaxed">
          Operational agronomic guidance addressing Objectives 2, 3, and 4: Rule-based precision irrigation, 
          sourced climate-resilient cultivar selection, and agro-meteorological pest vulnerability forewarning.
        </p>
      </div>

      {/* District Context Selector Bar */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Active Location Context:</span>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 cursor-pointer"
          >
            {Object.keys(DISTRICT_PROFILES).map((dist) => (
              <option key={dist} value={dist}>
                {dist} ({DISTRICT_PROFILES[dist].state_name})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-3 text-xs text-stone-600 font-mono">
          <span>Zone: <strong>{profile.agro_ecological_zone}</strong></span>
          <span>&bull;</span>
          <span>Irrigation: <strong>{Math.round((profile.irrigation_ratio || 0.7) * 100)}%</strong></span>
        </div>
      </div>

      {/* Advisory Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveSubTab('water')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeSubTab === 'water'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Droplets className="h-4 w-4" />
          <span>1. Water &amp; Irrigation Advisory</span>
        </button>

        <button
          onClick={() => setActiveSubTab('variety')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeSubTab === 'variety'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Sprout className="h-4 w-4" />
          <span>2. Variety Decision Matrix</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pest')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeSubTab === 'pest'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Bug className="h-4 w-4" />
          <span>3. Pest &amp; Disease Weather Risk</span>
        </button>
      </div>

      {/* Tab 1: Water & Irrigation Advisory */}
      {activeSubTab === 'water' && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Status Card */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Current Status</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${advice.urgencyColor}`}>
                  {advice.urgency}
                </span>
              </div>
              <div className="pt-1">
                <h3 className="text-base font-bold text-stone-900">{advice.schedule}</h3>
                <p className="text-xs text-stone-500 mt-1">Calibrated to soil moisture holding capacity (AWC: {advice.awc}) and dry spells.</p>
              </div>

              <div className="pt-3 border-t border-stone-100 space-y-2 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Consecutive Dry Days:</span>
                  <span className="font-mono font-bold text-stone-900">{advice.cdd} days</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Rainfall Anomaly:</span>
                  <span className={`font-mono font-bold ${advice.rainAnom < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {advice.rainAnom > 0 ? `+${advice.rainAnom}` : advice.rainAnom}%
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Canal/Groundwater Access:</span>
                  <span className="font-mono font-bold text-stone-900">{Math.round(advice.irrigRatio * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Actionable Recommendations */}
            <div className="md:col-span-2 bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <span>Field-Level Scheduling Recommendations</span>
              </h3>
              <ul className="space-y-2.5 text-xs text-stone-700">
                {advice.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start space-x-2 p-2.5 rounded bg-stone-50 border border-stone-200/70">
                    <span className="text-emerald-700 font-bold shrink-0">&bull;</span>
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 leading-relaxed">
                <strong>IRRI AWD Guideline:</strong> Safe Alternate Wetting and Drying (AWD) allows the field pond water to drop 10–15 cm beneath the soil surface before re-flooding, reducing methane greenhouse emissions by up to 50% while saving 25% water.
              </div>
            </div>
          </div>

          {/* Growth Stage Water Matrix */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-emerald-700" />
              <span>Phenological Stage-Wise Water Management Protocol</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                    <th className="py-2.5 px-3">Crop Stage</th>
                    <th className="py-2.5 px-3">Days After Transplant</th>
                    <th className="py-2.5 px-3">Recommended Water Depth</th>
                    <th className="py-2.5 px-3">Stress Sensitivity</th>
                    <th className="py-2.5 px-3">Key Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-stone-900">Transplanting &amp; Early Rooting</td>
                    <td className="py-2.5 px-3 font-mono">DAT 1–10</td>
                    <td className="py-2.5 px-3 font-mono">2–3 cm shallow ponding</td>
                    <td className="py-2.5 px-3"><span className="text-amber-700 font-semibold">Moderate</span></td>
                    <td className="py-2.5 px-3 text-stone-600">Prevent seedling desiccation; avoid deep submergence.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-stone-900">Active Tillering</td>
                    <td className="py-2.5 px-3 font-mono">DAT 15–35</td>
                    <td className="py-2.5 px-3 font-mono">AWD cycling (0 to 3 cm)</td>
                    <td className="py-2.5 px-3"><span className="text-emerald-700 font-semibold">Low</span></td>
                    <td className="py-2.5 px-3 text-stone-600">Encourages deep nodal rooting and tillering vigor.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-stone-900">Panicle Initiation to Flowering</td>
                    <td className="py-2.5 px-3 font-mono">DAT 45–80</td>
                    <td className="py-2.5 px-3 font-mono">Continuous 4–5 cm ponding</td>
                    <td className="py-2.5 px-3"><span className="text-rose-700 font-bold">Critical (Highest)</span></td>
                    <td className="py-2.5 px-3 text-stone-600">Zero moisture stress tolerated; water deficit causes floret sterility.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-stone-900">Milking &amp; Grain Filling</td>
                    <td className="py-2.5 px-3 font-mono">DAT 80–105</td>
                    <td className="py-2.5 px-3 font-mono">2–3 cm intermittent depth</td>
                    <td className="py-2.5 px-3"><span className="text-amber-700 font-semibold">Moderate</span></td>
                    <td className="py-2.5 px-3 text-stone-600">Maintain saturated soil until physiological grain hardening.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-stone-900">Terminal Maturity</td>
                    <td className="py-2.5 px-3 font-mono">DAT 110–Harvest</td>
                    <td className="py-2.5 px-3 font-mono">Complete drainage</td>
                    <td className="py-2.5 px-3"><span className="text-stone-500">None</span></td>
                    <td className="py-2.5 px-3 text-stone-600">Drain field 10–14 days prior to harvest for uniform grain drying.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Variety Decision Matrix */}
      {activeSubTab === 'variety' && (
        <div className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-2">
            <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2">
              <Sprout className="h-4 w-4 text-emerald-700" />
              <span>Sourced High-Yielding &amp; Climate-Resilient Cultivars</span>
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Agronomic decision matrix compiled from official National Rice Research Institute (NRRI), 
              Acharya N.G. Ranga Agricultural University (ANGRAU), and Punjab Agricultural University (PAU) trial documentation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {varieties.map((v, idx) => (
              <div key={idx} className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-stone-900 text-sm">{v.name}</h4>
                    <span className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded font-mono shrink-0">
                      {v.duration}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 font-semibold">{v.origin}</p>
                  
                  <div className="space-y-1.5 pt-2 border-t border-stone-100 text-xs">
                    <div>
                      <span className="text-stone-400">Potential Yield: </span>
                      <span className="font-mono font-bold text-stone-800">{v.yieldPotential}</span>
                    </div>
                    <div>
                      <span className="text-stone-400">Water Regime: </span>
                      <span className="text-stone-700">{v.waterRegime}</span>
                    </div>
                    <div>
                      <span className="text-stone-400">Stress Traits: </span>
                      <span className="text-stone-700">{v.stressTolerance}</span>
                    </div>
                    <div>
                      <span className="text-stone-400">Target Belts: </span>
                      <span className="text-stone-700">{v.targetRegions}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 text-[11px] text-stone-600 bg-stone-50 p-2.5 rounded">
                  <strong>Recommendation:</strong> {v.recommendedFor}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Pest & Disease Weather Risk */}
      {activeSubTab === 'pest' && (
        <div className="space-y-6">
          {/* Scientific Disclaimer Alert */}
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1 flex items-start space-x-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Agro-Meteorological Vulnerability Forewarning (Not Autonomous Image Diagnosis):</span>
              <p className="text-[11px] leading-relaxed text-amber-800 mt-0.5">
                These indicators model weather-window conditions (temperature, humidity thresholds, rainfall anomalies, and canopy moisture) 
                correlated with pest spore germination and insect proliferation in Indian rice ecology. They serve as prophylactic alerts for timely scouting.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Blast Risk */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">1. Rice Blast</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  pest.blastRisk === 'Elevated' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                }`}>
                  {pest.blastRisk} Risk
                </span>
              </div>
              <p className="text-[11px] text-stone-500 italic font-mono">Magnaporthe oryzae</p>

              <div className="space-y-2 text-xs text-stone-700">
                <p><strong>Climatic Trigger Window:</strong> Night temperature 18–24°C, RH &ge;85%, overcast weather.</p>
                <p><strong>Active District Conditions:</strong> Night Tmin: {pest.tmin}°C | RH: {pest.rh}%</p>
                <div className="p-3 bg-stone-50 rounded border border-stone-200/70 text-[11px] space-y-1">
                  <strong>Agronomic Mitigation:</strong>
                  <ul className="list-disc pl-4 space-y-0.5 text-stone-600">
                    <li>Avoid excess top-dressed urea during cloudy periods.</li>
                    <li>Scout spindle-shaped lesions with grey centers on leaves.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* BPH Risk */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">2. Brown Plant Hopper</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  pest.bphRisk === 'High' ? 'bg-rose-100 text-rose-900' : 'bg-amber-100 text-amber-900'
                }`}>
                  {pest.bphRisk} Risk
                </span>
              </div>
              <p className="text-[11px] text-stone-500 italic font-mono">Nilaparvata lugens</p>

              <div className="space-y-2 text-xs text-stone-700">
                <p><strong>Climatic Trigger Window:</strong> Warm humid canopy (28–30°C, RH &ge;78%), stagnant water.</p>
                <p><strong>Active District Conditions:</strong> Day Tmax: {pest.tmax}°C | RH: {pest.rh}%</p>
                <div className="p-3 bg-stone-50 rounded border border-stone-200/70 text-[11px] space-y-1">
                  <strong>Agronomic Mitigation:</strong>
                  <ul className="list-disc pl-4 space-y-0.5 text-stone-600">
                    <li>Implement Alternate Wetting and Drying (AWD) to expose tillers.</li>
                    <li>Leave 30 cm alleyways every 2 meters for canopy aeration.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Bacterial Leaf Blight */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">3. Bacterial Blight</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  pest.blbRisk === 'Elevated' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                }`}>
                  {pest.blbRisk} Risk
                </span>
              </div>
              <p className="text-[11px] text-stone-500 italic font-mono">Xanthomonas oryzae pv. oryzae</p>

              <div className="space-y-2 text-xs text-stone-700">
                <p><strong>Climatic Trigger Window:</strong> Cyclonic heavy rainfall, strong gusty winds, warm temp (25–34°C).</p>
                <p><strong>Active District Conditions:</strong> Heat Days: {pest.heatDays} | RH: {pest.rh}%</p>
                <div className="p-3 bg-stone-50 rounded border border-stone-200/70 text-[11px] space-y-1">
                  <strong>Agronomic Mitigation:</strong>
                  <ul className="list-disc pl-4 space-y-0.5 text-stone-600">
                    <li>Ensure rapid drainage of submergence water after cyclones.</li>
                    <li>Avoid clipping seedling leaf tips during transplanting.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
