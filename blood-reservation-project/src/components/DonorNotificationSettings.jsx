import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationOptions from './NotificationOptions';

export default function DonorNotificationSettings() {
  const { donor, saveNotificationPreferences } = useAuth();
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const preferences = { sms: donor?.notificationPreferences?.sms !== false, email: donor?.notificationPreferences?.email !== false };
  const value = draft || preferences;
  const dirty = value.sms !== preferences.sms || value.email !== preferences.email;

  const handleChange = next => {
    setDraft(next);
    setSaved(false);
    setError('');
  };
  const handleSave = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await saveNotificationPreferences(value);
      setDraft(null);
      setSaved(true);
    } catch (failure) {
      setError(failure.message || 'Could not save your choices. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="donor-notification-settings" aria-labelledby="notification-settings-heading">
      <h2 id="notification-settings-heading">Notification preferences</h2>
      <form onSubmit={handleSave}>
        <NotificationOptions value={value} onChange={handleChange} disabled={saving} />
        <div className="notification-contact">
          <p><strong>Mobile:</strong> {donor?.mobileNumber || 'No mobile number on your account. SMS requires a valid Philippine mobile number.'}</p>
          <p><strong>Email:</strong> {donor?.email || 'No email address on your account.'}</p>
        </div>
        <button className="notification-save" type="submit" disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
        {error && <p className="notification-error" role="alert">{error}</p>}
        <p className="notification-status" role="status">{saved ? 'Your notification preferences have been saved.' : ''}</p>
      </form>
    </section>
  );
}
