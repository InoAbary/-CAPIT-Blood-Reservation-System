import React from 'react';
import { PinIcon } from './Icons';

export default function ChangeLocationModal({
  currentOrigin,
  facilities = [],
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
            {facilities.map((facility) => {
              const isCurrent = currentOrigin.name === facility.name;
              return (
                <button
                  key={facility.id}
                  type="button"
                  className={`city-option-btn ${isCurrent ? 'active' : ''}`}
                  onClick={() => {
                    onSelectCity({ name: facility.name, lat: facility.lat, lon: facility.lon });
                    onClose();
                  }}
                >
                  <div className="city-name-row">
                    <span className="city-pin" style={{ color: '#dc2626', display: 'flex', alignItems: 'center' }}>
                      <PinIcon size={16} />
                    </span>
                    <span className="city-name">{facility.name}</span>
                    {isCurrent && <span className="current-badge">Active Center</span>}
                  </div>
                  <span className="city-coords">
                    {facility.address}
                  </span>
                </button>
              );
            })}
            {facilities.length === 0 && (
              <p className="request-header-sub">No located facilities are available to use as a reference point yet.</p>
            )}
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
