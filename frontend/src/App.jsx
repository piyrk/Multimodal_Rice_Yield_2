import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import PredictPage from './pages/PredictPage';
import AdvisoryPage from './pages/AdvisoryPage';
import DashboardPage from './pages/DashboardPage';
import BenchmarkPage from './pages/BenchmarkPage';
import ExplainabilityPage from './pages/ExplainabilityPage';
import MapPage from './pages/MapPage';
import AboutPage from './pages/AboutPage';
import { checkHealth, getLocations } from './api/client';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [healthInfo, setHealthInfo] = useState(null);
  const [locations, setLocations] = useState([]);
  // District handed from the Map's "Simulate in Yield Predictor" to Predict.
  // Consumed once: navigating anywhere else clears it, so a later plain
  // visit to Predict opens on the page default again.
  const [predictDistrict, setPredictDistrict] = useState(null);
  const goTo = (tab) => {
    if (tab !== 'predict') setPredictDistrict(null);
    setActiveTab(tab);
  };

  // Every page opens at the top — without this, the previous page's scroll
  // position carries over and the sticky header clips the new page's heading.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  useEffect(() => {
    // Initial health and location check
    const fetchStatus = () => {
      checkHealth().then((res) => setHealthInfo(res));
    };
    fetchStatus();
    getLocations().then((res) => {
      if (Array.isArray(res)) setLocations(res);
    });

    // Rapid initial retry for cloud cold-start (after 3 seconds)
    const initialRetry = setTimeout(fetchStatus, 3000);

    // Periodic health check every 15 seconds
    const interval = setInterval(fetchStatus, 15000);
    return () => {
      clearTimeout(initialRetry);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-950">
      <Navbar activeTab={activeTab} setActiveTab={goTo} healthInfo={healthInfo} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'home' && (
          <HomePage onNavigate={goTo} />
        )}
        {activeTab === 'predict' && (
          <PredictPage locations={locations} initialDistrict={predictDistrict} />
        )}
        {activeTab === 'advisory' && (
          <AdvisoryPage onNavigate={goTo} />
        )}
        {activeTab === 'dashboard' && (
          <DashboardPage />
        )}
        {activeTab === 'benchmark' && (
          <BenchmarkPage />
        )}
        {activeTab === 'explain' && (
          <ExplainabilityPage />
        )}
        {activeTab === 'map' && (
          <MapPage
            locations={locations}
            onSelectDistrict={(d) => {
              setPredictDistrict(d);
              goTo('predict');
            }}
          />
        )}
        {activeTab === 'about' && (
          <AboutPage onNavigate={goTo} />
        )}
      </main>

      <footer className="border-t border-stone-200 bg-white py-8 text-center text-xs text-stone-500 mt-auto">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-stone-800 text-sm">
            ClimateRice-AI &bull; B.Tech CSE Final Year Capstone Project
          </p>
          <p className="text-stone-500 max-w-xl mx-auto text-xs">
            Climate-Aware Multimodal Rice Yield Prediction Using Satellite, Weather, Soil, and Historical Agricultural Features.
          </p>
          <p className="text-[11px] text-stone-400 pt-1">
            Engineered with PyTorch 2.6 &bull; XGBoost &bull; FastAPI &bull; SHAP &bull; React & Tailwind CSS
          </p>
        </div>
      </footer>
    </div>
  );
}
