// Main Application Logic and Initialization
import { handleLogin, handleLogout, checkAndCacheUserProfile, handleRegister } from './auth.js'; // Add handleRegister import
import { updateHeaderNav, renderExchangeList, displayErrorMessage, clearErrorMessage, initTableViewToggle } from './ui.js'; // clearErrorMessage and initTableViewToggle potentially needed
import { fetchExchanges } from './api.js';

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    // Check login status and update UI immediately
    // Also fetches profile if logged in but not cached
    checkAndCacheUserProfile(); // This now calls updateHeaderNav internally

    // Crucial: Checks login status on EVERY page load and updates header
    checkAndCacheUserProfile();

    // --- Page-Specific Logic ---
    const pathname = window.location.pathname;

    // == Login Page Specific Logic ==
    if (pathname === '/login.html') {
        console.log("On login page");
        const loginForm = document.getElementById('login-form');
        const submitButton = document.getElementById('login-submit-btn');

        loginForm?.addEventListener('submit', async (event) => {
            event.preventDefault(); // Stop browser's default form submission
            console.log("Login form submitted");

            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const errorElementId = 'login-error-message'; // Target div for errors

            if (emailInput && passwordInput && submitButton) {
                const email = emailInput.value;
                const password = passwordInput.value;

                // Visual feedback: Disable button
                submitButton.disabled = true;
                submitButton.textContent = 'Logging in...';

                // Call the core login handler
                await handleLogin(email, password, errorElementId);

                // Re-enable button ONLY if login failed and we are still on the page
                const currentButton = document.getElementById('login-submit-btn');
                if (currentButton) { // Check if element still exists (might have navigated away)
                    currentButton.disabled = false;
                    currentButton.textContent = 'Login';
                }
            } else {
                console.error("Login form elements not found!");
                // Display a generic error if elements are missing
                displayErrorMessage(errorElementId, "Form elements missing. Cannot log in.");
            }
        });
    }

    // == Homepage Logic ==
    if (pathname === '/' || pathname === '/index.html') {
        console.log("On homepage");
        
        // Initialize table view toggle if we're on the homepage
        if (document.getElementById('exchange-table')) {
            initTableViewToggle();
        }

        // Load exchanges if we're on the homepage
        if (document.getElementById('exchange-list-body')) {
            loadHomepageExchanges();
        }

        const searchForm = document.getElementById('search-filter-form');
        searchForm?.addEventListener('submit', (event) => {
            event.preventDefault();
            console.log("Search submitted");
            const searchTerm = document.getElementById('search-input').value;
            // Reload exchanges with search parameter
            loadHomepageExchanges({ name: searchTerm });
        });
    }

    // == Login Page Logic ==
    if (pathname === '/login.html') {
        console.log("On login page");
        const loginForm = document.getElementById('login-form');
        const submitButton = document.getElementById('login-submit-btn');

        loginForm?.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission
            console.log("Login form submitted");

            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const errorElementId = 'login-error-message'; // ID of the error display div

            if (emailInput && passwordInput && submitButton) {
                const email = emailInput.value;
                const password = passwordInput.value;

                // Disable button during login attempt
                submitButton.disabled = true;
                submitButton.textContent = 'Logging in...';

                await handleLogin(email, password, errorElementId);

                // Re-enable button if login failed (stayed on page)
                // Check if button still exists (might have navigated away on success)
                const currentButton = document.getElementById('login-submit-btn');
                if (currentButton) {
                    currentButton.disabled = false;
                    currentButton.textContent = 'Login';
                }
            } else {
                console.error("Login form elements not found!");
            }
        });
    }

    // == Register Page Logic ==
    if (pathname === '/register.html') {
        console.log("On register page");
        const registerForm = document.getElementById('register-form');
        const submitButton = document.getElementById('register-submit-btn');
        const passwordInput = document.getElementById('password');
        const passwordConfirmInput = document.getElementById('password-confirm');
        const passwordMatchError = document.getElementById('password-match-error');

        // Basic client-side password match validation
        const validatePasswordMatch = () => {
            if (passwordInput.value !== passwordConfirmInput.value && passwordConfirmInput.value.length > 0) {
                passwordMatchError.textContent = 'Passwords do not match.';
                passwordMatchError.classList.add('visible');
                return false;
            } else {
                passwordMatchError.textContent = '';
                passwordMatchError.classList.remove('visible');
                return true;
            }
        };

        passwordInput?.addEventListener('input', validatePasswordMatch);
        passwordConfirmInput?.addEventListener('input', validatePasswordMatch);

        registerForm?.addEventListener('submit', async (event) => {
            event.preventDefault();
            console.log("Register form submitted");

            // Perform final password match check before submitting
            if (!validatePasswordMatch()) {
                passwordConfirmInput.focus(); // Focus the confirmation field
                return; // Stop submission if passwords don't match
            }

            const emailInput = document.getElementById('email');
            const nicknameInput = document.getElementById('nickname');
            // Password inputs already defined above
            const errorElementId = 'register-error-message';
            const successElementId = 'register-success-message';

            if (emailInput && nicknameInput && passwordInput && submitButton) {
                const email = emailInput.value;
                const nickname = nicknameInput.value;
                const password = passwordInput.value; // Use the first password field's value

                // Disable button during registration attempt
                submitButton.disabled = true;
                submitButton.textContent = 'Registering...';

                const success = await handleRegister(email, nickname, password, errorElementId, successElementId);

                // Re-enable button if registration failed (stayed on page)
                // Check if button still exists
                const currentButton = document.getElementById('register-submit-btn');
                if (currentButton) {
                    currentButton.disabled = false;
                    currentButton.textContent = 'Register';
                }

                if (success) {
                    // Optionally clear the form on success
                    registerForm.reset();
                }

            } else {
                console.error("Register form elements not found!");
                displayErrorMessage(errorElementId, "An unexpected error occurred setting up the form.");
            }
        });
    }

    // == Global Event Listeners ==
    const logoutBtn = document.getElementById('nav-logout-btn');
    logoutBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        console.log("Logout button clicked");
        handleLogout(); // Call the logout handler from auth.js
    });

});

// --- Helper Functions ---
/**
 * Fetches and displays exchanges on the homepage table.
 * @param {object} params - Optional parameters for filtering/searching exchanges.
 */
async function loadHomepageExchanges(params = {}) {
    // *** Use the correct IDs from the HTML ***
    const tbodyId = 'exchange-list-body';         // <--- ID of the tbody
    const loadingIndicatorId = 'loading-exchanges';
    const errorContainerId = 'exchange-list-error'; // <--- ID of the error div

    const loadingIndicator = document.getElementById(loadingIndicatorId);
    const tbody = document.getElementById(tbodyId); // Get the tbody element
    const errorContainer = document.getElementById(errorContainerId);

    // Show loading, clear previous state
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (tbody) tbody.innerHTML = ''; // Clear previous table rows
    if (errorContainer) errorContainer.classList.remove('visible'); // Hide previous errors

    try {
        console.log("Fetching exchanges with params:", params);
        // Add default sorting if desired, e.g., by rating desc
        const queryParams = {
            field: 'overall_average_rating',
            direction: 'desc',
            limit: 25, // Fetch more for a table view?
            ...params // Merge search/filter params
        };
        const data = await fetchExchanges(queryParams);
        console.log("Exchanges received:", data);

        if (data && data.items) {
            // Call the updated rendering function with correct IDs
            renderExchangeList(data.items, tbodyId, loadingIndicatorId, errorContainerId);
        } else {
            // Handle cases like empty 'items' array correctly via renderExchangeList
            renderExchangeList([], tbodyId, loadingIndicatorId, errorContainerId);
            // Or throw an error if the structure is unexpected
            // throw new Error("Invalid data structure received from server.");
        }

    } catch (error) {
        console.error("Failed to load exchanges:", error);
        if (loadingIndicator) loadingIndicator.style.display = 'none'; // Hide loading on error
        // Display error message in the designated container
        displayErrorMessage(errorContainerId, `Error loading exchanges: ${error.message}`);
        // Optionally clear the tbody again or show error row in table
        if (tbody) tbody.innerHTML = ''; // Clear potential partial data
    }
}