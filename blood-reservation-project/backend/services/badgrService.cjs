require('dotenv').config();

let cachedToken = null;
let tokenExpiresAt = 0;
let refreshToken = null;


async function fetchToken() {

    
    const res = await fetch(`${process.env.BADGR_API}/o/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({
            username: process.env.BADGR_EMAIL,
            password: process.env.BADGR_PASSWORD
        })
    })

    const data = await res.json();

    if (!data.access_token) {
        console.error('Badgr token response:', data);  
        throw new Error(`Failed to get Badgr token: ${data.error || data.error_description || 'unknown'}`);
    }

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
    const res = await fetch(`${process.env.BADGR_API}${path}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers,
        }
    })
    const data = await res.json()
    if (!data.status?.success){
        const detail =
            (Array.isArray(data.validationErrors) && data.validationErrors.length)
                ? data.validationErrors.join('; ')
                : (data.fieldErrors && Object.keys(data.fieldErrors).length)
                    ? Object.entries(data.fieldErrors)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                        .join('; ')
                    : data.status?.description
                    || 'Badgr request failed';
        const err = new Error(detail);
        err.badgrErrors = {
            validationErrors: data.validationErrors,
            fieldErrors: data.fieldErrors,
        };
        err.raw = data;  // keep the full payload for debugging
        throw err;
    }

    return data.result;
}

async function issueBadge(recipientEmail, badgeClassId) {
    return badgrRequest(`/v2/badgeclasses/${badgeClassId}/assertions`, {
        method: 'POST',
        body: JSON.stringify({
            recipient: {
                identity: recipientEmail,
                type: 'email',
                hashed: true,
            },
            notify: false
        }),
        
    })
}

async function createIssuer(issuerData) {
    return badgrRequest('/v2/issuers', {
        method: 'POST',
        body: JSON.stringify({
            name: issuerData.name,           // Required
            description: issuerData.description, // Required
            url: issuerData.url,             // Required, a publicly accessible page introducing the issuer
            email: issuerData.email,         // Required, must be a verified email on your Badgr account
            image: issuerData.image          // Optional, base64-encoded PNG or SVG
        })
    })
}

async function getIssuers() {
    return badgrRequest('/v2/issuers')
}

async function createBadgeClass( badgeData) {
    return badgrRequest(`/v2/badgeclasses`, {
        method: 'POST',
        body: JSON.stringify({
            name: badgeData.name,
            description: badgeData.description,
            image: badgeData.image,
            criteriaNarrative: badgeData.criteriaNarrative
        })
    })
}

async function getDonorBadges(email) {
    return badgrRequest(`/v2/backpack/assertions?recipient=${encodeURIComponent(email)}`)
}


module.exports = { issueBadge, getIssuers, createBadgeClass, getDonorBadges, createIssuer }