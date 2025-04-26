// API Interaction Logic
import { getAccessToken } from './auth.js'; // Import the auth function

// Base URL for API, taken from environment variable or fallback to default
const BASE_API_URL = 'http://localhost:8000/api/v1'

/**
 * Performs a fetch request to the API.
 * Handles adding Authorization header and basic error handling.
 * @param {string} endpoint - The API endpoint (e.g., '/auth/login')
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @param {boolean} requiresAuth - Whether to include the Authorization header
 * @returns {Promise<any>} - Resolves with the JSON response data or rejects with an error.
 */
async function fetchApi(endpoint, options = {}, requiresAuth = false) {
    const url = `${BASE_API_URL}${endpoint}`;
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
 * Supports filtering and sorting.
 * @param {object} params - Parameters like { skip, limit, name, country_id, kyc_type, has_p2p, supports_fiat_id, field, direction }
 * @returns {Promise<object>} - The paginated response object { items: [...], total, skip, limit }
 */
export async function fetchExchanges(params = { skip: 0, limit: 10 }) {
    // Clean up empty parameters before creating query string
    const cleanedParams = Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            acc[key] = value;
        }
        return acc;
    }, {});
    const query = new URLSearchParams(cleanedParams).toString();
    console.log("Fetching exchanges with query:", query); // Log the actual query
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
    // Use the public endpoint as requested, but still require admin auth for access control if needed on the frontend side
    // Note: The backend might not require auth for GET /exchanges/, but the admin panel context implies it might be desired.
    // If the public endpoint is truly public, the 'true' flag might be removed later.
    return fetchApi(`/exchanges/?${query}`, { method: 'GET' }, true); // Changed endpoint, kept auth requirement for admin context
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
 * Submits a review for a specific exchange.
 * @param {string|number} exchangeId - The ID of the exchange being reviewed.
 * @param {object} reviewData - The review data { comment: string, ratings: Array<{category_id: number, rating_value: number}> }.
 * @returns {Promise<object>} - The submitted review object (or confirmation).
 */
export async function submitExchangeReview(exchangeId, reviewData) {
    // Backend expects exchange_id in the path AND potentially in the body
    // The ExchangeReviewCreate schema likely includes exchange_id, so let's ensure it's there.
    // If your backend schema *doesn't* require exchange_id in the body, you can remove it here.
    const payload = {
            ...reviewData,
            exchange_id: parseInt(exchangeId, 10) // Ensure exchange_id is in the payload
    };
    return fetchApi(`/reviews/exchange/${exchangeId}`, { // ID in URL path
        method: 'POST',
        body: JSON.stringify(payload), // ID also in body
    }, true);
}

/**
 * Fetches the available rating categories.
 * @returns {Promise<Array<object>>} - Array of category objects { id: number, name: string, description: string|null }
 */
export async function getRatingCategories() {
    // Assuming you have an endpoint like /rating-categories/
    // Adjust the endpoint if necessary
    return fetchApi('/rating-categories/', { method: 'GET' });
}

/**
 * Lists approved reviews for a specific exchange.
 * @param {string|number} exchangeId - The ID of the exchange.
 * @param {object} params - Pagination and filtering parameters (e.g., { skip: 0, limit: 10, sort_by: 'created_at', direction: 'desc' })
 * @returns {Promise<object>} - The paginated response with review items.
 */
export async function listExchangeReviews(exchangeId, params = { skip: 0, limit: 10 }) {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/reviews/exchange/${exchangeId}?${query}`, { method: 'GET' }); // Public endpoint for approved reviews
}

/**
 * Vote on the usefulness of a review.
 * @param {string|number} reviewId - The ID of the review to vote on.
 * @param {boolean} isUseful - True if voting useful, false otherwise.
 * @returns {Promise<object>} - The updated review object.
 */
export async function voteOnReview(reviewId, isUseful) {
    return fetchApi(`/reviews/${reviewId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ is_useful: isUseful }),
    }, true); // Requires authentication
}

/**
 * Fetches the reviews submitted by the currently authenticated user.
 * @param {object} params - Pagination and filtering parameters (e.g., { skip: 0, limit: 10, moderation_status: 'approved' })
 * @returns {Promise<object>} - The paginated response with the user's review items.
 */
export async function listMyReviews(params = { skip: 0, limit: 10 }) {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/reviews/me?${query}`, { method: 'GET' }, true); // Requires authentication
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

/**
 * Lists all reviews for admin management (pending, approved, rejected)
 * @param {object} params - Pagination, filtering (e.g., moderation_status), and sorting parameters
 * @returns {Promise<object>} - The paginated response with review items
 */
export async function adminListReviews(params = { skip: 0, limit: 10 }) {
    const query = new URLSearchParams(params).toString();
    // Correct endpoint from admin_router in router.py
    return fetchApi(`/admin/reviews/?${query}`, { method: 'GET' }, true); // Requires admin auth
}

/**
 * Fetches the content of a static page by its slug.
 * @param {string} slug - The slug of the static page (e.g., 'about', 'faq').
 * @returns {Promise<object>} - The static page object { id, title, content, slug, ... }.
 */
export async function fetchStaticPage(slug) {
    // Assuming the static page endpoint is at the root level of the API
    // Adjust the path if your FastAPI app includes the static_pages router under a prefix like '/pages/'
    return fetchApi(`/${slug}`, { method: 'GET' }); // No auth needed for public pages
}

/**
 * Updates the status and/or moderator notes of a review (admin function).
 * Aligns with backend PATCH /admin/reviews/{review_id}/moderate
 * @param {string|number} reviewId - The ID of the review to update.
 * @param {object} moderationPayload - The update payload { moderation_status: string, moderator_notes?: string }.
 * @returns {Promise<object>} - The updated review object.
 */
export async function adminModerateReview(reviewId, moderationPayload) {
    // Ensure moderation_status is one of the expected values by the backend
    if (!['approved', 'rejected'].includes(moderationPayload.moderation_status)) {
        return Promise.reject(new Error("Invalid moderation status provided. Must be 'approved' or 'rejected'."));
    }
    return fetchApi(`/admin/reviews/${reviewId}/moderate`, { // Corrected endpoint
        method: 'PATCH', // Corrected method
        body: JSON.stringify(moderationPayload),
    }, true); // Requires admin auth
}

// --- Keep the old function name for now if other parts rely on it, but point it to the new one ---
// Or refactor admin.js to use adminModerateReview directly
/** @deprecated Use adminModerateReview instead */
export async function adminUpdateReviewStatus(reviewId, statusUpdate) {
    console.warn("adminUpdateReviewStatus is deprecated. Use adminModerateReview.");
    // Map the old payload structure if necessary, assuming statusUpdate contains { moderation_status, moderator_notes }
    return adminModerateReview(reviewId, statusUpdate);
}

// --- News API Functions ---

/**
 * Fetches a list of news items.
 * @param {object} params - Pagination parameters (e.g., { skip: 0, limit: 10 })
 * @returns {Promise<object>} - The paginated response object { items: [...], total, skip, limit }
 */
export async function listNews(params = { skip: 0, limit: 10 }) {
    const query = new URLSearchParams(params).toString();
    // Assuming news is public, no auth needed
    return fetchApi(`/news/?${query}`, { method: 'GET' });
}

/**
 * Fetches details for a specific news item.
 * @param {string|number} newsId - The ID of the news item.
 * @returns {Promise<object>} - The news item object.
 */
export async function getNewsItem(newsId) {
    // Assuming news is public, no auth needed
    return fetchApi(`/news/${newsId}`, { method: 'GET' });
}

// --- Guide API Functions ---

/**
 * Fetches a list of guide items, optionally filtered by exchange ID.
 * @param {object} params - Parameters including pagination (skip, limit) and filtering (exchange_id).
 * @returns {Promise<object>} - The paginated response object { items: [...], total, skip, limit }
 */
export async function listGuides(params = { skip: 0, limit: 10 }) {
    // Clean up empty parameters
    const cleanedParams = Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            acc[key] = value;
        }
        return acc;
    }, {});
    const query = new URLSearchParams(cleanedParams).toString();
    // Assuming guides are public, no auth needed.
    return fetchApi(`/guides/?${query}`, { method: 'GET' });
}

/**
 * Fetches details for a specific guide item.
 * @param {string|number} guideId - The ID of the guide item.
 * @returns {Promise<object>} - The guide item object.
 */
export async function getGuideItem(guideId) {
    // Assuming guides are public, no auth needed
    return fetchApi(`/guides/${guideId}`, { method: 'GET' });
}

/**
 * Fetches a list of all countries.
 * @returns {Promise<Array<object>>} - Array of country objects { id: number, name: string, code: string }
 */
export async function fetchCountries() {
    // Assuming a public endpoint /countries/ exists
    return fetchApi('/common/countries/', { method: 'GET' });
}

/**
 * Fetches a list of all fiat currencies.
 * @returns {Promise<Array<object>>} - Array of fiat currency objects { id: number, name: string, code: string, symbol: string }
 */
export async function fetchFiatCurrencies() {
    // Assuming a public endpoint /fiat-currencies/ exists
    return fetchApi('/common/fiat_currencies/', { method: 'GET' });
}

/** addLogoutHandler
 * 
 */
export function addLogoutHandler(logoutButton, redirectUrl) {
    if (!logoutButton) return;

    logoutButton.addEventListener('click', async (event) => {
        event.preventDefault();
        try {
            await fetchApi('/auth/logout', { method: 'POST' }, true); // Requires auth
            // Optionally clear local storage or cookies here
            window.location.href = redirectUrl || '/'; // Redirect to home or specified URL
        } catch (error) {
            console.error('Logout failed:', error);
            alert('Logout failed. Please try again.');
        }
    });
}
