import React from 'react';
import { ClockIcon, PhoneIcon, PinIcon } from './Icons';
import { getFacilityOpenStatus } from '../utils/facilityOpenStatus';

export default function FacilityCard({
  facility,
  selectedBloodTypes,
  selectedComponent,
  isSelected,
  onSelect,
  isAdmin = false,
  onEdit,
  onDelete,
  currentTime,
}) {
  const selectedTypes = Array.isArray(selectedBloodTypes) ? selectedBloodTypes : [selectedBloodTypes];
  const selectedTypesLabel = selectedTypes.length <= 2
    ? selectedTypes.join(', ')
    : `${selectedTypes.length} types`;

  let currentCompKey = 'prbc';
  if (selectedComponent?.toLowerCase().includes('whole')) currentCompKey = 'whole';
  else if (selectedComponent?.toLowerCase().includes('platelet')) currentCompKey = 'platelet';
  else if (selectedComponent?.toLowerCase().includes('plasma')) currentCompKey = 'plasma';
  else if (selectedComponent?.toLowerCase().includes('cryo')) currentCompKey = 'cryo';

  const statusesForComponent = (componentKey) => selectedTypes.map((bloodType) => ({
    bloodType,
    status: facility.matrix?.[bloodType]?.[componentKey] || 'Unavailable',
  }));
  const aggregateStatus = (componentKey) => {
    const statuses = statusesForComponent(componentKey).map(({ status }) => status);
    if (statuses.includes('Available')) return 'Available';
    if (statuses.includes('Low')) return 'Low';
    return 'Unavailable';
  };
  const componentSummary = (componentKey) => {
    const rows = statusesForComponent(componentKey);
    const status = aggregateStatus(componentKey);
    if (status === 'Unavailable') return { status, label: '✕ Out' };
    const matchingTypes = rows.filter((row) => row.status === status).map((row) => row.bloodType);
    const matchedLabel = matchingTypes.length <= 2 ? matchingTypes.join(', ') : `${matchingTypes.length} types`;
    return {
      status,
      label: `${status === 'Available' ? '● Available' : '▲ Low'}${selectedTypes.length > 1 ? ` · ${matchedLabel}` : ''}`,
      title: `${status} for ${matchingTypes.join(', ')}`,
    };
  };

  const mainStatus = aggregateStatus(currentCompKey);

  const hasBloodInventory = facility.facilityType !== 'hospital';
  const facilityTypeColor = {
    prc_chapter: '#dc2626',
    hospital: '#2563eb',
    hospital_bsf: '#a16207',
    bsf: '#15803d',
  }[facility.facilityType] || (facility.category === 'PRC' ? '#dc2626' : '#2563eb');
  const isAvailable = mainStatus === 'Available';
  const isLow = mainStatus === 'Low';
  const openStatus = getFacilityOpenStatus(facility.operatingHours, currentTime);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${facility.lat},${facility.lon}`)}`;

  return (
    <div
      id={`facility-card-${facility.id}`}
      className={`facility-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(facility)}
    >
      {/* Top Header Row */}
      <div className="card-top-row">
        <span className="card-category-meta">
          <strong style={{ color: facilityTypeColor }}>
            {facility.typeLabel}
          </strong>{' '}
          · {facility.distanceKm} km away · {facility.travelTime}
        </span>

        <div className="card-status-badges">
          <span className={`facility-open-status ${openStatus.state}`} aria-label={`Facility status: ${openStatus.label}`}>
            {openStatus.label}
          </span>
          {hasBloodInventory && <>
            <span className="card-bt-badge" title={`Selected blood types: ${selectedTypes.join(', ')}`}>
              {selectedTypesLabel} · {selectedComponent?.includes('Packed') ? 'Packed' : selectedComponent?.split(' ')[0]}
            </span>
            <span
              className={`card-status-pill ${
                isAvailable ? 'available' : isLow ? 'low' : 'unavailable'
              }`}
            >
              {isAvailable ? '✓ Available' : isLow ? '▲ Low' : '✕ Out of Stock'}
            </span>
          </>}
        </div>
      </div>

      {/* Facility Name & Address */}
      <h3 className="card-facility-name">{facility.name}</h3>
      <p className="card-facility-address">{facility.address}</p>

      {hasBloodInventory && <>
        {/* Stock Summary Header */}
        <div className="card-stock-header">
          <span className="stock-header-title">
            Stock Summary for <strong>{selectedTypesLabel}</strong>:
          </span>
        </div>

        {/* Component Summary Chips */}
        <div className="card-components-grid">
        <div className="comp-chip">
          <span className="comp-name">PRBC</span>
          <span className={`comp-status ${componentSummary('prbc').status.toLowerCase()}`} title={componentSummary('prbc').title}>
            {componentSummary('prbc').label}
          </span>
        </div>
        <div className="comp-chip">
          <span className="comp-name">Whole</span>
          <span className={`comp-status ${componentSummary('whole').status.toLowerCase()}`} title={componentSummary('whole').title}>
            {componentSummary('whole').label}
          </span>
        </div>
        <div className="comp-chip">
          <span className="comp-name">Platelet</span>
          <span className={`comp-status ${componentSummary('platelet').status.toLowerCase()}`} title={componentSummary('platelet').title}>
            {componentSummary('platelet').label}
          </span>
        </div>
        <div className="comp-chip">
          <span className="comp-name">Plasma</span>
          <span className={`comp-status ${componentSummary('plasma').status.toLowerCase()}`} title={componentSummary('plasma').title}>
            {componentSummary('plasma').label}
          </span>
        </div>
        </div>
      </>}

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
          {isAdmin && <>
            <button type="button" className="facility-admin-action" onClick={(event) => { event.stopPropagation(); onEdit?.(facility); }}>Edit</button>
            <button type="button" className="facility-admin-action danger" onClick={(event) => { event.stopPropagation(); onDelete?.(facility); }}>Delete</button>
          </>}
          <a
            href={googleMapsUrl}
            className="btn-card-details"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${facility.name} in Google Maps`}
            onClick={(event) => event.stopPropagation()}
          >
            <PinIcon size={14} />
            Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}
