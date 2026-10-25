import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, getErrorMessage } from '../lib/api.js';

const roles = ['All Roles', 'System Admin', 'BSF Admin', 'PRC Admin', 'Hospital Supervisor', 'BSF Supervisor', 'Hospital Staff', 'BSF Staff', 'Donor'];

function UserDirectoryPage() {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState('');
  const [generatedCredential, setGeneratedCredential] = useState(null);
  const [transfer, setTransfer] = useState(null);
  const [transferTarget, setTransferTarget] = useState(null);
  const [transferPassword, setTransferPassword] = useState('');
  const [transferEmail, setTransferEmail] = useState('');
  const [acceptPassword, setAcceptPassword] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('adminUser') || 'null');
    } catch {
      return null;
    }
  });

  const loadUsers = useCallback(async () => {
    setError('');
    try {
      const [result, transferResult] = await Promise.all([
        api('/api/admin/users')
      ]);
      setUsers(result.users || []);
      setTransfer(transferResult?.direction ? transferResult : null);

      // The new endpoint no longer returns canManageAccounts / isPrimaryAdmin.
      // Fall back to whatever the caller already knows from localStorage unless
      // the response explicitly includes them (keeps backward compatibility).
      const hasPerms = typeof result.canManageAccounts === 'boolean' || typeof result.isPrimaryAdmin === 'boolean';

      const savedAdmin = JSON.parse(localStorage.getItem('adminUser') || 'null');
      if (savedAdmin && hasPerms) {
        const updated = {
          ...savedAdmin,
          ...(typeof result.canManageAccounts === 'boolean' ? { canManageAccounts: result.canManageAccounts } : {}),
          ...(typeof result.isPrimaryAdmin === 'boolean' ? { isPrimaryAdmin: result.isPrimaryAdmin } : {}),
        };
        localStorage.setItem('adminUser', JSON.stringify(updated));
        window.dispatchEvent(new Event('admin-user-updated'));
        setCurrentAdmin(updated);
      } else if (savedAdmin) {
        setCurrentAdmin(savedAdmin);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => (users || []).filter((user) => {
    const matchesRole = roleFilter === 'All Roles' || user.role === roleFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || Object.values(user).some((value) => String(value ?? '').toLowerCase().includes(term));
    return matchesRole && matchesSearch;
  }), [users, roleFilter, search]);

  async function toggleStatus(user) {
    setError('');
    try {
      await api(`/api/admin/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: user.status === 'Active' ? 'Suspended' : 'Active' }),
      });
      await loadUsers();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function authorizeAccountManagement(user) {
    setError('');
    setNotice('');
    try {
      const result = await api(`/api/admin/users/${encodeURIComponent(user.id)}/authorization`, {
        method: 'PATCH',
      });
      setNotice(result.message);
      await loadUsers();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function startPrimaryTransfer(event) {
    event.preventDefault();
    if (!transferTarget) return;
    setError('');
    setNotice('');
    setTransferBusy(true);
    try {
      const result = await api(`/api/admin/primary-admin-transfer/target/${encodeURIComponent(transferTarget.id)}`, {
        method: 'POST',
        body: JSON.stringify({ currentPassword: transferPassword, confirmationEmail: transferEmail }),
      });
      setNotice(result.message);
      setTransferTarget(null);
      setTransferPassword('');
      setTransferEmail('');
      await loadUsers();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setTransferBusy(false);
    }
  }

  async function acceptPrimaryTransfer(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setTransferBusy(true);
    try {
      const result = await api('/api/admin/primary-admin-transfer/accept', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: acceptPassword }),
      });
      setNotice(result.message);
      setAcceptPassword('');
      await loadUsers();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setTransferBusy(false);
    }
  }

  async function cancelPrimaryTransfer() {
    setError('');
    setNotice('');
    setTransferBusy(true);
    try {
      const result = await api('/api/admin/primary-admin-transfer', { method: 'DELETE' });
      setNotice(result.message);
      await loadUsers();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setTransferBusy(false);
    }
  }

  async function generatePassword(user) {
    setError('');
    setNotice('');
    setGeneratedCredential(null);
    setGeneratingId(user.id);
    try {
      const result = await api(`/api/admin/supervisors/${encodeURIComponent(user.id)}/generate-password`, {
        method: 'POST',
      });
      setNotice(result.message);
      setGeneratedCredential({ userId: user.id, password: result.generatedPassword });
      await loadUsers();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setGeneratingId('');
    }
  }

  return (
    <section className="content-card" id="user-registry">
      <div className="card-header-flex">
        <div>
          <h2 className="card-title">{currentAdmin?.canManageAccounts ? 'Account Directory' : 'My Accounts'}</h2>
          <p className="card-subtitle">
            {currentAdmin?.isPrimaryAdmin
              ? 'You are the Primary admin. You can grant account access or transfer the role.'
              : currentAdmin?.canManageAccounts
                ? 'You are an Account manager. The Primary admin granted you permission to manage accounts.'
                : 'You can view accounts you created. Ask the Primary admin if you need account-management access.'}
          </p>
        </div>
        <div className="filter-controls">
          <input
            aria-label="Search users"
            type="search"
            placeholder="Search user, email, branch..."
            className="form-control search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select aria-label="Filter users by role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="form-control">
            {roles.map((role) => <option key={role}>{role}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {notice && <p className="form-message" role="status">{notice}</p>}
      {transfer?.direction === 'outgoing' && (
        <div className="form-message" role="status" style={{ margin: '16px 0', padding: '14px 18px' }}>
          <strong>Handoff waiting for acceptance</strong>
          <p style={{ margin: '6px 0' }}>{transfer.targetName || transfer.targetEmail} must sign in and confirm with their password. You remain Primary admin until then. Request expires {new Date(transfer.expiresAt).toLocaleString()}.</p>
          <button className="btn-action" type="button" onClick={cancelPrimaryTransfer} disabled={transferBusy}>Cancel handoff</button>
        </div>
      )}
      {transfer?.direction === 'incoming' && (
        <form onSubmit={acceptPrimaryTransfer} className="form-message" style={{ margin: '16px 0', padding: '14px 18px' }}>
          <strong>Primary admin handoff requested</strong>
          <p style={{ margin: '6px 0' }}>{transfer.fromName || transfer.fromEmail} requested to transfer the role to you. Your account becomes Primary admin only after you accept. Request expires {new Date(transfer.expiresAt).toLocaleString()}.</p>
          <label htmlFor="accept-transfer-password">Confirm your password</label>
          <input id="accept-transfer-password" className="form-control" type="password" value={acceptPassword} onChange={(event) => setAcceptPassword(event.target.value)} required autoComplete="current-password" />
          <button className="btn-action" type="submit" disabled={transferBusy}>{transferBusy ? 'Confirming…' : 'Accept handoff'}</button>
        </form>
      )}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', margin: '16px 0', fontSize: '13px', color: '#334155' }}>
        <strong>How admin access works</strong>
        <ul style={{ margin: '6px 0 0', paddingLeft: '20px' }}>
          <li>There is one Primary admin, who can transfer the role.</li>
          <li>Other System Admins start with no account-management access.</li>
          <li>The Primary admin can grant Account manager access to let them create and deactivate accounts.</li>
        </ul>
      </div>
      <div className="table-scroll">
        <table className="custom-table">
          <thead>
            <tr><th>User / Email</th><th>Role</th><th>Staff ID</th><th>Branch / Facility</th><th>Created By</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="7" className="empty-table">Loading accounts from MongoDB…</td></tr>}
            {filteredUsers.map((user) => (
              <tr key={user.id || user.email}>
                <td><strong>{user.name}</strong><div className="subtext">{user.email}</div></td>
                <td><span className="tag">{user.role}</span></td>
                <td>{user.staffId || '—'}</td>
                <td>{user.branch || '—'}</td>
                <td>{user.createdByName || 'System'}</td>
                <td><span className={`status-pill ${(user.status || '').toLowerCase()}`}>{user.status}</span></td>
                <td>
                  {user.role === 'System Admin' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                      <span className="protected-label">
                        {user.isPrimaryAdmin ? 'Primary admin' : user.canManageAccounts ? 'Account manager' : 'No account access'}
                      </span>
                      {!user.isPrimaryAdmin && currentAdmin?.isPrimaryAdmin && !user.canManageAccounts && (
                        <button className="btn-action" type="button" onClick={() => authorizeAccountManagement(user)}>Grant account access</button>
                      )}
                      {!user.isPrimaryAdmin && currentAdmin?.isPrimaryAdmin && !transfer?.direction && (
                        <button className="btn-action" type="button" onClick={() => { setTransferTarget(user); setTransferEmail(''); setTransferPassword(''); }}>Start secure handoff</button>
                      )}
                      {transferTarget?.id === user.id && (
                        <form onSubmit={startPrimaryTransfer} style={{ display: 'grid', gap: '6px', marginTop: '8px', maxWidth: '280px' }}>
                          <strong>Verify this handoff</strong>
                          <label htmlFor={`transfer-password-${user.id}`}>Your current password</label>
                          <input id={`transfer-password-${user.id}`} className="form-control" type="password" value={transferPassword} onChange={(event) => setTransferPassword(event.target.value)} required autoComplete="current-password" />
                          <label htmlFor={`transfer-email-${user.id}`}>Type {user.email} to confirm</label>
                          <input id={`transfer-email-${user.id}`} className="form-control" type="email" value={transferEmail} onChange={(event) => setTransferEmail(event.target.value)} required />
                          <button className="btn-action" type="submit" disabled={transferBusy}>{transferBusy ? 'Sending…' : 'Send handoff request'}</button>
                          <button className="btn-action" type="button" onClick={() => setTransferTarget(null)}>Cancel</button>
                        </form>
                      )}
                      {!user.isPrimaryAdmin && user.canManageAccounts && currentAdmin?.canManageAccounts && (
                        <button className="btn-action" type="button" onClick={() => toggleStatus(user)}>{user.status === 'Active' ? 'Deactivate account' : 'Activate account'}</button>
                      )}
                    </div>
                  ) : currentAdmin?.canManageAccounts ? (
                    <>
                      {user.status === 'Pending Setup'
                        ? <button
                            className="btn-action"
                            type="button"
                            onClick={() => generatePassword(user)}
                            disabled={generatingId === user.id}
                          >
                            {generatingId === user.id ? 'Generating…' : 'Generate password'}
                          </button>
                        : <button className="btn-action" type="button" onClick={() => toggleStatus(user)}>{user.status === 'Active' ? 'Deactivate account' : 'Activate account'}</button>}
                      {generatedCredential?.userId === user.id && (
                        <div role="status" style={{ marginTop: '8px' }}>
                          Temporary password: <code>{generatedCredential.password}</code>
                        </div>
                      )}
                    </>
                  ) : <span className="protected-label">Account manager access required</span>}
                </td>
              </tr>
            ))}
            {!loading && filteredUsers.length === 0 && (
              <tr>
                <td colSpan="7" className="empty-table">
                  {users.length === 0
                    ? 'No accounts are stored in the connected database yet.'
                    : 'No users match your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default UserDirectoryPage;