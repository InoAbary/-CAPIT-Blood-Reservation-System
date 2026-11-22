import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, getErrorMessage } from '../lib/api.js';

function ProvisionSupervisorPage() {
  const { admin } = useOutletContext();

  const [facilities, setFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [supervisor, setSupervisor] = useState({
    fullName: '',
    email: '',
    mobile: '',
    facilityId: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdAccount, setCreatedAccount] = useState(null);

  // Permissions come from the authenticated user, not localStorage.
  const canManageAccounts = admin?.canManageAccounts === true;

  useEffect(() => {
    let isCurrent = true;

    async function loadFacilities() {
      try {
        const result = await api('/api/admin/facilities');
        if (!isCurrent) return;
        const list = result.facilities || [];
        setFacilities(list);
        setSupervisor((current) => ({
          ...current,
          facilityId: list.some((f) => f._id === current.facilityId)
            ? current.facilityId
            : list[0]?._id || '',
        }));
      } catch (requestError) {
        if (isCurrent) setError(getErrorMessage(requestError));
      } finally {
        if (isCurrent) setLoadingFacilities(false);
      }
    }

    loadFacilities();

    return () => {
      isCurrent = false;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setSupervisor((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    setCreatedAccount(null);
    setSubmitting(true);

    try {
      const result = await api('/api/admin/supervisors', {
        method: 'POST',
        body: JSON.stringify({
          name: supervisor.fullName,
          email: supervisor.email,
          mobile: supervisor.mobile,
          facilityId: supervisor.facilityId,
        }),
      });

      setCreatedAccount({
        name: supervisor.fullName,
        email: supervisor.email,
        facilityName:
          facilities.find((f) => f._id === supervisor.facilityId)?.facilityName || '',
        staffId: result.staffId,
        generatedPassword: result.generatedPassword,
      });
      setMessage(result.message || 'Branch Admin account created.');
      setSupervisor((current) => ({ ...current, fullName: '', email: '', mobile: '' }));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  const submitDisabled =
    !canManageAccounts ||
    submitting ||
    loadingFacilities ||
    facilities.length === 0 ||
    !supervisor.facilityId;

  return (
    <section className="content-card" id="create-supervisor">
      <h2 className="card-title">Create Account</h2>
      <p className="card-subtitle">
        Create a Branch Admin account assigned to a facility, with a generated temporary password.
      </p>

      {!canManageAccounts && (
        <p className="form-message" role="status">
          The primary System Admin must grant your account permission before you can create accounts.
        </p>
      )}

      {message && <p className="form-message" role="status">{message}</p>}
      {error && <p className="form-message error-message" role="alert">{error}</p>}

      {createdAccount && (
        <div
          role="status"
          style={{
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '20px',
            color: '#166534',
          }}
        >
          <strong>Branch Admin account created</strong>
          <div style={{ marginTop: '6px', fontSize: '13px' }}>
            {createdAccount.name} ({createdAccount.email})
            {createdAccount.facilityName ? ` · ${createdAccount.facilityName}` : ''}
          </div>
          {createdAccount.staffId && (
            <div style={{ marginTop: '4px', fontSize: '12px' }}>
              Staff ID: {createdAccount.staffId}
            </div>
          )}
          <div style={{ marginTop: '8px', fontSize: '13px' }}>
            Temporary password: <code>{createdAccount.generatedPassword}</code>
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px' }}>
            Share this password securely. It will only be shown here for this creation.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label htmlFor="facilityId">Assigned Facility</label>
          <select
            id="facilityId"
            name="facilityId"
            value={supervisor.facilityId}
            onChange={handleChange}
            className="form-control"
            required
            disabled={loadingFacilities || facilities.length === 0}
          >
            {facilities.map((facility) => (
              <option key={facility._id} value={facility._id}>
                {facility.facilityName}
              </option>
            ))}
          </select>
          {!loadingFacilities && facilities.length === 0 && (
            <div role="alert" className="form-message error-message">
              No facilities are available. Add a facility before creating this account.
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="fullName">Account Name</label>
          <input
            id="fullName"
            name="fullName"
            required
            value={supervisor.fullName}
            onChange={handleChange}
            placeholder="e.g. Dr. Teresa Mendoza"
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Work Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={supervisor.email}
            onChange={handleChange}
            placeholder="name@institution.gov.ph"
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label htmlFor="mobile">Mobile / Contact Number</label>
          <input
            id="mobile"
            name="mobile"
            value={supervisor.mobile}
            onChange={handleChange}
            placeholder="+63 917..."
            className="form-control"
            type="tel"
            autoComplete="tel"
            required
          />
        </div>

        <div className="form-group full-width">
          <button type="submit" className="btn-primary" disabled={submitDisabled}>
            {submitting ? 'Creating account…' : 'Create Account'}
          </button>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            A unique Staff ID in SDYY#### format and temporary password are generated for each new account.
          </div>
        </div>
      </form>
    </section>
  );
}

export default ProvisionSupervisorPage;
