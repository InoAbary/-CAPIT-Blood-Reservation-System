import React from 'react';
import { CITIES } from '../data/prcFacilitiesData';
import { PinIcon } from './Icons';

export default function ChangeLocationModal({
  currentOrigin,
  onSelectCity,
  onClose,
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content location-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="request-modal-header">
          <div>
            <span className="request-module-tag">Geographical Reference Origin</span>
            <h3>Change Location Reference</h3>
            <p className="request-header-sub">
              Select or set the origin point for proximity calculation & radar circles.
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="location-modal-body">
          <div className="city-options-list">
            {CITIES.map((city) => {
              const isCurrent = currentOrigin.name === city.name;
              return (
                <button
                  key={city.name}
                  type="button"
                  className={`city-option-btn ${isCurrent ? 'active' : ''}`}
                  onClick={() => {
                    onSelectCity(city);
                    onClose();
                  }}
                >
                  <div className="city-name-row">
                    <span className="city-pin" style={{ color: '#dc2626', display: 'flex', alignItems: 'center' }}>
                      <PinIcon size={16} />
                    </span>
                    <span className="city-name">{city.name}</span>
                    {isCurrent && <span className="current-badge">Active Center</span>}
                  </div>
                  <span className="city-coords">
                    {city.lat.toFixed(4)}° N, {city.lon.toFixed(4)}° E · Metro Manila
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="matrix-modal-footer">
          <button type="button" className="btn-modal-cancel" onClick={onClose} style={{ marginLeft: 'auto' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
