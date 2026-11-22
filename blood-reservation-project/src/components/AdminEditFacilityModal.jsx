import { useState } from 'react';
import '../styles/AdminModal.css';

const labels = {
  prc_chapter: 'Philippine Red Cross',
  bsf: 'Blood Service Facility',
  hospital: 'Hospital',
  hospital_bsf: 'Hospital Blood Service Facility',
};

export default function AdminEditFacilityModal({ facility, onClose, onSaved }) {
  const originalForm = {
    facilityName: facility.name || facility.facilityName || '',
    facilityType: facility.facilityType || 'hospital_bsf',
    address: facility.address || '',
    contactNumber: facility.phone || facility.contactNumber || '',
    hours: facility.hours || '',
    lat: facility.lat,
    lon: facility.lon,
  };
  const [form, setForm] = useState(() => originalForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const hasChanges = Object.keys(originalForm).some((key) => {
    if (key === 'lat' || key === 'lon') return Number(form[key]) !== Number(originalForm[key]);
    return String(form[key] ?? '').trim() !== String(originalForm[key] ?? '').trim();
  });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!hasChanges || saving) return;
    setSaving(true);
    setError('');
    try {
      const facilityType = form.facilityType;
      const response = await fetch(`/api/facilities/${facility.mongoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, category: facilityType === 'prc_chapter' ? 'PRC' : 'Hospital BSF', typeLabel: labels[facilityType] }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Could not update this facility.');
      onSaved(data.facility);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-container admin-edit-facility" onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-header">
          <div><div className="admin-badge-label">SUPERADMIN • FACILITY</div><h2 className="admin-modal-title">Edit facility</h2><p className="admin-modal-subtitle">Update this facility’s directory details.</p></div>
          <button type="button" className="btn-close-modal" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form id="admin-edit-facility-form" className="admin-form-section" onSubmit={submit}>
          <label className="admin-form-group">Facility name<input className="form-input" required value={form.facilityName} onChange={(e) => update('facilityName', e.target.value)} /></label>
          <label className="admin-form-group">Facility type<select className="form-select" value={form.facilityType} onChange={(e) => update('facilityType', e.target.value)}><option value="prc_chapter">PRC Chapter</option><option value="bsf">Blood Service Facility</option><option value="hospital">Hospital</option><option value="hospital_bsf">Hospital BSF</option></select></label>
          <label className="admin-form-group">Address<input className="form-input" required value={form.address} onChange={(e) => update('address', e.target.value)} /></label>
          <div className="admin-form-row">
            <label className="admin-form-group flex-1">Contact number<input className="form-input" value={form.contactNumber} onChange={(e) => update('contactNumber', e.target.value)} /></label>
            <label className="admin-form-group flex-1">Operating hours<input className="form-input" value={form.hours} onChange={(e) => update('hours', e.target.value)} /></label>
          </div>
          <div className="admin-form-row">
            <label className="admin-form-group flex-1">Latitude<input className="form-input" type="number" step="any" required value={form.lat} onChange={(e) => update('lat', Number(e.target.value))} /></label>
            <label className="admin-form-group flex-1">Longitude<input className="form-input" type="number" step="any" required value={form.lon} onChange={(e) => update('lon', Number(e.target.value))} /></label>
          </div>
          {error && <p role="alert" className="admin-facility-error">{error}</p>}
        </form>
        <div className="admin-facility-actions">
          <button type="button" className="btn-close-modal" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            type="submit"
            form="admin-edit-facility-form"
            className="btn-admin-add-branch-hero"
            disabled={saving || !hasChanges}
            title={!hasChanges ? 'Make a change to enable saving.' : undefined}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
