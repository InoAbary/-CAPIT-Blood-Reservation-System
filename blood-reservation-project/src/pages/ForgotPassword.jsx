import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { requestDonorPasswordReset } from '../utils/donorRecoveryApi';
import '../styles/ForgotPassword.css';

export default function ForgotPassword() {
  const location = useLocation();
  const [email, setEmail] = useState(typeof location.state?.email === 'string' ? location.state.email : '');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const resultHeading = useRef(null);
  const emailInput = useRef(null);
  const errorBox = useRef(null);

  useEffect(() => { if (submittedEmail) resultHeading.current?.focus(); }, [submittedEmail]);
  useEffect(() => { if (error) errorBox.current?.focus(); }, [error]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy.current || !event.currentTarget.reportValidity()) return;
    busy.current = true;
    setError('');
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const result = await requestDonorPasswordReset(normalizedEmail);
      setMessage(result.message);
      setSubmittedEmail(normalizedEmail);
    } catch (failure) {
      setError(failure.message);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }
  function editEmail() {
    setSubmittedEmail('');
    setError('');
    setMessage('');
    requestAnimationFrame(() => emailInput.current?.focus());
  }

  return (
    <main className="donor-recovery-page">
      <section className="donor-recovery-card" aria-labelledby="recovery-title">
        <div className="donor-recovery-brand" aria-hidden="true">✚</div>
        <span className="donor-recovery-eyebrow">BLOOD RESERVATION SYSTEM</span>
        <p className="donor-recovery-tag">Donor account recovery</p>
        {submittedEmail ? <>
          <div className="donor-recovery-icon" aria-hidden="true">✉</div>
          <h1 id="recovery-title" ref={resultHeading} tabIndex={-1}>Check your email</h1>
          <p className="donor-recovery-description">Request submitted for <strong>{submittedEmail}</strong>.</p>
          <div className="donor-recovery-preview" role="status"><p>{message}</p><p>The link expires in 15 minutes and can be used once.</p></div>
          <button className="donor-recovery-button donor-recovery-secondary" type="button" onClick={editEmail}>Use a different email</button>
        </> : <>
          <h1 id="recovery-title">Forgot your password?</h1>
          <p className="donor-recovery-description">Enter the email address registered to your donor account. We’ll email a link to reset your password.</p>
          {error && <p className="donor-recovery-error" role="alert" tabIndex={-1} ref={errorBox}>{error}</p>}
          <form onSubmit={handleSubmit} aria-busy={loading}>
            <label htmlFor="email">Donor email address</label>
            <input ref={emailInput} id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="juan.delacruz@example.com" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} aria-describedby="recovery-email-help" disabled={loading} required />
            <p id="recovery-email-help" className="donor-recovery-help">Available for donor accounts only.</p>
            <button className="donor-recovery-button" type="submit" disabled={loading}>{loading ? 'Sending request…' : 'Send reset link'}</button>
          </form>
        </>}
        <Link className="donor-recovery-back" to="/Login"><span aria-hidden="true">← </span>Back to donor login</Link>
        <p className="donor-recovery-staff">Staff accounts: contact your administrator for password assistance.</p>
      </section>
    </main>
  );
}
