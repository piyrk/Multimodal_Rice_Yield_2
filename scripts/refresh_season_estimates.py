"""Refresh ClimateRice-AI season estimates from live NASA POWER data.

Recomputes ONLY the 10 weather features of frontend/src/data/seasonEstimates.json
for the 2025 and 2026 Kharif seasons (Jun 1 - Oct 31, 153 days), re-runs every
row through the deployed prediction API to refresh the precomputed estimates,
and writes an updated JSON with fresh _meta provenance.

Rules (no silent fabrication):
- District normals are recovered exactly from the shipped 2025 rows
  (rain_normal = rain / (1 + anomaly/100); temp_normal = tmean - anomaly),
  the same recovery the original builder used against the observational CSV.
- A season day counts as observed only if all 6 NASA POWER parameters are
  present and above the -999 fill value. Missing days are filled with the
  district's 2000-2014 calendar-day climatology mean and COUNTED per district
  in the provenance string.
- Verification gate: recomputed 2025 features are compared against the
  shipped 2025 values; the report flags any district drifting beyond
  tolerance (rain 2%, temps 0.3 C, RH 2 pts, solar 5%, counts exact-ish).
- All 50 API predictions must succeed and be non-empty (Oct-2026 lesson:
  a silent failure once produced empty estimates for 3 districts).

Usage (from the repo root, no third-party packages needed):
  python3 scripts/refresh_season_estimates.py
      -> refreshes frontend/src/data/seasonEstimates.json in place
  python3 scripts/refresh_season_estimates.py <current.json> <out.json> <report.txt>
"""
import json, sys, time, urllib.request, urllib.error
from datetime import date, timedelta

POWER = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMS = "PRECTOTCORR,T2M_MIN,T2M_MAX,T2M,RH2M,ALLSKY_SFC_SW_DWN"
API = "https://climaterice-api.onrender.com/api/v1/predict"
FILL = -900.0

def pull(lat, lon, start, end, tries=3):
    url = (f"{POWER}?parameters={PARAMS}&community=AG&longitude={lon}"
           f"&latitude={lat}&start={start}&end={end}&format=JSON")
    for i in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=300) as r:
                return json.load(r)["properties"]["parameter"]
        except Exception as e:
            print(f"  pull retry {i+1} ({start}-{end}): {e}", flush=True)
            time.sleep(10 * (i + 1))
    raise RuntimeError(f"POWER pull failed {start}-{end}")

def window(year):
    d, out = date(year, 6, 1), []
    while d <= date(year, 10, 31):
        out.append(d); d += timedelta(days=1)
    return out

def day_vals(param, d):
    k = d.strftime("%Y%m%d")
    vals = {}
    for p, series in param.items():
        v = series.get(k)
        if v is None or v <= FILL:
            return None
        vals[p] = float(v)
    return vals

def climatology(param):
    """{(month, day): {param: mean}} over all years present in the pull."""
    acc = {}
    for p, series in param.items():
        for k, v in series.items():
            if v is None or v <= FILL:
                continue
            md = (int(k[4:6]), int(k[6:8]))
            acc.setdefault(md, {}).setdefault(p, []).append(float(v))
    return {md: {p: sum(vs) / len(vs) for p, vs in ps.items()}
            for md, ps in acc.items()}

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

def fetch_forecast(lat, lon):
    """Open-Meteo 16-day daily forecast mapped onto the POWER parameter names.
    Returns {date: {param: value}}; empty dict on any failure (the caller then
    falls back to climatology, and the counts say so)."""
    q = (f"?latitude={lat}&longitude={lon}"
         "&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,"
         "precipitation_sum,relative_humidity_2m_mean,shortwave_radiation_sum"
         "&timezone=Asia%2FKolkata&forecast_days=16")
    try:
        with urllib.request.urlopen(FORECAST_URL + q, timeout=60) as r:
            daily = json.load(r)["daily"]
        out = {}
        for i, ds in enumerate(daily["time"]):
            y, m, dd = (int(x) for x in ds.split("-"))
            out[date(y, m, dd)] = {
                "PRECTOTCORR": float(daily["precipitation_sum"][i]),
                "T2M_MAX": float(daily["temperature_2m_max"][i]),
                "T2M_MIN": float(daily["temperature_2m_min"][i]),
                "T2M": float(daily["temperature_2m_mean"][i]),
                "RH2M": float(daily["relative_humidity_2m_mean"][i]),
                "ALLSKY_SFC_SW_DWN": float(daily["shortwave_radiation_sum"][i]),
            }
        return out
    except Exception as e:
        print(f"  forecast unavailable ({e}); climatology fallback", flush=True)
        return {}

def season_features(param, clim, year, rain_normal, temp_normal, forecast=None, today=None):
    """Day sources, in priority order: NASA POWER observed -> Open-Meteo
    forecast (future days inside the 16-day horizon) -> district climatology.
    Returns (features, observed_days, forecast_days, climatology_days)."""
    today = today or date.today()
    forecast = forecast or {}
    days = window(year)
    rows, filled, fc_days = [], 0, 0
    for d in days:
        v = day_vals(param, d)
        if v is None and d >= today and d in forecast:
            v = forecast[d]
            fc_days += 1
        if v is None:
            v = clim[(d.month, d.day)]
            filled += 1
        rows.append(v)
    rain = sum(r["PRECTOTCORR"] for r in rows)
    tmean = sum(r["T2M"] for r in rows) / len(rows)
    longest = run = 0
    for r in rows:
        run = run + 1 if r["PRECTOTCORR"] < 2.5 else 0
        longest = max(longest, run)
    feats = {
        "rainfall_cumulative_mm": round(rain, 2),
        "rainfall_anomaly_pct": round((rain / rain_normal - 1) * 100, 2),
        "temp_min_deg_c": round(sum(r["T2M_MIN"] for r in rows) / len(rows), 2),
        "temp_max_deg_c": round(sum(r["T2M_MAX"] for r in rows) / len(rows), 2),
        "temp_mean_deg_c": round(tmean, 2),
        "temp_anomaly_deg_c": round(tmean - temp_normal, 2),
        "extreme_heat_days": sum(1 for r in rows if r["T2M_MAX"] >= 35.0),
        "consecutive_dry_days": longest,
        "relative_humidity_pct": round(sum(r["RH2M"] for r in rows) / len(rows), 2),
        "solar_radiation_mj_m2": round(sum(r["ALLSKY_SFC_SW_DWN"] for r in rows) / len(rows), 2),
    }
    return feats, len(days) - filled - fc_days, fc_days, filled

def predict(payload, tries=8):
    body = json.dumps(payload).encode()
    for i in range(tries):
        try:
            req = urllib.request.Request(API, data=body,
                                         headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.load(r)
        except Exception as e:
            print(f"  predict retry {i+1}: {e}", flush=True)
            try:
                urllib.request.urlopen(
                    "https://climaterice-api.onrender.com/api/v1/health",
                    timeout=30).read()
            except Exception:
                pass
            time.sleep(min(10 * (i + 1), 60))
    return None

import os
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "power_cache")
os.makedirs(CACHE, exist_ok=True)

def pull_cached(dist, lat, lon, start, end):
    path = os.path.join(CACHE, f"{dist.replace(' ', '_')}_{start}_{end}.json")
    if os.path.exists(path):
        return json.load(open(path))
    data = pull(lat, lon, start, end)
    json.dump(data, open(path, "w"))
    return data

def maybe_alert(data, old_est):
    """Step G: one summary Telegram message when a refresh moves any
    estimate by >= 0.25 t/ha or a current-season district is water-critical
    (rainfall anomaly <= -20% or dry spell >= 12 days). Credentials come
    only from the environment (GitHub Actions secrets); without them this
    step silently skips."""
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat:
        return "alerts skipped (Telegram env not set)"
    lines = []
    for (y, d), old in old_est.items():
        new = data[y][d].get("precomputed_estimate_t_ha")
        if old is not None and new is not None and abs(new - old) >= 0.25:
            lines.append(f"{d} Kharif {y}: estimate {old} -> {new} t/ha")
    for d, r in data.get("2026", {}).items():
        if r["rainfall_anomaly_pct"] <= -20 or r["consecutive_dry_days"] >= 12:
            lines.append(f"{d} Kharif 2026 water-critical: rainfall anomaly "
                         f"{r['rainfall_anomaly_pct']}%, dry spell {r['consecutive_dry_days']} days")
    if not lines:
        return "no alert conditions met"
    text = "ClimateRice-AI season refresh - changes worth knowing:\n" + "\n".join(lines[:20])
    try:
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=json.dumps({"chat_id": chat, "text": text}).encode(),
            headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=30).read()
        return f"telegram alert sent ({len(lines)} lines)"
    except Exception as e:
        return f"telegram alert FAILED: {e}"


def main():
    if len(sys.argv) >= 4:
        src, out_path, report_path = sys.argv[1], sys.argv[2], sys.argv[3]
    else:
        src = out_path = "frontend/src/data/seasonEstimates.json"
        report_path = "refresh-report.txt"
    data = json.load(open(src))
    old_est = {(y, d): r.get("precomputed_estimate_t_ha")
               for y in ("2025", "2026") for d, r in data.get(y, {}).items()}
    report = []
    districts = list(data["2025"].keys())
    obs_counts, fill_counts = {2025: [], 2026: []}, {2025: [], 2026: []}
    fc_counts = {2025: [], 2026: []}
    gate_flags = []
    npred = 0
    pending = []
    for dist in districts:
        row25, row26 = data["2025"][dist], data["2026"][dist]
        lat, lon = row25["latitude"], row25["longitude"]
        print(f"[{dist}] pulling seasons...", flush=True)
        seasons = pull_cached(dist, lat, lon, "20250601", "20261031")
        print(f"[{dist}] pulling climatology...", flush=True)
        clim = climatology(pull_cached(dist, lat, lon, "20000601", "20141031"))
        rain_normal = row25["rainfall_cumulative_mm"] / (1 + row25["rainfall_anomaly_pct"] / 100)
        temp_normal = row25["temp_mean_deg_c"] - row25["temp_anomaly_deg_c"]
        forecast = {}
        if date.today() <= date(2026, 10, 31):
            forecast = fetch_forecast(lat, lon)
        for year, row in ((2025, row25), (2026, row26)):
            feats, valid, fc, filled = season_features(
                seasons, clim, year, rain_normal, temp_normal,
                forecast=forecast if year == 2026 else None)
            if year == 2025:
                checks = [
                    ("rainfall_cumulative_mm", 0.02), ("temp_mean_deg_c", 0.3),
                    ("temp_min_deg_c", 0.3), ("temp_max_deg_c", 0.3),
                    ("relative_humidity_pct", 2.0), ("solar_radiation_mj_m2", 0.05),
                ]
                for k, tol in checks:
                    old, new = row[k], feats[k]
                    lim = abs(old) * tol if k != "temp_mean_deg_c" and k != "temp_min_deg_c" and k != "temp_max_deg_c" and k != "relative_humidity_pct" else tol
                    if abs(new - old) > lim:
                        gate_flags.append(f"{dist} 2025 {k}: shipped {old} vs recomputed {new}")
                for k in ("extreme_heat_days", "consecutive_dry_days"):
                    if abs(feats[k] - row[k]) > 3:
                        gate_flags.append(f"{dist} 2025 {k}: shipped {row[k]} vs recomputed {feats[k]}")
            row.update(feats)
            if fc:
                row["weather_provenance"] = (
                    f"NASA POWER daily {year} (valid {valid}/153 d, "
                    f"forecast-blended {fc} d, climatology-filled {filled} d)")
            else:
                row["weather_provenance"] = (f"NASA POWER daily {year} (valid {valid}/153 d, "
                                             f"tail-filled {filled} d)")
            obs_counts[year].append(valid); fill_counts[year].append(filled)
            fc_counts[year].append(fc)
            payload = {k: v for k, v in row.items() if k not in (
                "weather_provenance", "satellite_provenance", "soil_provenance",
                "historical_provenance", "precomputed_estimate_t_ha",
                "precomputed_interval_low", "precomputed_interval_high",
                "agro_ecological_zone", "latitude", "longitude")}
            payload.update({"crop_year": year, "season": "Kharif"})
            res = predict(payload)
            if res and res.get("predicted_yield_tonnes_per_hectare") is not None:
                row["precomputed_estimate_t_ha"] = res["predicted_yield_tonnes_per_hectare"]
                row["precomputed_interval_low"] = res["predictive_interval"][0]
                row["precomputed_interval_high"] = res["predictive_interval"][1]
                npred += 1
            else:
                pending.append((dist, year, payload))
                print(f"[{dist}] {year}: prediction PENDING (backend flaky), continuing", flush=True)
            print(f"[{dist}] {year}: valid {valid}/153, filled {filled}, "
                  f"rain {feats['rainfall_cumulative_mm']}, est {row.get('precomputed_estimate_t_ha')}", flush=True)
            time.sleep(1)
        json.dump(data, open(out_path + ".checkpoint", "w"), indent=2)
    for dist, year, payload in list(pending):
        print(f"[retry-pass] {dist} {year}...", flush=True)
        res = predict(payload)
        if res and res.get("predicted_yield_tonnes_per_hectare") is not None:
            row = data[str(year)][dist]
            row["precomputed_estimate_t_ha"] = res["predicted_yield_tonnes_per_hectare"]
            row["precomputed_interval_low"] = res["predictive_interval"][0]
            row["precomputed_interval_high"] = res["predictive_interval"][1]
            npred += 1
            pending.remove((dist, year, payload))
    assert npred == 50 and not pending, f"only {npred}/50 predictions, pending: {pending}"
    today = date.today()
    # Preserve the existing _meta (it also carries the 2022-2024 measured
    # seasons) and update only this refresh's weather fields.
    meta = dict(data.get("_meta", {}))
    meta.update({
        "source": "NASA POWER daily (weather features, refreshed)",
        "generated_on": today.strftime("%d %b %Y"),
        "season_days_total": 153,
    })
    for key, counts, fn in (("days_observed", obs_counts, min),
                            ("forecast_days", fc_counts, max),
                            ("tail_filled_days", fill_counts, max)):
        merged = dict(meta.get(key, {}))
        for y in (2025, 2026):
            merged[str(y)] = fn(counts[y])
        meta[key] = merged
    meta["satellite_note"] = (
        "Satellite inputs are MEASURED: MODIS MOD13Q1 NDVI/EVI from the NASA ORNL "
        "DAAC subset service, computed over each district's cropland mask (pixels with 2000-2014 mean "
        "Kharif NDVI >= 0.35 in a centroid window; Ludhiana uses a +/-5 km window because its +/-2 km "
        "window is urban). NDVI anomaly is against the district's own masked 2000-2014 MODIS climatology. "
        "NDWI is carried from the district baseline profile (MOD13Q1 carries no SWIR band). Measured "
        "season-mean NDVI is lower than the semi-synthetic values the site carried before Nov 2026 - "
        "expected: a season mean over real cropland pixels is not a peak-greenness figure.")
    data["_meta"] = meta
    json.dump(data, open(out_path, "w"), indent=2)
    report.append(maybe_alert(data, old_est))
    report.append(f"predictions ok: {npred}/50")
    report.append(f"2025 valid days per district: min {min(obs_counts[2025])}, max {max(obs_counts[2025])}")
    report.append(f"2026 valid days per district: min {min(obs_counts[2026])}, max {max(obs_counts[2026])}")
    report.append(f"2026 filled days per district: {fill_counts[2026]}")
    report.append("GATE FLAGS (2025 reproduction drift):")
    report += gate_flags if gate_flags else ["  none — 2025 reproduced within tolerance everywhere"]
    open(report_path, "w").write("\n".join(report))
    print("\n".join(report), flush=True)
    print("DONE", flush=True)

if __name__ == "__main__":
    main()
