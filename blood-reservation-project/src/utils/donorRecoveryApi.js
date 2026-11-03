// Use VITE_API_URL=http://localhost:3000 for the supplied Express server.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

async function postRecovery(path, body) {
    let response;
    try {
        response = await fetch(`${API_URL}/api/donor/${path}`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } catch {
        throw new Error('Cannot reach the server. Check your connection and try again.');
    }
    let result;
    try { result = await response.json(); }
    catch {
        throw new Error('The server returned an unexpected response. Check the backend URL and recovery routes.');
    }
    if (!response.ok || result?.success !== true) {
        throw new Error(result?.message || 'The request could not be completed. Please try again.');
    }
    return result;
}
export const requestDonorPasswordReset = email => postRecovery('forgotpassword', { email });
export const resetDonorPassword = (token, password) => postRecovery('resetpassword', { token, password });
