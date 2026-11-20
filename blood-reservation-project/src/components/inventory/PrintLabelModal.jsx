import React, { useEffect } from 'react';
import '../../styles/PrintLabelModal.css';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

/**
 * Printable blood bag label.
 * Deliberately EXCLUDES the donor's name / personal identifiers.
 * Requires: unit, facility (optional), onClose.
 */
export default function PrintLabelModal({ unit, facility, onClose }) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!unit) return null;

  const handlePrint = () => window.print();

  const fields = [
    { label: 'Blood Unit ID', value: unit.unitID || unit._id || '—' },
    { label: 'Blood Type', value: unit.bloodType || '—' },
    { label: 'Component', value: unit.component || 'Whole Blood' },
    { label: 'Volume', value: unit.volume ? `${unit.volume} mL` : '—' },
    { label: 'Collection Date', value: formatDate(unit.collectionDate) },
    { label: 'Expiry Date', value: formatDate(unit.expiryDate) },
    { label: 'Storage Location', value: unit.storageLocation || '—' },
    { label: 'Status', value: (unit.status || '—').toUpperCase() },
  ];

  return (
    <div className="label-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="label-title">
      <div className="label-modal">
        <div className="label-modal__toolbar no-print">
          <h2 id="label-title">Blood Bag Label</h2>
          <div className="label-modal__actions">
            <button type="button" className="label-btn label-btn--ghost" onClick={onClose}>
              Close
            </button>
            <button type="button" className="label-btn label-btn--primary" onClick={handlePrint}>
              Print
            </button>
          </div>
        </div>

        <div className="label-print-area">
          <header className="label-header">
            <div>
              <p className="label-eyebrow">BLOOD COMPONENT LABEL</p>
              <h3 className="label-facility">{facility?.facilityName || 'Facility'}</h3>
              {facility?.address && <p className="label-address">{facility.address}</p>}
              {facility?.facilityID && (
                <p className="label-address">Facility ID: {facility.facilityID}</p>
              )}
            </div>
            <div className={`label-bloodtype label-bloodtype--${(unit.bloodType || '').replace('+', 'pos').replace('-', 'neg')}`}>
              {unit.bloodType || '?'}
            </div>
          </header>

          <div className="label-grid">
            {fields.map((f) => (
              <div className="label-field" key={f.label}>
                <span className="label-field__key">{f.label}</span>
                <span className="label-field__val">{f.value}</span>
              </div>
            ))}
          </div>

          <div className="label-barcode" aria-label="Unit barcode">
            {/* Pure CSS barcode look; replace with a real <Barcode/> lib if available */}
            <div className="label-barcode__bars" />
            <span className="label-barcode__text">{unit.unitID || unit._id}</span>
          </div>

          <footer className="label-footer">
            <p>
              <strong>No donor identifying information is printed on this label.</strong>
            </p>
            <p className="label-footer__small">
              Handle as biohazard. Transfuse only after cross-match per protocol.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}