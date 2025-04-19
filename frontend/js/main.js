// Main Application Logic and Initialization
import { handleLogin, handleLogout, checkAndCacheUserProfile, handleRegister } from './auth.js';
import { updateHeaderNav, renderExchangeList, displayErrorMessage, clearErrorMessage, initTableViewToggle } from './ui.js';
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
        // if (document.getElementById('exchange-table')) {
        //     initTableToggle();
        // }

        // Load exchanges if we're on the homepage
        if (document.getElementById('exchange-list-body')) {
            loadHomepageExchanges();
        }

        const searchForm = document.getElementById('search-filter-form');
        searchForm?.addEventListener('submit', (event) => {
            event.preventDefault();
            console.log("Search submitted");
            const searchTerm = document.getElementById('search-input').value;

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

/**
 * Initialize table/card toggle functionality
 */
function initTableToggle() {
    const toggleBtn = document.getElementById('toggle-view-btn');
    const tableView = document.getElementById('exchange-table');
    const cardView = document.getElementById('exchange-card-container');
    const tableViewText = toggleBtn.querySelector('.table-view-text');
    const cardViewText = toggleBtn.querySelector('.card-view-text');
    
    // Check initial state based on screen size
    const isSmallScreen = window.innerWidth <= 767;
    if (isSmallScreen) {
        toggleToCardView();
    }
    
    toggleBtn.addEventListener('click', () => {
        if (tableView.classList.contains('hidden')) {
            toggleToTableView();
        } else {
            toggleToCardView();
        }
    });
    
    // Helper functions
    function toggleToCardView() {
        tableView.classList.add('hidden');
        cardView.classList.remove('hidden');
        tableViewText.classList.remove('hidden');
        cardViewText.classList.add('hidden');
    }
    
    function toggleToTableView() {
        tableView.classList.remove('hidden');
        cardView.classList.add('hidden');
        tableViewText.classList.add('hidden');
        cardViewText.classList.remove('hidden');
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        const isSmallScreen = window.innerWidth <= 767;
        if (isSmallScreen && !cardView.classList.contains('hidden')) {
            // Already in card view, no change needed
        } else if (isSmallScreen) {
            toggleToCardView();
        }
    });
}

// --- Helper Functions ---
/**
 * Fetches and displays exchanges on the homepage table.
 * @param {object} params - Optional parameters for filtering/searching exchanges.
 */
async function loadHomepageExchanges(params = {}) {
    // *** Use the correct IDs from the HTML ***
    const tbodyId = 'exchange-list-body';
    const cardContainerId = 'exchange-card-container';
    const loadingIndicatorId = 'loading-exchanges';
    const errorContainerId = 'exchange-list-error';

    const loadingIndicator = document.getElementById(loadingIndicatorId);
    const tbody = document.getElementById(tbodyId);
    const cardContainer = document.getElementById(cardContainerId);
    const errorContainer = document.getElementById(errorContainerId);

    // Show loading, clear previous state
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (tbody) tbody.innerHTML = '';
    if (cardContainer) cardContainer.innerHTML = '';
    if (errorContainer) errorContainer.classList.remove('visible');

    try {
        console.log("Fetching exchanges with params:", params);
        const queryParams = {
            field: 'overall_average_rating',
            direction: 'desc',
            limit: 25,
            ...params
        }; 
        if(params.name === "") {
            delete queryParams.name;
        }
        const data = await fetchExchanges(queryParams);
        console.log("Exchanges received:", data);

        if (data && data.items) {
            // Render table view
            renderExchangeList(data.items, tbodyId, loadingIndicatorId, errorContainerId);
            
            // Render card view
            renderCardView(data.items, cardContainerId);
            
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        } else {
            renderExchangeList([], tbodyId, loadingIndicatorId, errorContainerId);
            renderCardView([], cardContainerId);
        }

    } catch (error) {
        console.error("Failed to load exchanges:", error);
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        displayErrorMessage(errorContainerId, `Error loading exchanges: ${error.message}`);
        if (tbody) tbody.innerHTML = '';
        if (cardContainer) cardContainer.innerHTML = '';
    }
}

/**
 * Renders exchanges as cards in the card container
 * @param {Array} exchanges - Array of exchange objects
 * @param {string} containerId - ID of the card container element
 */
function renderCardView(exchanges, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (exchanges && exchanges.length > 0) {
        exchanges.forEach(exchange => {
            const card = document.createElement('div');
            card.className = 'exchange-card';
            
            // Format data for display
            const ratingValue = parseFloat(exchange.overall_average_rating);
            const formattedRating = isNaN(ratingValue) ? 'N/A' : ratingValue.toFixed(1);
            const reviewCount = exchange.total_review_count?.toLocaleString() ?? 'N/A';
            const volumeValue = exchange.trading_volume_24h ? parseFloat(exchange.trading_volume_24h) : null;
            const formattedVolume = volumeValue ? '$' + volumeValue.toLocaleString(undefined, 
                { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : 'N/A';
            const year = exchange.year_founded || '??';
            const country = exchange.registration_country?.name || 'Unknown';
            
            card.innerHTML = `
                <div class="card-header">
                    <img src="${exchange.logo_url || 'assets/images/logo-placeholder.png'}" alt="${exchange.name} Logo" class="card-logo">
                    <h3 class="card-title">${exchange.name}</h3>
                </div>
                <div class="card-body">
                    <div class="card-info-row">
                        <div class="card-info-label">Rating:</div>
                        <div class="card-info-value card-rating">${formattedRating}</div>
                    </div>
                    <div class="card-info-row">
                        <div class="card-info-label">Reviews:</div>
                        <div class="card-info-value">${reviewCount}</div>
                    </div>
                    <div class="card-info-row">
                        <div class="card-info-label">24h Volume:</div>
                        <div class="card-info-value">${formattedVolume}</div>
                    </div>
                    <div class="card-info-row">
                        <div class="card-info-label">Info:</div>
                        <div class="card-info-value">Est: ${year}, ${country}</div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="card-action">
                        <a href="exchange.html?slug=${exchange.slug}" class="btn btn-primary btn-sm">Details</a>
                    </div>
                </div>
            `;
            
            container.appendChild(card);
        });
    } else {
        // Display no results message
        const noResults = document.createElement('div');
        noResults.className = 'no-results-message';
        noResults.textContent = 'No exchanges found matching your criteria.';
        container.appendChild(noResults);
    }
}