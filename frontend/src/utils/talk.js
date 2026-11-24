// Talk — Phase 1 conversational voice for the ClimateRice-AI Farmer Dashboard.
// Project 19, Objective 5 (usability, ISO 9241).
//
// What it is: the farmer taps "Talk", asks a question by voice, and the site
// answers by voice — in English, Hindi or Telugu. NO AI model, NO API key,
// NO cost: it is a small rule-based parser over the dashboard data the page
// already has (seasonEstimates.json). Every answer is built from one row of
// measured data, so it cannot invent a number.
//
// What it is NOT: open-ended chat. A question it cannot map to the dashboard
// data gets an honest "I can only answer about ..." reply (with examples),
// never a made-up answer. That guardrail is the point — and the viva story.
//
// Drop-in: put this file at frontend/src/utils/talk.js next to voice.js.
// Pure functions (parseQuestion / answerFor / computeWater / computePests)
// have no browser dependency, so they are unit-tested by talk-test.mjs.
// The browser wrappers at the bottom (startTalk) use SpeechRecognition +
// speechSynthesis, exactly like the existing voice bar in voice.js.

// ---------------------------------------------------------------------------
// Language detection: script first, then Roman-Hindi keywords, else English.
// ---------------------------------------------------------------------------
export function detectLang(text) {
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu script
  if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Devanagari script
  const t = ' ' + text.toLowerCase().replace(/[^a-z\s]/g, ' ') + ' ';
  // Roman Telugu (typed or transcribed in Latin script) -> Telugu answers.
  if (/\b(neeru|nillu|varsham|digubadi|digubadulu|pantalu|vedi)\b/.test(t)) return 'te';
  if (
    /\b(paani|pani|barish|varsha|paidavaar|upaj|fasal|keet|rog|bimari|sukha|sookha|sinchai|kitni|kitna|kya|kab|kaisi|kaise|batao|bolo|madad)\b/.test(
      t
    )
  )
    return 'hi';
  return 'en';
}

// ---------------------------------------------------------------------------
// Same published thresholds as DashboardPage.jsx / Advisory page.
// Duplicated here (not imported) so talk.js stays usable standalone.
// ---------------------------------------------------------------------------
export function computeWater(row) {
  const anom = row.rainfall_anomaly_pct;
  // 'critical' = a genuine water deficit: season rainfall <= -20%, or a
  // long dry spell (>= 12 days) in a below-normal season. A long dry spell
  // inside a normal/wet season is its own level — calling Ludhiana 2026
  // (+37% rain, 16 dry days) critical contradicted its rainfall total,
  // while Patna 2026 (-17%, 18 dry days) is a real deficit case.
  if (anom <= -20 || (row.consecutive_dry_days >= 12 && anom < 0)) return 'critical';
  if (row.consecutive_dry_days >= 12) return 'dryspell';
  if (row.consecutive_dry_days >= 8 || anom < 0) return 'moderate';
  return 'comfortable';
}

export function computePests(row) {
  const blast =
    row.temp_min_deg_c <= 24.5 && row.relative_humidity_pct >= 80.0
      ? 'Elevated'
      : 'Low';
  const bph =
    row.temp_min_deg_c >= 23.5 &&
    row.temp_max_deg_c <= 34.5 &&
    row.relative_humidity_pct >= 76.0
      ? 'High'
      : 'Moderate';
  const blb =
    row.relative_humidity_pct >= 82.0 && row.temp_max_deg_c >= 32.0
      ? 'Elevated'
      : 'Low';
  return { blast, bph, blb };
}

const RISK_WORD = {
  en: { Low: 'low', Moderate: 'moderate', High: 'high', Elevated: 'elevated' },
  hi: { Low: 'kam', Moderate: 'madhyam', High: 'zyada', Elevated: 'badha hua' },
  te: { Low: 'తక్కువ', Moderate: 'మధ్యస్థం', High: 'ఎక్కువ', Elevated: 'పెరిగిన' },
};

const WATER_WORD = {
  en: {
    critical: 'Needs water — critical. Irrigate now, especially at flowering.',
    dryspell: 'Rainfall overall is near or above normal, but a long dry spell is stressing the crop — one light irrigation will help, especially at flowering.',
    moderate: 'Watch — moderate. Use controlled AWD.',
    comfortable: 'Comfortable. Rainfall has been sufficient.',
  },
  hi: {
    critical: 'Paani ki sakht zaroorat hai. Turant sinchai karein.',
    dryspell: 'Kul varsha theek hai, lekin beech mein lamba sukha pada hai — ek halki sinchai faydemand rahegi, khaas taur par phool aane par.',
    moderate: 'Nigrani rakhein — madhyam sthiti. Niyantrit AWD apnayein.',
    comfortable: 'Paani ki sthiti aaramdayak hai. Varsha paryapt hui hai.',
  },
  te: {
    critical: 'నీరు తక్షణం అవసరం. వెంటనే నీరు పెట్టండి.',
    dryspell: 'మొత్తం వర్షపాతం సరిపడా ఉంది, కానీ మధ్యలో దీర్ఘ వర్షాభావం పంటను ఒత్తిడికి గురిచేస్తోంది — ఒక తేలికపాటి నీరు పెట్టడం మంచిది, ముఖ్యంగా పూత సమయంలో.',
    moderate: 'గమనిస్తూ ఉండండి — మధ్యస్థ స్థితి. నియంత్రిత AWD వాడండి.',
    comfortable: 'నీటి పరిస్థితి సరిపడా ఉంది. వర్షపాతం సరిపడా కురిసింది.',
  },
};

// ---------------------------------------------------------------------------
// Question parsing. Returns { lang, district, year, topic, districtOnly }.
// district/year fall back to the dashboard's current selection.
// ---------------------------------------------------------------------------
// NOTE: \b is ASCII-only in JS, so Indic-script words are alternated WITHOUT
// \b — otherwise "దిగుబడి" never matches. Latin words keep \b.
// Latin keywords are STEMS with a leading \b only — a trailing \b after the
// group silently broke every inflected form ("irrigat\b" never matches
// "irrigation", "yield\b" never matches "yields"). Prefix matching fixes
// plurals/-ing/-tion forms; the leading \b still blocks mid-word hits
// (e.g. "rain" inside "grain" or "training").
const TOPIC_KEYWORDS = [
  ['compare', /\b(actual|recorded|asli|tulna|compar|sahi|galat)|వాస్తవం/],
  ['pest', /\b(pest|keet|blast|hopper|blight|rog|bimari|scout)|తెగుళ్లు|తెగులు/],
  ['water', /\b(water|paani|pani|irrigat|sinchai|neeru|watering)|నీరు/],
  ['rainfall', /\b(rain|barish|varsha|barsaat|barsat)|వర్షపాతం/],
  ['dry', /\b(dry|sukha|sookha)|వర్షాభావ/],
  ['heat', /\b(heat|hot|garmi|tapman|temperatur)|వేడి/],
  ['yield', /\b(yield|harvest|paidavaar|upaj|fasal|production|kitni hogi|kharif)|దిగుబడి/],
];

export function parseQuestion(text, districts, currentDistrict, currentYear) {
  const lang = detectLang(text);
  const lower = ' ' + text.toLowerCase() + ' ';
  // Longest district name first so "East Godavari" beats "Godavari".
  const district =
    [...districts]
      .sort((a, b) => b.length - a.length)
      .find((d) => lower.includes(d.toLowerCase())) || currentDistrict;
  const yearMatch = lower.match(/\b(202[2-6])\b/);
  let year = yearMatch
    ? yearMatch[1]
    : /\b(is saal|this year|iss saal)\b/.test(lower)
      ? '2026'
      : /\b(pichhle saal|pichla saal|last year)\b/.test(lower)
        ? '2025'
        : currentYear;
  let topic = null;
  for (const [name, re] of TOPIC_KEYWORDS) {
    if (re.test(lower)) {
      topic = name;
      break;
    }
  }
  // Bare district name ("Krishna", "Burdwan batao") = switch district + yield.
  const districtOnly =
    !topic &&
    district !== currentDistrict &&
    lower.replace(/[^a-z ]/g, ' ').trim().split(/\s+/).length <= 3;
  if (districtOnly) topic = 'yield';
  return { lang, district, year, topic, districtOnly };
}

// ---------------------------------------------------------------------------
// Answer building — every number comes from the row / recorded actuals.
// ctx: { district, year, row, actual (number|undefined), inPanel (bool) }
// ---------------------------------------------------------------------------
export function answerFor(parsed, ctx) {
  const { lang, district, year, topic } = parsed;
  const { row } = ctx;
  if (!row) {
    return {
      en: `Sorry, I have no data for ${district} in Kharif ${year}.`,
      hi: `Maaf kijiye, Kharif ${year} ke liye ${district} ka data mere paas nahi hai.`,
      te: `క్షమించండి, ఖరీఫ్ ${year} కోసం ${district} డేటా నా వద్ద లేదు.`,
    }[lang];
  }
  const risk = RISK_WORD[lang] || RISK_WORD.en;
  const water = computeWater(row);
  const pests = computePests(row);
  const anomWord =
    row.rainfall_anomaly_pct > 0
      ? { en: 'more', hi: 'zyada', te: 'ఎక్కువ' }[lang]
      : { en: 'less', hi: 'kam', te: 'తక్కువ' }[lang];

  switch (topic) {
    case 'yield':
      return {
        en: `${district}, Kharif ${year}: expected harvest about ${row.precomputed_estimate_t_ha} tonnes per hectare, likely between ${row.precomputed_interval_low} and ${row.precomputed_interval_high}.`,
        hi: `${district}, Kharif ${year}: apekshit paidavaar lagbhag ${row.precomputed_estimate_t_ha} tonne prati hectare hai, sambhavit seema ${row.precomputed_interval_low} se ${row.precomputed_interval_high} tak.`,
        te: `${district}, ఖరీఫ్ ${year}: ఆశించిన దిగుబడి హెక్టారుకు సుమారు ${row.precomputed_estimate_t_ha} టన్నులు, సంభావ్య పరిధి ${row.precomputed_interval_low} నుండి ${row.precomputed_interval_high} వరకు.`,
      }[lang];
    case 'rainfall':
      return {
        en: `${district}, Kharif ${year}: total rainfall ${row.rainfall_cumulative_mm} millimetres, ${Math.abs(row.rainfall_anomaly_pct)} percent ${anomWord} than normal.`,
        hi: `${district}, Kharif ${year}: kul varsha ${row.rainfall_cumulative_mm} millimeter rahi, jo aam se ${Math.abs(row.rainfall_anomaly_pct)} percent ${anomWord} hai.`,
        te: `${district}, ఖరీఫ్ ${year}: మొత్తం వర్షపాతం ${row.rainfall_cumulative_mm} మిల్లీమీటర్లు, ఇది సాధారణం కంటే ${Math.abs(row.rainfall_anomaly_pct)} శాతం ${anomWord}.`,
      }[lang];
    case 'water': {
      // Complete picture in one answer (Piyush, 2026-11-23): expected
      // harvest first, then the irrigation situation — rainfall vs normal,
      // dry spell, the advice, and how much of the cropped area actually
      // has irrigation — so the farmer is never left guessing.
      const anomAbs = Math.round(Math.abs(row.rainfall_anomaly_pct));
      const irrPct = Math.round((row.irrigation_ratio ?? 0) * 100);
      return {
        en: `${district}, Kharif ${year}: expected harvest about ${row.precomputed_estimate_t_ha} tonnes per hectare, likely between ${row.precomputed_interval_low} and ${row.precomputed_interval_high}. Irrigation: rainfall was ${row.rainfall_cumulative_mm} millimetres, about ${anomAbs} percent ${anomWord} than normal, and the longest dry spell was ${row.consecutive_dry_days} days. ${WATER_WORD.en[water]} About ${irrPct} percent of the cropped area here has irrigation.`,
        hi: `${district}, Kharif ${year}: apekshit paidavaar lagbhag ${row.precomputed_estimate_t_ha} tonne prati hectare hai, sambhavit seema ${row.precomputed_interval_low} se ${row.precomputed_interval_high} tak. Sinchai: varsha ${row.rainfall_cumulative_mm} millimeter hui, aam se lagbhag ${anomAbs} percent ${anomWord}, aur sabse lamba sookha daur ${row.consecutive_dry_days} din raha. ${WATER_WORD.hi[water]} Is jile me lagbhag ${irrPct} percent fasal kshetra me sinchai ki suvidha hai.`,
        te: `${district}, ఖరీఫ్ ${year}: ఆశించిన దిగుబడి హెక్టారుకు సుమారు ${row.precomputed_estimate_t_ha} టన్నులు, సంభావ్య పరిధి ${row.precomputed_interval_low} నుండి ${row.precomputed_interval_high} వరకు. నీటిపారుదల: వర్షపాతం ${row.rainfall_cumulative_mm} మిల్లీమీటర్లు, సాధారణం కంటే సుమారు ${anomAbs} శాతం ${anomWord}, అత్యంత పొడవైన వర్షాభావ కాలం ${row.consecutive_dry_days} రోజులు. ${WATER_WORD.te[water]} ఈ జిల్లాలో సుమారు ${irrPct} శాతం పంట భూమిలో నీటిపారుదల సదుపాయం ఉంది.`,
      }[lang];
    }
    case 'pest': {
      const which = /blast/i.test(parsed.raw || '')
        ? 'blast'
        : /hopper/i.test(parsed.raw || '')
          ? 'bph'
          : /blight/i.test(parsed.raw || '')
            ? 'blb'
            : null;
      if (which) {
        const name = { blast: 'Rice Blast', bph: 'Brown Plant Hopper', blb: 'Bacterial Leaf Blight' }[which];
        return {
          en: `${district}, Kharif ${year}: ${name} risk is ${risk[pests[which]]}. This is a weather-window warning for scouting, not a diagnosis.`,
          hi: `${district}, Kharif ${year}: ${name} ka jokhim ${risk[pests[which]]} hai. Ye nigrani ke liye chetavni hai, nidan nahi.`,
          te: `${district}, ఖరీఫ్ ${year}: ${name} ప్రమాదం ${risk[pests[which]]}. ఇది పరిశీలన కోసం హెచ్చరిక, నిర్ధారణ కాదు.`,
        }[lang];
      }
      return {
        en: `${district}, Kharif ${year}: pest watch — Rice Blast ${risk[pests.blast]} risk, Brown Plant Hopper ${risk[pests.bph]} risk, Bacterial Leaf Blight ${risk[pests.blb]} risk.`,
        hi: `${district}, Kharif ${year}: keet savdhaani — Rice Blast ${risk[pests.blast]}, Brown Plant Hopper ${risk[pests.bph]}, Bacterial Leaf Blight ${risk[pests.blb]} jokhim hai.`,
        te: `${district}, ఖరీఫ్ ${year}: తెగుళ్ల హెచ్చరిక — రైస్ బ్లాస్ట్ ${risk[pests.blast]}, బ్రౌన్ ప్లాంట్ హాపర్ ${risk[pests.bph]}, బ్యాక్టీరియల్ లీఫ్ బ్లైట్ ${risk[pests.blb]} ప్రమాదం.`,
      }[lang];
    }
    case 'dry':
      return {
        en: `${district}, Kharif ${year}: longest dry spell was ${row.consecutive_dry_days} days.`,
        hi: `${district}, Kharif ${year}: sabse lamba sookha daur ${row.consecutive_dry_days} din raha.`,
        te: `${district}, ఖరీఫ్ ${year}: అత్యంత పొడవైన వర్షాభావ కాలం ${row.consecutive_dry_days} రోజులు.`,
      }[lang];
    case 'heat':
      return {
        en: `${district}, Kharif ${year}: ${row.extreme_heat_days} very hot days above 35 degrees.`,
        hi: `${district}, Kharif ${year}: 35 degree se upar ke ${row.extreme_heat_days} bahut garm din rahe.`,
        te: `${district}, ఖరీఫ్ ${year}: 35 డిగ్రీల పైన ${row.extreme_heat_days} చాలా వేడి రోజులు ఉన్నాయి.`,
      }[lang];
    case 'compare': {
      if (ctx.actual === undefined) {
        const why =
          year >= '2025'
            ? {
                en: 'the official actual for that season is not published yet.',
                hi: 'us season ka official actual abhi prakashit nahi hua hai.',
                te: 'ఆ సీజన్ అధికారిక వాస్తవం ఇంకా ప్రచురించబడలేదు.',
              }[lang]
            : {
                en: `${district} is not in the 12-district recorded panel for that season, so there is no official actual to compare with.`,
                hi: `${district} us season ke 12 jilon wale recorded panel me nahi hai, isliye tulna ke liye koi official actual nahi hai.`,
                te: `${district} ఆ సీజన్ 12 జిల్లాల రికార్డ్ ప్యానెల్‌లో లేదు, కాబట్టి పోల్చడానికి అధికారిక వాస్తవం లేదు.`,
              }[lang];
        return {
          en: `${district}, Kharif ${year}: our estimate was ${row.precomputed_estimate_t_ha} tonnes per hectare, but I cannot compare it — ${why}`,
          hi: `${district}, Kharif ${year}: hamara estimate ${row.precomputed_estimate_t_ha} tonne prati hectare tha, lekin tulna nahi kar sakta — ${why}`,
          te: `${district}, ఖరీఫ్ ${year}: మా అంచనా హెక్టారుకు ${row.precomputed_estimate_t_ha} టన్నులు, కానీ పోల్చలేను — ${why}`,
        }[lang];
      }
      const diff = (row.precomputed_estimate_t_ha - ctx.actual).toFixed(2);
      const inside =
        ctx.actual >= row.precomputed_interval_low &&
        ctx.actual <= row.precomputed_interval_high;
      return {
        en: `${district}, Kharif ${year}: our estimate was ${row.precomputed_estimate_t_ha} tonnes per hectare and the official actual was ${ctx.actual}. Difference ${diff > 0 ? '+' : ''}${diff} tonnes per hectare — the actual was ${inside ? 'inside' : 'outside'} our range.`,
        hi: `${district}, Kharif ${year}: hamara estimate ${row.precomputed_estimate_t_ha} tonne prati hectare tha aur official actual ${ctx.actual} tha. Farak ${diff > 0 ? '+' : ''}${diff} tonne prati hectare — actual hamari seema ke ${inside ? 'andar' : 'bahar'} tha.`,
        te: `${district}, ఖరీఫ్ ${year}: మా అంచనా హెక్టారుకు ${row.precomputed_estimate_t_ha} టన్నులు, అధికారిక వాస్తవం ${ctx.actual}. తేడా ${diff > 0 ? '+' : ''}${diff} టన్నులు — వాస్తవం మా పరిధి ${inside ? 'లోపల' : 'బయట'} ఉంది.`,
      }[lang];
    }
    default:
      // Honest fallback: say what CAN be asked, in the farmer's language.
      return {
        en: `I can answer about ${district}, Kharif ${year}: expected harvest, rainfall, water advice, pest watch, dry spell, or how our estimate compared with the official actual. Try: "How much yield in Krishna this year?"`,
        hi: `Main ${district}, Kharif ${year} ke baare me bata sakta hu: apekshit paidavaar, varsha, paani ki salah, keet savdhaani, sookha daur, ya hamare estimate ki official actual se tulna. Aise puchein: "Krishna me is saal kitni paidavaar hogi?"`,
        te: `నేను ${district}, ఖరీఫ్ ${year} గురించి చెప్పగలను: ఆశించిన దిగుబడి, వర్షపాతం, నీటి సలహా, తెగుళ్ల హెచ్చరిక, వర్షాభావ కాలం, లేదా మా అంచనాను అధికారిక వాస్తవంతో పోల్చడం. ఇలా అడగండి: "ఈ సంవత్సరం కృష్ణాలో దిగుబడి ఎంత?"`,
      }[lang];
  }
}

// Browser capability helpers (same checks as voice.js, re-exported here
// so TalkPanel.jsx needs only one import).
export function speechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
export function recognitionSupported() {
  return (
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
}

// ---------------------------------------------------------------------------
// Browser wrapper: listen once, parse, answer aloud, and report back.
// onResult({ heard, parsed, answer, changedDistrict, changedYear })
// ---------------------------------------------------------------------------
export function startTalk({ districts, district, year, data, recordedActuals, voiceLang, onResult, onError }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    onError && onError('Voice input needs Chrome — speech recognition is not available in this browser.');
    return false;
  }
  const rec = new SR();
  rec.lang = voiceLang || 'en-IN';
  rec.interimResults = false;
  rec.maxAlternatives = 3;
  rec.onresult = (e) => {
    const heard = e.results[0][0].transcript;
    const parsed = parseQuestion(heard, districts, district, year);
    parsed.raw = heard;
    const row = data?.[parsed.year]?.[parsed.district];
    const actual = recordedActuals?.[parsed.year]?.[parsed.district];
    const answer = answerFor(parsed, { district: parsed.district, year: parsed.year, row, actual });
    // Speak the answer in the question's language (not the UI language).
    const speakLang =
      parsed.lang === 'hi' ? 'hi-IN' : parsed.lang === 'te' ? 'te-IN' : 'en-IN';
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(answer);
      u.lang = speakLang;
      u.rate = 0.95;
      const voices = window.speechSynthesis.getVoices();
      const match =
        voices.find((v) => v.lang === speakLang) ||
        voices.find((v) => v.lang && v.lang.startsWith(speakLang.slice(0, 2)));
      if (match) u.voice = match;
      window.speechSynthesis.speak(u);
    }
    onResult && onResult({ heard, parsed, answer, row: !!row });
  };
  rec.onerror = (e) => {
    // Say what actually went wrong — one generic message misdiagnoses
    // permission and hardware problems as background noise.
    const msgs = {
      'not-allowed': 'Microphone is blocked — allow mic access in the browser site settings, or type your question below.',
      'service-not-allowed': 'Microphone is blocked — allow mic access in the browser site settings, or type your question below.',
      'audio-capture': 'No microphone found on this device — you can type your question below instead.',
      'no-speech': 'Could not hear clearly — try again in a quiet place, or type your question below.',
      network: 'Speech service unreachable — check the connection, or type your question below.',
    };
    onError && onError(msgs[e?.error] || msgs['no-speech']);
  };
  rec.start();
  return true;
}

// ---------------------------------------------------------------------------
// Typed-question path: same parser and answers as the voice path, for
// farmers without a microphone (and for anyone who prefers typing).
// Returns { parsed, answer } and speaks the answer like the voice path.
// ---------------------------------------------------------------------------
export function answerTextQuestion(text, { districts, district, year, data, recordedActuals }) {
  const parsed = parseQuestion(text, districts, district, year);
  parsed.raw = text;
  const row = data?.[parsed.year]?.[parsed.district];
  const actual = recordedActuals?.[parsed.year]?.[parsed.district];
  const answer = answerFor(parsed, { district: parsed.district, year: parsed.year, row, actual });
  const speakLang = parsed.lang === 'hi' ? 'hi-IN' : parsed.lang === 'te' ? 'te-IN' : 'en-IN';
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(answer);
    u.lang = speakLang;
    u.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const match =
      voices.find((v) => v.lang === speakLang) ||
      voices.find((v) => v.lang && v.lang.startsWith(speakLang.slice(0, 2)));
    if (match) u.voice = match;
    window.speechSynthesis.speak(u);
  }
  return { parsed, answer };
}
