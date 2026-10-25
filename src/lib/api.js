export async function api(url, options = {}) {
  let accessToken = '';
  try {
    accessToken = JSON.parse(localStorage.getItem('adminUser') || 'null')?.accessToken || '';
  } catch {
    accessToken = '';
  }
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
  };

  const response = await fetch(url, config);
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json') && !contentType.includes('+json')) {
    const err = new Error(
      `The API at ${url} did not return JSON. The backend may not be running or this endpoint may be unavailable.`,
    );
    err.status = response.status;
    throw err;
  }

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.error || errorJson.message || errorDetail;
    } catch {
      // ignore
    }
    const err = new Error(errorDetail || `Request failed with status ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return response.json();
}

export function getErrorMessage(error) {
  if (!error) return 'An unexpected error occurred.';
  if (typeof error === 'string') return error;
  return error.message || 'Request failed. Please try again.';
}
