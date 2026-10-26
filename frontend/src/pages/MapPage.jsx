import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { MapPin, Navigation, Info, ExternalLink } from 'lucide-react';

export default function MapPage({ locations, onSelectDistrict }) {
  const [selectedDistrict, setSelectedDistrict] = useState(locations[0] || null);

  const getMarkerColor = (baseYield) => {
    if (baseYield >= 3.6) return '#10b981'; // Green (High Yield / Irrigated)
    if (baseYield >= 2.5) return '#3b82f6'; // Blue (Medium Yield)
    return '#f59e0b'; // Amber (Low Yield / Rainfed Upland)
  };

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Geospatial Agro-Ecological District Map</h1>
        <p className="text-slate-400 text-sm mt-1">
          Explore representative Indian rice-producing districts across distinct agro-ecological zones and irrigation regimes. Click any marker to view localized characteristics.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Map Container (8 cols) */}
        <div className="lg:col-span-8 bg-slate-800/80 border border-slate-700/80 rounded-3xl p-4 shadow-xl h-[580px] flex flex-col">
          <div className="flex justify-between items-center mb-3 px-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <Navigation className="h-4 w-4 text-emerald-400" />
              <span>Spatial Distribution ({locations.length} Districts)</span>
            </span>
            <div className="flex items-center space-x-4 text-xs font-mono">
              <div className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-300">&gt; 3.6 t/ha</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                <span className="text-slate-300">2.5 – 3.6 t/ha</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                <span className="text-slate-300">&lt; 2.5 t/ha</span>
              </div>
            </div>
          </div>

          <div className="flex-1 rounded-2xl overflow-hidden border border-slate-700 relative">
            <MapContainer
              center={[22.5937, 82.9629]}
              zoom={5}
              scrollWheelZoom={true}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {locations.map((loc) => (
                <CircleMarker
                  key={loc.district_name}
                  center={[loc.lat, loc.lon]}
                  radius={9}
                  pathOptions={{
                    fillColor: getMarkerColor(loc.base_yield),
                    fillOpacity: 0.85,
                    color: '#ffffff',
                    weight: 1.5,
                  }}
                  eventHandlers={{
                    click: () => setSelectedDistrict(loc),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                    <div className="text-slate-900 font-bold text-xs">{loc.district_name}, {loc.state_name}</div>
                    <div className="text-slate-700 text-[10px]">Base Yield: {loc.base_yield} t/ha</div>
                  </Tooltip>
                  <Popup>
                    <div className="text-slate-900 p-1">
                      <div className="font-bold text-sm">{loc.district_name}</div>
                      <div className="text-xs text-slate-600">{loc.state_name}</div>
                      <div className="text-xs font-semibold text-emerald-700 mt-1">Base Yield: {loc.base_yield} t/ha</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Irrigation: {(loc.irrigation_ratio * 100).toFixed(0)}%</div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Selected District Details Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {selectedDistrict ? (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-5 shadow-xl">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">Selected Region</span>
                <h2 className="text-2xl font-bold text-white mt-1">{selectedDistrict.district_name}</h2>
                <p className="text-slate-400 text-xs">{selectedDistrict.state_name}, India</p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-400">Agro-Ecological Zone</span>
                  <span className="text-xs font-bold text-white font-mono">{selectedDistrict.zone}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-400">Baseline Rice Yield</span>
                  <span className="text-sm font-extrabold text-emerald-400 font-mono">{selectedDistrict.base_yield} t/ha</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-400">Irrigation Coverage</span>
                  <span className="text-xs font-bold text-sky-400 font-mono">{(selectedDistrict.irrigation_ratio * 100).toFixed(0)}% Irrigated</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-400">Centroid Coordinates</span>
                  <span className="text-xs font-mono text-slate-300">{selectedDistrict.lat.toFixed(2)}°N, {selectedDistrict.lon.toFixed(2)}°E</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-slate-300 leading-relaxed">
                <div className="font-bold text-emerald-400 mb-1 flex items-center space-x-1.5">
                  <Info className="h-4 w-4" />
                  <span>Agronomic Characteristics</span>
                </div>
                {selectedDistrict.irrigation_ratio > 0.85 ? (
                  <p>Intensively cultivated and highly buffered against erratic monsoon rainfall due to comprehensive canal/tubewell infrastructure.</p>
                ) : (selectedDistrict.irrigation_ratio < 0.45 ? (
                  <p>Predominantly rainfed upland ecosystem. Exceptionally vulnerable to monsoon dry spells (&gt;15 days) and soil moisture deficits.</p>
                ) : (
                  <p>Mixed irrigated-rainfed alluvial basin. Favorable soil organic carbon with sensitivity to late-season terminal heat events.</p>
                ))}
              </div>

              <button
                onClick={() => onSelectDistrict(selectedDistrict.district_name)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 text-xs shadow-lg shadow-emerald-500/20 transition-all"
              >
                <span>Simulate in Yield Predictor</span>
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 text-center text-slate-400">
              Select a district marker on the map to inspect localized properties.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
