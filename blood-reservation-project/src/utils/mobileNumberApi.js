async function post(path, body) {
  const response = await fetch(`/api/donor/mobile-number/${path}`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'The request could not be completed. Please try again.');
  return result;
}

export const requestMobileNumberChange = mobileNumber => post('request', { mobileNumber });
export const confirmMobileNumberChange = token => post('confirm', { token });
