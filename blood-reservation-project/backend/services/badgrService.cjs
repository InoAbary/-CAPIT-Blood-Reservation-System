require('dotenv').config();

let cachedToken = null;
let tokenExpiresAt = 0;
let refreshToken = null;


async function fetchToken() {
    const res = await fetch(`${process.env.BADGR_API}/o/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({
            username: BADGR_EMAIL,
            password: BADGR_PASSWORD
        })
    })

    const data = await res.json();
    cachedToken = data.access_token
    refreshToken = data.refresh_token
    tokenExpiresAt = Date.now() + (data.expires_in-60) * 1000
}

async function refreshAccessToken() {
    const res = await fetch(`${process.env.BADGR_API}/o/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        })
    })

    const data = await res.json();
    cachedToken = data.access_token
    refreshToken = data.refresh_token
    tokenExpiresAt = Date.now() + (data.expires_in-60) * 1000
}

async function getValidToken(){
    if (!cachedToken){
        await fetchToken()
    } else if (Date.now() >= tokenExpiresAt) {
        await refreshAccessToken();
    }

    return cachedToken;
}

async function badgrRequest(path, options = {}){
    const token = await getValidToken()
    const res = await fetch(`${BADGR_API}${path}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers,
        }
    })
    const data = await res.json()
    if (!data.status?.success){
        const err = new Error(data.status?.description || 'Badgr request failed');
        err.badgrErrors = { validationErrors: data.validationErrors, fieldErrors: data.fieldErrors };
        throw err;

    }

    return data.result;
}

async function issueBadge(recipientEmail, badgeClassId) {
    return badgrRequest(`/v2/badgclasses/${badgeClassId}/assertions`, {
        method: 'POST',
        body: JSON.stringify({
            identity: recipientEmail,
            type: 'email',
            hashed: true,
        }),
        notify: false
    })
}

module.exports = { issueBadge, badgrRequest }