import { useState } from 'react';

const FIELDS = [
  ['firstName', 'First name', 'text', true],
  ['middleName', 'Middle name', 'text'],
  ['lastName', 'Last name', 'text', true],
  ['birthDate', 'Birth date', 'date', true],
  ['civilStatus', 'Civil status', 'text', true],
  ['sex', 'Sex', ['Male', 'Female']],
  ['bloodType', 'Blood type', ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'], true],
  ['houseNumber', 'House number', 'text', true],
  ['street', 'Street', 'text', true],
  ['barangay', 'Barangay', 'text', true],
  ['municipality', 'Municipality', 'text'],
  ['province', 'Province', 'text'],
  ['zipCode', 'ZIP code', 'text'],
  ['nationality', 'Nationality', 'text', true],
  ['education', 'Education', 'text', true],
  ['occupation', 'Occupation', 'text'],
  ['email', 'Email', 'email'],
  ['mobileNumber', 'Mobile number', 'tel'],
];

export default function StaffAddDonor({ onCreated, onCancel }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setErrors({});
    try {
      const response = await fetch('/api/donations/donors', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) {
        setErrors(result.errors || {});
        throw new Error(result.error || 'Could not add donor.');
      }
      onCreated(result.donor);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h3>Add donor</h3>
      <p className="card-subtitle">Create a donor record for someone who has not registered. Fields marked * are required.</p>
      {error && <p className="form-message error-message" role="alert">{error}</p>}
      <form className="donation-form sd-add-donor" onSubmit={submit}>
        {FIELDS.map(([field, label, type, required]) => (
          <label key={field} htmlFor={`new-donor-${field}`}>
            {label}{required ? ' *' : ''}
            {Array.isArray(type) ? (
              <select id={`new-donor-${field}`} required={required} disabled={saving}
                value={values[field] || ''} aria-invalid={!!errors[field]}
                onChange={event => setValues(current => ({ ...current, [field]: event.target.value }))}>
                <option value="">Select…</option>
                {type.map(option => <option key={option}>{option}</option>)}
              </select>
            ) : (
              <input id={`new-donor-${field}`} type={type} required={required}
                disabled={saving} maxLength={300} value={values[field] || ''}
                aria-invalid={!!errors[field]}
                onChange={event => setValues(current => ({ ...current, [field]: event.target.value }))} />
            )}
            {errors[field] && <span role="alert">{errors[field]}</span>}
          </label>
        ))}
        <div className="modal-actions">
          <button type="button" className="btn-secondary" disabled={saving} onClick={onCancel}>Back to donation</button>
          <button type="submit" className="btn-action" disabled={saving}>{saving ? 'Saving…' : 'Save donor'}</button>
        </div>
      </form>
    </div>
  );
}
