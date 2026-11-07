import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { requestStaffPasswordReset } from '../utils/staffRecoveryApi';
import '../styles/StaffRecovery.css';

export default function ForgotPasswordStaff() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try { await requestStaffPasswordReset(email.trim().toLowerCase()); setSent(true); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <main className="staff-recovery-page"><section className="staff-recovery-card">
    <div className="staff-recovery-logo" aria-hidden="true">✚</div>
    <p className="staff-recovery-tag">BLOOD RESERVATION SYSTEM · STAFF</p>
    {sent ? <>
      <h1>Check your email</h1>
      <p>If an active staff account exists for <strong>{email}</strong>, a reset link will arrive shortly. The link expires after 15 minutes.</p>
      <button type="button" className="staff-recovery-secondary" onClick={() => setSent(false)}>Try another email</button>
    </> : <>
      <h1>Forgot your password?</h1>
      <p>Enter the email address registered to your staff account. We'll send you a reset link.</p>
      {error && <p className="staff-recovery-error" role="alert">{error}</p>}
      <form onSubmit={submit}>
        <label htmlFor="staff-reset-email">Staff email</label>
        <input id="staff-reset-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={e => setEmail(e.target.value)} disabled={busy} placeholder="staff@example.com" />
        <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
      </form>
    </>}
    <Link className="staff-recovery-link" to="/Login/Staff">← Back to staff login</Link>
  </section></main>;
}
