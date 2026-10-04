import React from 'react';

export default function ComprehensiveMatrixModal({
  facility,
  onClose,
}) {
  if (!facility) return null;

  const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  const getStatusBadge = (status) => {
    if (status === 'Available') {
      return (
        <span className="matrix-badge available">
          ✓ Available
        </span>
      );
    }
    if (status === 'Low') {
      return (
        <span className="matrix-badge low">
          ▲ Low Buffer
        </span>
      );
    }
    return (
      <span className="matrix-badge out">
        ✕ Out of Stock
      </span>
    );
  };

  const openGoogleMaps = () => {
    const query = encodeURIComponent(`${facility.name}, ${facility.address}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content matrix-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Dark Modal Header */}
        <div className="matrix-modal-header">
          <div className="modal-header-top">
            <div className="modal-header-tags">
              <span className="modal-branch-tag">
                {facility.category === 'PRC'
                  ? 'Philippine Red Cross Priority Branch'
                  : 'Accredited Hospital Blood Service Facility'}
              </span>
              <span className="modal-subtag">
                ID: {facility.id} · <span className="sync-live-dot"></span> BBIS Live Sync Active
              </span>
            </div>
            <button className="modal-close-btn" onClick={onClose} title="Close">
              ✕
            </button>
          </div>

          <h2 className="modal-facility-title">{facility.name}</h2>
          <p className="modal-facility-sub">{facility.address}</p>
        </div>

        {/* Modal Body */}
        <div className="matrix-modal-body">
          {/* Quote Banner */}
          <div className="matrix-quote-banner">
            <span className="quote-mark">“</span>
            <p className="quote-text">{facility.quote}</p>
          </div>

          {/* Section Info */}
          <div className="matrix-section-header">
            <h3>Comprehensive Blood Availability Matrix</h3>
            <p>
              Reflects simplified public status (Available, Low, Unavailable) per Blood Bank privacy protocol.
            </p>
          </div>

          {/* Availability Table */}
          <div className="matrix-table-wrapper">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th>Blood Type</th>
                  <th>Whole Blood</th>
                  <th>Packed RBC</th>
                  <th>Platelet Conc.</th>
                  <th>Fresh Frozen Plasma</th>
                  <th>Cryoprecipitate</th>
                </tr>
              </thead>
              <tbody>
                {bloodTypes.map((bt) => {
                  const m = facility.matrix?.[bt] || {
                    whole: 'Available',
                    prbc: 'Available',
                    platelet: 'Low',
                    plasma: 'Available',
                    cryo: 'Low',
                  };
                  return (
                    <tr key={bt}>
                      <td className="matrix-bt-cell">
                        <span className="matrix-bt-label">{bt}</span>
                      </td>
                      <td>{getStatusBadge(m.whole)}</td>
                      <td>{getStatusBadge(m.prbc)}</td>
                      <td>{getStatusBadge(m.platelet)}</td>
                      <td>{getStatusBadge(m.plasma)}</td>
                      <td>{getStatusBadge(m.cryo)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="matrix-modal-footer">
          <button
            type="button"
            className="btn-directions-link"
            onClick={openGoogleMaps}
          >
            Open in Google Maps Directions &gt;
          </button>

          <div className="footer-action-group">
            <button type="button" className="btn-modal-cancel" onClick={onClose}>
              Close Matrix
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
