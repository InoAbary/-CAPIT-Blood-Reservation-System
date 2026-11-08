import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestMobileNumberChange, confirmMobileNumberChange } from '../utils/mobileNumberApi';
import '../styles/ForgotPassword.css';

function ChangeNumberLayout({ children }) {
  return <main className="donor-recovery-page"><section className="donor-recovery-card">
    <div className="donor-recovery-brand" aria-hidden="true">+</div>
    <p className="donor-recovery-eyebrow">CAPIT BLOOD RESERVATION SYSTEM</p>
    <p className="donor-recovery-tag">Donor account</p>
    {children}
  </section></main>;
}

export default function ChangeMobileNumber() {
  const { donor } = useAuth();
  const [number, setNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try { setMessage((await requestMobileNumberChange(number)).message); }
    catch (failure) { setError(failure.message || 'Could not send verification email. Please try again.'); }
    finally { setBusy(false); }
  };
  return <ChangeNumberLayout>
    <h1>Change mobile number</h1>
    <p className="donor-recovery-description">Current number: {donor?.mobileNumber || 'No number saved'}<br />We will email a verification link to {donor?.email}. Your number will change only after you confirm that link.</p>
    {error && <p className="donor-recovery-error" role="alert">{error}</p>}
    {message && <p className="donor-recovery-description" role="status">{message}</p>}
    <form onSubmit={submit} aria-busy={busy}>
      <label htmlFor="new-mobile-number">New mobile number</label>
      <input id="new-mobile-number" name="mobileNumber" type="tel" autoComplete="tel" value={number}
        onChange={event => { setNumber(event.target.value); setError(''); setMessage(''); }}
        required maxLength={40} disabled={busy} aria-describedby="new-mobile-help" />
      <p id="new-mobile-help" className="donor-recovery-help">Use a Philippine mobile number, such as 09171234567. The email link expires in 15 minutes. Only your latest link works.</p>
      <button className="donor-recovery-button donor-recovery-submit" type="submit" disabled={busy || !number.trim()}>{busy ? 'Sending…' : 'Send verification email'}</button>
    </form>
    <Link className="donor-recovery-back" to="/donor/profile">Back to Profile Settings</Link>
  </ChangeNumberLayout>;
}

export function ConfirmMobileNumber() {
  const location = useLocation();
  const { donor, refreshDonorProfile } = useAuth();
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const valid = /^[a-f0-9]{64}$/.test(token);
  const confirm = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await confirmMobileNumberChange(token);
      setMessage(result.message);
      // Remove the consumed secret from this browser history entry.
      window.history.replaceState(window.history.state, '', location.pathname);
      if (donor) await refreshDonorProfile().catch(() => {});
    } catch (failure) {
      setError(failure.message || 'Could not confirm your number. Please try again.');
    } finally { setBusy(false); }
  };
  return <ChangeNumberLayout>
    <h1>{message ? 'Mobile number updated' : 'Confirm mobile number change'}</h1>
    {message ? <p className="donor-recovery-description" role="status">{message}</p> : !valid ?
      <p className="donor-recovery-error" role="alert">This verification link is incomplete. Open the full link in your email or request a new one.</p> : <>
        <p className="donor-recovery-description">Confirm the new mobile number listed in your verification email. If you did not request this change, close this page.</p>
        {error && <p className="donor-recovery-error" role="alert">{error}</p>}
        <form onSubmit={confirm} aria-busy={busy}>
          <button className="donor-recovery-button donor-recovery-submit" type="submit" disabled={busy}>{busy ? 'Confirming…' : 'Confirm mobile number change'}</button>
        </form>
      </>}
    <Link className="donor-recovery-back" to={donor ? '/donor/profile' : '/Login'}>{donor ? 'Back to Profile Settings' : 'Sign in to your donor account'}</Link>
    {!message && <Link className="donor-recovery-back" to="/donor/change-number">Request a new verification link</Link>}
  </ChangeNumberLayout>;
}
