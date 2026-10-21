import React from 'react';
import { ClockIcon, PhoneIcon } from './Icons';

export default function FacilityCard({
  facility,
  selectedBloodType,
  selectedComponent,
  isSelected,
  onSelect,
  onOpenDetails,
}) {
  // Determine status for selected blood type & component
  const bt = selectedBloodType === 'ALL' ? 'O+' : selectedBloodType;
  const matrixForBT = facility.matrix?.[bt] || {};

  let currentCompKey = 'prbc';
  if (selectedComponent?.toLowerCase().includes('whole')) currentCompKey = 'whole';
  else if (selectedComponent?.toLowerCase().includes('platelet')) currentCompKey = 'platelet';
  else if (selectedComponent?.toLowerCase().includes('plasma')) currentCompKey = 'plasma';
  else if (selectedComponent?.toLowerCase().includes('cryo')) currentCompKey = 'cryo';

  const mainStatus = matrixForBT[currentCompKey] || 'Available';

  const isAvailable = mainStatus === 'Available';
  const isLow = mainStatus === 'Low';

  return (
    <div
      className={`facility-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(facility)}
    >
      {/* Top Header Row */}
      <div className="card-top-row">
        <span className="card-category-meta">
          <strong style={{ color: facility.category === 'PRC' ? '#dc2626' : '#0284c7' }}>
            {facility.typeLabel}
          </strong>{' '}
          · {facility.distanceKm} km away · {facility.travelTime}
        </span>

        <div className="card-status-badges">
          <span className="card-bt-badge">
            {bt} · {selectedComponent?.includes('Packed') ? 'Packed' : selectedComponent?.split(' ')[0]}
          </span>
          <span
            className={`card-status-pill ${
              isAvailable ? 'available' : isLow ? 'low' : 'unavailable'
            }`}
          >
            {isAvailable ? '✓ Available' : isLow ? '▲ Low' : '✕ Out of Stock'}
          </span>
        </div>
      </div>

      {/* Facility Name & Address */}
      <h3 className="card-facility-name">{facility.name}</h3>
      <p className="card-facility-address">{facility.address}</p>

      {/* Stock Summary Header */}
      <div className="card-stock-header">
        <span className="stock-header-title">
          Stock Summary for Blood Type <strong>{bt}</strong>:
        </span>
        <span className="stock-sync-time">
          BBIS Synced: {facility.bbisSyncedMins} minutes ago
        </span>
      </div>

      {/* 5 Component Summary Chips */}
      <div className="card-components-grid">
        <div className="comp-chip">
          <span className="comp-name">PRBC</span>
          <span className={`comp-status ${matrixForBT.prbc?.toLowerCase()}`}>
            {matrixForBT.prbc === 'Available' ? '● Available' : matrixForBT.prbc === 'Low' ? '▲ Low' : '✕ Out'}
          </span>
        </div>
        <div className="comp-chip">
          <span className="comp-name">Whole</span>
          <span className={`comp-status ${matrixForBT.whole?.toLowerCase()}`}>
            {matrixForBT.whole === 'Available' ? '● Available' : matrixForBT.whole === 'Low' ? '▲ Low' : '✕ Out'}
          </span>
        </div>
        <div className="comp-chip">
          <span className="comp-name">Platelet</span>
          <span className={`comp-status ${matrixForBT.platelet?.toLowerCase()}`}>
            {matrixForBT.platelet === 'Available' ? '● Available' : matrixForBT.platelet === 'Low' ? '▲ Low' : '✕ Out'}
          </span>
        </div>
        <div className="comp-chip">
          <span className="comp-name">Plasma</span>
          <span className={`comp-status ${matrixForBT.plasma?.toLowerCase()}`}>
            {matrixForBT.plasma === 'Available' ? '● Available' : matrixForBT.plasma === 'Low' ? '▲ Low' : '✕ Out'}
          </span>
        </div>
        <div className="comp-chip">
          <span className="comp-name">Cryo</span>
          <span className={`comp-status ${matrixForBT.cryo?.toLowerCase()}`}>
            {matrixForBT.cryo === 'Available' ? '● Available' : matrixForBT.cryo === 'Low' ? '▲ Low' : '✕ Out'}
          </span>
        </div>
      </div>

      {/* Info & Actions Footer */}
      <div className="card-footer-row">
        <div className="card-info-meta">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <ClockIcon size={14} />
            <span>{facility.hours}</span>
          </span>
          <a
            href={`tel:${facility.phone.replace(/[^0-9]/g, '')}`}
            className="phone-link"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
            onClick={(e) => e.stopPropagation()}
          >
            <PhoneIcon size={14} />
            <span>{facility.phone}</span>
          </a>
        </div>

        <div className="card-action-buttons">
          <button
            type="button"
            className="btn-card-details"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(facility);
            }}
          >
            Details &gt;
          </button>
        </div>
      </div>
    </div>
  );
}
