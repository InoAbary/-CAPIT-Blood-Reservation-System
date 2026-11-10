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
  ['religion', 'Religion', 'text'],
  ['officeAddress', 'Office address', 'text'],
  ['telephoneNumber', 'Telephone number', 'tel'],
  ['schoolID', 'School ID', 'text'],
  ['companyID', 'Company ID', 'text'],
  ['prcID', 'PRC ID', 'text'],
  ['driverID', 'Driver’s license ID', 'text'],
  ['govID', 'Government ID', 'text'],
  ['otherID', 'Other ID', 'text'],
  ['email', 'Email', 'email'],
  ['mobileNumber', 'Mobile number', 'tel'],
];

export default function StaffAddDonor({ onCreated, onCancel, endpoint = '/api/donations/donors', cancelLabel = 'Back to donation', initialDonor = null, editing = false }) {
  const [values, setValues] = useState(() => Object.fromEntries(FIELDS.map(([field]) => [
    field, field === 'birthDate' ? String(initialDonor?.[field] || '').slice(0, 10) : initialDonor?.[field] || '',
  ])));
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
      const response = await fetch(endpoint, {
        method: editing ? 'PATCH' : 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) {
        setErrors(result.errors || {});
        throw new Error(result.error || (editing ? 'Could not update donor.' : 'Could not add donor.'));
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
      <h3>{editing ? 'Edit donor' : 'Add donor'}</h3>
      {editing && <p>Donor ID: <strong>{initialDonor.donorID}</strong></p>}
      <p className="card-subtitle">{editing ? 'Update the donor’s details.' : 'Create a donor record for someone who has not registered.'} Fields marked * are required.</p>
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
          <button type="button" className="btn-secondary" disabled={saving} onClick={onCancel}>{cancelLabel}</button>
          <button type="submit" className="btn-action" disabled={saving}>{saving ? 'Saving…' : 'Save donor'}</button>
        </div>
      </form>
    </div>
  );
}
