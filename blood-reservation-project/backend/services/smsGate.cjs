const { normalizeMobile } = require('./semaphore.cjs');

function readSmsConfig(env = process.env) {
    const mode = env.SMSGATE_MODE || 'local';
    if (!['local', 'cloud'].includes(mode)) throw new Error('SMSGATE_MODE must be local or cloud');
    let endpoint;
    if (mode === 'cloud') endpoint = 'https://api.sms-gate.app/3rdparty/v1/messages';
    else {
        const url = new URL(env.SMSGATE_BASE_URL || '');
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
            throw new Error('SMSGATE_BASE_URL must be the local HTTP(S) server address without a path or credentials');
        }
        endpoint = new URL('/message', url).href;
    }
    const username = mode === 'cloud' ? env.SMSGATE_CLOUD_USERNAME : env.SMSGATE_USERNAME;
    const password = mode === 'cloud' ? env.SMSGATE_CLOUD_PASSWORD : env.SMSGATE_PASSWORD;
    if (!username || !password) throw new Error(`SMSgate ${mode} credentials are missing`);
    return { endpoint, username, password };
}

async function sendSms(number, text, config = readSmsConfig(), { fetchImpl = fetch } = {}) {
    const normalized = normalizeMobile(number);
    if (!normalized) throw new Error('A valid Philippine mobile number is required');
    const response = await fetchImpl(config.endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ textMessage: { text }, phoneNumbers: [`+${normalized}`] }),
        signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`SMSGate HTTP ${response.status}; review before retrying`);
    const data = await response.json();
    if (!data?.id || ['Failed', 'Cancelled'].includes(data.state)) throw new Error('SMSGate acceptance unconfirmed; review before retrying');
    return { messageId: String(data.id), providerStatus: String(data.state || 'Accepted') };
}

async function sendEligibilitySms(number, config) {
    const name = String(config.firstName || 'Donor').trim();
    return sendSms(number, `Hi ${name}! Your donation waiting period has passed. You may visit a blood bank for donor screening. Final eligibility will be assessed by blood bank staff. Thank you for helping save lives! - Sandugo`, config.smsGate);
}

module.exports = { readSmsConfig, sendSms, sendEligibilitySms };
