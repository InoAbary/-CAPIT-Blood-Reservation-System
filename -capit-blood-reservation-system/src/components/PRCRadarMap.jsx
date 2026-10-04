import React, { useState, useRef } from 'react';
import './PRCRadarMap.css';

export default function PRCRadarMap({
  facilities,
  selectedFacility,
  onSelectFacility,
  onOpenMatrix,
  onRequestUnits,
  selectedBloodType,
  selectedComponent,
  currentOrigin = { name: 'City of Manila', lat: 14.5888, lon: 120.9744 },
}) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Canvas bounds & origin
  const width = 640;
  const height = 580;
  const centerX = width / 2;
  const centerY = height / 2;

  // Scale factor for coordinates relative to City of Manila
  // 1 degree lat ≈ 111km, 1 degree lon ≈ 108km
  const kmToPixels = 12 * zoomLevel;

  const handleMouseDown = (e) => {
    if (e.target.closest('.facility-marker') || e.target.closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Convert facility lat/lon to map SVG coordinates
  const projectCoords = (lat, lon) => {
    const dLat = lat - currentOrigin.lat;
    const dLon = lon - currentOrigin.lon;
    // North is negative Y in SVG, East is positive X
    const kmX = dLon * 108;
    const kmY = dLat * 111;

    return {
      x: centerX + panOffset.x + kmX * kmToPixels,
      y: centerY + panOffset.y - kmY * kmToPixels,
    };
  };

  // Helper to determine status for selected blood type & component
  const getFacilityStatus = (facility) => {
    const bt = selectedBloodType === 'ALL' ? 'O+' : selectedBloodType;
    let compKey = 'prbc';
    if (selectedComponent?.toLowerCase().includes('whole')) compKey = 'whole';
    else if (selectedComponent?.toLowerCase().includes('platelet')) compKey = 'platelet';
    else if (selectedComponent?.toLowerCase().includes('plasma')) compKey = 'plasma';
    else if (selectedComponent?.toLowerCase().includes('cryo')) compKey = 'cryo';

    return facility.matrix?.[bt]?.[compKey] || 'Available';
  };

  return (
    <div
      className="radar-map-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Header Overlay */}
      <div className="radar-header-overlay">
        <span className="radar-center-dot"></span>
        <span>
          <strong>Center: {currentOrigin.name}</strong> · Showing {facilities.length} BSFs
        </span>
      </div>

      {/* Map Controls */}
      <div className="radar-controls">
        <button
          className="radar-control-btn"
          title="Zoom In"
          onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.5))}
        >
          ➕
        </button>
        <button
          className="radar-control-btn"
          title="Zoom Out"
          onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.6))}
        >
          ➖
        </button>
        <button className="radar-control-btn" title="Reset View" onClick={resetView}>
          🔄
        </button>
      </div>

      {/* Radar SVG Surface */}
      <svg className="radar-svg" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <radialGradient id="radarSweepGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Dynamic Center Point from Pan Offset */}
        <g transform={`translate(${centerX + panOffset.x}, ${centerY + panOffset.y})`}>
          {/* Concentric Distance Rings */}
          <circle r={5 * kmToPixels} className="radar-ring" />
          <text x={5 * kmToPixels + 4} y="-6" className="radar-distance-label">
            5 km
          </text>

          <circle r={15 * kmToPixels} className="radar-ring solid" />
          <text x={15 * kmToPixels + 4} y="-6" className="radar-distance-label">
            15 km
          </text>

          <circle r={30 * kmToPixels} className="radar-ring" />
          <text x={30 * kmToPixels + 4} y="-6" className="radar-distance-label">
            30 km
          </text>

          {/* Crosshair Axes */}
          <line x1={-32 * kmToPixels} y1="0" x2={32 * kmToPixels} y2="0" className="radar-axis" />
          <line x1="0" y1={-32 * kmToPixels} x2="0" y2={32 * kmToPixels} className="radar-axis" />

          {/* Center Location Pin */}
          <circle r="14" className="radar-origin-glow" />
          <circle r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
        </g>

        {/* Facilities Markers */}
        {facilities.map((fac) => {
          const pt = projectCoords(fac.lat, fac.lon);
          const isSelected = selectedFacility?.id === fac.id;
          const status = getFacilityStatus(fac);
          const isPRC = fac.category === 'PRC';

          let statusColor = '#22c55e'; // Green for Available
          if (status === 'Low') statusColor = '#f59e0b';
          if (status === 'Unavailable' || status === 'Out of Stock') statusColor = '#ef4444';

          return (
            <g
              key={fac.id}
              className="facility-marker"
              transform={`translate(${pt.x}, ${pt.y})`}
              onClick={() => onSelectFacility(fac)}
            >
              {/* Selected highlight pulse */}
              {isSelected && (
                <circle
                  r="20"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeDasharray="4 2"
                  opacity="0.8"
                />
              )}

              {/* Status aura */}
              <circle r="13" fill={statusColor} opacity="0.25" />

              {/* Node Icon */}
              {isPRC ? (
                // Red Cross badge
                <g>
                  <circle r="10" fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" />
                  <path
                    d="M-4 -1.2 H4 V1.2 H-4 Z M-1.2 -4 H1.2 V4 H-1.2 Z"
                    fill="#ffffff"
                  />
                </g>
              ) : (
                // Hospital BSF blue badge
                <g>
                  <circle r="10" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="800"
                    fontFamily="system-ui"
                  >
                    H
                  </text>
                </g>
              )}

              {/* Short Label */}
              <text
                x="14"
                y="4"
                className={`marker-label ${isSelected ? 'selected' : ''}`}
              >
                {fac.name.replace('Philippine Red Cross – ', 'PRC ').replace('Philippine General Hospital', 'PGH')}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Selected Facility Floating Card (Screenshot 3) */}
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
            <div>
              🕐 {selectedFacility.hours}
            </div>
            <div>
              📞 {selectedFacility.phone}
            </div>
          </div>

          <div className="bottom-card-actions">
            <button
              className="btn-matrix-outline"
              onClick={() => onOpenMatrix(selectedFacility)}
            >
              Full Stock Matrix &gt;
            </button>
            <button
              className="btn-request-solid"
              onClick={() => onRequestUnits(selectedFacility)}
            >
              <span>🩸</span> Request Units
            </button>
          </div>
        </div>
      )}

      {/* Radar Legend */}
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
