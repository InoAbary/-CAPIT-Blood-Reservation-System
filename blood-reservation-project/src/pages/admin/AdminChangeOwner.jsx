import React, { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api, getErrorMessage } from '../lib/api.js';

export default function AdminChangeOwner() {
  const { admin } = useOutletContext();
  const isPrimaryAdmin = admin?.isPrimaryAdmin === true;
  const [form, setForm] = useState({ name: '', email: '', mobile: '', canManageAccounts: false });
  const [admins, setAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [transfer, setTransfer] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [createdAccount, setCreatedAccount] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadAdmins = useCallback(async () => {
    if (!isPrimaryAdmin) {
      setLoading(false);
      return;
    }
    try {
      const [userResult, transferResult] = await Promise.all([
        api('/api/admin/users'),
        api('/api/admin/primary-admin-transfer'),
      ]);
      const list = (userResult.users || []).filter((user) => user.role === 'System Admin' && !user.isPrimaryAdmin && user.status === 'Active');
      setAdmins(list);
      setSelectedAdminId((current) => list.some((user) => user.id === current) ? current : list[0]?.id || '');
      setTransfer(transferResult?.direction ? transferResult : null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [isPrimaryAdmin]);

  useEffect(() => { loadAdmins(); }, [loadAdmins]);

  function updateForm(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  async function createSystemAdmin(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setCreatedAccount(null);
    setSubmitting(true);
    try {
      const result = await api('/api/admin/system-admins', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setCreatedAccount({ name: form.name.trim(), email: form.email.trim(), staffId: result.staffId, password: result.generatedPassword });
      setMessage(result.message || 'System Admin account created.');
      setForm({ name: '', email: '', mobile: '', canManageAccounts: false });
      await loadAdmins();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function startTransfer(event) {
    event.preventDefault();
    if (!selectedAdminId) return;
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const result = await api(`/api/admin/primary-admin-transfer/target/${encodeURIComponent(selectedAdminId)}`, {
        method: 'POST',
        body: JSON.stringify({ currentPassword, confirmationEmail }),
      });
      setMessage(result.message || 'Ownership handoff started.');
      setCurrentPassword('');
      setConfirmationEmail('');
      await loadAdmins();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelTransfer() {
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const result = await api('/api/admin/primary-admin-transfer', { method: 'DELETE' });
      setMessage(result.message || 'Ownership handoff cancelled.');
      await loadAdmins();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="content-card" id="create-system-admin">
        <h2 className="card-title">Create System Admin</h2>
        <p className="card-subtitle">Create another system administrator and choose whether they can manage user accounts.</p>
        {!isPrimaryAdmin && <p className="form-message" role="status">Only the Primary admin can create System Admin accounts or grant account-management access.</p>}
        {message && <p className="form-message" role="status">{message}</p>}
        {error && <p className="form-message error-message" role="alert">{error}</p>}
        {createdAccount && (
          <div className="system-admin-created" role="status">
            <strong>System Admin account created</strong>
            <span>{createdAccount.name} · {createdAccount.email}</span>
            <span>Staff ID: {createdAccount.staffId}</span>
            <span>Temporary password: <code>{createdAccount.password}</code></span>
            <small>Share this password securely. It is shown here only once.</small>
          </div>
        )}
        <form className="form-grid system-admin-form" onSubmit={createSystemAdmin}>
          <div className="form-group">
            <label htmlFor="system-admin-name">Account name</label>
            <input id="system-admin-name" name="name" className="form-control" value={form.name} onChange={updateForm} placeholder="e.g. Maria Santos" required disabled={!isPrimaryAdmin} />
          </div>
          <div className="form-group">
            <label htmlFor="system-admin-email">Work email address</label>
            <input id="system-admin-email" name="email" type="email" className="form-control" value={form.email} onChange={updateForm} placeholder="name@example.org" required disabled={!isPrimaryAdmin} />
          </div>
          <div className="form-group full-width">
            <label htmlFor="system-admin-mobile">Mobile / contact number</label>
            <input id="system-admin-mobile" name="mobile" type="tel" className="form-control" value={form.mobile} onChange={updateForm} autoComplete="tel" placeholder="e.g. +63 917 123 4567" required disabled={!isPrimaryAdmin} />
            <small className="field-help">Required for account contact and recovery.</small>
          </div>
          <label className="system-admin-access-option">
            <input type="checkbox" name="canManageAccounts" checked={form.canManageAccounts} onChange={updateForm} disabled={!isPrimaryAdmin} />
            <span><strong>Grant account-management access</strong><small>Allow this System Admin to create and manage user accounts. Primary admin ownership stays with you.</small></span>
          </label>
          <small className="field-help system-admin-id-note">A Staff ID in SDYY#### format is generated automatically.</small>
          <div className="form-group full-width">
            <button type="submit" className="btn-primary" disabled={!isPrimaryAdmin || submitting}>{submitting ? 'Creating account…' : 'Create System Admin'}</button>
          </div>
        </form>
      </section>

      <section className="content-card" id="change-owner">
        <h2 className="card-title">Transfer Primary admin ownership</h2>
        <p className="card-subtitle">For a full handoff, transfer all Primary admin privileges to another active System Admin.</p>
        <div className="ownership-guide" role="note">
          <ol>
            <li>Create the new System Admin above, or select an existing active System Admin.</li>
            <li>Confirm their email and enter your current password to start the handoff.</li>
            <li>They sign in and accept with their password. Then Primary admin ownership moves to them.</li>
          </ol>
          <p>Until the recipient accepts, you remain Primary admin. The request expires after 24 hours.</p>
        </div>
        {transfer?.direction === 'outgoing' ? (
          <div className="form-message" role="status">
            <strong>Handoff waiting for acceptance</strong>
            <p>{transfer.targetName || transfer.targetEmail} must accept the request. You remain Primary admin until then.</p>
            <button className="btn-action" type="button" onClick={cancelTransfer} disabled={submitting}>Cancel handoff</button>
          </div>
        ) : transfer?.direction === 'incoming' ? (
          <div className="form-message" role="status">
            <strong>Primary admin handoff requested</strong>
            <p>{transfer.fromName || transfer.fromEmail} has requested to transfer ownership to you.</p>
            <Link className="btn-action" to="/admin/user-directory">Review and accept in User Directory</Link>
          </div>
        ) : isPrimaryAdmin ? (
          <form className="form-grid ownership-transfer-form" onSubmit={startTransfer}>
            <div className="form-group">
              <label htmlFor="ownership-target">Active System Admin</label>
              <select id="ownership-target" className="form-control" value={selectedAdminId} onChange={(event) => setSelectedAdminId(event.target.value)} required disabled={loading || admins.length === 0}>
                {admins.length === 0 && <option value="">{loading ? 'Loading System Admins…' : 'Create a System Admin first'}</option>}
                {admins.map((user) => <option key={user.id} value={user.id}>{user.name} — {user.email}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="ownership-email">Type the recipient email to confirm</label>
              <input id="ownership-email" className="form-control" type="email" value={confirmationEmail} onChange={(event) => setConfirmationEmail(event.target.value)} required disabled={!selectedAdminId} />
            </div>
            <div className="form-group full-width">
              <label htmlFor="ownership-password">Your current password</label>
              <input id="ownership-password" className="form-control" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoComplete="current-password" disabled={!selectedAdminId} />
            </div>
            <div className="form-group full-width">
              <button type="submit" className="btn-primary ownership-transfer-button" disabled={submitting || !selectedAdminId}>{submitting ? 'Starting handoff…' : 'Start Primary admin handoff'}</button>
            </div>
          </form>
        ) : (
          <p className="form-message" role="status">Only the Primary admin can transfer ownership. Incoming handoff requests can be reviewed from the User Directory.</p>
        )}
      </section>
    </>
  );
}
