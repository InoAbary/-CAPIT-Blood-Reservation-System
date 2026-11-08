import '../styles/NotificationPreferences.css';

export default function NotificationOptions({ value, onChange, disabled = false }) {
  return (
    <fieldset className="notification-options" disabled={disabled}>
      <legend>Donation reminders</legend>
      <p>Choose how you would like to hear when your donation waiting period has passed. Select both, one, or neither.</p>
      <label className="notification-choice">
        <input type="checkbox" checked={value.sms} onChange={event => onChange({ ...value, sms: event.target.checked })} />
        <span><strong>SMS</strong><span>Receive a text message on your registered mobile number.</span></span>
      </label>
      <label className="notification-choice">
        <input type="checkbox" checked={value.email} onChange={event => onChange({ ...value, email: event.target.checked })} />
        <span><strong>Email</strong><span>Receive a reminder at your registered email address.</span></span>
      </label>
      <p className="notification-note">These choices apply to donation reminders. Password reset emails are sent when you request them.</p>
    </fieldset>
  );
}
