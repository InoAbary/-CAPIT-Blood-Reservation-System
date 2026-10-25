import React, { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../lib/api.js';

function ProvisionSupervisorPage() {
  const [canManageAccounts, setCanManageAccounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('adminUser') || 'null')?.canManageAccounts === true; }
    catch { return false; }
  });
  const [facilities, setFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [supervisor, setSupervisor] = useState({
    accountRole: 'System Admin',
    fullName: '',
    email: '',
    mobile: '',
    staffId: '',
    branch: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdAccount, setCreatedAccount] = useState(null);

  useEffect(() => {
    let isCurrent = true;
    api('/api/admin/users').then((result) => {
      if (!isCurrent) return;
      setCanManageAccounts(result.canManageAccounts === true);
      try {
        const current = JSON.parse(localStorage.getItem('adminUser') || 'null');
        if (current) localStorage.setItem('adminUser', JSON.stringify({ ...current, canManageAccounts: result.canManageAccounts === true, isPrimaryAdmin: result.isPrimaryAdmin === true }));
      } catch { /* permissions are still enforced by the API */ }
    }).catch(() => {});
    api('/api/admin/facilities')
      .then((result) => {
        if (!isCurrent) return;
        const availableFacilities = result.facilities || [];
        setFacilities(availableFacilities);
        setSupervisor((current) => {
          const facilityType = current.accountRole === 'BSF Admin'
            ? 'Participating_BSF'
            : current.accountRole === 'PRC Admin'
              ? 'PRC'
              : '';
          const roleFacilities = availableFacilities.filter((facility) => facility.type === facilityType);
          return {
            ...current,
            branch: facilityType && roleFacilities.some((facility) => facility.name === current.branch)
              ? current.branch
              : roleFacilities[0]?.name || '',
          };
        });
      })
      .catch((requestError) => {
        if (isCurrent) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (isCurrent) setLoadingFacilities(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setSupervisor((current) => {
      if (name !== 'accountRole') return { ...current, [name]: value };
      const facilityType = value === 'BSF Admin' ? 'Participating_BSF' : value === 'PRC Admin' ? 'PRC' : '';
      const roleFacilities = facilities.filter((facility) => facility.type === facilityType);
      return {
        ...current,
        accountRole: value,
        branch: roleFacilities.some((facility) => facility.name === current.branch)
          ? current.branch
          : roleFacilities[0]?.name || '',
      };
    });
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
          mobile: supervisor.accountRole === 'System Admin' ? '' : supervisor.mobile,
          staffId: supervisor.accountRole === 'System Admin' ? '' : supervisor.staffId,
          role: supervisor.accountRole,
          branch: supervisor.accountRole === 'System Admin' ? '' : supervisor.branch,
        }),
      });

      setCreatedAccount({
        name: supervisor.fullName,
        email: supervisor.email,
        role: supervisor.accountRole,
        branch: supervisor.accountRole === 'System Admin' ? '' : supervisor.branch,
        staffId: result.staffId,
        generatedPassword: result.generatedPassword,
      });
      setMessage(result.message || 'Supervisor account created.');
      setSupervisor((current) => ({ ...current, fullName: '', email: '', mobile: '', staffId: '' }));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="content-card" id="create-supervisor">
      <h2 className="card-title">Create Account</h2>
      <p className="card-subtitle">
        Create a System Admin, BSF Admin, or PRC Admin account with a generated temporary password.
      </p>

      {!canManageAccounts && <p className="form-message" role="status">The primary System Admin must grant your account permission before you can create accounts.</p>}

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
          <strong>{createdAccount.role} account created</strong>
          <div style={{ marginTop: '6px', fontSize: '13px' }}>
            {createdAccount.name} ({createdAccount.email}) · {createdAccount.role}
            {createdAccount.branch ? ` · ${createdAccount.branch}` : ''}
          </div>
          {createdAccount.staffId && <div style={{ marginTop: '4px', fontSize: '12px' }}>
            Staff ID: {createdAccount.staffId}
          </div>}
          <div style={{ marginTop: '8px', fontSize: '13px' }}>
            Temporary password: <code>{createdAccount.generatedPassword}</code>
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px' }}>
            Share this password securely. It will only be shown here for this creation.
          </div>
          {createdAccount.role === 'System Admin' && (
            <div style={{ marginTop: '4px', fontSize: '12px' }}>
              This administrator must be authorized before managing account status.
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label htmlFor="accountRole">Account Type</label>
          <select
            id="accountRole"
            name="accountRole"
            value={supervisor.accountRole}
            onChange={handleChange}
            className="form-control"
          >
            <option>System Admin</option>
          <option>BSF Admin</option>
          <option>PRC Admin</option>
          </select>
        </div>

        {supervisor.accountRole !== 'System Admin' && (
          <div className="form-group">
            <label htmlFor="branch">Assigned Facility</label>
            <select
              id="branch"
              name="branch"
              value={supervisor.branch}
              onChange={handleChange}
              className="form-control"
              required
              disabled={loadingFacilities || facilities.length === 0}
            >
              {facilities
                .filter((facility) => facility.type === (supervisor.accountRole === 'BSF Admin' ? 'Participating_BSF' : 'PRC'))
                .map((facility) => <option key={facility.id} value={facility.name}>{facility.name}</option>)}
            </select>
            {!loadingFacilities && facilities.length === 0 && (
              <div role="alert" className="form-message error-message">No facilities are available. Add a facility before creating this account.</div>
            )}
          </div>
        )}

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

        {supervisor.accountRole !== 'System Admin' && <>
          <div className="form-group">
            <label htmlFor="mobile">Mobile / Contact Number</label>
            <input
              id="mobile"
              name="mobile"
              value={supervisor.mobile}
              onChange={handleChange}
              placeholder="+63 917..."
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="staffId">Staff ID</label>
            <input
              id="staffId"
              name="staffId"
              value={supervisor.staffId}
              onChange={handleChange}
              placeholder="e.g. 103103"
              className="form-control"
            />
          </div>
        </>}

        <div className="form-group full-width">
          <button
            type="submit"
            className="btn-primary"
            disabled={!canManageAccounts || submitting || (supervisor.accountRole !== 'System Admin' && (loadingFacilities || facilities.length === 0))}
          >
            {submitting ? 'Creating account…' : 'Create Account'}
          </button>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            A unique temporary password is generated for each new account.
          </div>
        </div>
      </form>
    </section>
  );
}

export default ProvisionSupervisorPage;
