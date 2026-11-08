import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/DonorProfile.css';

const SECTIONS = [
  { title: 'Personal information', fields: [
    ['firstName', 'First name', 'text', true, 'given-name'],
    ['middleName', 'Middle name', 'text', false, 'additional-name'],
    ['lastName', 'Last name', 'text', true, 'family-name'],
    ['birthDate', 'Birth date', 'date', true, 'bday'],
    ['civilStatus', 'Civil status', 'text', true],
    ['sex', 'Sex', ['Male', 'Female']],
    ['bloodType', 'Blood type', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], true]
  ] },
  { title: 'Telephone', fields: [
    ['telephoneNumber', 'Telephone number', 'tel']
  ] },
  { title: 'Address', fields: [
    ['houseNumber', 'House number', 'text', true],
    ['street', 'Street', 'text', true, 'address-line1'],
    ['barangay', 'Barangay', 'text', true],
    ['municipality', 'Town / Municipality', 'text', false, 'address-level2'],
    ['province', 'Province / City', 'text', false, 'address-level1'],
    ['zipCode', 'ZIP code', 'text', false, 'postal-code']
  ] },
  { title: 'Background and work', fields: [
    ['nationality', 'Nationality', 'text', true],
    ['religion', 'Religion', 'text'],
    ['education', 'Education', 'text', true],
    ['occupation', 'Occupation', 'text', false, 'organization-title'],
    ['officeAddress', 'Office address', 'text']
  ] },
  { title: 'Identification', description: 'Update the identification numbers provided with your registration. These fields are optional.', fields: [
    ['schoolID', 'School ID', 'text'],
    ['companyID', 'Company ID', 'text'],
    ['prcID', 'PRC ID', 'text'],
    ['driverID', "Driver’s license ID", 'text'],
    ['govID', 'SSS / GSIS / BIR ID', 'text'],
    ['otherID', 'Other ID', 'text']
  ] }
];

function profileValues(donor) {
  return Object.fromEntries(SECTIONS.flatMap(section => section.fields.map(([field]) => [
    field, field === 'birthDate' ? String(donor?.birthDate || '').slice(0, 10) : donor?.[field] || ''
  ])));
}

export default function DonorProfileForm() {
  const { donor, saveDonorProfile } = useAuth();
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const original = profileValues(donor);
  const value = { ...original, ...draft };
  const changes = Object.fromEntries(Object.entries(draft).filter(([field, text]) => text !== original[field]));
  const dirty = Object.keys(changes).length > 0;

  const reset = () => { setDraft({}); setErrors({}); setMessage(''); setSaved(false); };
  const change = (field, text) => {
    setDraft(current => ({ ...current, [field]: text }));
    setErrors(current => ({ ...current, [field]: undefined }));
    setMessage('');
    setSaved(false);
  };
  const save = async event => {
    event.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    setErrors({});
    setMessage('');
    setSaved(false);
    try {
      await saveDonorProfile(changes);
      setDraft({});
      setSaved(true);
    } catch (error) {
      setMessage(error.message || 'Could not save your profile. Please try again.');
      setErrors(error.fields || {});
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="donor-profile-card" aria-labelledby="profile-information-heading">
      <div className="donor-profile-card-heading">
        <div><h2 id="profile-information-heading">Your information</h2><p>Keep your details up to date. Fields marked * are required.</p></div>
        <p className="donor-profile-id">Donor ID: <strong>{donor?.donorID || '—'}</strong></p>
      </div>
      <form onSubmit={save}>
        <fieldset className="donor-profile-fields" disabled={saving}>
          <legend className="donor-profile-sr-only">Edit your profile information</legend>
          {SECTIONS.map(section => (
            <section className="donor-profile-section" key={section.title} aria-label={section.title}>
              <h3>{section.title}</h3>
              {section.description && <p>{section.description}</p>}
              <div className="donor-profile-grid">
                {section.fields.map(([field, label, type, required = false, autoComplete]) => {
                  const id = `profile-${field}`;
                  const shared = { id, name: field, value: value[field], required,
                    onChange: event => change(field, event.target.value),
                    'aria-invalid': errors[field] ? true : undefined,
                    'aria-describedby': errors[field] ? `${id}-error` : undefined };
                  return (
                    <div className="donor-profile-field" key={field}>
                      <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
                      {Array.isArray(type) ? (
                        <select {...shared}><option value="">Select {label.toLowerCase()}</option>{type.map(option => <option key={option} value={option}>{option}</option>)}</select>
                      ) : <input {...shared} type={type} maxLength={300} autoComplete={autoComplete} />}
                      {field === 'birthDate' && <small>Age on record: {donor?.age ?? '—'}. Calculated automatically when your birth date is saved.</small>}
                      {errors[field] && <small id={`${id}-error`} className="donor-profile-field-error">{errors[field]}</small>}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </fieldset>
        {message && <div className="donor-profile-error" role="alert">{message}{errors.form && <p>{errors.form}</p>}</div>}
        <div className="donor-profile-actions">
          <button className="donor-profile-save" type="submit" disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save information'}</button>
          <button className="donor-profile-reset" type="button" disabled={!dirty || saving} onClick={reset}>Discard changes</button>
          {dirty && <span className="donor-profile-unsaved">You have unsaved changes.</span>}
        </div>
        <p className="donor-profile-success" role="status">{saved ? 'Your information has been saved.' : ''}</p>
      </form>
    </section>
  );
}
