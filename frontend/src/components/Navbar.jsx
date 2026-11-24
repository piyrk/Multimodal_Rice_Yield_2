import React, { useEffect, useRef, useState } from 'react';

export default function Navbar({ activeTab, setActiveTab, healthInfo }) {
  const isOnline = healthInfo?.status === 'healthy';
  const isChecking = healthInfo === null || healthInfo?.status === 'waking';

  // After ~4 s of checking, the backend is almost certainly cold-starting:
  // say so honestly instead of showing a bare "Connecting..." for minutes.
  const [slowCheck, setSlowCheck] = useState(false);
  const checkingSince = useRef(null);
  useEffect(() => {
    if (isChecking) {
      if (checkingSince.current === null) checkingSince.current = Date.now();
      const elapsed = Date.now() - checkingSince.current;
      if (elapsed >= 4000) {
        setSlowCheck(true);
        return;
      }
      const t = setTimeout(() => setSlowCheck(true), 4000 - elapsed);
      return () => clearTimeout(t);
    }
    checkingSince.current = null;
    setSlowCheck(false);
  }, [isChecking, healthInfo]);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'predict', label: 'Predict' },
    { id: 'advisory', label: 'Advisory' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'benchmark', label: 'Benchmarks' },
    { id: 'explain', label: 'Explainability' },
    { id: 'map', label: 'Map' },
    { id: 'about', label: 'About' },
  ];

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer select-none shrink-0"
            onClick={() => setActiveTab('home')}
          >
            <img
              src="/logo.svg"
              alt="ClimateRice-AI logo"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg shadow-sm"
            />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-base sm:text-lg text-stone-900 tracking-tight">
                  ClimateRice<span className="text-emerald-700">-AI</span>
                </span>
                <span className="hidden lg:inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Kharif 2026 · Live
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links (scrollable on smaller devices) */}
          <nav className="flex items-center space-x-0.5 overflow-x-auto no-scrollbar py-1 min-w-0">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
                    active
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* API Status Indicator with Cold-Start friendly state */}
          <div className="flex items-center space-x-2 text-xs shrink-0">
            {isChecking ? (
              <div className="flex items-center space-x-1.5 text-stone-500 font-medium text-[11px]">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="hidden sm:inline">{slowCheck ? 'Waking server… (~30–60 s)' : 'Connecting...'}</span>
              </div>
            ) : isOnline ? (
              <div className="flex items-center space-x-1.5 text-stone-700 font-medium text-[11px]">
                <span className="h-2 w-2 rounded-full bg-emerald-600 ring-2 ring-emerald-100"></span>
                <span>API Online</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 text-rose-700 font-medium text-[11px]">
                <span className="h-2 w-2 rounded-full bg-rose-500 ring-2 ring-rose-100"></span>
                <span>API Offline</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
