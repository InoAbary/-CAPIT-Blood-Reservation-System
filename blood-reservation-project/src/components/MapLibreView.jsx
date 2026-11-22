import React, { useState, useRef, useEffect } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ClockIcon, PhoneIcon, RefreshIcon, PinIcon } from './Icons';
import '../styles/PRCRadarMap.css';
import { getFacilityOpenStatus } from '../utils/facilityOpenStatus';
import { readLocatorPreferences, saveLocatorPreferences } from '../utils/locatorPreferences';

export default function MapLibreView({
  facilities,
  selectedFacility,
  onSelectFacility,
  selectedBloodTypes,
  selectedComponent,
  currentOrigin = { name: 'City of Manila', lat: 14.5888, lon: 120.9744 },
  currentTime,
  showHospitalLegend = false,
}) {
  const mapRef = useRef(null);

  const [viewState, setViewState] = useState(() => {
    const saved = readLocatorPreferences().mapView;
    return saved && Number.isFinite(saved.longitude) && Number.isFinite(saved.latitude) && Number.isFinite(saved.zoom)
      ? saved
      : { longitude: currentOrigin.lon || 120.9744, latitude: currentOrigin.lat || 14.5888, zoom: 11.8 };
  });

  const [mapTheme, setMapTheme] = useState(() => readLocatorPreferences().mapTheme === 'light' ? 'light' : 'dark'); // 'dark' (Dark Matter) or 'light' (Positron)
  const lastOriginRef = useRef(currentOrigin);

  const mapStyleUrl =
    mapTheme === 'dark'
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

  // Fly to new origin when currentOrigin changes
  useEffect(() => {
    const hasOriginChanged = currentOrigin?.lat !== lastOriginRef.current?.lat
      || currentOrigin?.lon !== lastOriginRef.current?.lon;
    if (hasOriginChanged && currentOrigin?.lat && currentOrigin?.lon) {
      lastOriginRef.current = currentOrigin;
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
    let compKey = 'prbc';
    if (selectedComponent?.toLowerCase().includes('whole')) compKey = 'whole';
    else if (selectedComponent?.toLowerCase().includes('platelet')) compKey = 'platelet';
    else if (selectedComponent?.toLowerCase().includes('plasma')) compKey = 'plasma';
    else if (selectedComponent?.toLowerCase().includes('cryo')) compKey = 'cryo';

    const statuses = selectedBloodTypes.map((bloodType) =>
      facility.matrix?.[bloodType]?.[compKey] || 'Unavailable'
    );
    if (statuses.includes('Available')) return 'Available';
    if (statuses.includes('Low')) return 'Low';
    return 'Unavailable';
  };

  const FacilityMarkerIcon = ({ type }) => {
    if (type === 'prc_chapter') {
      return <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" /></svg>;
    }
    if (type === 'bsf') {
      return <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path fill="currentColor" d="M12 2C10.3 5.3 5 10.9 5 15.6a7 7 0 0 0 14 0C19 10.9 13.7 5.3 12 2Z" /><path fill="#15803d" d="M10.5 10h3v2.5H16v3h-2.5V18h-3v-2.5H8v-3h2.5z" /></svg>;
    }
    const backgroundColor = type === 'hospital_bsf' ? '#eab308' : '#2563eb';
    return (
      <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
        <path fill="currentColor" d="M3 22V7h5V3h8v4h5v15h-7v-5h-4v5H3Zm7-15h2V5h2v2h2v2h-2v2h-2V9h-2V7Z" />
        <path fill={backgroundColor} d="M5.5 11h2v2h-2zm0 4h2v2h-2zm11-4h2v2h-2zm0 4h2v2h-2z" />
        {type === 'hospital_bsf' && <path d="M19 1.2s-3 3.3-3 5.4a3 3 0 0 0 6 0c0-2.1-3-5.4-3-5.4Z" fill="#b91c1c" stroke="#fff" strokeWidth=".8" />}
      </svg>
    );
  };

  const resetView = () => {
    const targetLon = currentOrigin.lon || 120.9744;
    const targetLat = currentOrigin.lat || 14.5888;
    setViewState({
      longitude: targetLon,
      latitude: targetLat,
      zoom: 11.8,
    });
    saveLocatorPreferences({ mapView: { longitude: targetLon, latitude: targetLat, zoom: 11.8 } });
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
          <strong>Center: {currentOrigin.name}</strong> · Showing {facilities.length} facilities
        </span>
      </div>

      {/* Map Theme & Reset Controls in Top Right */}
      <div className="radar-controls" style={{ top: '14px', right: '48px', flexDirection: 'row' }}>
        <button
          className="radar-control-btn"
          style={{ width: 'auto', padding: '0 10px', fontSize: '0.75rem', fontWeight: 600 }}
          title="Toggle Dark / Light Map Style"
          onClick={() => setMapTheme((current) => {
            const next = current === 'dark' ? 'light' : 'dark';
            saveLocatorPreferences({ mapTheme: next });
            return next;
          })}
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
        onMove={(evt) => {
          setViewState(evt.viewState);
          saveLocatorPreferences({ mapView: { longitude: evt.viewState.longitude, latitude: evt.viewState.latitude, zoom: evt.viewState.zoom } });
        }}
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
          const hasBloodInventory = fac.facilityType !== 'hospital';
          const status = getFacilityStatus(fac);
          const type = fac.facilityType || (fac.category === 'PRC' ? 'prc_chapter' : 'hospital_bsf');
          const facilityColors = {
            prc_chapter: '#dc2626',
            hospital: '#2563eb',
            hospital_bsf: '#eab308',
            bsf: '#16a34a',
          };
          const typeColor = facilityColors[type] || facilityColors.hospital_bsf;
          const markerTextColor = type === 'hospital_bsf' ? '#1f2937' : '#ffffff';

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
                onSelectFacility(fac, 'map');
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
                    gap: 3,
                    width: 30,
                    height: 30,
                    justifyContent: 'center',
                    borderRadius: 10,
                    background: typeColor,
                    color: markerTextColor,
                    border: isSelected ? '2px solid #38bdf8' : '1.5px solid #ffffff',
                    boxShadow: isSelected
                      ? '0 0 14px rgba(56, 189, 248, 0.8)'
                      : '0 2px 8px rgba(0,0,0,0.4)',
                    position: 'relative',
                  }}
                >
                  <FacilityMarkerIcon type={type} />
                  {hasBloodInventory && <span
                    title={`Availability: ${status}`}
                    aria-label={`Availability: ${status}`}
                    style={{
                      position: 'absolute',
                      top: -5,
                      right: -5,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: statusBg,
                      border: '2px solid #ffffff',
                      boxShadow: '0 1px 5px rgba(0,0,0,0.75)',
                      zIndex: 2,
                    }}
                  />}
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
              {selectedFacility.typeLabel || (selectedFacility.category === 'PRC' ? 'PRC Chapter' : 'Blood Service Facility')} ·{' '}
              {selectedFacility.distanceKm} km · {selectedFacility.travelTime}
            </span>
            <div className="bottom-card-statuses">
              <span className={`facility-open-status ${getFacilityOpenStatus(selectedFacility.operatingHours, currentTime).state}`}>
                {getFacilityOpenStatus(selectedFacility.operatingHours, currentTime).label}
              </span>
              {selectedFacility.facilityType !== 'hospital' && <span
                className="bottom-card-inventory-status"
                style={{
                  background:
                    getFacilityStatus(selectedFacility) === 'Available'
                      ? 'rgba(34, 197, 94, 0.14)'
                      : getFacilityStatus(selectedFacility) === 'Low'
                      ? 'rgba(245, 158, 11, 0.14)'
                      : 'rgba(127, 29, 29, 0.24)',
                  color:
                    getFacilityStatus(selectedFacility) === 'Available'
                      ? '#86efac'
                      : getFacilityStatus(selectedFacility) === 'Low'
                      ? '#fcd34d'
                      : '#fca5a5',
                  border: `1px solid ${
                    getFacilityStatus(selectedFacility) === 'Available'
                      ? 'rgba(74, 222, 128, 0.55)'
                      : getFacilityStatus(selectedFacility) === 'Low'
                      ? 'rgba(251, 191, 36, 0.55)'
                      : 'rgba(248, 113, 113, 0.55)'
                  }`,
                }}
              >
                {getFacilityStatus(selectedFacility) === 'Available'
                  ? '✓ Available'
                  : getFacilityStatus(selectedFacility) === 'Low'
                  ? '▲ Low'
                  : '✕ Unavailable'}
              </span>}
            </div>
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
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedFacility.lat},${selectedFacility.lon}`)}`}
              className="btn-matrix-outline"
              style={{ width: '100%', justifyContent: 'center' }}
              target="_blank"
              rel="noopener noreferrer"
            >
              <PinIcon size={14} />
              Open in Google Maps
            </a>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="radar-facility-legend" aria-label="Facility types">
        <div className="legend-item"><span className="legend-dot facility-prc"></span><span>PRC</span></div>
        {showHospitalLegend && <div className="legend-item"><span className="legend-dot facility-hospital"></span><span>Hospital</span></div>}
        <div className="legend-item"><span className="legend-dot facility-hospital-bsf"></span><span>Hospital BSF</span></div>
        <div className="legend-item"><span className="legend-dot facility-bsf"></span><span>BSF</span></div>
      </div>
      <div className="radar-legend" aria-label="Blood availability status">
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
