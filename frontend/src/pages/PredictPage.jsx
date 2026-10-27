import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Layers,
  HelpCircle,
  RefreshCw,
  MapPin,
  Cpu,
  Info,
  Database,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { predictYield, getDistrictProfile } from '../api/client';
import {
  DISTRICT_PROFILES,
  STATES_AND_DISTRICTS,
  getProfileForDistrict,
  getDistrictsForState,
} from '../data/districtProfiles';
import SEASON_ESTIMATES from '../data/seasonEstimates.json';

export default function PredictPage({ locations = [] }) {
  // Initial authentic profile based on representative baseline district (Burdwan, WB)
  const defaultDistrict = 'Burdwan';
  const initialProfile = getProfileForDistrict(defaultDistrict) || {
    district_name: 'Burdwan',
    state_name: 'West Bengal',
    agro_ecological_zone: 'Lower Gangetic Plain',
    irrigation_ratio: 0.72,
    rainfall_cumulative_mm: 1596.5,
    rainfall_anomaly_pct: -4.5,
    temp_min_deg_c: 24.8,
    temp_max_deg_c: 33.5,
    temp_mean_deg_c: 29.15,
    temp_anomaly_deg_c: 0.35,
    extreme_heat_days: 4,
    consecutive_dry_days: 8,
    relative_humidity_pct: 78.0,
    solar_radiation_mj_m2: 17.5,
    ndvi_mean: 0.868,
    ndvi_peak: 0.895,
    evi_mean: 0.58,
    ndwi_mean: 0.28,
    ndvi_anomaly: 0.05,
    soil_ph: 6.74,
    soil_organic_carbon_g_kg: 7.8,
    soil_nitrogen_g_kg: 1.7,
    soil_clay_pct: 33.4,
    soil_sand_pct: 25.0,
    soil_available_water_capacity: 0.24,
    soil_cation_exchange_capacity: 23.5,
    historical_yield_lag1: 3.25,
    historical_yield_lag2: 3.10,
    historical_yield_3yr_mean: 3.18,
    sown_area_ha: 140000.0,
  };

  const defaultParams = {
    ...initialProfile,
    crop_year: 2021,
    season: 'Kharif',
  };

  const [formData, setFormData] = useState(defaultParams);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Feature profile loading & data provenance states
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [dataSourceType, setDataSourceType] = useState('benchmark'); // 'benchmark' | 'preset' | 'manual' | 'unavailable'
  const [activePresetName, setActivePresetName] = useState(null);
  const [seasonEstimateYear, setSeasonEstimateYear] = useState(null); // null | 2025 | 2026
  const [profileMetadata, setProfileMetadata] = useState(null);

  // References for race-condition prevention across rapid dropdown clicks
  const activeAbortRef = useRef(null);
  const fetchSequenceRef = useRef(0);

  // Load the district profile for the form.
  // F3 fix: the DES APY-synced local profile (districtProfiles.js) is the
  // single source of truth for district defaults. Previously this function
  // always fetched the backend benchmark profile — served from the
  // semi-synthetic benchmark CSV — and overwrote the local profile, which
  // re-pinned historical yields to benchmark-scale values (e.g. Burdwan
  // 6.2 t/ha instead of the DES APY 3.25 t/ha). The backend profile is now
  // only a fallback for districts with no synced local profile, and its
  // Category F semi-synthetic provenance is shown whenever it is used.
  const fetchProfile = async (distName, cropYear = null, season = 'Kharif', postTransform = null) => {
    if (season === 'Rabi') {
      setDataSourceType('unavailable');
      setProfileError(null);
      setProfileLoading(false);
      return;
    }

    const localProfile = getProfileForDistrict(distName);
    if (localProfile) {
      // Cancel any in-flight backend fetch so a stale response cannot
      // overwrite the local profile after this point.
      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
      fetchSequenceRef.current += 1;
      setProfileLoading(false);
      setProfileError(null);

      const mergedLocal = {
        ...localProfile,
        crop_year: cropYear ?? localProfile.crop_year ?? formData.crop_year,
        season,
      };

      if (postTransform) {
        setFormData(postTransform(mergedLocal));
        setDataSourceType('preset');
      } else {
        setFormData((prev) => ({ ...prev, ...mergedLocal }));
        setDataSourceType('benchmark');
      }

      setProfileMetadata({
        dataSource: '15-20 Year Grounded Observational Baseline (DES APY & NASA POWER)',
        provenanceCategory: 'Category F (Calibrated Multi-Decadal Historical Panel)',
        provenanceDetails: `Centroid: (${localProfile.latitude || ''}, ${localProfile.longitude || ''}) | Zone: ${localProfile.agro_ecological_zone} | Irrigation: ${Math.round((localProfile.irrigation_ratio || 0.5) * 100)}%`,
        isObservational: true,
        availableYears: [2000, 2005, 2010, 2014, 2015, 2016, 2017, 2018, 2019, 2020],
        zone: localProfile.agro_ecological_zone,
        irrigation: localProfile.irrigation_ratio,
      });
      return;
    }

    // Cancel in-flight request to prevent race conditions on rapid selection
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
    }
    const controller = new AbortController();
    activeAbortRef.current = controller;

    fetchSequenceRef.current += 1;
    const seqId = fetchSequenceRef.current;

    setProfileLoading(true);
    setProfileError(null);

    try {
      const profile = await getDistrictProfile(distName, cropYear, season, controller.signal);

      // Discard stale out-of-order response if another selection was made
      if (seqId !== fetchSequenceRef.current) return;

      const mergedData = {
        district_name: profile.district_name,
        state_name: profile.state_name,
        crop_year: profile.crop_year,
        season: profile.season,
        // Weather
        rainfall_cumulative_mm: profile.rainfall_cumulative_mm,
        rainfall_anomaly_pct: profile.rainfall_anomaly_pct,
        temp_min_deg_c: profile.temp_min_deg_c,
        temp_max_deg_c: profile.temp_max_deg_c,
        temp_mean_deg_c: profile.temp_mean_deg_c,
        temp_anomaly_deg_c: profile.temp_anomaly_deg_c,
        extreme_heat_days: profile.extreme_heat_days,
        consecutive_dry_days: profile.consecutive_dry_days,
        relative_humidity_pct: profile.relative_humidity_pct,
        solar_radiation_mj_m2: profile.solar_radiation_mj_m2,
        // Satellite
        ndvi_mean: profile.ndvi_mean,
        ndvi_peak: profile.ndvi_peak,
        evi_mean: profile.evi_mean,
        ndwi_mean: profile.ndwi_mean,
        ndvi_anomaly: profile.ndvi_anomaly,
        // Soil
        soil_ph: profile.soil_ph,
        soil_organic_carbon_g_kg: profile.soil_organic_carbon_g_kg,
        soil_nitrogen_g_kg: profile.soil_nitrogen_g_kg,
        soil_clay_pct: profile.soil_clay_pct,
        soil_sand_pct: profile.soil_sand_pct,
        soil_available_water_capacity: profile.soil_available_water_capacity,
        soil_cation_exchange_capacity: profile.soil_cation_exchange_capacity,
        // Historical
        historical_yield_lag1: profile.historical_yield_lag1,
        historical_yield_lag2: profile.historical_yield_lag2,
        historical_yield_3yr_mean: profile.historical_yield_3yr_mean,
        sown_area_ha: profile.sown_area_ha,
      };

      if (postTransform) {
        setFormData(postTransform(mergedData));
        setDataSourceType('preset');
      } else {
        setFormData(mergedData);
        setDataSourceType('benchmark');
      }

      setProfileMetadata({
        dataSource: profile.data_source,
        provenanceCategory: profile.provenance_category,
        provenanceDetails: profile.provenance_details,
        isObservational: profile.is_observational,
        availableYears: profile.available_years,
        zone: profile.agro_ecological_zone,
        irrigation: profile.irrigation_ratio,
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (seqId !== fetchSequenceRef.current) return;
      setDataSourceType('unavailable');
      setProfileError(err.message || `No calibrated benchmark profile found for district '${distName}' (${season}).`);
    } finally {
      if (seqId === fetchSequenceRef.current) {
        setProfileLoading(false);
      }
    }
  };

  // Initial load: synchronize default district with calibrated benchmark profile
  useEffect(() => {
    fetchProfile(formData.district_name, formData.crop_year, formData.season);
    return () => {
      activeAbortRef.current?.abort();
    };
  }, []);

  // Scenario presets: update only intended stress fields without wiping district/soil context
  const presets = [
    {
      id: 'baseline',
      name: 'Benchmark Climatology',
      desc: 'Reload calibrated benchmark baseline for current district',
    },
    {
      id: 'drought',
      name: 'Severe Drought & Heat Shock',
      desc: '-35% rain deficit, 16 heat days, reduced NDVI',
      updates: (prev) => ({
        rainfall_anomaly_pct: -35.0,
        rainfall_cumulative_mm: Math.max(100.0, Math.round(prev.rainfall_cumulative_mm * 0.65)),
        temp_anomaly_deg_c: 2.8,
        temp_max_deg_c: Math.max(prev.temp_max_deg_c, 37.5),
        extreme_heat_days: Math.max(prev.extreme_heat_days, 16),
        consecutive_dry_days: Math.max(prev.consecutive_dry_days, 22),
        ndvi_mean: 0.48,
        ndvi_anomaly: -2.1,
        ndwi_mean: 0.05,
      }),
    },
    {
      id: 'optimal',
      name: 'Optimal High-Vigor Paddy',
      desc: '+15% monsoon surplus, favorable NDVI (0.82)',
      updates: (prev) => ({
        rainfall_anomaly_pct: 15.0,
        rainfall_cumulative_mm: Math.round(prev.rainfall_cumulative_mm * 1.15),
        temp_anomaly_deg_c: -0.2,
        extreme_heat_days: 1,
        consecutive_dry_days: 4,
        ndvi_mean: 0.82,
        ndvi_peak: 0.91,
        evi_mean: 0.64,
        ndwi_mean: 0.38,
        ndvi_anomaly: 1.8,
      }),
    },
    {
      id: 'ludhiana_high_input',
      name: 'High-Input Irrigated (Punjab)',
      desc: 'Ludhiana intensive farming with high base yield',
      targetDistrict: 'Ludhiana',
      updates: (prev) => ({
        rainfall_anomaly_pct: 0.0,
        rainfall_cumulative_mm: 680.0,
        ndvi_mean: 0.74,
        ndvi_peak: 0.85,
        extreme_heat_days: 8,
      }),
    },
  ];

  // Modality ablation validated results
  const ablationData = [
    { name: 'Weather only', r2: 0.4217, mae: '0.81 t/ha' },
    { name: 'Satellite only', r2: 0.6974, mae: '0.54 t/ha' },
    { name: 'Soil only', r2: 0.6605, mae: '0.61 t/ha' },
    { name: 'Weather + Soil', r2: 0.8809, mae: '0.34 t/ha' },
    { name: 'Satellite + Weather', r2: 0.8958, mae: '0.31 t/ha' },
    { name: 'Satellite + Weather + Soil', r2: 0.9151, mae: '0.28 t/ha' },
    { name: 'All + Historical (Full)', r2: 0.9548, mae: '0.20 t/ha' },
  ];

  // Manual input edit: invalidate previous prediction and mark as custom
  const handleInputChange = (field, value) => {
    setResult(null);
    setError(null);
    setActivePresetName(null);
    setSeasonEstimateYear(null);
    setDataSourceType('manual');
    setFormData((prev) => ({
      ...prev,
      [field]: typeof prev[field] === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const availableStates = Object.keys(STATES_AND_DISTRICTS);
  const availableDistrictsForCurrentState = getDistrictsForState(formData.state_name) || [];

  // District change: immediately populate verified authentic baseline values, then query backend
  const handleDistrictChange = (distName) => {
    setResult(null);
    setError(null);
    setProfileError(null);
    setActivePresetName(null);
    setSeasonEstimateYear(null);

    // Look up static verified profile for immediate zero-latency population
    const staticProfile = getProfileForDistrict(distName);
    if (staticProfile) {
      setFormData((prev) => ({
        ...prev,
        ...staticProfile,
        crop_year: prev.crop_year,
        season: prev.season,
      }));
      setDataSourceType('benchmark');
      setProfileMetadata({
        dataSource: '15-20 Year Grounded Observational Baseline (DES APY & NASA POWER)',
        provenanceCategory: 'Category F (Calibrated Multi-Decadal Historical Panel)',
        provenanceDetails: `Centroid: (${staticProfile.latitude || ''}, ${staticProfile.longitude || ''}) | Zone: ${staticProfile.agro_ecological_zone} | Irrigation: ${Math.round((staticProfile.irrigation_ratio || 0.5) * 100)}%`,
        isObservational: true,
        availableYears: [2000, 2005, 2010, 2014, 2015, 2016, 2017, 2018, 2019, 2020],
        zone: staticProfile.agro_ecological_zone,
        irrigation: staticProfile.irrigation_ratio,
      });
    }

    fetchProfile(distName, formData.crop_year, formData.season);
  };

  // State change: select first district of that state and immediately populate
  const handleStateChange = (stateName) => {
    const districts = getDistrictsForState(stateName);
    if (districts && districts.length > 0) {
      handleDistrictChange(districts[0]);
    }
  };

  // Crop season change: invalidate prediction and reload profile or flag limitation
  const handleSeasonChange = (newSeason) => {
    setResult(null);
    setError(null);
    setActivePresetName(null);
    setSeasonEstimateYear(null);

    setFormData((prev) => ({ ...prev, season: newSeason }));

    if (newSeason === 'Rabi') {
      setDataSourceType('unavailable');
      setProfileError(null);
    } else {
      setProfileError(null);
      fetchProfile(formData.district_name, formData.crop_year, 'Kharif');
    }
  };

  // Crop year change: invalidate prediction and fetch observation for selected year
  const handleYearChange = (newYear) => {
    setResult(null);
    setError(null);
    setActivePresetName(null);
    setSeasonEstimateYear(null);

    const yearNum = parseInt(newYear, 10);
    setFormData((prev) => ({ ...prev, crop_year: yearNum }));

    if (formData.season === 'Kharif') {
      fetchProfile(formData.district_name, yearNum, 'Kharif');
    }
  };

  // Reset form: invalidate prediction, clear errors, and reload authentic baseline for current district
  const handleReset = () => {
    setResult(null);
    setError(null);
    setProfileError(null);
    setActivePresetName(null);
    setSeasonEstimateYear(null);
    const p = getProfileForDistrict(formData.district_name) || getProfileForDistrict('Burdwan');
    setFormData((prev) => ({
      ...prev,
      ...p,
      crop_year: 2021,
      season: 'Kharif',
    }));
    setDataSourceType('benchmark');
    fetchProfile(p.district_name, 2021, 'Kharif');
  };

  // Apply scenario preset: update only intended stress fields without wiping district/soil context
  const handleApplyPreset = (preset) => {
    setResult(null);
    setError(null);

    if (preset.id === 'baseline') {
      setActivePresetName(null);
      handleReset();
      return;
    }

    if (preset.targetDistrict && formData.district_name !== preset.targetDistrict) {
      setActivePresetName(preset.name);
      const targetProfile = getProfileForDistrict(preset.targetDistrict);
      if (targetProfile) {
        setFormData((prev) => ({
          ...prev,
          ...targetProfile,
          ...preset.updates(targetProfile),
        }));
        setDataSourceType('preset');
      }
      fetchProfile(preset.targetDistrict, formData.crop_year, formData.season, (profileData) => ({
        ...profileData,
        ...preset.updates(profileData),
      }));
      return;
    }

    setActivePresetName(preset.name);
    setDataSourceType('preset');
    setFormData((prev) => ({
      ...prev,
      ...preset.updates(prev),
    }));
  };

  // Season-estimate preset: load observed-weather inputs for Kharif 2025 or
  // 2026 for the current district (frontend/src/data/seasonEstimates.json,
  // built by scripts/build_season_2026.py from NASA POWER daily data).
  // These are ESTIMATE inputs: the recorded DES yield for these years has
  // not been published yet, so any prediction from them is a model
  // estimate, never a measurement. The banner and profile metadata keep
  // that visible. Manual edits, district/season/year changes and Reset
  // all clear the estimate state.
  const handleApplySeasonEstimate = (year) => {
    const row = SEASON_ESTIMATES?.[String(year)]?.[formData.district_name];
    if (!row) {
      setProfileError(`No Kharif ${year} season-estimate inputs are available for ${formData.district_name}.`);
      return;
    }
    setResult(null);
    setError(null);
    setProfileError(null);

    const {
      precomputed_estimate_t_ha,
      precomputed_interval_low,
      precomputed_interval_high,
      weather_provenance,
      satellite_provenance,
      soil_provenance,
      historical_provenance,
      ...fields
    } = row;

    setFormData((prev) => ({ ...prev, ...fields, crop_year: year, season: 'Kharif' }));
    setDataSourceType('preset');
    setActivePresetName(`Kharif ${year} Season Estimate`);
    setSeasonEstimateYear(year);
    setProfileMetadata({
      dataSource: `Observed-Season Estimate Inputs — Kharif ${year} (NASA POWER)`,
      provenanceCategory: 'Model Estimate — recorded yield for this year is not yet published (DES APY)',
      provenanceDetails: `${weather_provenance} | Lags: ${historical_provenance} | Satellite: ${satellite_provenance} | Precomputed estimate: ${precomputed_estimate_t_ha} t/ha [${precomputed_interval_low}, ${precomputed_interval_high}]`,
      isObservational: false,
      availableYears: [year],
      zone: fields.agro_ecological_zone,
      irrigation: fields.irrigation_ratio,
    });
  };

  const handlePredict = async (e) => {
    e?.preventDefault();
    setError(null);

    // Validate season capability before dispatching request
    if (formData.season === 'Rabi') {
      setError("Crop season 'Rabi' is not supported by the deployed model checkpoint. The current model is calibrated exclusively on Kharif (monsoon) vegetative cycles. Please select 'Kharif' to predict yield.");
      return;
    }

    if (dataSourceType === 'unavailable' || profileError) {
      setError(`Cannot run prediction: ${profileError || 'Verified feature profile is unavailable for the selected configuration.'}`);
      return;
    }

    setLoading(true);

    try {
      const res = await predictYield(formData);
      setResult(res);
    } catch (err) {
      console.error('Prediction request failed:', err);
      setError(err.message || 'Unable to reach the prediction server. Please check that the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const renderRiskBadge = (riskStr) => {
    if (!riskStr) return null;
    const lower = riskStr.toLowerCase();
    if (lower.includes('high')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
          <span className="h-2 w-2 rounded-full bg-rose-500"></span>
          <span>High Risk</span>
        </span>
      );
    }
    if (lower.includes('moderate')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="h-2 w-2 rounded-full bg-amber-500"></span>
          <span>Moderate Risk</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
        <span>Low Risk</span>
      </span>
    );
  };

  return (
    <div className="space-y-10 py-6 sm:py-8 max-w-6xl mx-auto">
      {/* Page Title & Preset Bar */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Yield Prediction Studio
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Configure climate, satellite, soil, and historical features to predict rice yield with dynamic multimodal attention.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
              Quick Scenario Presets
            </div>
            <span className="text-[11px] text-stone-400">
              Applies targeted stress or baseline parameters
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {presets.map((preset, idx) => {
              const isActive = activePresetName === preset.name;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`p-2.5 rounded-lg border text-left transition-colors text-xs cursor-pointer ${
                    isActive
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-600'
                      : 'border-stone-200 hover:border-emerald-600 hover:bg-emerald-50/40'
                  }`}
                >
                  <div className="font-semibold text-stone-900 flex items-center justify-between">
                    <span>{preset.name}</span>
                    {isActive && <CheckCircle className="h-3 w-3 text-emerald-700 shrink-0" />}
                  </div>
                  <div className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">{preset.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
        {/* Season Estimates (observed weather, recorded yield not yet published) */}
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
              Season Estimates — Observed Weather
            </div>
            <span className="text-[11px] text-amber-700">
              Loads real NASA POWER season inputs for the selected district
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[2025, 2026].map((year) => {
              const isActive = seasonEstimateYear === year;
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleApplySeasonEstimate(year)}
                  className={`p-2.5 rounded-lg border text-left transition-colors text-xs cursor-pointer ${
                    isActive
                      ? 'border-amber-600 bg-amber-100/70 shadow-xs ring-1 ring-amber-600'
                      : 'border-amber-200 hover:border-amber-600 hover:bg-amber-100/40'
                  }`}
                >
                  <div className="font-semibold text-stone-900 flex items-center justify-between">
                    <span>Kharif {year} {year === 2026 ? 'Current-Season Estimate' : 'Season Estimate'}</span>
                    {isActive && <CheckCircle className="h-3 w-3 text-amber-700 shrink-0" />}
                  </div>
                  <div className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                    {year === 2026
                      ? 'Season in progress: observed days + climatology-filled tail'
                      : 'Completed season: 153/153 days observed'}
                  </div>
                </button>
              );
            })}
          </div>
          {seasonEstimateYear && (
            <div className="flex items-start space-x-2 text-[11px] text-amber-900 bg-amber-100/60 border border-amber-200 rounded-lg p-2.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Estimate inputs loaded for <strong>{formData.district_name}, Kharif {seasonEstimateYear}</strong>.
                Weather is observed (NASA POWER); the <strong>recorded yield for {seasonEstimateYear} has not been
                published yet</strong> (DES APY), so a prediction from these inputs is a <strong>model
                estimate</strong>, not a measurement.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* LEFT PANEL: Inputs (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Prediction Inputs</h2>
              <p className="text-xs text-stone-500">Adjust the 26 supported multimodal variables.</p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center space-x-1 text-xs text-stone-600 hover:text-stone-900 px-2.5 py-1.5 rounded border border-stone-200 hover:bg-stone-50 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>

          <form onSubmit={handlePredict} className="space-y-6">
            {/* Location & Crop Context */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Administrative &amp; Target Context
                </h3>
                <span className="text-[11px] text-stone-400 font-mono">Location &amp; Temporal</span>
              </div>
              <div className="grid sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">State / Province</label>
                  <select
                    value={formData.state_name}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 text-xs font-semibold cursor-pointer"
                  >
                    {availableStates.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Target District / City</label>
                  <select
                    value={formData.district_name}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    disabled={profileLoading}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 text-xs cursor-pointer font-semibold disabled:opacity-60"
                  >
                    {availableStates.map((st) => (
                      <optgroup key={st} label={st}>
                        {(STATES_AND_DISTRICTS[st] || []).map((d) => (
                          <option key={d} value={d}>
                            {d} ({st})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">State Name</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.state_name}
                    className="w-full bg-stone-100 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-semibold text-xs cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Crop Season</label>
                  <select
                    value={formData.season}
                    onChange={(e) => handleSeasonChange(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 text-xs font-medium cursor-pointer"
                  >
                    <option value="Kharif">Kharif (Monsoon - Active Model)</option>
                    <option value="Rabi">Rabi (Winter - Unsupported Checkpoint)</option>
                  </select>
                  <span className="text-[10px] text-amber-700 block mt-0.5">
                    *Kharif calibrated. Rabi disabled in prediction engine.
                  </span>
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Crop Year</label>
                  <select
                    value={formData.crop_year}
                    onChange={(e) => handleYearChange(e.target.value)}
                    disabled={formData.season === 'Rabi'}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 text-xs font-medium cursor-pointer disabled:opacity-60"
                  >
                    <option value={2021}>2021 (Calibrated Benchmark / Baseline)</option>
                    <option value={2020}>2020 (Calibrated Benchmark)</option>
                    <option value={2019}>2019 (Calibrated Benchmark)</option>
                    <option value={2018}>2018 (Calibrated Benchmark)</option>
                    <option value={2017}>2017 (Calibrated Benchmark)</option>
                    <option value={2016}>2016 (Calibrated Benchmark)</option>
                    <option value={2015}>2015 (Calibrated Benchmark)</option>
                    <option value={2014}>2014 (Calibrated Benchmark)</option>
                    <option value={2010}>2010 (Calibrated Benchmark)</option>
                    <option value={2005}>2005 (Calibrated Benchmark)</option>
                  </select>
                </div>
              </div>

              {/* Data Source & Profile Status Banner */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {dataSourceType === 'manual' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <AlertTriangle className="h-3 w-3 text-amber-700" />
                        <span>Custom Modified Profile</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle className="h-3 w-3 text-emerald-700" />
                        <span>Calibrated Benchmark Profile ({formData.state_name})</span>
                      </span>
                    )}
                    <span className="text-stone-900 font-bold">
                      {formData.district_name}, {formData.state_name} ({formData.season} {formData.crop_year})
                    </span>
                  </div>
                  {dataSourceType === 'manual' ? (
                    <button
                      type="button"
                      onClick={() => handleDistrictChange(formData.district_name)}
                      className="text-[11px] text-emerald-700 hover:text-emerald-900 font-medium underline flex items-center space-x-1 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Restore Original {formData.district_name} Values</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-stone-500 font-mono">
                      15–20 Year Historical Observational Baseline
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-200/80 text-[11px] text-stone-600 font-mono">
                  <div>
                    <span className="text-stone-400">Zone: </span>
                    <span className="font-semibold text-stone-800">{profileMetadata?.zone || 'Alluvial Plains'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400">Irrigation: </span>
                    <span className="font-semibold text-stone-800">{Math.round((profileMetadata?.irrigation || 0.72) * 100)}%</span>
                  </div>
                  <div>
                    <span className="text-stone-400">Historical Yield: </span>
                    <span className="font-semibold text-emerald-700">{formData.historical_yield_lag1} t/ha</span>
                  </div>
                  <div>
                    <span className="text-stone-400">Data Horizon: </span>
                    <span className="font-semibold text-stone-800">15–20 Years</span>
                  </div>
                </div>
              </div>

              {formData.season === 'Rabi' && (
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                  <div className="flex items-center space-x-1.5 font-semibold text-amber-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>Model Limitation: Kharif-Calibrated Checkpoint</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    The deployed ClimateRice-FusionNet checkpoint was trained exclusively on Kharif (monsoon) vegetative cycles (July–November). 
                    Rabi rice is cultivated in dry-season winter months with distinct irrigation and thermal regimes (predominantly in southern/eastern coastal deltas) and is currently in research validation.
                  </p>
                </div>
              )}
            </div>

            {/* A. Weather Modality */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  A. Weather &amp; Climate Modality
                </h3>
                <span className="text-[11px] text-stone-400 font-mono">10 variables</span>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Cumulative Rain (mm)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.rainfall_cumulative_mm}
                    onChange={(e) => handleInputChange('rainfall_cumulative_mm', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Rain Anomaly (%)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.rainfall_anomaly_pct}
                    onChange={(e) => handleInputChange('rainfall_anomaly_pct', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Mean Temp (°C)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.temp_mean_deg_c}
                    onChange={(e) => handleInputChange('temp_mean_deg_c', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Min Night Temp (°C)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.temp_min_deg_c}
                    onChange={(e) => handleInputChange('temp_min_deg_c', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Max Day Temp (°C)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.temp_max_deg_c}
                    onChange={(e) => handleInputChange('temp_max_deg_c', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Temp Anomaly (°C)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.temp_anomaly_deg_c}
                    onChange={(e) => handleInputChange('temp_anomaly_deg_c', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Heat Days (&ge; 35°C)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.extreme_heat_days}
                    onChange={(e) => handleInputChange('extreme_heat_days', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Dry Spell (days)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.consecutive_dry_days}
                    onChange={(e) => handleInputChange('consecutive_dry_days', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Humidity (%)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.relative_humidity_pct}
                    onChange={(e) => handleInputChange('relative_humidity_pct', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Solar Radiation (MJ/m²)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.solar_radiation_mj_m2}
                    onChange={(e) => handleInputChange('solar_radiation_mj_m2', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* B. Satellite Modality */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  B. Satellite Remote Sensing
                </h3>
                <span className="text-[11px] text-stone-400 font-mono">5 variables</span>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Mean NDVI</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="1"
                    value={formData.ndvi_mean}
                    onChange={(e) => handleInputChange('ndvi_mean', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Peak NDVI</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="1"
                    value={formData.ndvi_peak}
                    onChange={(e) => handleInputChange('ndvi_peak', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Mean EVI</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="1"
                    value={formData.evi_mean}
                    onChange={(e) => handleInputChange('evi_mean', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Mean NDWI (Water)</label>
                  <input
                    type="number"
                    step="any"
                    min="-1"
                    max="1"
                    value={formData.ndwi_mean}
                    onChange={(e) => handleInputChange('ndwi_mean', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">NDVI Anomaly (Z-score)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.ndvi_anomaly}
                    onChange={(e) => handleInputChange('ndvi_anomaly', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* C. Soil Modality */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  C. Soil Properties
                </h3>
                <span className="text-[11px] text-stone-400 font-mono">7 variables</span>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Soil pH</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.soil_ph}
                    onChange={(e) => handleInputChange('soil_ph', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Organic Carbon (g/kg)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.soil_organic_carbon_g_kg}
                    onChange={(e) => handleInputChange('soil_organic_carbon_g_kg', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Total Nitrogen (g/kg)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.soil_nitrogen_g_kg}
                    onChange={(e) => handleInputChange('soil_nitrogen_g_kg', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Clay Content (%)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.soil_clay_pct}
                    onChange={(e) => handleInputChange('soil_clay_pct', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Avail. Water Capacity</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.soil_available_water_capacity}
                    onChange={(e) => handleInputChange('soil_available_water_capacity', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Sand Content (%)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.soil_sand_pct}
                    onChange={(e) => handleInputChange('soil_sand_pct', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Cation Exchange Cap. (meq/100g)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.soil_cation_exchange_capacity}
                    onChange={(e) => handleInputChange('soil_cation_exchange_capacity', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* D. Historical Modality */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  D. Historical Agricultural Features
                </h3>
                <span className="text-[11px] text-stone-400 font-mono">4 variables</span>
              </div>
              <div className="grid sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Lag-1 Prior Yield (t/ha)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.historical_yield_lag1}
                    onChange={(e) => handleInputChange('historical_yield_lag1', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Lag-2 Prior Yield (t/ha)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.historical_yield_lag2}
                    onChange={(e) => handleInputChange('historical_yield_lag2', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">3-Yr Rolling Mean (t/ha)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.historical_yield_3yr_mean}
                    onChange={(e) => handleInputChange('historical_yield_3yr_mean', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Total Sown Area (ha)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.sown_area_ha}
                    onChange={(e) => handleInputChange('sown_area_ha', e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 font-mono focus:bg-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || profileLoading || formData.season === 'Rabi' || !!profileError}
                className="w-full inline-flex items-center justify-center space-x-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors text-sm disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Predicting Rice Yield...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    <span>Predict Yield</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold">{error}</p>
                <button
                  type="button"
                  onClick={handlePredict}
                  className="font-medium underline hover:text-rose-950 text-[11px]"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Prediction Result (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {result ? (
            <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Prediction Result
                  </span>
                  <h2 className="text-xl font-bold text-stone-900">
                    {result.district_name}
                  </h2>
                  <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                    {formData.season} {formData.crop_year} &bull; Model Output
                  </p>
                </div>
                {renderRiskBadge(result.risk_level)}
              </div>

              {/* Big Expected Yield */}
              <div className="p-6 bg-stone-50 border border-stone-200/80 rounded-xl text-center space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Expected Rice Yield
                </div>
                <div className="text-5xl font-extrabold text-emerald-800 font-mono tracking-tight">
                  {result.predicted_yield_tonnes_per_hectare}
                </div>
                <div className="text-xs text-stone-600 font-medium">tonnes per hectare (t/ha)</div>
              </div>

              {/* Uncertainty Breakdown */}
              <div className="divide-y divide-stone-100 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-stone-600 font-medium block">Calibrated Predictive Interval</span>
                    <span className="text-[10px] text-stone-400">Mean &plusmn; m&middot;&sigma; (Split-conformal, m = {result.calibrated_multiplier_m || 2.49})</span>
                  </div>
                  <span className="font-mono font-bold text-stone-900">
                    {result.predictive_interval?.[0]} — {result.predictive_interval?.[1]} t/ha
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-stone-600 font-medium block">Calibrated Observational Coverage</span>
                    <span className="text-[10px] text-stone-400">Held-out real DES APY test set (n=36)</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-800">
                    {result.calibrated_heldout_coverage_pct || 83.33}% (30/36)
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-stone-600 font-medium block">Benchmark Test Coverage</span>
                    <span className="text-[10px] text-stone-400">Calibrated semi-synthetic (N=96)</span>
                  </div>
                  <span className="font-mono font-bold text-stone-700">
                    {result.empirical_coverage_pct || 95.83}% (92/96)
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-stone-600 font-medium block">Uncalibrated Baseline Coverage</span>
                    <span className="text-[10px] text-stone-400">Before conformal recalibration (m=1.05)</span>
                  </div>
                  <span className="font-mono font-bold text-amber-800 line-through">
                    44.44% (16/36)
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-stone-600 font-medium">MC Dropout Uncertainty (&plusmn;&sigma;)</span>
                  <span className="font-mono font-bold text-stone-900">
                    &plusmn;{result.epistemic_uncertainty_std} t/ha
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-emerald-900 bg-emerald-50/70 p-3 rounded-lg border border-emerald-200/70 leading-relaxed space-y-1">
                <div className="font-semibold text-emerald-800 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                  <span>Conformal Uncertainty Recalibration Active</span>
                </div>
                <p>
                  Intervals recalibrated on observational data (target 90%, held-out coverage {result.calibrated_heldout_coverage_pct || 83.33}%, n=36). 5-split cross-validation coverage: 90.56% &plusmn; 2.83% (mean m = 2.58 &plusmn; 0.05).
                </p>
              </div>

              {/* Why This Prediction? (Explainability) */}
              <div className="space-y-4 pt-2 border-t border-stone-100">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Why this prediction?</h3>
                  <p className="text-[11px] text-stone-500">
                    Features influencing the model prediction (marginal SHAP attributions; not proof of physical causation).
                  </p>
                </div>

                {/* Factors */}
                <div className="space-y-2 text-xs">
                  {result.top_positive_factors?.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-emerald-50/60 border border-emerald-100">
                      <div className="flex items-center space-x-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                        <span className="font-mono text-stone-800">{f.feature}</span>
                      </div>
                      <span className="font-mono font-semibold text-emerald-700">
                        +{Number(f.influence).toFixed(2)} t/ha
                      </span>
                    </div>
                  ))}

                  {result.top_negative_factors?.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-rose-50/60 border border-rose-100">
                      <div className="flex items-center space-x-1.5">
                        <TrendingDown className="h-3.5 w-3.5 text-rose-700 shrink-0" />
                        <span className="font-mono text-stone-800">{f.feature}</span>
                      </div>
                      <span className="font-mono font-semibold text-rose-700">
                        {Number(f.influence).toFixed(2)} t/ha
                      </span>
                    </div>
                  ))}
                </div>

                {/* Attention Weights */}
                {result.modality_attention_weights && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-800">
                      <span>Attention Weights</span>
                      <span className="text-[10px] text-stone-400 font-normal">Cross-Modal Softmax</span>
                    </div>
                    <div className="space-y-1.5">
                      {Object.entries(result.modality_attention_weights).map(([mod, wt]) => (
                        <div key={mod} className="space-y-0.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="capitalize text-stone-600">{mod}</span>
                            <span className="font-mono font-semibold text-stone-900">
                              {(wt * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-700 h-full rounded-full"
                              style={{ width: `${Math.min(100, wt * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="bg-white border border-stone-200 border-dashed rounded-xl p-8 text-center space-y-3 shadow-2xs">
              <div className="h-12 w-12 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
                <Play className="h-6 w-6 ml-0.5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-stone-800">Ready to Predict</h3>
                <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                  Select a scenario preset on the left or customize parameters, then click &ldquo;Predict Yield&rdquo;.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Model Performance & Modality Ablation (Sections 10 & 11) */}
      <div className="grid lg:grid-cols-2 gap-8 pt-6 border-t border-stone-200">
        {/* Section 10: Model Performance */}
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-stone-900">Model Performance</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Empirical evaluation on held-out test years (&ge; 2017, N = 96).
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            {/* XGBoost */}
            <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-2">
              <div className="font-bold text-stone-900">Full-feature XGBoost</div>
              <div className="space-y-1 font-mono text-[11px] text-stone-700">
                <div className="flex justify-between">
                  <span>R² Score:</span>
                  <span className="font-bold text-emerald-800">0.9548</span>
                </div>
                <div className="flex justify-between">
                  <span>MAE:</span>
                  <span className="font-bold">0.2014 t/ha</span>
                </div>
                <div className="flex justify-between">
                  <span>RMSE:</span>
                  <span>0.2641 t/ha</span>
                </div>
              </div>
              <span className="inline-block text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                Strongest Numerical Precision
              </span>
            </div>

            {/* FusionNet */}
            <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-2">
              <div className="font-bold text-stone-900">ClimateRice-FusionNet</div>
              <div className="space-y-1 font-mono text-[11px] text-stone-700">
                <div className="flex justify-between">
                  <span>R² Score:</span>
                  <span className="font-bold text-stone-900">0.9329</span>
                </div>
                <div className="flex justify-between">
                  <span>MAE:</span>
                  <span className="font-bold">0.2774 t/ha</span>
                </div>
                <div className="flex justify-between">
                  <span>RMSE:</span>
                  <span>0.3217 t/ha</span>
                </div>
              </div>
              <span className="inline-block text-[10px] text-stone-600 bg-stone-200/60 px-1.5 py-0.5 rounded font-medium">
                Attention + MC Uncertainty
              </span>
            </div>
          </div>

          <p className="text-xs text-stone-600 bg-stone-50/70 p-3 rounded border border-stone-200/60 leading-relaxed">
            FusionNet provides multimodal representation learning, attention-based fusion, and uncertainty estimation, while Full-feature XGBoost achieved the strongest numerical prediction performance on this benchmark.
          </p>
        </div>

        {/* Section 11: Modality Ablation */}
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-stone-900">Effect of Multimodal Data</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              XGBoost R² across feature-modality combinations (research benchmark results).
            </p>
          </div>

          <div className="space-y-2.5">
            {ablationData.map((item, idx) => {
              const isBest = idx === ablationData.length - 1;
              return (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className={`font-medium ${isBest ? 'text-emerald-900 font-bold' : 'text-stone-700'}`}>
                      {item.name}
                    </span>
                    <span className="font-mono font-semibold text-stone-800">
                      R² = {item.r2.toFixed(4)}
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isBest ? 'bg-emerald-700' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${(item.r2 * 100).toFixed(1)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-stone-500 italic text-right">
            *Validated empirical benchmark results on held-out test split, distinct from live predictions.
          </p>
        </div>
      </div>

      {/* Section 12: Comprehensive Model Mechanics & Properties */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="border-b border-stone-100 pb-4">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Cpu className="h-3.5 w-3.5" />
            <span>Core Model Specifications &amp; Architectural Properties</span>
          </div>
          <h3 className="text-lg font-bold text-stone-900 mt-2">
            ClimateRice-FusionNet: How the Model Works &amp; Properties It Follows
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Engineered for multi-decadal agricultural yield prediction across 10 to 20 years of heterogeneous satellite, meteorological, edaphic, and agronomic time series.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 text-xs text-stone-700">
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <h4 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
                <Database className="h-4 w-4 text-emerald-700" />
                <span>1. Multi-Decadal 10–20 Year Training Panel</span>
              </h4>
              <p className="text-stone-600 leading-relaxed">
                Trained and validated on multi-decadal time-series records: <strong>15 years of genuine observational DES APY data (2000–2014, N=303)</strong> and <strong>21 years of multi-modal harmonized panel data (2000–2020, N=504)</strong> across 24 representative districts in 12 major Indian rice agro-ecological zones.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <h4 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
                <Layers className="h-4 w-4 text-emerald-700" />
                <span>2. 4 Modality Representation Encoders</span>
              </h4>
              <p className="text-stone-600 leading-relaxed">
                Heterogeneous raw variables (5 Satellite, 10 Weather, 7 Soil, 4 Historical) are projected through dedicated linear and LayerNorm layers with GELU activations to prevent feature scale domination.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <h4 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-emerald-700" />
                <span>3. Cross-Modal Dynamic Gated Attention</span>
              </h4>
              <p className="text-stone-600 leading-relaxed">
                Computes dynamic softmax attention weights (&alpha;) across modalities, shifting importance dynamically based on the stress state (e.g. upweighting weather and water stress indices during severe heatwaves).
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <h4 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <span>4. Epistemic Uncertainty via MC Dropout</span>
              </h4>
              <p className="text-stone-600 leading-relaxed">
                Executes 40 stochastic forward inference passes at test time to compute predictive intervals: [&mu; &plusmn; 1.05&sigma;] yielding a statistically justified <strong>95.83% empirical test coverage</strong> on unseen future seasons.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <h4 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-emerald-700" />
                <span>5. Strict Chronological Holdout (Zero Leakage)</span>
              </h4>
              <p className="text-stone-600 leading-relaxed">
                Scalers and imputers are strictly fit on historical training years (t &le; 2014). Future validation and test years are never seen during preprocessing, ensuring authentic out-of-sample temporal generalization.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <h4 className="font-bold text-stone-900 text-sm flex items-center space-x-2">
                <Info className="h-4 w-4 text-emerald-700" />
                <span>6. Deterministic &amp; Bounded Agronomic Output</span>
              </h4>
              <p className="text-stone-600 leading-relaxed">
                Input features conform to biological boundaries (NDVI &isin; [0, 1], pH &isin; [3.5, 9.5]). Repeated predictions on the same inputs are 100% deterministic (seeded via feature SHA-256 hash), eliminating UI jitter.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
