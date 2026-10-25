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
      const result = await api('/api/admin/users');
      setUsers(result.users || []);
      setCurrentAdmin((admin) => {
        if (!admin) return admin;
        const updated = { ...admin, canManageAccounts: result.canManageAccounts, isPrimaryAdmin: result.isPrimaryAdmin };
        localStorage.setItem('adminUser', JSON.stringify(updated));
        return updated;
      });
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

  async function transferPrimaryAdmin(user) {
    if (!window.confirm(`Transfer primary System Admin authority to ${user.name} (${user.email})? Your account-management access will be removed.`)) return;
    setError('');
    setNotice('');
    try {
      const result = await api(`/api/admin/users/${encodeURIComponent(user.id)}/primary-admin`, { method: 'PATCH' });
      setNotice(result.message);
      setCurrentAdmin((admin) => {
        if (!admin) return admin;
        const updated = { ...admin, isPrimaryAdmin: false, canManageAccounts: false };
        localStorage.setItem('adminUser', JSON.stringify(updated));
        return updated;
      });
      await loadUsers();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
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
          <h2 className="card-title">{currentAdmin?.canManageAccounts ? 'Account Directory' : 'Accounts I Created'}</h2>
          <p className="card-subtitle">
            {currentAdmin?.canManageAccounts ? 'Manage account access across the system.' : 'This list only includes accounts you created.'}
            {currentAdmin?.isPrimaryAdmin && ' Pending administrator authorization requests are also shown.'}
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
                    user.isPrimaryAdmin
                      ? <span className="protected-label">Primary System Admin</span>
                      : currentAdmin?.isPrimaryAdmin
                        ? <>
                            {user.pendingAuthorization && <button className="btn-action" type="button" onClick={() => authorizeAccountManagement(user)}>Authorize account management</button>}
                            <button className="btn-action" type="button" onClick={() => transferPrimaryAdmin(user)}>Make primary admin</button>
                            {user.canManageAccounts && <button className="btn-action" type="button" onClick={() => toggleStatus(user)}>{user.status === 'Active' ? 'Deactivate' : 'Activate'}</button>}
                          </>
                        : user.canManageAccounts && currentAdmin?.canManageAccounts
                          ? <button className="btn-action" type="button" onClick={() => toggleStatus(user)}>{user.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
                          : <span className="protected-label">{user.canManageAccounts ? 'Account manager' : 'Awaiting authorization'}</span>
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
                        : <button className="btn-action" type="button" onClick={() => toggleStatus(user)}>{user.status === 'Active' ? 'Deactivate' : 'Activate'}</button>}
                      {generatedCredential?.userId === user.id && (
                        <div role="status" style={{ marginTop: '8px' }}>
                          Temporary password: <code>{generatedCredential.password}</code>
                        </div>
                      )}
                    </>
                  ) : <span className="protected-label">Admin authorization required</span>}
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
