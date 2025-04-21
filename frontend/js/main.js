// Main Application Logic and Initialization
import { handleLogin, handleLogout, checkAndCacheUserProfile, handleRegister } from './auth.js';
import { updateHeaderNav, renderExchangeList, displayErrorMessage, clearErrorMessage, initTableViewToggle } from './ui.js';
import { fetchExchanges, fetchCountries, fetchFiatCurrencies } from './api.js';

// --- Global State for Sorting ---
let currentSortKey = 'overall_average_rating'; // Default sort
let currentSortDirection = 'desc'; // Default direction

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
        initTableViewToggle();

        // Populate filter dropdowns
        populateFilterOptions();

        // Load exchanges if we're on the homepage (uses default sort initially)
        if (document.getElementById('exchange-list-body')) {
            loadHomepageExchanges(); // Initial load with default sort
        }

        const searchForm = document.getElementById('search-filter-form');
        searchForm?.addEventListener('submit', (event) => {
            event.preventDefault();
            console.log("Search submitted");
            applyFilters();
        });

        // Add listener for Apply Filters button
        const applyFiltersBtn = document.getElementById('apply-filters-btn');
        applyFiltersBtn?.addEventListener('click', applyFilters);

        // Add listener for Reset Filters button
        const resetFiltersBtn = document.getElementById('reset-filters-btn');
        resetFiltersBtn?.addEventListener('click', () => {
            document.getElementById('filter-form')?.reset();
            document.getElementById('search-input').value = '';
            // Explicitly reset the P2P select to the default "Any" value
            const p2pSelect = document.getElementById('filter-has-p2p');
            if (p2pSelect) p2pSelect.value = '';
            // Reset sort to default when resetting filters
            currentSortKey = 'overall_average_rating';
            currentSortDirection = 'desc';
            updateSortIndicators(); // Update visual indicators
            loadHomepageExchanges(); // Reload with default filters and sort
        });

        // Add listener for table header clicks (sorting)
        const tableHeader = document.querySelector('#exchange-table thead tr');
        tableHeader?.addEventListener('click', (event) => {
            const headerCell = event.target.closest('th'); // Find the clicked header cell
            if (headerCell && headerCell.classList.contains('sortable')) {
                const sortKey = headerCell.dataset.sortKey;
                if (sortKey) {
                    handleSortClick(sortKey);
                }
            }
        });

        // Set initial sort indicators
        updateSortIndicators();
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
 * Fetches data and populates filter select options.
 */
async function populateFilterOptions() {
    const countrySelect = document.getElementById('filter-country-registration');
    const kycSelect = document.getElementById('filter-kyc-type');
    const fiatSelect = document.getElementById('filter-fiat-currency');

    // Populate KYC Type (manual based on enum)
    if (kycSelect) {
        const kycTypes = ['none', 'optional', 'mandatory'];
        kycTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type.charAt(0).toUpperCase() + type.slice(1); // Capitalize
            kycSelect.appendChild(option);
        });
    }

    // Populate Countries
    if (countrySelect) {
        try {
            const countries = await fetchCountries();
            countries.sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
            countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country.id;
                option.textContent = country.name;
                countrySelect.appendChild(option);
            });
        } catch (error) {
            console.error("Failed to load countries for filter:", error);
            // Optionally display an error message near the select
        }
    }

    // Populate Fiat Currencies
    if (fiatSelect) {
        try {
            const fiats = await fetchFiatCurrencies();
            fiats.sort((a, b) => {
                if (typeof a.code_iso_4217 !== 'string' || typeof b.code_iso_4217 !== 'string') {
                    return 0; // Or handle the missing code as needed
                }
                return a.code_iso_4217.localeCompare(b.code_iso_4217);
            }); // Sort by code
            fiats.forEach(fiat => {
                const option = document.createElement('option');
                option.value = fiat.id;
                option.textContent = `${fiat.code_iso_4217} (${fiat.name})`;
                fiatSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Failed to load fiat currencies for filter:", error);
            // Optionally display an error message near the select
        }
    }
}

/**
 * Handles clicking on a sortable table header.
 * @param {string} newSortKey - The key to sort by (from data-sort-key).
 */
function handleSortClick(newSortKey) {
    if (currentSortKey === newSortKey) {
        // Toggle direction if clicking the same column
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // Switch to new column, default to descending
        currentSortKey = newSortKey;
        currentSortDirection = 'desc';
    }
    console.log(`Sorting by: ${currentSortKey}, Direction: ${currentSortDirection}`);
    updateSortIndicators();
    applyFilters(); // Re-apply filters which will include the new sort order
}

/**
 * Updates the visual indicators (classes) on table headers based on current sort state.
 */
function updateSortIndicators() {
    const headers = document.querySelectorAll('#exchange-table th.sortable');
    headers.forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.dataset.sortKey === currentSortKey) {
            th.classList.add(currentSortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });
}

/**
 * Gathers filter values and triggers loading exchanges.
 */
function applyFilters() {
    const params = {};
    const searchTerm = document.getElementById('search-input')?.value;
    const countryId = document.getElementById('filter-country-registration')?.value;
    const kycType = document.getElementById('filter-kyc-type')?.value;
    // Get value from the select dropdown instead of checkbox checked state
    const hasP2pValue = document.getElementById('filter-has-p2p')?.value;
    const fiatId = document.getElementById('filter-fiat-currency')?.value;

    if (searchTerm) params.name = searchTerm;
    if (countryId) params.country_id = countryId;
    if (kycType) params.kyc_type = kycType;
    // Add has_p2p only if a specific value ("true" or "false") is selected
    if (hasP2pValue === 'true' || hasP2pValue === 'false') {
        params.has_p2p = hasP2pValue === 'true'; // Convert string "true" to boolean true
    }
    if (fiatId) params.supports_fiat_id = fiatId;

    // Add sort parameters
    params.field = currentSortKey;
    params.direction = currentSortDirection;

    console.log("Applying filters and sort:", params);
    loadHomepageExchanges(params);
}

/**
 * Fetches and displays exchanges on the homepage table.
 * @param {object} params - Optional parameters for filtering/searching/sorting exchanges.
 */
async function loadHomepageExchanges(params = {}) {
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
        console.log("Loading exchanges with params:", params);
        // Ensure default sort is applied if not provided in params
        const queryParams = {
            field: currentSortKey, // Use global state as default
            direction: currentSortDirection, // Use global state as default
            limit: 25,
            ...params // Params passed in will override defaults
        };

        Object.keys(queryParams).forEach(key => {
            if (queryParams[key] === '' || queryParams[key] === null || queryParams[key] === undefined) {
                delete queryParams[key];
            }
        });

        const data = await fetchExchanges(queryParams);
        console.log("Exchanges received:", data);

        if (data && data.items) {
            // Render table view
            renderExchangeList(data.items, tbodyId, loadingIndicatorId, errorContainerId);

            // Render card view
            renderCardView(data.items, cardContainerId);

            // Ensure sort indicators are correct after load (might be redundant but safe)
            updateSortIndicators();

            if (loadingIndicator) loadingIndicator.style.display = 'none';
        } else {
            renderExchangeList([], tbodyId, loadingIndicatorId, errorContainerId);
            renderCardView([], cardContainerId);
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (!errorContainer?.classList.contains('visible')) {
                displayErrorMessage(errorContainerId, 'Could not load exchange data.');
            }
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
                        <a href="exchange/overview.html?slug=${exchange.slug}" class="btn btn-primary btn-sm">Details</a>
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