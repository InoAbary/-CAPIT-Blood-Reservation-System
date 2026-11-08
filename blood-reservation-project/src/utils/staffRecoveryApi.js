const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
async function post(path, body) {
  let response;
  try {
    response = await fetch(`${API_URL}/api/staff-recovery/${path}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch { throw new Error('Cannot connect to the server.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.message || 'Request failed.');
  return data;
}
export const requestStaffPasswordReset = email => post('forgotpassword', { email });
export const resetStaffPassword = (token, password) => post('resetpassword', { token, password });
