import React, { useMemo, useState } from 'react';
import { PinIcon, SearchIcon, RefreshIcon } from './Icons';

export default function ChangeLocationModal({
  currentOrigin,
  onSelectCity,
  onClose,
  facilities = [],        // NEW: pass in from parent to derive cities
  onUseMyLocation,        // NEW: optional callback for geolocation
  isLocating = false,     // NEW: loading state from parent
}) {
  const [query, setQuery] = useState('');

  // Derive unique cities from facilities, plus keep the current origin visible
  const derivedCities = useMemo(() => {
    const byName = new Map();

    // Add current origin so it always appears in the list (even if no facility there)
    if (currentOrigin?.name && typeof currentOrigin.lat === 'number' && typeof currentOrigin.lon === 'number') {
      byName.set(currentOrigin.name, {
        name: currentOrigin.name,
        lat: currentOrigin.lat,
        lon: currentOrigin.lon,
        region: currentOrigin.region || '—',
      });
    }

    for (const fac of facilities) {
      if (!fac) continue;
      const cityName =
        fac.city ||
        fac.municipality ||
        fac.address?.split(',')?.slice(-3, -2)?.[0]?.trim() ||
        fac.address?.split(',')?.slice(-2, -1)?.[0]?.trim();

      const lat = Number(fac.lat);
      const lon = Number(fac.lon);
      if (!cityName || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      if (!byName.has(cityName)) {
        byName.set(cityName, {
          name: cityName,
          lat,
          lon,
          region: fac.region || 'Philippines',
        });
      }
    }

    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [facilities, currentOrigin]);

  const filteredCities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return derivedCities;
    return derivedCities.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.region || '').toLowerCase().includes(q)
    );
  }, [derivedCities, query]);

  const handleSelect = (city) => {
    onSelectCity({
      name: city.name,
      lat: Number(city.lat),
      lon: Number(city.lon),
      region: city.region,
    });
    onClose();
  };

  return (
    <div className="modal-overlay location-modal-overlay" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
    >
      <div className="modal-content location-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="request-modal-header">
          <div>
            <span className="request-module-tag">Geographical Reference Origin</span>
            <h3 id="location-modal-title">Change Location Reference</h3>
            <p className="request-header-sub">
              Select or set the origin point for proximity calculation & radar circles.
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="location-modal-body">
          {/* Search box */}
          <div className="location-search-row">
            <SearchIcon size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search a city or region…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Use my location button */}
          {onUseMyLocation && (
            <button
              type="button"
              className="use-my-location-btn"
              onClick={onUseMyLocation}
              disabled={isLocating}
            >
              {isLocating ? <RefreshIcon size={14} spinning /> : <PinIcon size={14} />}
              <span>{isLocating ? 'Locating…' : 'Use my current location'}</span>
            </button>
          )}

          {/* Derived city list */}
          <div className="city-options-list">
            {filteredCities.length === 0 && (
              <div className="location-empty-state">
                <p>No matching cities found.</p>
                <p className="muted">Try a different search or use your current location.</p>
              </div>
            )}

            {filteredCities.map((city) => {
              const isCurrent =
                currentOrigin?.name === city.name &&
                Number(currentOrigin?.lat) === Number(city.lat) &&
                Number(currentOrigin?.lon) === Number(city.lon);

              return (
                <button
                  key={`${city.name}-${city.lat}-${city.lon}`}
                  type="button"
                  className={`city-option-btn ${isCurrent ? 'active' : ''}`}
                  onClick={() => handleSelect(city)}
                >
                  <div className="city-name-row">
                    <span
                      className="city-pin"
                      style={{ color: '#dc2626', display: 'flex', alignItems: 'center' }}
                    >
                      <PinIcon size={16} />
                    </span>
                    <span className="city-name">{city.name}</span>
                    {isCurrent && <span className="current-badge">Active Center</span>}
                  </div>
                  <span className="city-coords">
                    {Number(city.lat).toFixed(4)}° N, {Number(city.lon).toFixed(4)}° E
                    {city.region ? ` · ${city.region}` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="matrix-modal-footer">
          <button
            type="button"
            className="btn-modal-cancel"
            onClick={onClose}
            style={{ marginLeft: 'auto' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}