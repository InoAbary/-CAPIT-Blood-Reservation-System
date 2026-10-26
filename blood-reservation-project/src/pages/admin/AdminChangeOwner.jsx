import React, { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../lib/api.js';
import { useAuth } from '../../context/AuthContext';

function AdminChangeOwner() {
  const { staff, loading: authLoading } = useAuth();

  const [owner, setOwner] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdAccount, setCreatedAccount] = useState(null);

  const canTransferOwnership = staff?.role === 'admin';

  useEffect(() => {
    let isCurrent = true;

    return () => {
      isCurrent = false;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setOwner((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    setCreatedAccount(null);
    setSubmitting(true);

    try {
      const result = await api(`/api/admin/change-owner/${staff?._id}`, {
        method: 'POST',
        body: JSON.stringify({
          firstName: owner.firstName,
          lastName: owner.lastName,
          email: owner.email,
          currentPassword: owner.currentPassword,
        }),
      });

      setCreatedAccount({
        name: `${owner.firstName} ${owner.lastName}`.trim(),
        email: owner.email,
        staffId: result.staffId,
        generatedPassword: result.tempPassword,
      });
      setMessage(result.message || 'Ownership transferred.');
      setOwner((current) => ({ ...current, firstName: '', lastName: '', email: '', currentPassword: '' }));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <section className="content-card" id="change-owner">
        <h2 className="card-title">Change Admin Ownership</h2>
        <p className="card-subtitle">Loading your account…</p>
      </section>
    );
  }

  const submitDisabled =
    !canTransferOwnership ||
    submitting ||
    !owner.firstName ||
    !owner.email ||
    !owner.currentPassword;

  return (
    <section className="content-card" id="change-owner">
      <h2 className="card-title">Change Admin Ownership</h2>
      <p className="card-subtitle">
        Create a new System Admin account and transfer primary-admin ownership to it. You will lose admin privileges immediately.
      </p>

      {!canTransferOwnership && (
        <p className="form-message" role="status">
          Only the Primary System Admin can transfer ownership.
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
          <strong>Ownership transferred</strong>
          <div style={{ marginTop: '6px', fontSize: '13px' }}>
            {createdAccount.name} ({createdAccount.email})
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
            Share this password securely. It will only be shown here.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            name="firstName"
            required
            value={owner.firstName}
            onChange={handleChange}
            placeholder="e.g. Teresa"
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            name="lastName"
            value={owner.lastName}
            onChange={handleChange}
            placeholder="e.g. Mendoza"
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">New Owner Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={owner.email}
            onChange={handleChange}
            placeholder="name@institution.gov.ph"
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label htmlFor="currentPassword">Your Current Password</label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
            value={owner.currentPassword}
            onChange={handleChange}
            autoComplete="current-password"
            className="form-control"
          />
        </div>

        <div className="form-group full-width">
          <button type="submit" className="btn-primary" disabled={submitDisabled}>
            {submitting ? 'Transferring…' : 'Transfer Ownership'}
          </button>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            A unique temporary password is generated for the new owner.
          </div>
        </div>
      </form>
    </section>
  );
}

export default AdminChangeOwner;