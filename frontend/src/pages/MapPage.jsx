import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { MapPin, Navigation, Info, ExternalLink } from 'lucide-react';

export default function MapPage({ locations, onSelectDistrict }) {
  const [selectedDistrict, setSelectedDistrict] = useState(locations[0] || null);

  const getMarkerColor = (baseYield) => {
    if (baseYield >= 3.6) return '#059669'; // Emerald (High Yield / Irrigated)
    if (baseYield >= 2.5) return '#0284c7'; // Sky (Medium Yield)
    return '#d97706'; // Amber (Low Yield / Rainfed Upland)
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-stone-200 pb-5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
          <Navigation className="w-3.5 h-3.5 text-emerald-700" />
          Geospatial Coverage
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
          Agro-Ecological District Distribution
        </h1>
        <p className="text-sm text-stone-600 mt-1 max-w-3xl">
          Explore representative Indian rice-producing districts across 12 distinct agro-climatic zones and irrigation regimes. Click any marker to view localized agronomic attributes.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Map Container (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-stone-200 rounded-2xl p-4 shadow-sm h-[580px] flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3 px-1">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-emerald-700" />
              <span>Spatial Distribution ({locations.length} Districts)</span>
            </span>
            <div className="flex items-center space-x-4 text-xs font-mono">
              <div className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
                <span className="text-stone-600">&gt; 3.6 t/ha</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-600"></span>
                <span className="text-stone-600">2.5 – 3.6 t/ha</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-600"></span>
                <span className="text-stone-600">&lt; 2.5 t/ha</span>
              </div>
            </div>
          </div>

          <div className="flex-1 rounded-xl overflow-hidden border border-stone-200 relative">
            <MapContainer
              center={[22.5937, 82.9629]}
              zoom={5}
              scrollWheelZoom={true}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {locations.map((loc) => (
                <CircleMarker
                  key={loc.district_name}
                  center={[loc.lat, loc.lon]}
                  radius={8}
                  pathOptions={{
                    fillColor: getMarkerColor(loc.base_yield),
                    fillOpacity: 0.85,
                    color: '#ffffff',
                    weight: 2,
                  }}
                  eventHandlers={{
                    click: () => setSelectedDistrict(loc),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                    <div className="text-stone-900 font-bold text-xs">{loc.district_name}, {loc.state_name}</div>
                    <div className="text-stone-600 text-[10px]">Base Yield: {loc.base_yield} t/ha</div>
                  </Tooltip>
                  <Popup>
                    <div className="text-stone-900 p-1">
                      <div className="font-bold text-sm text-stone-900">{loc.district_name}</div>
                      <div className="text-xs text-stone-500">{loc.state_name}</div>
                      <div className="text-xs font-semibold text-emerald-700 mt-1">Base Yield: {loc.base_yield} t/ha</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">Irrigation: {(loc.irrigation_ratio * 100).toFixed(0)}%</div>
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
            <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-5 shadow-sm">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider font-mono">Selected Region</span>
                <h2 className="text-2xl font-bold text-stone-900 mt-1">{selectedDistrict.district_name}</h2>
                <p className="text-stone-500 text-xs">{selectedDistrict.state_name}, India</p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 flex justify-between items-center">
                  <span className="text-xs text-stone-600">Agro-Ecological Zone</span>
                  <span className="text-xs font-bold text-stone-900 font-mono text-right">{selectedDistrict.zone}</span>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 flex justify-between items-center">
                  <span className="text-xs text-stone-600">Baseline Yield (APY DES)</span>
                  <span className="text-sm font-extrabold text-emerald-700 font-mono">{selectedDistrict.base_yield} t/ha</span>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 flex justify-between items-center">
                  <span className="text-xs text-stone-600">Irrigation Coverage</span>
                  <span className="text-xs font-bold text-sky-700 font-mono">{(selectedDistrict.irrigation_ratio * 100).toFixed(0)}% Irrigated</span>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 flex justify-between items-center">
                  <span className="text-xs text-stone-600">Centroid Coordinates</span>
                  <span className="text-xs font-mono text-stone-700">{selectedDistrict.lat.toFixed(2)}°N, {selectedDistrict.lon.toFixed(2)}°E</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/60 text-xs text-stone-700 leading-relaxed">
                <div className="font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-emerald-700" />
                  <span>Agronomic Profile</span>
                </div>
                {selectedDistrict.irrigation_ratio > 0.85 ? (
                  <p>Intensively cultivated and highly buffered against erratic monsoon rainfall due to comprehensive canal and tubewell infrastructure.</p>
                ) : selectedDistrict.irrigation_ratio < 0.45 ? (
                  <p>Predominantly rainfed upland ecosystem. High vulnerability to monsoon dry spells (&gt;15 days) and soil moisture deficits.</p>
                ) : (
                  <p>Mixed irrigated-rainfed alluvial basin. Favorable soil organic carbon with sensitivity to late-season terminal heat events.</p>
                )}
              </div>

              <button
                onClick={() => onSelectDistrict(selectedDistrict.district_name)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs shadow-sm transition-all"
              >
                <span>Simulate in Yield Predictor</span>
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 text-center text-stone-500 shadow-sm">
              Select a district marker on the map to inspect localized properties.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
