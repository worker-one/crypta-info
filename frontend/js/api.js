// API Interaction Logic
import { getAccessToken } from './auth.js'; // Import the auth function

// Base URL for API, taken from environment variable or fallback to default
const BASE_API_URL = 'http://176.124.219.116:8300/api/v1'

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
 * Fetches the content of a static page by its slug.
 * @param {string} slug - The slug of the static page (e.g., 'about', 'faq').
 * @returns {Promise<object>} - The static page data { title: string, content: string, slug: string }.
 */
export async function fetchStaticPage(slug) {
    return fetchApi(`/${slug}`, { method: 'GET' }); // Public endpoint
}

/**
 * Fetches a list of exchanges (basic version).
 * Supports filtering and sorting.
 * @param {object} params - Parameters like { 
 *   skip, limit, name, country_id, has_kyc, has_p2p, supports_fiat_id, 
 *   field, direction, 
 *   min_spot_maker_fee, max_spot_maker_fee, 
 *   min_futures_maker_fee, max_futures_maker_fee, 
 *   min_spot_taker_fee, max_spot_taker_fee, 
 *   min_futures_taker_fee, max_futures_taker_fee,
 *   min_total_review_count, max_total_review_count,
 *   min_total_rating_count, max_total_rating_count
 * }
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
    const payload = {
        email,
        nickname,
        password,
    };
    return fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/**
 * Attempts to log in a user by calling the backend endpoint.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} - The token object { access_token, refresh_token, token_type } from the API.
 */
export async function loginUser(email, password) {
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
    return fetchApi(`/exchanges/?${query}`, { method: 'GET' }, true); // Requires admin auth
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
 * @param {string} slug - The exchange slug
 * @param {object} exchangeData - The updated exchange data
 * @returns {Promise<object>} - The updated exchange object
 */
export async function adminUpdateExchange(slug, exchangeData) {
    return fetchApi(`/admin/exchanges/${slug}`, {
        method: 'PUT', // Changed from PATCH/POST to PUT as per new spec
        body: JSON.stringify(exchangeData),
    }, true); // Requires admin auth
}

/**
 * Deletes an exchange
 * @param {string} slug - The exchange slug to delete
 * @returns {Promise<null>} - Empty response on success (204)
 */
export async function adminDeleteExchange(slug) {
    return fetchApi(`/admin/exchanges/${slug}`, { // Use slug instead of ID
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
 * Gets details for a specific item by its ID.
 * @param {string|number} itemId - The ID of the item.
 * @returns {Promise<object>} - The item details object.
 */
export async function getItemDetails(itemId) {
    return fetchApi(`/items/${itemId}`, { method: 'GET' }); // Assuming public endpoint
}

/**
 * Submits a review for a specific item (e.g., exchange, book).
 * @param {string|number} itemId - The ID of the item being reviewed.
 * @param {object} reviewData - The review data { comment: string, rating: number, guest_name?: string }.
 * @returns {Promise<object>} - The submitted review object (or confirmation).
 */
export async function submitItemReview(itemId, reviewData) {
    // Ensure item_id and rating are in the payload
    const payload = {
        comment: reviewData.comment,
        rating: reviewData.rating, // Send single rating
        moderation_status: reviewData.moderation_status || 'pending', // Default to pending if not provided
        item_id: parseInt(itemId, 10)
    };

    if (reviewData.guest_name) {
        payload.guest_name = reviewData.guest_name;
    }

    // Validate rating is a number between 1 and 5 if needed here
    if (typeof payload.rating !== 'number' || payload.rating < 1 || payload.rating > 5) {
        return Promise.reject(new Error('Rating must be a number between 1 and 5.'));
    }

    // If guest_name is provided, it's an unauthenticated request.
    // Otherwise, it's an authenticated request (if a token exists).
    const token = getAccessToken();
    const requiresAuth = !payload.guest_name && !!token;


    return fetchApi(`/reviews/item/${itemId}`, { // ID in URL path
        method: 'POST',
        body: JSON.stringify(payload), // Send payload
    }, requiresAuth);
}

/**
 * Lists approved reviews for a specific item (e.g., exchange, book).
 * @param {string|number} itemId - The ID of the item.
 * @param {object} params - Pagination and filtering parameters (e.g., { skip: 0, limit: 10, sort_by: 'created_at', direction: 'desc' })
 * @returns {Promise<object>} - The paginated response with review items.
 */
export async function listItemReviews(itemId, params = { skip: 0, limit: 10 }) {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/reviews/item/${itemId}?${query}`, { method: 'GET' }); // Public endpoint for approved reviews
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
    return fetchApi(`/reviews/admin/reviews/?${query}`, { method: 'GET' }, true); // Requires admin auth
}

/**
 * Updates the status and/or moderator notes of a review (admin function).
 * Aligns with backend PUT /api/v1/reviews/admin/reviews/{review_id}/status
 * @param {string|number} reviewId - The ID of the review to update.
 * @param {object} moderationPayload - The update payload { moderation_status: string, moderator_notes?: string }.
 * @returns {Promise<object>} - The updated review object.
 */
export async function adminModerateReview(reviewId, moderationPayload) {
    if (moderationPayload.moderation_status && !['pending', 'approved', 'rejected'].includes(moderationPayload.moderation_status)) {
        return Promise.reject(new Error("Invalid moderation status provided. Must be 'pending', 'approved' or 'rejected'."));
    }
    return fetchApi(`/reviews/admin/reviews/${reviewId}/status`, {
        method: 'PUT', // Corrected method to PUT
        body: JSON.stringify(moderationPayload),
    }, true); // Requires admin auth
}

// --- Новости биржи API Functions ---

/**
 * Fetches a list of news items.
 * @param {object} params - Pagination parameters (e.g., { skip: 0, limit: 10 })
 * @returns {Promise<object>} - The paginated response object { items: [...], total, skip, limit }
 */
export async function listNews(params = { skip: 0, limit: 10 }) {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/news/?${query}`, { method: 'GET' });
}

/**
 * Fetches details for a specific news item.
 * @param {string|number} newsId - The ID of the news item.
 * @returns {Promise<object>} - The news item object.
 */
export async function getNewsItem(newsId) {
    return fetchApi(`/news/${newsId}`, { method: 'GET' });
}

// --- Book API Functions ---

/**
 * Fetches a list of books.
 * @param {object} params - Filtering, sorting, and pagination parameters (e.g., { skip: 0, limit: 10, name, topic_id, field, direction })
 * @returns {Promise<object>} - The paginated response object { items: [...], total, skip, limit }
 */
export async function listBooks(params = { skip: 0, limit: 10 }) {
    const cleanedParams = Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            acc[key] = value;
        }
        return acc;
    }, {});
    const query = new URLSearchParams(cleanedParams).toString();
    return fetchApi(`/books/?${query}`, { method: 'GET' });
}

/**
 * Fetches a paginated, filtered, and sorted list of books.
 * @param {object} params - Filtering, sorting, and pagination parameters (e.g., { skip, limit, name, topic_id, field, direction })
 * @returns {Promise<object>} - The paginated response object { items: [...], total, skip, limit }
 */
export async function fetchBooks(params = { skip: 0, limit: 10 }) {
    return listBooks(params);
}

/**
 * Fetches details for a specific book by its slug.
 * @param {string} slug - The slug of the book.
 * @returns {Promise<object>} - The book details object.
 */
export async function getBookDetails(slug) {
    return fetchApi(`/books/${slug}`, { method: 'GET' });
}

/**
 * Fetches a list of all book topics.
 * @returns {Promise<Array<object>>} - Array of topic objects { id: number, name: string }
 */
export async function fetchBookTopics() {
    return fetchApi('/books/topics/', { method: 'GET' });
}

// --- Инструкции API Functions ---

/**
 * Fetches a list of guide items, optionally filtered by exchange ID.
 * @param {object} params - Parameters including pagination (skip, limit) and filtering (exchange_id).
 * @returns {Promise<object>} - The paginated response object { items: [...], total, skip, limit }
 */
export async function listGuides(params = { skip: 0, limit: 10 }) {
    const cleanedParams = Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            acc[key] = value;
        }
        return acc;
    }, {});
    const query = new URLSearchParams(cleanedParams).toString();
    return fetchApi(`/guides/?${query}`, { method: 'GET' });
}

/**
 * Fetches details for a specific guide item.
 * @param {string|number} guideId - The ID of the guide item.
 * @returns {Promise<object>} - The guide item object.
 */
export async function getGuideItem(guideId) {
    return fetchApi(`/guides/${guideId}`, { method: 'GET' });
}

/**
 * Fetches a list of all countries.
 * @returns {Promise<Array<object>>} - Array of country objects { id: number, name: string, code: string }
 */
export async function fetchCountries() {
    return fetchApi('/common/countries/', { method: 'GET' });
}

/**
 * Fetches a list of all fiat currencies.
 * @returns {Promise<Array<object>>} - Array of fiat currency objects { id: number, name: string, code: string, symbol: string }
 */
export async function fetchFiatCurrencies() {
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
            window.location.href = redirectUrl || '/'; // Redirect to home or specified URL
        } catch (error) {
            console.error('Logout failed:', error);
            alert('Logout failed. Please try again.');
        }
    });
}