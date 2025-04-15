import { loginUser, getUserProfile, registerUser } from './api.js'; // Add registerUser import
import { updateHeaderNav, displayErrorMessage, clearErrorMessage, displaySuccessMessage } from './ui.js'; // Import UI functions

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_PROFILE_KEY = 'userProfile';

// Token handling functions
export function saveTokens(accessToken, refreshToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    console.log("Tokens saved to localStorage"); // Debug log
}

export function getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearAuthData() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_PROFILE_KEY);
}

export function isLoggedIn() {
    return !!getAccessToken();
}

// Profile handling functions
function saveUserProfile(profile) {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

export function getUserProfileData() {
    const profileData = localStorage.getItem(USER_PROFILE_KEY);
    return profileData ? JSON.parse(profileData) : null;
}

/**
 * Handles the login process triggered by the form submission.
 * Calls the API, saves tokens, fetches profile, updates UI, and redirects.
 * @param {string} email
 * @param {string} password
 * @param {string} errorElementId - ID of the element to display login errors.
 * @returns {Promise<boolean>} - True if login successful, false otherwise.
 */
export async function handleLogin(email, password, errorElementId) {
    clearErrorMessage(errorElementId); // Clear previous errors
    try {
        console.log(`Attempting login for ${email}...`);
        // 1. Call the API function
        const data = await loginUser(email, password);
        console.log("Login API success:", data);

        // 2. Check for tokens in the response
        if (data.access_token && data.refresh_token) {
            // 3. Save tokens
            saveTokens(data.access_token, data.refresh_token);
            console.log("Tokens received and saved.");

            // 4. Fetch and save user profile immediately
            try {
                 const profile = await getUserProfile(); // Uses the newly saved token
                 saveUserProfile(profile);
                 console.log("User profile fetched and saved:", profile);
            } catch (profileError) {
                console.error("Failed to fetch profile after login:", profileError);
                // Decide how critical this is. Maybe proceed, maybe show warning.
                // If profile fetch fails due to auth, the token might be bad despite being received.
                clearAuthData(); // Clear potentially bad tokens
                displayErrorMessage(errorElementId, 'Login succeeded but failed to fetch profile. Please try again.');
                return false;
            }

            // 5. Update navigation UI
            updateHeaderNav();

            // 6. Redirect to the main page
            window.location.href = '/'; // Or '/' depending on your server setup
            return true;
        } else {
            // Handle cases where API responds 200 OK but doesn't include tokens (shouldn't happen with correct API)
            console.error("Login response missing tokens:", data);
            displayErrorMessage(errorElementId, 'Login failed: Invalid response from server.');
            return false;
        }
    } catch (error) {
        // Handle API errors (network, 4xx, 5xx)
        console.error('Login failed:', error);
        const message = error.message || 'Login failed. Please check your credentials or server status.';
        displayErrorMessage(errorElementId, message);
        return false;
    }
}

/**
 * Fetches and caches the user profile if logged in and not already cached.
 * Also updates the header navigation based on the final login state.
 * Should be called on page load for all pages.
 */
export async function checkAndCacheUserProfile() {
    if (isLoggedIn() && !getUserProfileData()) {
        try {
            const profile = await getUserProfile();
            saveUserProfile(profile);
            console.log("User profile fetched and cached on load:", profile);
        } catch (error) {
            console.error("Failed to fetch user profile on load:", error);
             // Check error status or message for unauthorized indication
             if (error.status === 401 || (error.message && (error.message.includes('401') || error.message.includes('Unauthorized')))) {
                 // Token might be invalid/expired - Clean up
                 console.log("Token likely invalid, logging out.");
                 clearAuthData(); // Use clearAuthData instead of handleLogout to avoid redirect loop
             }
             // Note: No 'else' block needed here, we proceed to updateHeaderNav regardless
        }
    }
    // Always update the header nav based on the current state AFTER attempting profile fetch/cache
    updateHeaderNav();
}

/**
 * Handles the logout process.
 */
export function handleLogout() {
    clearAuthData();
    updateHeaderNav();
    // Optionally redirect to login page or refresh current page
     window.location.href = '/login.html'; // Redirect to login
    console.log("User logged out.");
}

/**
 * Handles the registration process.
 * @param {string} email
 * @param {string} nickname
 * @param {string} password
 * @param {string} errorElementId - ID of the main error element.
 * @param {string} successElementId - ID of the success message element.
 * @returns {Promise<boolean>} - True if registration successful, false otherwise.
 */
export async function handleRegister(email, nickname, password, errorElementId, successElementId) {
    clearErrorMessage(errorElementId);
    clearErrorMessage(successElementId); // Clear previous success message too

    try {
        console.log(`Attempting registration for ${email}...`);
        const userProfile = await registerUser(email, nickname, password);
        console.log("Registration API success:", userProfile);

        // Handle success: Display message, maybe redirect to login or auto-login
        displaySuccessMessage(successElementId, `Registration successful for ${userProfile.nickname}! Please check your email for verification (if applicable) and log in.`);

        // Option 1: Redirect to login page after a short delay
        // setTimeout(() => {
        //     window.location.href = '/login.html';
        // }, 3000); // 3 second delay

        // Option 2: Clear form (handled in main.js perhaps)

        return true;

    } catch (error) {
        console.error('Registration failed:', error);
        // Attempt to extract more specific error messages if available (e.g., email already exists)
        const message = error.message || 'Registration failed. Please try again.';
        displayErrorMessage(errorElementId, message);
        return false;
    }
}