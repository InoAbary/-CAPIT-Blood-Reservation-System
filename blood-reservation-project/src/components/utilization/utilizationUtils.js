export function getID(value) {
    if (!value) {
        return '';
    }

    if (typeof value === 'string') {
        return value;
    }

    return value._id || '';
}


export function getFacilityName(value) {
    if (!value) {
        return '—';
    }

    if (typeof value === 'string') {
        return value;
    }

    return value.facilityName || '—';
}


export function getPerformerName(value) {
    if (!value) {
        return 'System / Unavailable';
    }

    const name = [
        value.firstName,
        value.lastName
    ]
        .filter(Boolean)
        .join(' ');

    return name || 'System / Unavailable';
}


export function formatDateTime(value) {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return new Intl.DateTimeFormat(
        'en-PH',
        {
            dateStyle: 'medium',
            timeStyle: 'short'
        }
    ).format(date);
}


export function getTodayValue() {
    const now = new Date();

    const year = now.getFullYear();

    const month = String(
        now.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
        now.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
}


export function getStatusClass(status) {
    return `util-status util-status-${String(
        status || ''
    )
        .toLowerCase()
        .replace(/[^a-z]/g, '')}`;
}