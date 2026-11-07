import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetStaffPassword } from '../utils/staffRecoveryApi';
import '../styles/StaffRecovery.css';

export default function ResetPasswordStaff() {
  const [params, setParams] = useSearchParams();
  const [token] = useState(() => params.get('token') || '');
  const validToken = /^[a-f0-9]{64}$/.test(token);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let meta = document.querySelector('meta[name="referrer"]');
    const created = !meta;
    const previous = meta?.getAttribute('content');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'referrer'; document.head.appendChild(meta); }
    meta.content = 'no-referrer';
    return () => { if (created) meta.remove(); else if (previous === null) meta.removeAttribute('content'); else meta.content = previous; };
  }, []);
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8 || new TextEncoder().encode(password).length > 72 || !password.trim()) {
      setError('Use at least 8 characters and at most 72 UTF-8 bytes.'); return;
    }
    setBusy(true);
    try {
      const result = await resetStaffPassword(token, password);
      setMessage(result.message); setPassword(''); setConfirm('');
      setParams({}, { replace: true });
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <main className="staff-recovery-page"><section className="staff-recovery-card">
    <div className="staff-recovery-logo" aria-hidden="true">✚</div>
    <p className="staff-recovery-tag">BLOOD RESERVATION SYSTEM · STAFF</p>
    {message ? <>
      <h1>Password changed</h1><p role="status">{message}</p>
      <Link className="staff-recovery-action" to="/Login/Staff" reloadDocument>Go to staff login</Link>
    </> : !validToken ? <>
      <h1>Reset link unavailable</h1><p>The link is missing or malformed. Request a new one.</p>
      <Link className="staff-recovery-action" to="/ForgotPassword/Staff">Request a reset link</Link>
    </> : <>
      <h1>Create a new password</h1><p>Update the password for your staff account.</p>
      {error && <p className="staff-recovery-error" role="alert">{error}</p>}
      <form onSubmit={submit}>
        <label htmlFor="staff-new-password">New password</label>
        <input id="staff-new-password" type="password" autoComplete="new-password" minLength={8} required value={password} disabled={busy} onChange={e => setPassword(e.target.value)} />
        <label htmlFor="staff-confirm-password">Confirm new password</label>
        <input id="staff-confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirm} disabled={busy} onChange={e => setConfirm(e.target.value)} />
        <button type="submit" disabled={busy}>{busy ? 'Changing password…' : 'Change password'}</button>
      </form>
    </>}
    <Link className="staff-recovery-link" to="/Login/Staff">← Back to staff login</Link>
  </section></main>;
}
