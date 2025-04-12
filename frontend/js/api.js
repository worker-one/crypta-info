// API Interaction Logic
import { getAccessToken } from './auth.js'; // Import the auth function

const BASE_URL = 'https://8000-idx-crypta-info-1744406696956.cluster-6yqpn75caneccvva7hjo4uejgk.cloudworkstations.dev/api/v1'; // Replace with your actual API base URL

/**
 * Performs a fetch request to the API.
 * Handles adding Authorization header and basic error handling.
 * @param {string} endpoint - The API endpoint (e.g., '/auth/login')
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @param {boolean} requiresAuth - Whether to include the Authorization header
 * @returns {Promise<any>} - Resolves with the JSON response data or rejects with an error.
 */
async function fetchApi(endpoint, options = {}, requiresAuth = false) {
    const url = `${BASE_URL}${endpoint}`;
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    if (requiresAuth) {
        const token = getAccessToken(); // Use auth module's function
        if (token) {
            console.log("Using token for authenticated request"); // Debug log
            config.headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.warn('Attempted authenticated request without token.');
            // Optionally redirect to login or reject immediately
            return Promise.reject(new Error('Authentication required'));
        }
    }

    try {
        const response = await fetch(url, config);

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json(); // Try to parse error details
            } catch (e) {
                errorData = { message: `HTTP error! status: ${response.status}` };
            }
            // Enhance error message if possible
            const errorMessage = errorData?.detail?.[0]?.msg || errorData?.message || `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
        }

        // Handle cases with no content (e.g., 204 No Content)
        if (response.status === 204) {
            return null;
        }

        return await response.json();

    } catch (error) {
        console.error('API Fetch Error:', error);
        throw error; // Re-throw the error to be caught by the caller
    }
}

// --- Specific API Functions ---

/**
 * Fetches a list of exchanges (basic version).
 * @returns {Promise<object>} - The paginated response object { items: [...], total, skip, limit }
 */
export async function fetchExchanges(params = { skip: 0, limit: 10 }) {
    // Basic query string builder
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/exchanges/?${query}`);
}

/**
 * Fetches the current user's profile.
 * @returns {Promise<object>} - The user profile object.
 */
export async function getUserProfile() {
    return fetchApi('/auth/profile', { method: 'GET' }, true); // Requires authentication
}

/**
 * Registers a new user.
 * @param {string} email
 * @param {string} nickname
 * @param {string} password
 * @returns {Promise<object>} - The registered user profile object (adjust based on your API response)
 */
export async function registerUser(email, nickname, password) {
    // Note: API spec shows UserCreate requires 'avatar_url' but allows null.
    // We don't have an avatar upload yet, so we won't send it or send null if needed.
    // Check if your backend handles missing optional fields or requires explicit null.
    const payload = {
        email,
        nickname,
        password,
        // avatar_url: null // Include if backend requires it explicitly
    };
    return fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    // API returns UserRead on 201 Created
}

/**
 * Attempts to log in a user by calling the backend endpoint.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} - The token object { access_token, refresh_token, token_type } from the API.
 */
export async function loginUser(email, password) {
    // The API spec uses 'email' and 'password' in the LoginRequest schema.
    // If your backend expects 'username' instead of 'email' for the OAuth2 form data,
    // you might need to adjust the payload *or* how fetchApi handles form data vs JSON.
    // Assuming the API endpoint `/api/v1/auth/login` expects JSON body:
    return fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }), // Sending JSON
    });
}

// --- Admin API Functions ---

/**
 * Fetches a paginated list of all exchanges (admin version)
 * @param {object} params - Pagination and sorting parameters
 * @returns {Promise<object>} - The paginated response with exchange items
 */
export async function adminListExchanges(params = { skip: 0, limit: 10 }) {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/admin/exchanges/?${query}`, { method: 'GET' }, true); // Requires admin auth
}

/**
 * Creates a new exchange
 * @param {object} exchangeData - The exchange data object
 * @returns {Promise<object>} - The created exchange object
 */
export async function adminCreateExchange(exchangeData) {
    return fetchApi('/admin/exchanges/', {
        method: 'POST',
        body: JSON.stringify(exchangeData),
    }, true); // Requires admin auth
}

/**
 * Updates an existing exchange
 * @param {string|number} exchangeId - The exchange ID
 * @param {object} exchangeData - The updated exchange data
 * @returns {Promise<object>} - The updated exchange object
 */
export async function adminUpdateExchange(exchangeId, exchangeData) {
    return fetchApi(`/admin/exchanges/${exchangeId}`, {
        method: 'PATCH', // or PUT depending on your API
        body: JSON.stringify(exchangeData),
    }, true); // Requires admin auth
}

/**
 * Deletes an exchange
 * @param {string|number} exchangeId - The exchange ID to delete
 * @returns {Promise<null>} - Empty response on success
 */
export async function adminDeleteExchange(exchangeId) {
    return fetchApi(`/admin/exchanges/${exchangeId}`, {
        method: 'DELETE',
    }, true); // Requires admin auth
}

/**
 * Gets details for a specific exchange
 * @param {string} slug - The exchange slug
 * @returns {Promise<object>} - The exchange details
 */
export async function getExchangeDetails(slug) {
    return fetchApi(`/exchanges/${slug}`, { method: 'GET' }); // Public endpoint
}

/**
 * Lists all users (admin function)
 * @param {object} params - Pagination and filtering parameters
 * @returns {Promise<object>} - The paginated response with user items
 */
export async function adminListUsers(params = { skip: 0, limit: 50 }) {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/admin/users/?${query}`, { method: 'GET' }, true); // Requires admin auth
}

/**
 * Lists pending reviews that need moderation
 * @param {object} params - Pagination and filtering parameters
 * @returns {Promise<object>} - The paginated response with review items
 */
export async function adminListPendingReviews(params = { skip: 0, limit: 10 }) {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/admin/reviews/pending/?${query}`, { method: 'GET' }, true); // Requires admin auth
}