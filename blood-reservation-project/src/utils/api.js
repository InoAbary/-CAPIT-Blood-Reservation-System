const API_URL = "http://localhost:3000";

export const apiFetch = (endpoint, options = {}) => {
    return fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: "include"
    });
};

/*
 Import this function:

 import { apiFetch } from "../utils/api";

 Example: get inventory

    const response = await apiFetch("/api/inventories");
    const data = await response.json();

 Example: Create blood request

    const response = await apiFetch("/api/bloodForm", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

Example: logging out

    await apiFetch("/api/auth/logout", {
        method: "POST"
    });

*/
