import React from 'react';
import { Sprout } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, healthInfo }) {
  const isOnline = healthInfo?.status === 'healthy';

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'predict', label: 'Predict' },
    { id: 'about', label: 'About' },
  ];

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer select-none"
            onClick={() => setActiveTab('home')}
          >
            <div className="h-9 w-9 rounded-lg bg-emerald-700 flex items-center justify-center text-white shadow-sm">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-lg text-stone-900 tracking-tight">
                  ClimateRice<span className="text-emerald-700">-AI</span>
                </span>
                <span className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                  B.Tech Capstone
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
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

          {/* API Status Indicator */}
          <div className="flex items-center space-x-2 text-xs">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isOnline ? 'bg-emerald-600 ring-2 ring-emerald-100' : 'bg-rose-500 ring-2 ring-rose-100'
              }`}
            ></span>
            <span className={`font-medium ${isOnline ? 'text-stone-700' : 'text-rose-700'}`}>
              {isOnline ? 'API Online' : 'API Offline'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
