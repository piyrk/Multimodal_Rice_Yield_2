import React, { useState } from 'react';
import { BookOpen, HelpCircle, Check, ChevronDown, ChevronRight, FileText, Code2, Terminal, Award } from 'lucide-react';

export default function VivaGuidePage() {
  const [openFaq, setOpenFaq] = useState(0);

  const vivaFaqs = [
    {
      q: "1. How does ClimateRice-FusionNet compare with XGBoost, and why does XGBoost achieve lower error?",
      a: "Full-feature XGBoost achieves the strongest numerical prediction on this benchmark (MAE: 0.2014 t/ha, R²: 0.9548) outperforming ClimateRice-FusionNet (MAE: 0.2774 t/ha, R²: 0.9329). This aligns with established machine learning research (Grinsztajn et al., NeurIPS 2022; Gorishniy et al., NeurIPS 2021) showing gradient boosted decision trees routinely outperform deep neural networks on tabular datasets with N < 10,000. ClimateRice-FusionNet provides complementary architectural capabilities: (1) Differentiable cross-modal gated attention that dynamically weights modalities during environmental shocks, and (2) MC Dropout predictive intervals with an empirical coverage of 95.83%."
    },
    {
      q: "2. Is your dataset real or synthetic?",
      a: "The dataset is explicitly designated as a 'Calibrated Semi-Synthetic Multimodal Agricultural Benchmark' (504 rows across 24 districts and 21 crop years). District spatial centroids, agro-ecological classifications, and baseline historical yields are grounded in authentic DES GoI and ICRISAT records. However, the multi-decadal annual time series was generated via peer-reviewed biophysical equations (Peng et al. 2004, Lobell et al. 2015) coupled to historical Indian drought and heat shock years. A complete real-data migration roadmap is documented in docs/real_data_upgrade_plan.md."
    },
    {
      q: "3. How did you prevent data leakage in your agricultural dataset?",
      a: "Agricultural time-series exhibit strong temporal autocorrelation and climate trends. Standard random K-Fold cross-validation leaks future trends into earlier predictions. We enforced a strict Temporal Holdout Split: Training on 2000–2014, Validation on 2015–2016, and Held-Out Testing on 2017–2020. Furthermore, all scalers (StandardScaler) were fit strictly on the training partition, and historical yield lag features strictly draw from prior years (t-1, t-2, and t-3:t-1)."
    },
    {
      q: "4. What is the scientific justification for your engineered climate features?",
      a: "We engineered features grounded directly in agricultural agronomy: (1) Rainfall Anomaly (%) captures departure from climatological normal; (2) Extreme Heat Days (Tmax >= 35°C during anthesis) triggers spikelet sterility and pollen desiccation; (3) Consecutive Dry Days (CDD) models agricultural drought streaks; and (4) Minimum Nighttime Temperature anomalies (Tmin) model nocturnal respiration losses where rice consumes assimilates without photosynthesizing (Peng et al. 2004, PNAS)."
    },
    {
      q: "5. What are the formal results of your hypothesis testing?",
      a: "Multimodal feature integration significantly improves prediction relative to selected single-modality configurations. Fusing satellite, weather, soil, and historical lags reduces error by 0.2652 t/ha compared to satellite alone (paired Student's t-test p = 2.54e-07 << 0.05, Wilcoxon p = 5.10e-06). In the comparison between models on the full feature set, full-feature XGBoost achieves lower test error than ClimateRice-FusionNet on this benchmark (paired t-test p = 0.0019, Wilcoxon p = 0.0017)."
    },
    {
      q: "6. Is your uncertainty interval a confidence interval or a predictive interval, and what is its empirical coverage?",
      a: "It is an 'MC Dropout predictive interval', NOT a parameter confidence interval. A confidence interval bounds an unknown fixed population parameter (such as population mean yield). An MC Dropout predictive interval bounds individual uncertain future crop yield outcomes by capturing epistemic neural network uncertainty across stochastic dropout passes (Gal & Ghahramani, ICML 2016). On our held-out test partition (N = 96, 2017–2020), this predictive interval achieves an empirical coverage of 95.83% (92 of 96 actual observations fall strictly inside the interval)."
    }
  ];

  const chapters = [
    { num: 'Chapter 1', title: 'Introduction', summary: 'Motivation, rice food security in India, climate vulnerability, research objectives.' },
    { num: 'Chapter 2', title: 'Literature Review', summary: 'Remote sensing in agriculture, crop simulation models, deep multimodal learning, explainability in agronomy.' },
    { num: 'Chapter 3', title: 'Problem Statement & Hypotheses', summary: 'Formal research question, Hypothesis H1 vs Null Hypothesis H0, project boundaries.' },
    { num: 'Chapter 4', title: 'Dataset Lineage & Preprocessing', summary: 'DES GoI, NASA POWER, MODIS, SoilGrids 2.0, leakage-free temporal partitioning.' },
    { num: 'Chapter 5', title: 'System Architecture', summary: 'End-to-end pipeline, ClimateRice-FusionNet neural schematic, FastAPI REST backend, React frontend.' },
    { num: 'Chapter 6', title: 'Implementation', summary: 'Modality encoders, cross-modal gated attention, MC-Dropout uncertainty, loss functions.' },
    { num: 'Chapter 7', title: 'Experiments & Modality Ablations', summary: '7-phase ablation matrix (Exp A – Exp G), baseline comparisons, paired t-tests.' },
    { num: 'Chapter 8', title: 'Explainable AI (XAI)', summary: 'SHAP game-theoretic attributions, global feature sensitivities, local waterfall diagnostics.' },
    { num: 'Chapter 9', title: 'Limitations & Threats to Validity', summary: 'District aggregation granularity, monsoon optical cloud cover, unobserved input fertilizers.' },
    { num: 'Chapter 10', title: 'Conclusion & Future Work', summary: 'Summary of findings, Sentinel-1 SAR cloud penetration, field-level 10m gridded scaling.' },
  ];

  return (
    <div className="space-y-8 py-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Academic Capstone Guide &amp; Viva Defense</h1>
        <p className="text-slate-400 text-sm mt-1">
          Complete presentation reference, thesis chapter structures, anticipated viva questions, and live execution instructions.
        </p>
      </div>

      {/* Quick Viva Defense Cards */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Anticipated External Examiner Questions &amp; Defense Answers</h2>
            <p className="text-xs text-slate-400">Click each question to view the rigorous research-oriented response.</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {vivaFaqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                className="w-full p-4 text-left flex justify-between items-center hover:bg-slate-800/40 transition-colors"
              >
                <span className="font-bold text-sm text-white">{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronDown className="h-5 w-5 text-emerald-400 shrink-0 ml-2" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-500 shrink-0 ml-2" />
                )}
              </button>
              {openFaq === idx && (
                <div className="p-4 pt-1 border-t border-slate-800/80 text-xs text-slate-300 leading-relaxed bg-slate-950/40">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* B.Tech Thesis Outline */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/40">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">B.Tech CSE Capstone Report Structure (Chapters 1–10)</h2>
            <p className="text-xs text-slate-400">Fully documented and aligned with docs/ directory files</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-2">
          {chapters.map((ch) => (
            <div key={ch.num} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-mono text-emerald-400 font-bold text-xs">{ch.num}</span>
                <span className="text-[10px] text-slate-500">docs/*.md</span>
              </div>
              <h3 className="font-bold text-sm text-white">{ch.title}</h3>
              <p className="text-xs text-slate-400">{ch.summary}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Execution Commands for Viva Demonstration */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl font-mono text-xs">
        <div className="flex items-center space-x-2 text-white font-bold text-sm font-sans">
          <Terminal className="h-5 w-5 text-emerald-400" />
          <span>Viva Live Demonstration Run Commands</span>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-sans text-[11px] mb-1">1. Run Full Preprocessing &amp; Temporal Partitioning:</div>
            <code className="text-emerald-400">python scripts/preprocess.py</code>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-sans text-[11px] mb-1">2. Train Baselines &amp; Multimodal FusionNet (GPU Accelerated):</div>
            <code className="text-emerald-400">python scripts/train.py</code>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-sans text-[11px] mb-1">3. Generate Publication-Quality Figures &amp; Evaluations:</div>
            <code className="text-emerald-400">python scripts/evaluate.py</code>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-sans text-[11px] mb-1">4. Run Command-Line Inference &amp; Factor Explanations:</div>
            <code className="text-emerald-400">python scripts/predict.py --district Ludhiana</code>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-sans text-[11px] mb-1">5. Run Full Pytest Suite (All 15 Unit &amp; Integration Tests):</div>
            <code className="text-emerald-400">python -m pytest tests/ -v</code>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-sans text-[11px] mb-1">6. Start FastAPI Backend Server:</div>
            <code className="text-emerald-400">uvicorn backend.app.main:app --reload --port 8000</code>
          </div>
        </div>
      </div>
    </div>
  );
}
