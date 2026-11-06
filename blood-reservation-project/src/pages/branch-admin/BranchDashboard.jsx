import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import BloodBankMap from '../BloodBankMap';
import BloodRequestForm from '../Bloodrequestform';
import BranchRequests from './BranchRequests';
import BranchUtilization from './BranchUtilization';
import StaffAppointments from '../StaffAppointments';
import HospitalRequests from './HospitalRequests';
import Inventory from '../Inventory';
import '../../styles/BranchAdmin.css';

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || 'The request could not be completed.');
  }
  return result;
}

function BranchDashboard() {
  const { activeTab, setActiveTab, setFacilityType } = useOutletContext();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [credentials, setCredentials] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', mobile: '', staffId: '' });
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');

  const fetchDashboard = useCallback(() => request('/api/branch-admin/dashboard'), []);

  const loadDashboard = useCallback(async () => {
    try {
      setDashboard(await fetchDashboard());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [fetchDashboard]);

  useEffect(() => {
    let isCurrent = true;
    fetchDashboard()
      .then((result) => {
        if (isCurrent) setDashboard(result);
      })
      .catch((requestError) => {
        if (isCurrent) setError(requestError.message);
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [fetchDashboard]);

  useEffect(() => {
    if (dashboard?.facility?.facilityType) {
      setFacilityType(dashboard.facility.facilityType);
    }
  }, [dashboard?.facility?.facilityType, setFacilityType]);

  async function createUser(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setCredentials(null);
    setSubmitting(true);
    try {
      const result = await request('/api/branch-admin/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });
      setCredentials({
        name: result.user.name,
        email: result.user.email,
        facilityName: dashboard?.facility?.name,
        staffId: result.staffId,
        password: result.temporaryPassword,
      });
      setNotice(result.message);
      setNewUser({ name: '', email: '', mobile: '', staffId: '' });
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleUserStatus(user) {
    setError('');
    setNotice('');
    try {
      await request(`/api/branch-admin/users/${encodeURIComponent(user.id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: user.status === 'Active' ? 'Deactivated' : 'Active' }),
      });
      setNotice(`${user.name} is now ${user.status === 'Active' ? 'deactivated' : 'active'}.`);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteUser(user) {
    if (!window.confirm(`Permanently delete ${user.name} (${user.email})? This cannot be undone.`)) return;
    setError('');
    setNotice('');
    try {
      const result = await request(`/api/branch-admin/users/${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
      });
      setNotice(result.message);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const users = dashboard?.users || [];
  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !search
        || user.name?.toLowerCase().includes(search)
        || user.email?.toLowerCase().includes(search)
        || user.staffId?.toLowerCase().includes(search);
      const matchesStatus = userStatusFilter === 'all'
        || user.status?.toLowerCase() === userStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [users, userSearch, userStatusFilter]);

  if (loading) {
    return <section className="content-card"><p>Loading your branch dashboard…</p></section>;
  }

  const facility = dashboard?.facility;
  const summary = dashboard?.summary;
  const facilityTypeName = {
    hospital: 'Hospital',
    bsf: 'Blood Service Facility (BSF)',
    prc_chapter: 'PRC Chapter',
  }[facility?.facilityType] || facility?.facilityType || 'Facility type unavailable';

  return (
    <section className="branch-dashboard">
      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {notice && <p className="form-message" role="status">{notice}</p>}

      {activeTab === 'dashboard' && (
        <section
          id="branch-panel-dashboard"
          className="branch-tab-panel"
          role="tabpanel"
          aria-labelledby="branch-tab-dashboard"
          tabIndex="0"
        >
          <section className="content-card branch-facility-card">
            <div>
              <span className="branch-eyebrow">YOUR FACILITY</span>
              <h2 className="card-title">{facility?.name || 'Facility unavailable'}</h2>
              <p className="card-subtitle">{facility?.address || 'No address is on file.'}</p>
            </div>
            <div className="branch-facility-type">
              <span className="branch-type-icon" aria-hidden="true">
                {facility?.facilityType === 'hospital' ? '🏥' : facility?.facilityType === 'bsf' ? '🩸' : '✚'}
              </span>
              <div>
                <strong>{facility?.typeLabel || facilityTypeName}</strong>
                <span>{facility?.code ? `Facility ID: ${facility.code}` : 'Facility ID unavailable'}</span>
              </div>
            </div>
          </section>

          <div className="metrics-grid branch-metrics">
            <article className="metric-card">
              <div className="metric-header"><span className="metric-label">Branch Users</span><span className="metric-icon blue">👥</span></div>
              <div className="metric-value">{summary?.totalUsers ?? 0}</div>
              <div className="metric-subtext">Staff assigned to this facility</div>
            </article>
            {['bsf', 'prc_chapter'].includes(facility?.facilityType) && (
              <article className="metric-card">
                <div className="metric-header"><span className="metric-label">Pending blood requests</span><span className="metric-icon orange">◷</span></div>
                <div className="metric-value">{summary?.pendingBloodRequests ?? 0}</div>
                <div className="metric-subtext">{summary?.totalBloodRequests ?? 0} total requests for this branch</div>
                <button className="btn-action" type="button" onClick={() => setActiveTab('branch-requests')}>Review requests</button>
              </article>
            )}
            <article className="metric-card">
              <div className="metric-header"><span className="metric-label">Active Users</span><span className="metric-icon green">✓</span></div>
              <div className="metric-value">{summary?.activeUsers ?? 0}</div>
              <div className="metric-subtext">Currently able to sign in</div>
            </article>
            <article className="metric-card">
              <div className="metric-header"><span className="metric-label">Deactivated Users</span><span className="metric-icon orange">⏸</span></div>
              <div className="metric-value">{summary?.deactivatedUsers ?? 0}</div>
              <div className="metric-subtext">Accounts currently disabled</div>
            </article>
          </div>
        </section>
      )}

      {activeTab === 'create-user' && (
        <section
          id="branch-panel-create-user"
          className="content-card branch-tab-panel"
          role="tabpanel"
          aria-labelledby="branch-tab-create-user"
          tabIndex="0"
        >
          <div className="card-header-flex branch-users-header">
            <div>
              <h2 className="card-title">Create Account</h2>
              <p className="card-subtitle">
                Create a staff account with a generated temporary password. It will be assigned to {facility?.name || 'this facility'}.
              </p>
            </div>
          </div>
          <form className="branch-create-form" onSubmit={createUser}>
            <div className="form-group">
              <label htmlFor="branch-user-name">Account Name</label>
              <input
                id="branch-user-name"
                className="form-control"
                value={newUser.name}
                onChange={(event) => setNewUser((current) => ({ ...current, name: event.target.value }))}
                autoComplete="name"
                placeholder="e.g. Dr. Teresa Mendoza"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="branch-user-email">Work Email Address</label>
              <input
                id="branch-user-email"
                className="form-control"
                type="email"
                value={newUser.email}
                onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))}
                autoComplete="email"
                placeholder="name@institution.gov.ph"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="branch-user-mobile">Mobile / Contact Number</label>
              <input
                id="branch-user-mobile"
                className="form-control"
                type="tel"
                value={newUser.mobile}
                onChange={(event) => setNewUser((current) => ({ ...current, mobile: event.target.value }))}
                autoComplete="tel"
                placeholder="+63 917..."
              />
            </div>
            <div className="form-group">
              <label htmlFor="branch-user-staff-id">Staff ID</label>
              <input
                id="branch-user-staff-id"
                className="form-control"
                value={newUser.staffId}
                onChange={(event) => setNewUser((current) => ({ ...current, staffId: event.target.value }))}
                placeholder="Leave blank to auto-generate"
              />
            </div>
            <div className="form-group">
              <label htmlFor="branch-user-facility">Assigned Facility</label>
              <input
                id="branch-user-facility"
                className="form-control"
                value={facility?.name || 'Facility unavailable'}
                readOnly
                aria-readonly="true"
              />
            </div>
            <button className="btn-action" type="submit" disabled={submitting || !facility?.isActive}>
              {submitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
          {facility && !facility.isActive && (
            <p className="form-message error-message" role="alert">This facility is inactive. New accounts cannot be created.</p>
          )}
          {credentials && (
            <div className="branch-credentials" role="status">
              <strong>Staff account created</strong>
              <span>{credentials.name} ({credentials.email}){credentials.facilityName ? ` · ${credentials.facilityName}` : ''}</span>
              {credentials.staffId && <span>Staff ID: {credentials.staffId}</span>}
              <strong>Temporary password</strong>
              <code>{credentials.password}</code>
              <span>Copy and share this password securely. It will only be shown now.</span>
            </div>
          )}
        </section>
      )}

      {activeTab === 'users' && (
        <section
          id="branch-panel-users"
          className="content-card branch-tab-panel"
          role="tabpanel"
          aria-labelledby="branch-tab-users"
          tabIndex="0"
        >
          <div className="card-header-flex branch-users-header">
            <div>
              <h2 className="card-title">Branch users</h2>
              <p className="card-subtitle">Review staff accounts assigned to this facility and manage their access.</p>
            </div>
          </div>
          <div className="branch-user-filters">
            <div className="form-group branch-user-search">
              <label htmlFor="branch-user-search">Search users</label>
              <input
                id="branch-user-search"
                className="form-control"
                type="search"
                placeholder="Search by name, email, or staff ID"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
              />
            </div>
            <div className="form-group branch-user-status-filter">
              <label htmlFor="branch-user-status">Filter by status</label>
              <select
                id="branch-user-status"
                className="form-control"
                value={userStatusFilter}
                onChange={(event) => setUserStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="deactivated">Deactivated</option>
              </select>
            </div>
            <p className="branch-user-count" aria-live="polite">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          </div>
          <div className="table-scroll">
            <table className="custom-table">
              <thead>
                <tr><th>User / Email</th><th>Staff ID</th><th>Role</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filteredUsers.length ? filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td><strong>{user.name}</strong><div className="subtext">{user.email}</div></td>
                    <td>{user.staffId || '—'}</td>
                    <td><span className="tag">{user.role}</span></td>
                    <td><span className={`status-pill ${user.status === 'Active' ? 'active' : 'suspended'}`}>{user.status}</span></td>
                    <td>
                      <div className="branch-user-actions">
                        <button
                          className="btn-action"
                          type="button"
                          onClick={() => toggleUserStatus(user)}
                        >
                          {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn-action branch-delete-button"
                          type="button"
                          onClick={() => deleteUser(user)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="empty-table">
                      {users.length ? 'No users match your search and status filter.' : 'No staff accounts are assigned to this branch yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'utilization' && <BranchUtilization />}

      {activeTab === 'blood-locator' && (
        <section
          id="branch-panel-blood-locator"
          className="branch-tab-panel"
          role="tabpanel"
          aria-labelledby="branch-tab-blood-locator"
          tabIndex="0"
        >
          <BloodBankMap />
        </section>
      )}

      {activeTab === 'inventory' && ['bsf', 'prc_chapter'].includes(facility?.facilityType) && (
        <section id="branch-panel-inventory" className="branch-tab-panel" role="tabpanel" aria-labelledby="branch-tab-inventory" tabIndex="0">
          <Inventory fixedFacilityId={facility?.id} />
        </section>
      )}

      {activeTab === 'reservation' && (
        <section
          id="branch-panel-reservation"
          className="branch-tab-panel"
          role="tabpanel"
          aria-labelledby="branch-tab-reservation"
          tabIndex="0"
        >
          <BloodRequestForm embedded />
        </section>
      )}

      {activeTab === 'appointments' && (
            <section
              id="staff-panel-appointments"
              className="branch-tab-panel"
              role="tabpanel"
              aria-labelledby="staff-tab-appointments"
              tabIndex={0}
            >
              <StaffAppointments />
            </section>
          )}

      {activeTab === 'branch-requests' && ['bsf', 'prc_chapter'].includes(facility?.facilityType) && <BranchRequests />}
      {activeTab === 'my-requests' && facility?.facilityType === 'hospital' && <HospitalRequests />}
    </section>
  );
}

export default BranchDashboard;
