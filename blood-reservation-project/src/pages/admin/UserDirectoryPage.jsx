import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, getErrorMessage } from '../lib/api.js';

const roles = ['All Roles', 'System Admin', 'Branch Admin', 'Hospital Staff', 'Staff', 'Donor', 'Recipient'];
const PAGE_SIZE = 10;

function UserDirectoryPage() {
  const { admin: currentAdmin } = useOutletContext();
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [transfer, setTransfer] = useState(null);
  const [acceptPassword, setAcceptPassword] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);
  const [pendingAccountAction, setPendingAccountAction] = useState(null);
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [accountActionBusy, setAccountActionBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    setError('');
    try {
      const [result, transferResult] = await Promise.all([
        api('/api/admin/users'),
        api('/api/admin/primary-admin-transfer'),
      ]);
      setUsers(result.users || []);
      setTransfer(transferResult?.direction ? transferResult : null);
      window.dispatchEvent(new CustomEvent('admin-user-updated', { detail: {
        canManageAccounts: result.canManageAccounts === true,
        isPrimaryAdmin: result.isPrimaryAdmin === true,
      } }));
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

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const visibleUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, search]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function requestAccountAction(user, action) {
    setError('');
    setPendingAccountAction({ user, action });
    setSuperAdminPassword('');
  }

  async function confirmAccountAction(event) {
    event.preventDefault();
    if (!pendingAccountAction) return;
    setError('');
    setNotice('');
    setAccountActionBusy(true);
    try {
      const { user, action } = pendingAccountAction;
      if (action === 'delete') {
        const result = await api(`/api/admin/users/${encodeURIComponent(user.id)}`, {
          method: 'DELETE',
          body: JSON.stringify({ superadminPassword: superAdminPassword }),
        });
        setNotice(result.message || 'Account deleted.');
      } else {
        const status = user.status === 'Active' ? 'Suspended' : 'Active';
        await api(`/api/admin/users/${encodeURIComponent(user.id)}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, superadminPassword: superAdminPassword }),
        });
        setNotice(`Account ${status === 'Active' ? 'activated' : 'deactivated'}.`);
      }
      setPendingAccountAction(null);
      setSuperAdminPassword('');
      await loadUsers();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setAccountActionBusy(false);
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

  return (
    <section className="content-card" id="user-registry">
      <div className="card-header-flex user-directory-header">
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
        <div className="filter-controls user-directory-filters">
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
      <div className="table-scroll admin-bounded-table">
        <table className="custom-table">
          <thead>
            <tr><th>User</th><th>Email</th><th>Role</th><th>Staff / Donor ID</th><th>Branch / Facility</th><th>Created By</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="8" className="empty-table">Loading accounts from MongoDB…</td></tr>}
            {visibleUsers.map((user) => (
              <tr key={user.id || user.email}>
                <td><strong>{user.name}</strong></td>
                <td>{user.email || '—'}</td>
                <td><span className="tag">{user.role}</span></td>
                <td>{user.staffId || '—'}</td>
                <td>{user.branch || '—'}</td>
                <td>{user.createdByName || 'System'}</td>
                <td><span className={`status-pill ${(user.status || '').toLowerCase().replace(/\s+/g, '-')}`}>{user.status}</span></td>
                <td>
                  {user.isPrimaryAdmin ? (
                    <span className="protected-label">Primary admin</span>
                  ) : user.role === 'System Admin' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                      <span className="protected-label">
                        {user.canManageAccounts ? 'Account manager' : 'No account access'}
                      </span>
                      {currentAdmin?.isPrimaryAdmin && !user.canManageAccounts && (
                        <button className="btn-action" type="button" onClick={() => authorizeAccountManagement(user)}>Grant account access</button>
                      )}
                      {user.canManageAccounts && currentAdmin?.canManageAccounts && (
                        <button className="btn-action" type="button" onClick={() => requestAccountAction(user, 'status')}>{user.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
                      )}
                    </div>
                  ) : (
                    <div className="user-account-actions">
                      <button className="btn-action" type="button" onClick={() => requestAccountAction(user, 'status')}>
                        {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="btn-action user-delete-action" type="button" onClick={() => requestAccountAction(user, 'delete')}>Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && filteredUsers.length === 0 && (
              <tr>
                <td colSpan="8" className="empty-table">
                  {users.length === 0
                    ? 'No accounts are stored in the connected database yet.'
                    : 'No users match your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <nav className="admin-pagination" aria-label="User directory pages">
        <button className="btn-action" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage <= 1}>
          Previous
        </button>
        <span aria-live="polite">Page {currentPage} of {totalPages}</span>
        <button className="btn-action" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages}>
          Next
        </button>
      </nav>
      {pendingAccountAction && (
        <div className="admin-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !accountActionBusy) setPendingAccountAction(null); }}>
          <form className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="account-action-title" onSubmit={confirmAccountAction}>
            <h2 id="account-action-title">Confirm account {pendingAccountAction.action === 'delete' ? 'deletion' : 'status change'}</h2>
            <p>
              {pendingAccountAction.action === 'delete'
                ? `Delete ${pendingAccountAction.user.name}'s account? This cannot be undone.`
                : `${pendingAccountAction.user.status === 'Active' ? 'Deactivate' : 'Activate'} ${pendingAccountAction.user.name}'s account?`}
              {' '}Enter the Primary admin password to continue.
            </p>
            {error && <p className="form-message error-message" role="alert">{error}</p>}
            <label htmlFor="confirm-superadmin-password">Primary admin password</label>
            <input id="confirm-superadmin-password" className="form-control" type="password" value={superAdminPassword} onChange={(event) => setSuperAdminPassword(event.target.value)} autoComplete="current-password" required autoFocus />
            <div className="admin-confirm-actions">
              <button className="btn-action" type="button" onClick={() => setPendingAccountAction(null)} disabled={accountActionBusy}>Cancel</button>
              <button className={`btn-action${pendingAccountAction.action === 'delete' ? ' user-delete-action' : ' audit-download'}`} type="submit" disabled={accountActionBusy}>
                {accountActionBusy ? 'Processing…' : pendingAccountAction.action === 'delete' ? 'Delete account' : pendingAccountAction.user.status === 'Active' ? 'Deactivate account' : 'Activate account'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default UserDirectoryPage;
