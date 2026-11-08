// Preserve the existing reminder behavior for donors who have not saved preferences.
function getNotificationPreferences(donor) {
    return {
        sms: donor?.notificationPreferences?.sms !== false,
        email: donor?.notificationPreferences?.email !== false
    };
}

function validNotificationPreferences(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        && Object.keys(value).length === 2
        && typeof value.sms === 'boolean' && typeof value.email === 'boolean';
}

module.exports = { getNotificationPreferences, validNotificationPreferences };
