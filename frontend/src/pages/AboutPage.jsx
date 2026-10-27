import React from 'react';
import { Layers, ShieldAlert, Cpu, Database, CheckCircle, ArrowRight } from 'lucide-react';

export default function AboutPage({ onNavigate }) {
  const techStack = [
    { name: 'PyTorch 2.6', role: 'Deep representation learning, multi-branch encoders, cross-modal attention, and MC Dropout sampling.' },
    { name: 'XGBoost & Scikit-learn', role: 'Gradient boosted tree ensembles and traditional regression baselines.' },
    { name: 'FastAPI & Pydantic', role: 'High-performance asynchronous inference API with strict schema validation.' },
    { name: 'SHAP (Game-Theoretic XAI)', role: 'TreeExplainer and KernelExplainer computing marginal factor sensitivities.' },
    { name: 'React & Tailwind CSS', role: 'Lightweight, responsive academic interface with accessible typography.' },
  ];

  return (
    <div className="space-y-12 py-8 sm:py-12 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3 py-1 rounded-full text-xs font-semibold">
          <span>B.Tech CSE Capstone Project Documentation</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
          About ClimateRice-AI
        </h1>
        <p className="text-base text-stone-600 leading-relaxed">
          ClimateRice-AI is a climate-aware multimodal rice-yield prediction system integrating satellite-derived, weather, soil, and historical agricultural features.
        </p>
      </div>

      {/* 1. Research Objective & Central Hypothesis */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-stone-900">1. Research Objective &amp; Hypothesis</h2>
        <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 font-mono leading-relaxed">
          &ldquo;Can integrating satellite, weather, soil, and historical agricultural information improve rice-yield prediction, and how does a multimodal deep-learning architecture compare with strong traditional machine-learning baselines?&rdquo;
        </div>
        <p className="text-sm text-stone-600 leading-relaxed">
          <strong>Primary Finding:</strong> Multimodal feature fusion yields a statistically decisive error reduction over single-modality baselines (paired Student&apos;s t-test <code className="bg-stone-100 px-1.5 py-0.5 rounded text-xs">p = 2.54 × 10⁻⁷</code>, Wilcoxon <code className="bg-stone-100 px-1.5 py-0.5 rounded text-xs">p = 5.10 × 10⁻⁶</code>). In the model comparison on tabular panel features, Full-feature XGBoost achieved the lowest test error (MAE: 0.2014 t/ha), while ClimateRice-FusionNet (MAE: 0.2774 t/ha) provides cross-modal attention interpretability and epistemic uncertainty quantification.
        </p>
      </section>

      {/* 2. Model Architecture Visual */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-xl font-bold text-stone-900">2. Multimodal Fusion Architecture</h2>
        <p className="text-sm text-stone-600 leading-relaxed">
          Rather than naively concatenating raw heterogenous features, <strong>ClimateRice-FusionNet</strong> routes each domain into dedicated representation encoders before computing dynamic cross-modal attention weights.
        </p>

        {/* Clean Architectural Flow Diagram */}
        <div className="p-6 bg-stone-50 border border-stone-200 rounded-xl overflow-x-auto">
          <div className="min-w-[540px] flex items-center justify-between gap-4 font-mono text-xs">
            {/* Input Modalities */}
            <div className="space-y-3 w-36">
              <div className="bg-white border border-stone-300 p-2.5 rounded-lg text-center font-bold text-stone-800 shadow-2xs">
                Satellite (5)
              </div>
              <div className="bg-white border border-stone-300 p-2.5 rounded-lg text-center font-bold text-stone-800 shadow-2xs">
                Weather (10)
              </div>
              <div className="bg-white border border-stone-300 p-2.5 rounded-lg text-center font-bold text-stone-800 shadow-2xs">
                Soil (7)
              </div>
              <div className="bg-white border border-stone-300 p-2.5 rounded-lg text-center font-bold text-stone-800 shadow-2xs">
                Historical (4)
              </div>
            </div>

            {/* Connecting Arrows */}
            <div className="text-stone-400 text-sm font-bold flex flex-col justify-around h-44 py-2">
              <span>──►</span>
              <span>──►</span>
              <span>──►</span>
              <span>──►</span>
            </div>

            {/* Modality Encoders */}
            <div className="space-y-3 w-40">
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-2.5 rounded-lg text-center font-semibold">
                Satellite Encoder
              </div>
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-2.5 rounded-lg text-center font-semibold">
                Weather Encoder
              </div>
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-2.5 rounded-lg text-center font-semibold">
                Soil Encoder
              </div>
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-2.5 rounded-lg text-center font-semibold">
                History Encoder
              </div>
            </div>

            {/* Convergence Arrow */}
            <div className="text-stone-400 text-sm font-bold flex flex-col justify-center h-44">
              <span>──►</span>
            </div>

            {/* Fusion & Head */}
            <div className="space-y-3 w-44">
              <div className="bg-emerald-700 text-white p-4 rounded-xl text-center font-bold shadow-sm">
                Cross-Modal Gated Attention
              </div>
              <div className="bg-stone-800 text-white p-3 rounded-lg text-center font-medium">
                MC Dropout Head
              </div>
            </div>

            {/* Final Arrow */}
            <div className="text-stone-400 text-sm font-bold flex flex-col justify-center h-44">
              <span>──►</span>
            </div>

            {/* Outputs */}
            <div className="space-y-2 w-36">
              <div className="bg-white border-2 border-emerald-600 p-2.5 rounded-lg text-center font-bold text-emerald-800">
                Yield (t/ha)
              </div>
              <div className="bg-white border border-stone-300 p-2 rounded-lg text-center text-[11px] text-stone-600 font-sans">
                Predictive Interval (μ ± 1.05σ)
              </div>
              <div className="bg-white border border-stone-300 p-2 rounded-lg text-center text-[11px] text-stone-600 font-sans">
                Attention Weights (α)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Dataset & Academic Limitations */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-stone-900 font-bold text-xl">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          <h2>3. Dataset Provenance, Observational Upgrade &amp; Limitations</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-800">A. Calibrated Benchmark (N = 504)</span>
            <p className="text-xs text-stone-600 leading-relaxed">
              504 district-year records across 24 Indian districts (2000–2020). Utilized for controlled multi-modality ablation experiments (Exp A–G). Grounded in DES/ICRISAT historical base yields with biophysical agro-meteorological response equations.
            </p>
          </div>
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">B. Genuine Observational Dataset (N = 427, extended)</span>
            <p className="text-xs text-emerald-800 leading-relaxed">
              303 original panel records coupling <strong>real observed rice yield and sown area</strong> from official Government of India (DES APY) statistics with <strong>real daily meteorology</strong> from NASA POWER REST API and SoilGrids pedometrics (2000–2014), <strong>extended with recorded DES yields to 427 records (2000–2024)</strong> via the India Data Portal APY/UPAG compilations under vintage, identity and lag-integrity gates. Kharif 2025–2026 are available in the Predict studio as labelled model estimates (recorded yields not yet published).
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-lg space-y-1 text-xs text-amber-900">
          <span className="font-bold">Seasonal Scope &amp; Validation Status:</span>
          <p className="text-[11px] leading-relaxed">
            The current production prediction checkpoint is calibrated exclusively on <strong>Kharif (monsoon)</strong> rice, which represents &gt;80% of national rice production. 
            Rabi (winter/spring) rice is cultivated in dry-season regimes (concentrated in southern/eastern canal deltas) and is under active observational validation.
          </p>
        </div>

        <p className="text-xs text-stone-500 italic border-l-2 border-stone-300 pl-3 leading-relaxed">
          &ldquo;Results on the calibrated benchmark demonstrate system architecture and cross-modal attention dynamics, while the observational dataset verifies empirical performance against real-world Indian agricultural statistics.&rdquo;
        </p>
      </section>

      {/* 4. Geographic Scope: Andhra Pradesh Delta Origin & Pan-India Benchmark */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-stone-900">4. Geographic Focus &amp; Generalization Strategy</h2>
        <div className="space-y-3 text-xs sm:text-sm text-stone-600 leading-relaxed">
          <p>
            <strong>Project 19 Regional Origin:</strong> Grounded in the rice agro-ecosystem of <strong>Andhra Pradesh</strong>, specifically focusing on the high-intensity irrigated delta of <strong>Krishna district (Vijayawada region)</strong> and adjacent Godavari basins. Krishna represents an intensive canal-irrigated paddy system yielding 3.75 t/ha with high input adoption and vulnerability to cyclonic coastal weather.
          </p>
          <p>
            <strong>Pan-India Generalization Benchmark:</strong> To evaluate model transferability across diverse thermal, rainfall, and soil regimes, the evaluation was scaled to a <strong>24-district benchmark panel</strong> across 11 major rice-producing states (Punjab, Haryana, West Bengal, Bihar, Uttar Pradesh, Odisha, Andhra Pradesh, Telangana, Tamil Nadu, Chhattisgarh, and Assam) encompassing 12 distinct ICAR agro-ecological zones.
          </p>
        </div>
      </section>

      {/* 5. Project Team & Academic Guidance */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="border-b border-stone-100 pb-3">
          <h2 className="text-xl font-bold text-stone-900">5. Project Team &amp; Academic Supervision</h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            B.Tech Final Year Capstone Project (Project 19) &bull; Department of Computer Science &amp; Engineering
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Student Team Members</span>
            <ul className="text-xs text-stone-800 font-medium space-y-1.5 pt-2">
              <li className="flex items-center space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-700"></span>
                <span><strong>Piyush Kumar</strong> — Lead, Neural Architecture &amp; System Integration</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-700"></span>
                <span><strong>Rajesh</strong> — Data Pipeline Harmonization &amp; Agricultural Research</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-700"></span>
                <span><strong>Laxmi Pavani</strong> — Feature Engineering &amp; Statistical Evaluation</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-700"></span>
                <span><strong>Mullapudi Pravallika</strong> — UI/UX &amp; Agronomic Advisory Integration</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">Faculty Project Supervisor</span>
            <div className="pt-2 space-y-1 text-xs">
              <p className="font-bold text-stone-900 text-sm">Dr. E. Raveendra Reddy</p>
              <p className="text-stone-600">Department of Computer Science &amp; Engineering</p>
              <p className="text-[11px] text-stone-500 italic mt-2">
                Guidance on scientific methodology, multimodal architecture formulation, temporal leakage prevention, and research integrity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Technology Stack */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-stone-900">6. Technology Stack</h2>
        <div className="divide-y divide-stone-100">
          {techStack.map((t, idx) => (
            <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-sm">
              <span className="font-semibold text-stone-900 w-48 shrink-0">{t.name}</span>
              <span className="text-xs sm:text-sm text-stone-600">{t.role}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Action Footer */}
      <div className="text-center pt-2">
        <button
          onClick={() => onNavigate('predict')}
          className="inline-flex items-center space-x-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-6 py-2.5 rounded-lg shadow-sm transition-colors text-sm"
        >
          <span>Open Prediction Studio</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
