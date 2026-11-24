// Voice support for the Farmer Dashboard (Project 19, Objective 5 —
// usability, ISO 9241): the dashboard can read its summary aloud in
// English, Hindi or Telugu using the browser's built-in speech synthesis,
// and a farmer can pick the district by speaking its name (Chrome's
// built-in speech recognition). No external service, no API key: voices
// available depend on the device, and the UI says so honestly.

export const VOICE_LANGS = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
  { code: 'te-IN', label: 'తెలుగు (Telugu)' },
];

export function speakText(text, lang) {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const match =
    voices.find((v) => v.lang === lang) ||
    voices.find((v) => v.lang && v.lang.startsWith(lang.slice(0, 2)));
  if (match) u.voice = match;
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function speechSupported() {
  return 'speechSynthesis' in window;
}

export function recognitionSupported() {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

const RISK = {
  en: { Low: 'low', Moderate: 'moderate', High: 'high', Elevated: 'elevated' },
  hi: { Low: 'kam', Moderate: 'madhyam', High: 'zyada', Elevated: 'badha hua' },
  te: { Low: 'తక్కువ', Moderate: 'మధ్యస్థం', High: 'ఎక్కువ', Elevated: 'పెరిగిన' },
};

const WATER = {
  en: {
    critical: 'Needs water — critical',
    moderate: 'Watch — moderate',
    comfortable: 'Comfortable',
  },
  hi: {
    critical: 'Paani ki sakht zaroorat hai',
    moderate: 'Nigrani rakhein — madhyam sthiti',
    comfortable: 'Paani ki sthiti aaramdayak hai',
  },
  te: {
    critical: 'నీరు తక్షణం అవసరం',
    moderate: 'గమనిస్తూ ఉండండి — మధ్యస్థ స్థితి',
    comfortable: 'నీటి పరిస్థితి సరిపడా ఉంది',
  },
};

// ctx: { district, year, estimate, low, high, rainfallMm, anomalyPct,
//        dryDays, waterKey ('critical'|'moderate'|'comfortable'),
//        waterActionEn, blast, bph, blb }
export function buildSummary(langCode, ctx) {
  const lang = langCode.slice(0, 2);
  const risk = RISK[lang] || RISK.en;
  const waterLabel = (WATER[lang] || WATER.en)[ctx.waterKey];
  const anomWord =
    ctx.anomalyPct > 0
      ? { en: 'more', hi: 'zyada', te: 'ఎక్కువ' }[lang]
      : { en: 'less', hi: 'kam', te: 'తక్కువ' }[lang];
  if (lang === 'hi') {
    return (
      `${ctx.district} jile ke liye Kharif ${ctx.year} ka farmer dashboard. ` +
      `Apekshit paidavaar lagbhag ${ctx.estimate} tonne prati hectare hai, sambhavit seema ${ctx.low} se ${ctx.high} tak. ` +
      `Is season ki kul varsha ${ctx.rainfallMm} millimeter rahi, jo aam se ${Math.abs(ctx.anomalyPct)} percent ${anomWord} hai. ` +
      `Sabse lamba sookha daur ${ctx.dryDays} din raha. Paani ki salah: ${waterLabel}. ${ctx.waterActionHi} ` +
      `Keet aur rog savdhaani: Rice Blast ka jokhim ${risk[ctx.blast]}, Brown Plant Hopper ka jokhim ${risk[ctx.bph]}, ` +
      `aur Bacterial Leaf Blight ka jokhim ${risk[ctx.blb]} hai.`
    );
  }
  if (lang === 'te') {
    return (
      `${ctx.district} జిల్లా కోసం ఖరీఫ్ ${ctx.year} రైతు డ్యాష్‌బోర్డ్. ` +
      `ఆశించిన దిగుబడి హెక్టారుకు సుమారు ${ctx.estimate} టన్నులు, సంభావ్య పరిధి ${ctx.low} నుండి ${ctx.high} వరకు. ` +
      `ఈ సీజన్‌లో మొత్తం వర్షపాతం ${ctx.rainfallMm} మిల్లీమీటర్లు, ఇది సాధారణం కంటే ${Math.abs(ctx.anomalyPct)} శాతం ${anomWord}. ` +
      `అత్యంత పొడవైన వర్షాభావ కాలం ${ctx.dryDays} రోజులు. నీటి సలహా: ${waterLabel}. ${ctx.waterActionTe} ` +
      `తెగుళ్ల హెచ్చరిక: రైస్ బ్లాస్ట్ ప్రమాదం ${risk[ctx.blast]}, బ్రౌన్ ప్లాంట్ హాపర్ ప్రమాదం ${risk[ctx.bph]}, ` +
      `బ్యాక్టీరియల్ లీఫ్ బ్లైట్ ప్రమాదం ${risk[ctx.blb]}.`
    );
  }
  return (
    `Farmer Dashboard for ${ctx.district}, Kharif ${ctx.year}. ` +
    `Expected harvest: about ${ctx.estimate} tonnes per hectare, likely between ${ctx.low} and ${ctx.high}. ` +
    `Total rainfall this season: ${ctx.rainfallMm} millimetres, ${Math.abs(ctx.anomalyPct)} percent ${anomWord} than normal. ` +
    `Longest dry spell: ${ctx.dryDays} days. Water advice: ${waterLabel}. ${ctx.waterActionEn} ` +
    `Pest watch: Rice Blast ${risk[ctx.blast]} risk, Brown Plant Hopper ${risk[ctx.bph]} risk, ` +
    `Bacterial Leaf Blight ${risk[ctx.blb]} risk.`
  );
}

export const WATER_ACTIONS = {
  dryspell: {
    en: 'Rainfall overall is near or above normal, but a long dry spell is stressing the crop. One light irrigation will help, especially at flowering.',
    hi: 'Kul varsha theek hai, lekin beech mein lamba sukha pada hai. Ek halki sinchai faydemand rahegi, khaaskar phool aane par.',
    te: 'మొత్తం వర్షపాతం సరిపడా ఉంది, కానీ మధ్యలో దీర్ఘ వర్షాభావం ఉంది. ఒక తేలికపాటి నీరు పెట్టడం మంచిది, ముఖ్యంగా పూత సమయంలో.',
  },
  critical: {
    en: 'Irrigate now, especially at flowering. Do not let the field dry out.',
    hi: 'Turant sinchai karein, khaaskar phool aane ke samay par. Khet ko sookhne na dein.',
    te: 'వెంటనే నీరు పెట్టండి, ముఖ్యంగా పూత సమయంలో. పొలం ఎండిపోనివ్వకండి.',
  },
  moderate: {
    en: 'Use controlled AWD: let water drop about 10 centimetres below the surface before re-flooding.',
    hi: 'Niyantrit AWD apnayein: dobara paani bharne se pehle paani ki satah lagbhag 10 centimeter neeche jaane dein.',
    te: 'నియంత్రిత AWD పద్ధతి వాడండి: మళ్ళీ నీరు పెట్టే ముందు నీటి మట్టం సుమారు 10 సెంటీమీటర్లు తగ్గనివ్వండి.',
  },
  comfortable: {
    en: 'Rainfall has been sufficient. Keep drainage channels clear to avoid waterlogging.',
    hi: 'Varsha paryapt hui hai. Paani jamne se bachane ke liye nikasi naaliyan saaf rakhein.',
    te: 'వర్షపాతం సరిపడా కురిసింది. నీరు నిలవకుండా కాలువలు శుభ్రంగా ఉంచండి.',
  },
};
