const API_URL = "https://confident-transformation-production.up.railway.app/api";

export const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
};

export const apiFetch = async (endpoint, options = {}) => {
    const url = `${API_URL}${endpoint}`;
    const headers = getAuthHeaders();

    const response = await fetch(url, {
        ...options,
        headers: {
            ...headers,
            ...options.headers,
        },
    });

    if (response.status === 401) {
        // Handle unauthorized (maybe logout)
        localStorage.removeItem("token");
        localStorage.removeItem("isAuthenticated");
        window.location.href = "/";
    }

    return response.json();
};

export default API_URL;
