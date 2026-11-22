import React, { useState } from 'react';
import { Mic, MessageCircleQuestion, Volume2 } from 'lucide-react';
import { startTalk, recognitionSupported } from '../utils/talk';

// Talk panel — Phase 1 conversational voice for the Farmer Dashboard.
// Drop this component into DashboardPage.jsx, right under the existing
// "Listen / Bolkar chunein" voice bar. It needs no new dependency and no
// API key: talk.js parses the question against the dashboard data the page
// already has, and voice.js's browser speech reads the answer aloud.
//
// Props (all already exist in DashboardPage.jsx):
//   districts        — Object.keys(SEASON_ESTIMATES['2026'])
//   district, year   — currently selected district / season
//   data             — SEASON_ESTIMATES (the seasonEstimates.json object)
//   recordedActuals  — RECORDED_ACTUALS from the same file
//   voiceLang        — 'en-IN' | 'hi-IN' | 'te-IN' (mic listens in this lang)
//   onDistrictChange — setSelectedDistrict
//   onYearChange     — setSelectedYear
export default function TalkPanel({
  districts,
  district,
  year,
  data,
  recordedActuals,
  voiceLang,
  onDistrictChange,
  onYearChange,
}) {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [answer, setAnswer] = useState('');
  const [note, setNote] = useState('');

  const handleTalk = () => {
    if (listening) return;
    setListening(true);
    setNote('Listening… ask, e.g. "Krishna me is saal kitni paidavaar hogi?"');
    startTalk({
      districts,
      district,
      year,
      data,
      recordedActuals,
      voiceLang,
      onResult: ({ heard: h, parsed, answer: a }) => {
        setListening(false);
        setHeard(h);
        setAnswer(a);
        setNote('');
        if (parsed.district !== district) onDistrictChange(parsed.district);
        if (parsed.year !== year) onYearChange(parsed.year);
      },
      onError: (msg) => {
        setListening(false);
        setNote(msg);
      },
    });
  };

  return (
    <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm space-y-2">
      <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center space-x-1.5">
        <MessageCircleQuestion className="h-4 w-4" />
        <span>Talk to the dashboard — sawal puchein, jawab suniye</span>
      </span>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          onClick={handleTalk}
          disabled={!recognitionSupported() || listening}
          className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 flex items-center space-x-1.5"
        >
          <Mic className="h-4 w-4" />
          <span>{listening ? 'Listening…' : '🎙️ Talk — bolkar puchein'}</span>
        </button>
        <span className="text-[11px] text-stone-600">
          {note ||
            'Try: yield • barish • paani kab du? • keet ka khatra • 2024 me actual kitna tha? — English, Hindi ya Telugu me.'}
        </span>
      </div>
      {heard && (
        <p className="text-xs text-stone-700">
          <strong>You asked:</strong> “{heard}”
        </p>
      )}
      {answer && (
        <p className="text-xs text-stone-800 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 flex items-start space-x-1.5">
          <Volume2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-700" />
          <span>{answer}</span>
        </p>
      )}
    </div>
  );
}

// ---- one-line integration into DashboardPage.jsx ---------------------------
// 1. import TalkPanel from '../components/TalkPanel';   (or wherever you keep it)
//    import { recognitionSupported } from '../utils/talk';
// 2. Under the existing voice bar, add:
//      <TalkPanel
//        districts={districts}
//        district={selectedDistrict}
//        year={selectedYear}
//        data={SEASON_ESTIMATES}
//        recordedActuals={RECORDED_ACTUALS}
//        voiceLang={voiceLang}
//        onDistrictChange={setSelectedDistrict}
//        onYearChange={setSelectedYear}
//      />
// 3. No backend change, no new secret, no new dependency. Chrome works best;
//    speech recognition needs Chrome; spoken answers work in any browser
//    with speech synthesis. Viva line: "Phase 1 answers only from measured
//    dashboard data — no model, no key, no hallucinated number."
