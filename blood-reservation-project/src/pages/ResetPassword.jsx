import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetDonorPassword } from '../utils/donorRecoveryApi';
import '../styles/ForgotPassword.css';

export default function ResetPassword() {
  const [params, setParams] = useSearchParams();
  const [token] = useState(() => params.get('token') || '');
  const validLink = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(token);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const resultHeading = useRef(null);
  const errorBox = useRef(null);

  useEffect(() => {
    let meta = document.querySelector('meta[name="referrer"]');
    const created = !meta;
    const previous = meta?.getAttribute('content');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'referrer'; document.head.appendChild(meta); }
    meta.content = 'no-referrer';
    return () => { if (created) meta.remove(); else if (previous === null) meta.removeAttribute('content'); else meta.content = previous; };
  }, []);
  useEffect(() => { if (message) resultHeading.current?.focus(); }, [message]);
  useEffect(() => { if (error) errorBox.current?.focus(); }, [error]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy.current || !validLink || !event.currentTarget.reportValidity()) return;
    setError('');
    if (password !== confirmation) { setError('The passwords do not match.'); return; }
    if (password.length < 8 || new TextEncoder().encode(password).length > 72 || !password.trim()) {
      setError('Use at least 8 characters and no more than 72 UTF-8 bytes.'); return;
    }
    busy.current = true;
    setLoading(true);
    try {
      const result = await resetDonorPassword(token, password);
      setPassword('');
      setConfirmation('');
      setMessage(result.message);
      setParams({}, { replace: true });
    } catch (failure) {
      setError(failure.message);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return <main className="donor-recovery-page"><section className="donor-recovery-card" aria-labelledby="reset-title">
    <div className="donor-recovery-brand" aria-hidden="true">✚</div>
    <span className="donor-recovery-eyebrow">BLOOD RESERVATION SYSTEM</span>
    <p className="donor-recovery-tag">Donor account recovery</p>
    {message ? <>
      <div className="donor-recovery-icon" aria-hidden="true">✓</div>
      <h1 id="reset-title" ref={resultHeading} tabIndex={-1}>Password changed</h1>
      <p className="donor-recovery-description" role="status">{message}</p>
      {/* Reload so any existing donor AuthContext is refreshed after cookie clearing. */}
      <Link className="donor-recovery-button donor-recovery-action" to="/Login" reloadDocument>Go to donor login</Link>
    </> : !validLink ? <>
      <h1 id="reset-title">Reset link unavailable</h1>
      <p className="donor-recovery-description" role="alert">Open the complete reset link from your email, or request a new one.</p>
      <Link className="donor-recovery-button donor-recovery-action" to="/ForgotPassword">Request a new reset link</Link>
    </> : <>
      <h1 id="reset-title">Choose a new password</h1>
      <p className="donor-recovery-description">Set a new password for your donor account.</p>
      {error && <p className="donor-recovery-error" role="alert" ref={errorBox} tabIndex={-1}>{error}</p>}
      <form onSubmit={handleSubmit} aria-busy={loading}>
        <label htmlFor="new-password">New password</label>
        <input id="new-password" name="password" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} minLength={8} maxLength={72} aria-describedby="reset-password-help" disabled={loading} required />
        <p id="reset-password-help" className="donor-recovery-help">At least 8 characters. Maximum 72 UTF-8 bytes; some characters use more than one byte.</p>
        <label htmlFor="confirm-password">Confirm new password</label>
        <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} minLength={8} maxLength={72} disabled={loading} required />
        <button className="donor-recovery-button donor-recovery-submit" type="submit" disabled={loading}>{loading ? 'Changing password…' : 'Change password'}</button>
      </form>
      <Link className="donor-recovery-back" to="/ForgotPassword">Need a new reset link?</Link>
    </>}
    {!message && <Link className="donor-recovery-back donor-recovery-separate" to="/Login">Back to donor login</Link>}
    <p className="donor-recovery-staff">Staff accounts: contact your administrator for password assistance.</p>
  </section></main>;
}
