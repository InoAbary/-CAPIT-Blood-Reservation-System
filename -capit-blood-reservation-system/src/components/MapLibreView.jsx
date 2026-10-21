import React, { useState, useRef, useEffect } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ClockIcon, PhoneIcon, RefreshIcon } from './Icons';
import './PRCRadarMap.css';

export default function MapLibreView({
  facilities,
  selectedFacility,
  onSelectFacility,
  onOpenMatrix,
  selectedBloodType,
  selectedComponent,
  currentOrigin = { name: 'City of Manila', lat: 14.5888, lon: 120.9744 },
}) {
  const mapRef = useRef(null);

  const [viewState, setViewState] = useState({
    longitude: currentOrigin.lon || 120.9744,
    latitude: currentOrigin.lat || 14.5888,
    zoom: 11.8,
  });

  const [mapTheme, setMapTheme] = useState('dark'); // 'dark' (Dark Matter) or 'light' (Positron)

  const mapStyleUrl =
    mapTheme === 'dark'
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

  // Fly to new origin when currentOrigin changes
  useEffect(() => {
    if (currentOrigin?.lat && currentOrigin?.lon) {
      setViewState((prev) => ({
        ...prev,
        longitude: currentOrigin.lon,
        latitude: currentOrigin.lat,
      }));
      mapRef.current?.flyTo?.({
        center: [currentOrigin.lon, currentOrigin.lat],
        zoom: 12,
        duration: 800,
      });
    }
  }, [currentOrigin]);

  // Fly to facility when selected from outside
  useEffect(() => {
    if (selectedFacility?.lat && selectedFacility?.lon) {
      mapRef.current?.flyTo?.({
        center: [selectedFacility.lon, selectedFacility.lat],
        duration: 600,
      });
    }
  }, [selectedFacility]);

  // Determine availability status for current filter
  const getFacilityStatus = (facility) => {
    const bt = selectedBloodType === 'ALL' ? 'O+' : selectedBloodType;
    let compKey = 'prbc';
    if (selectedComponent?.toLowerCase().includes('whole')) compKey = 'whole';
    else if (selectedComponent?.toLowerCase().includes('platelet')) compKey = 'platelet';
    else if (selectedComponent?.toLowerCase().includes('plasma')) compKey = 'plasma';
    else if (selectedComponent?.toLowerCase().includes('cryo')) compKey = 'cryo';

    return facility.matrix?.[bt]?.[compKey] || 'Available';
  };

  const resetView = () => {
    const targetLon = currentOrigin.lon || 120.9744;
    const targetLat = currentOrigin.lat || 14.5888;
    setViewState({
      longitude: targetLon,
      latitude: targetLat,
      zoom: 11.8,
    });
    mapRef.current?.flyTo?.({
      center: [targetLon, targetLat],
      zoom: 11.8,
      duration: 600,
    });
  };

  return (
    <div className="radar-map-container" style={{ position: 'relative', height: '620px' }}>
      {/* Top Header Overlay */}
      <div className="radar-header-overlay">
        <span className="radar-center-dot"></span>
        <span>
          <strong>Center: {currentOrigin.name}</strong> · Showing {facilities.length} BSFs
        </span>
      </div>

      {/* Map Theme & Reset Controls in Top Right */}
      <div className="radar-controls" style={{ top: '14px', right: '48px', flexDirection: 'row' }}>
        <button
          className="radar-control-btn"
          style={{ width: 'auto', padding: '0 10px', fontSize: '0.75rem', fontWeight: 600 }}
          title="Toggle Dark / Light Map Style"
          onClick={() => setMapTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        >
          {mapTheme === 'dark' ? 'Light Map' : 'Dark Map'}
        </button>
        <button className="radar-control-btn" title="Reset to Origin" onClick={resetView}>
          <RefreshIcon size={14} />
        </button>
      </div>

      {/* MapLibre GL Map using original react-map-gl */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyleUrl}
        attributionControl={false}
      >
        <NavigationControl position="top-right" />

        {/* Center / User Origin Marker */}
        <Marker
          longitude={currentOrigin.lon || 120.9744}
          latitude={currentOrigin.lat || 14.5888}
          anchor="center"
        >
          <div
            title={`Origin: ${currentOrigin.name}`}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.35)',
                animation: 'radarPulse 2s infinite ease-out',
              }}
            />
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#ef4444',
                border: '2.5px solid #ffffff',
                boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
              }}
            />
          </div>
        </Marker>

        {/* Facility Markers */}
        {facilities.map((fac) => {
          const isSelected = selectedFacility?.id === fac.id;
          const status = getFacilityStatus(fac);
          const isPRC = fac.category === 'PRC';

          let statusBg = '#22c55e'; // Available (Green)
          if (status === 'Low') statusBg = '#f59e0b'; // Low (Amber)
          if (status === 'Unavailable' || status === 'Out of Stock') statusBg = '#ef4444'; // Out (Red)

          return (
            <Marker
              key={fac.id}
              longitude={fac.lon}
              latitude={fac.lat}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onSelectFacility(fac);
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                  transition: 'transform 0.15s ease',
                  zIndex: isSelected ? 50 : 10,
                }}
              >
                {/* Node Pill with Icon and Status Dot */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 7px 3px 5px',
                    borderRadius: 9999,
                    background: isPRC ? '#dc2626' : '#0284c7',
                    color: '#ffffff',
                    border: isSelected ? '2px solid #38bdf8' : '1.5px solid #ffffff',
                    boxShadow: isSelected
                      ? '0 0 14px rgba(56, 189, 248, 0.8)'
                      : '0 2px 8px rgba(0,0,0,0.4)',
                    fontSize: '11px',
                    fontWeight: 800,
                  }}
                >
                  {isPRC ? (
                    <span style={{ fontSize: '12px', lineHeight: 1 }}>✚</span>
                  ) : (
                    <span style={{ fontSize: '11px', lineHeight: 1 }}>H</span>
                  )}
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: statusBg,
                      border: '1px solid #ffffff',
                    }}
                  />
                </div>

                {/* Name Label */}
                <span
                  style={{
                    marginTop: 2,
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: 'rgba(11, 20, 42, 0.85)',
                    color: isSelected ? '#38bdf8' : '#e2e8f0',
                    fontSize: '9.5px',
                    fontWeight: isSelected ? 700 : 600,
                    whiteSpace: 'nowrap',
                    textShadow: '0 1px 2px #000',
                    border: '1px solid rgba(255,255,255,0.15)',
                    maxWidth: 140,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {fac.name.replace('Philippine Red Cross – ', 'PRC ').replace('Philippine General Hospital', 'PGH')}
                </span>
              </div>
            </Marker>
          );
        })}
      </Map>

      {/* Selected Facility Floating Card (Matches Screenshot 3) */}
      {selectedFacility && (
        <div className="radar-bottom-card">
          <div className="bottom-card-top">
            <span className="bottom-card-tag">
              {selectedFacility.category === 'PRC' ? 'PRC Priority Chapter' : 'Participating BSF'} ·{' '}
              {selectedFacility.distanceKm} km · {selectedFacility.travelTime}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 9999,
                fontSize: '0.72rem',
                fontWeight: 700,
                background:
                  getFacilityStatus(selectedFacility) === 'Available'
                    ? 'rgba(34, 197, 94, 0.2)'
                    : getFacilityStatus(selectedFacility) === 'Low'
                    ? 'rgba(245, 158, 11, 0.2)'
                    : 'rgba(239, 68, 68, 0.2)',
                color:
                  getFacilityStatus(selectedFacility) === 'Available'
                    ? '#4ade80'
                    : getFacilityStatus(selectedFacility) === 'Low'
                    ? '#fbbf24'
                    : '#f87171',
                border: `1px solid ${
                  getFacilityStatus(selectedFacility) === 'Available'
                    ? '#22c55e'
                    : getFacilityStatus(selectedFacility) === 'Low'
                    ? '#f59e0b'
                    : '#ef4444'
                }`,
              }}
            >
              {getFacilityStatus(selectedFacility) === 'Available'
                ? '✓ Available'
                : getFacilityStatus(selectedFacility) === 'Low'
                ? '▲ Low'
                : '✕ Unavailable'}
            </span>
          </div>

          <h4 className="bottom-card-title">{selectedFacility.name}</h4>

          <div className="bottom-card-meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <ClockIcon size={13} />
              <span>{selectedFacility.hours}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <PhoneIcon size={13} />
              <span>{selectedFacility.phone}</span>
            </div>
          </div>

          <div className="bottom-card-actions">
            <button
              className="btn-matrix-outline"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => onOpenMatrix(selectedFacility)}
            >
              Full Stock Matrix &gt;
            </button>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="radar-legend">
        <div className="legend-item">
          <span className="legend-dot available"></span>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot low"></span>
          <span>Low</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot unavailable"></span>
          <span>Unavailable</span>
        </div>
      </div>
    </div>
  );
}
