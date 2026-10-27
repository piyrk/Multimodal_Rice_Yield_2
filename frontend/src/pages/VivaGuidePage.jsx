import React, { useState } from 'react';
import { BookOpen, HelpCircle, ChevronDown, ChevronRight, Terminal, Award, FileText, CheckCircle2 } from 'lucide-react';

export default function VivaGuidePage() {
  const [openFaq, setOpenFaq] = useState(0);

  const vivaFaqs = [
    {
      q: "1. How does ClimateRice-FusionNet compare with XGBoost, and why does XGBoost achieve lower error?",
      a: "Full-feature XGBoost achieves the strongest numerical prediction on the semi-synthetic benchmark (MAE: 0.2014 t/ha, R²: 0.9548) outperforming ClimateRice-FusionNet (MAE: 0.2774 t/ha, R²: 0.9329). This aligns with established empirical machine learning literature (Grinsztajn et al., NeurIPS 2022; Gorishniy et al., NeurIPS 2021) showing gradient boosted decision trees routinely outperform deep neural networks on tabular datasets with N < 10,000. ClimateRice-FusionNet provides complementary architectural capabilities: (1) Differentiable cross-modal gated attention that dynamically reweights modalities during environmental shocks, and (2) Monte Carlo Dropout epistemic uncertainty intervals."
    },
    {
      q: "2. Is your dataset real observational data or a calibrated benchmark?",
      a: "The project evaluates both tracks rigorously: (1) An authentic observational dataset (DES APY, N=303 records, 2001–2022) where FusionNet achieves R² = 0.680 and MAE = 0.337 t/ha, reflecting real-world agricultural noise. (2) A calibrated semi-synthetic benchmark (N = 504 rows across 24 districts and 21 crop years) where spatial centroids, agro-ecological classifications, and baseline yields are grounded in authentic DES GoI and ICRISAT records, coupled to peer-reviewed biophysical response functions (Peng et al. 2004, Lobell et al. 2015) for Controlled Modality Ablation (Exp A–G)."
    },
    {
      q: "3. How did you prevent data leakage in your agricultural time-series?",
      a: "Agricultural time-series exhibit strong temporal autocorrelation and climate trends. Standard random K-Fold cross-validation leaks future trends into earlier predictions. We enforced a strict Temporal Holdout Split: Training on 2000–2014, Validation on 2015–2016, and Held-Out Testing on 2017–2020. Furthermore, all scalers (StandardScaler) were fit strictly on the training partition, and historical yield lag features strictly draw from prior years (t-1, t-2, and t-3:t-1)."
    },
    {
      q: "4. What is the agronomic justification for your engineered climate features?",
      a: "All 26 features are grounded in published crop physiology: (1) Rainfall Anomaly (%) captures departure from climatological normal; (2) Extreme Heat Days (Tmax >= 35°C during anthesis) triggers spikelet sterility and pollen desiccation; (3) Consecutive Dry Days (CDD) models agricultural drought streaks; and (4) Minimum Nighttime Temperature anomalies (Tmin) model nocturnal respiration losses where rice consumes carbohydrates without photosynthesizing (Peng et al. 2004, PNAS)."
    },
    {
      q: "5. What are the formal results of your hypothesis testing?",
      a: "Multimodal feature integration significantly improves prediction relative to selected single-modality configurations. Fusing satellite, weather, soil, and historical lags reduces test error by 0.2652 t/ha compared to satellite alone (paired Student's t-test p = 2.54e-07 << 0.05, Wilcoxon p = 5.10e-06). In the comparison between models on the full feature set, full-feature XGBoost achieves lower test error than ClimateRice-FusionNet on this benchmark (paired t-test p = 0.0019, Wilcoxon p = 0.0017)."
    },
    {
      q: "6. Is your uncertainty interval a confidence interval or a predictive interval, and what is its empirical coverage?",
      a: "It is an MC Dropout predictive interval (Gal & Ghahramani, ICML 2016), NOT a population parameter confidence interval. It captures epistemic model uncertainty across 50 stochastic forward passes. On our held-out benchmark test partition (N = 96, 2017–2020), this achieves 95.83% empirical coverage. On raw real-world observational DES APY data, the same ±1.96σ interval covers 44.44% (16 of 36 test cases), proving that unmodeled field-level factors (fertilizer application, pest outbreaks, localized flooding) expand real-world residual variance."
    },
    {
      q: "7. How does this system meet the broader Project 19 Decision Support requirements?",
      a: "Beyond raw yield prediction, ClimateRice-AI includes three actionable agronomic advisory components: (1) Rule-based Alternate Wetting and Drying (AWD) water management scheduling; (2) Verified cultivar selection matrix sourced from ICAR-NRRI and ANGRAU with maturity days and stress tolerances; (3) Weather-window pest and pathogen risk forewarning for Rice Blast, Brown Planthopper, and Bacterial Leaf Blight."
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-stone-200 pb-5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
          <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
          Examination Reference
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
          Academic Capstone Guide &amp; Viva Defense
        </h1>
        <p className="text-sm text-stone-600 mt-1 max-w-3xl">
          Comprehensive presentation reference, thesis chapter structure, anticipated examiner defense answers, and live demonstration run commands.
        </p>
      </div>

      {/* Anticipated Viva Questions */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">
              Anticipated External Examiner Questions &amp; Rigorous Defense
            </h2>
            <p className="text-xs text-stone-500">Click each question to view the scientifically honest, verified response.</p>
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          {vivaFaqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-stone-200/80 overflow-hidden transition-all bg-stone-50/50"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                className="w-full p-4 text-left flex justify-between items-center hover:bg-stone-100/60 transition-colors"
              >
                <span className="font-semibold text-sm text-stone-900">{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronDown className="h-4 w-4 text-emerald-700 shrink-0 ml-2" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-stone-400 shrink-0 ml-2" />
                )}
              </button>
              {openFaq === idx && (
                <div className="p-4 pt-2 border-t border-stone-200 text-xs text-stone-700 leading-relaxed bg-white">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* B.Tech Thesis Outline */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
          <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200/60">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">
              B.Tech CSE Capstone Report Structure (Chapters 1–10)
            </h2>
            <p className="text-xs text-stone-500">Mapped to verified documentation files in the repository `docs/` folder</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-1">
          {chapters.map((ch) => (
            <div key={ch.num} className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-mono text-emerald-700 font-bold text-xs">{ch.num}</span>
                <span className="text-[10px] font-mono text-stone-500">docs/*.md</span>
              </div>
              <h3 className="font-bold text-sm text-stone-900">{ch.title}</h3>
              <p className="text-xs text-stone-600 leading-relaxed">{ch.summary}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Execution Commands for Viva Demonstration */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-stone-900 font-bold text-base border-b border-stone-100 pb-4">
          <Terminal className="h-5 w-5 text-emerald-700" />
          <span>Viva Live Demonstration Verification Commands</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 font-mono text-xs">
          <div className="p-3 bg-stone-900 text-stone-100 rounded-xl space-y-1">
            <div className="text-stone-400 font-sans text-[11px]">1. Data Harmonization &amp; Partitioning:</div>
            <code className="text-emerald-400">python scripts/preprocess.py</code>
          </div>

          <div className="p-3 bg-stone-900 text-stone-100 rounded-xl space-y-1">
            <div className="text-stone-400 font-sans text-[11px]">2. Baseline &amp; FusionNet Training:</div>
            <code className="text-emerald-400">python scripts/train.py</code>
          </div>

          <div className="p-3 bg-stone-900 text-stone-100 rounded-xl space-y-1">
            <div className="text-stone-400 font-sans text-[11px]">3. Figures &amp; Ablation Evaluation:</div>
            <code className="text-emerald-400">python scripts/evaluate.py</code>
          </div>

          <div className="p-3 bg-stone-900 text-stone-100 rounded-xl space-y-1">
            <div className="text-stone-400 font-sans text-[11px]">4. CLI Test Inference:</div>
            <code className="text-emerald-400">python scripts/predict.py --district Ludhiana</code>
          </div>

          <div className="p-3 bg-stone-900 text-stone-100 rounded-xl space-y-1 sm:col-span-2">
            <div className="text-stone-400 font-sans text-[11px]">5. Full Automated Pytest Suite (All 37 Unit &amp; Integration Tests):</div>
            <code className="text-emerald-400">python -m pytest tests/ -v</code>
          </div>
        </div>
      </div>
    </div>
  );
}
