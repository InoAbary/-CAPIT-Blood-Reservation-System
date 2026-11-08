function buildEligibilityMessage(firstName, lastDonationDate) {
    const name = String(firstName || '').trim() || 'Donor';
    const date = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric'
    }).format(new Date(lastDonationDate));
    return `Hi ${name}! ❤️ Great news! You're now eligible to donate blood again based on your last donation date (${date}). Visit your nearest blood bank for a quick health screening before donating. Your kindness can help save lives. Thank you for being a lifesaver! 🩸`;
}

function normalizeMobile(value) {
    const number = String(value || '').replace(/[\s()+-]/g, '');
    if (/^09\d{9}$/.test(number)) return `63${number.slice(1)}`;
    if (/^9\d{9}$/.test(number)) return `63${number}`;
    if (/^639\d{9}$/.test(number)) return number;
    return null;
}

async function sendEligibilitySms(number, { apiKey, senderName, firstName, lastDonationDate, fetchImpl = fetch }) {
    const body = new URLSearchParams({ apikey: apiKey, number,
        message: buildEligibilityMessage(firstName, lastDonationDate) });
    if (senderName) body.set('sendername', senderName);
    // Never retry an ambiguous request: Semaphore may already have accepted it.
    const response = await fetchImpl('https://api.semaphore.co/api/v4/messages', {
        method: 'POST', body, signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error('Semaphore request outcome needs review');
    const data = await response.json();
    const message = Array.isArray(data) && data.length === 1 ? data[0] : null;
    if (!message?.message_id || !['Queued', 'Pending', 'Sent'].includes(message.status)) {
        throw new Error('Semaphore did not confirm acceptance; review the account before retrying');
    }
    return { messageId: String(message.message_id), providerStatus: message.status };
}

module.exports = { normalizeMobile, sendEligibilitySms, buildEligibilityMessage };
