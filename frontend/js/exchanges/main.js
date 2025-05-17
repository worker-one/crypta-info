// Main Application Logic and Initialization for Homepage/Exchanges
import { handleLogout, checkAndCacheUserProfile } from '../auth.js';
import { displayErrorMessage } from '../renderUtils.js';
import { fetchExchanges, fetchCountries, fetchFiatCurrencies } from '../api.js';
import { initTableViewToggle } from '../viewToggle.js'; // Import the view toggle function

// --- Global State for Sorting ---
let currentSortKey = 'overall_average_rating'; // Default sort
let currentSortDirection = 'desc'; // Default direction

// Define the API base URL directly here for the website link construction.
// TODO: Move BASE_URL_API to a config.js file and import it
const BASE_URL_API = 'http://176.124.219.116:8200/api/v1';

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed - exchanges-main.js");

    // Check login status and update UI immediately
    // Also fetches profile if logged in but not cached
    checkAndCacheUserProfile(); // This now calls updateHeaderNav internally

    // --- Page-Specific Logic ---
    const pathname = window.location.pathname;

    // == Homepage Logic ==
    console.log("On homepage");

    // Initialize table view toggle if we're on the homepage
    initTableViewToggle();

    // Populate filter dropdowns
    populateFilterOptions();

    // Load exchanges if we're on the homepage (uses default sort initially)
    if (document.getElementById('item-list-body')) {
        renderExchangeTable(); // Initial load with default sort
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
        renderExchangeTable(); // Reload with default filters and sort
    });

    // Add listener for table header clicks (sorting)
    const tableHeader = document.querySelector('#item-table thead tr');
    tableHeader?.addEventListener('click', (event) => {
        const headerCell = event.target.closest('th'); // Find the clicked header cell
        if (headerCell && headerCell.classList.contains('sortable')) {
            const sortKey = headerCell.dataset.sortKey;
            if (sortKey) {
                handleSortClick(sortKey);
            }
        }
    });

    // Add listener for table body clicks (row navigation)
    const tableBody = document.getElementById('item-list-body');
    tableBody?.addEventListener('click', (event) => {
        // Check if the click target is the reviews link or inside it
        if (event.target.closest('a.reviews-link')) {
            // Click was on the reviews link, let the default link behavior happen
            return;
        }

        // Otherwise, handle the row click for navigation
        const row = event.target.closest('tr.clickable-row'); // Find the closest clickable row
        if (row && row.dataset.slug) {
            const slug = row.dataset.slug;
            console.log(`Navigating to exchange details for slug: ${slug}`);
            window.location.href = `exchanges/details.html?slug=${slug}`;
        }
    });

    // Set initial sort indicators
    updateSortIndicators();


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
        const kycTypes = ['any', 'false', 'true'];
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
    const headers = document.querySelectorAll('#item-table th.sortable');
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
    if (kycType) params.has_kyc = kycType;
    // Add has_p2p only if a specific value ("true" or "false") is selected
    if (hasP2pValue === 'true' || hasP2pValue === 'false') {
        params.has_p2p = hasP2pValue === 'true'; // Convert string "true" to boolean true
    }
    if (fiatId) params.supports_fiat_id = fiatId;

    if (kycType === 'true' || kycType === 'false') {
        params.has_kyc = kycType === 'true';
    }

    // Add sort parameters
    params.field = currentSortKey;
    params.direction = currentSortDirection;

    console.log("Applying filters and sort:", params);
    renderExchangeTable(params);
}


/**
 * Renders a single exchange card.
 * @param {object} exchange - The exchange data object.
 * @returns {HTMLElement} - The created card element.
 */
export function renderExchangeCard(exchange) {
    const card = document.createElement('div');
    card.className = 'exchange-card';

    // Basic structure following Material Design and matching our CSS
    card.innerHTML = `
        <div class="logo">
            <img src="${exchange.logo_url || '../assets/images/logo-placeholder.png'}" alt="${exchange.name} Logo">
            <h3>${exchange.name}</h3>
        </div>
        <div class="card-content">
            <div class="rating" data-label="Rating">
                <span>${parseFloat(exchange.overall_average_rating).toFixed(1)}</span>
            </div>
            <div class="volume" data-label="Volume">
                ${exchange.trading_volume_24h ? '$' + parseFloat(exchange.trading_volume_24h).toLocaleString() : 'N/A'}
            </div>
            <div class="info" data-label="Info">
                Founded: ${exchange.year_founded || 'N/A'} | Country: ${exchange.registration_country?.name || 'N/A'}
            </div>
        </div>
        <div class="details-link">
            <a href="/exchanges/details.html?slug=${exchange.slug}" class="btn btn-primary">Обзор</a>
        </div>
    `;

    return card;
}

/**
 * Fetches and displays exchanges on the homepage table.
 * @param {object} params - Optional parameters for filtering/searching/sorting exchanges.
 */
async function renderExchangeTable(params = {}) {
    const tbodyId = 'item-list-body';
    const cardContainerId = 'exchange-card-container';
    const loadingIndicatorId = 'loading-exchanges';
    const errorContainerId = 'item-list-error';

    const loadingIndicator = document.getElementById(loadingIndicatorId);
    const tbody = document.getElementById(tbodyId);
    const cardContainer = document.getElementById(cardContainerId);
    const errorContainer = document.getElementById(errorContainerId);

    // Show loading, clear previous state
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (tbody) tbody.innerHTML = ''; // Clear previous table rows
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

        if (data && data.items && tbody) {
            // --- Manually render table rows ---
            if (data.items.length === 0) {
                const row = tbody.insertRow();
                const cell = row.insertCell();
                // Adjust colspan based on the final number of columns (8)
                cell.colSpan = 8; // Updated colspan
                cell.textContent = 'No exchanges found matching your criteria.';
                cell.style.textAlign = 'center';
            } else {
                data.items.forEach((exchange, index) => {
                    const row = tbody.insertRow();
                    row.className = 'clickable-row'; // Keep row clickable
                    row.dataset.slug = exchange.slug; // Add slug for navigation

                    // Format data for display
                    const ratingValue = parseFloat(exchange.overall_average_rating);
                    const formattedRating = isNaN(ratingValue) ? 'N/A' : ratingValue.toFixed(1);
                    const reviewCount = exchange.total_review_count?.toLocaleString() ?? 'N/A';
                    const volumeValue = exchange.trading_volume_24h ? parseFloat(exchange.trading_volume_24h) : null;
                    const formattedVolume = volumeValue ? '$' + volumeValue.toLocaleString(undefined,
                        { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : 'N/A';
                    const p2pIcon = exchange.has_p2p ? 
                        '<div style="display: inline-block; text-align: center;"><img src="../assets/images/green-check.png" alt="Yes" width="25" height="25"></div>' : 
                        '<div style="display: inline-block; text-align: center;"><img src="../assets/images/red-cross.png" alt="No" width="25" height="25"></div>';
                    const kycIcon = exchange.has_kyc ? 
                        '<div style="display: inline-block; text-align: center;"><img src="../assets/images/green-check.png" alt="Yes" width="25" height="25"></div>' : 
                        '<div style="display: inline-block; text-align: center;"><img src="../assets/images/red-cross.png" alt="No" width="25" height="25"></div>';

                    // Populate cells according to the new header structure and center content
                    let cell;

                    // # Cell
                    cell = row.insertCell();
                    cell.textContent = index + 1;
                    cell.style.textAlign = 'center';
                    cell.style.verticalAlign = 'middle';

                    // Logo & Name Cell (Combined)
                    const nameCell = row.insertCell();
                    nameCell.style.display = 'flex'; // Use flex layout
                    nameCell.style.alignItems = 'center'; // Align items vertically
                    nameCell.style.justifyContent = 'flex-start'; // Start alignment
                    nameCell.style.padding = '16px'; // Add some padding
                    
                    // Create image element
                    const img = document.createElement('img');
                    img.src = exchange.logo_url || 'assets/images/logo-placeholder.png';
                    img.alt = `${exchange.name} Logo`;
                    img.className = 'exchange-logo-small';
                    img.style.height = '40px';
                    img.style.width = '40px';
                    img.style.marginRight = '8px'; // Space between logo and name
                    img.style.flexShrink = '0'; // Prevent logo from shrinking
                    img.style.position = 'relative'; // Add position relative
                    img.style.top = '4px'; // Move down by 4 pixels
                    
                    // Create span for name
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = exchange.name;
                    
                    // Append image and name to the cell
                    nameCell.appendChild(img);
                    nameCell.appendChild(nameSpan);

                    // Rating Cell
                    cell = row.insertCell();
                    cell.innerHTML = `<span style="font-weight: bold; color: gold;"> ★ ${formattedRating}</span>`;
                    cell.style.textAlign = 'center';
                    cell.style.verticalAlign = 'middle';

                    // Reviews Cell (Updated with link)
                    const reviewsTd = row.insertCell();
                    reviewsTd.className = 'reviews-cell'; // Add class if needed for styling
                    reviewsTd.style.textAlign = 'center';
                    reviewsTd.style.verticalAlign = 'middle';

                    // Wrap the count in a link
                    const reviewsLink = document.createElement('a');
                    reviewsLink.href = `exchanges/reviews.html?slug=${exchange.slug}`;
                    reviewsLink.textContent = reviewCount;
                    reviewsLink.classList.add('reviews-link'); // Add class to identify the link
                    // Prevent row click when clicking the link itself
                    reviewsLink.addEventListener('click', (event) => {
                        event.stopPropagation();
                    });
                    reviewsTd.appendChild(reviewsLink); // Append link to td

                    // Volume Cell
                    cell = row.insertCell();
                    cell.textContent = formattedVolume;
                    cell.style.textAlign = 'center';
                    cell.style.verticalAlign = 'middle';

                    // P2P Cell
                    cell = row.insertCell();
                    cell.innerHTML = p2pIcon;
                    cell.style.textAlign = 'center';
                    cell.style.verticalAlign = 'middle';

                    // KYC Cell
                    cell = row.insertCell();
                    cell.innerHTML = kycIcon;
                    cell.style.textAlign = 'center';
                    cell.style.verticalAlign = 'middle';

                    // Website Button Cell
                    const websiteTd = row.insertCell();
                    websiteTd.className = 'action-cell'; // Use similar class if needed
                    websiteTd.style.textAlign = 'center'; // Center the button within the cell
                    websiteTd.style.verticalAlign = 'middle';

                    const websiteBtn = document.createElement('a');
                    websiteBtn.href = `${BASE_URL_API}/exchanges/go/${exchange.slug}`; // Construct the redirect URL
                    websiteBtn.textContent = 'Сайт';
                    websiteBtn.target = '_blank'; // Open in new tab
                    // websiteBtn.rel = 'noopener noreferrer'; // Good practice, but might interfere with simple redirects
                    websiteBtn.classList.add('btn', 'btn-sm', 'btn-secondary', 'website-link'); // Style as button

                    // Prevent row click when clicking the button
                    websiteBtn.addEventListener('click', (event) => {
                        event.stopPropagation();
                    });
                    websiteTd.appendChild(websiteBtn);
                });
            }
            // --- End manual table row rendering ---

            // Render card view (remains unchanged)
            renderCardView(data.items, cardContainerId);

            // Ensure sort indicators are correct after load
            updateSortIndicators();

            if (loadingIndicator) loadingIndicator.style.display = 'none';
        } else {
            // Handle case where data or tbody is missing, or items array is empty
             if (tbody) { // Check if tbody exists before trying to insert
                const row = tbody.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 8; // Match new column count
                cell.textContent = 'Could not load exchange data or no exchanges found.';
                cell.style.textAlign = 'center';
            }
            renderCardView([], cardContainerId); // Render empty card view
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (!errorContainer?.classList.contains('visible')) {
                // Display error only if one wasn't already shown by the catch block
                displayErrorMessage(errorContainerId, 'Could not load exchange data.');
            }
        }

    } catch (error) {
        console.error("Failed to load exchanges:", error);
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        displayErrorMessage(errorContainerId, `Error loading exchanges: ${error.message}`);
        if (tbody) tbody.innerHTML = ''; // Clear tbody on error
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
            const ratingValue = parseFloat(exchange.overall_average_rating );
            const formattedRating = isNaN(ratingValue) ? 'N/A' : ratingValue.toFixed(1);
            const reviewCount = exchange.total_review_count?.toLocaleString() ?? 'N/A';
            const volumeValue = exchange.trading_volume_24h ? parseFloat(exchange.trading_volume_24h) : null;
            const formattedVolume = volumeValue ? '$' + volumeValue.toLocaleString(undefined,
                { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : 'N/A';
            // Format booleans for card view as well (optional, but consistent)
            const p2pText = exchange.has_p2p ? 'Yes' : 'No'; // Using text for card view might be better
            const kycText = exchange.has_kyc ? 'Required' : 'Not Required'; // Example text

            card.innerHTML = `
                <div class="card-header">
                    <img src="${exchange.logo_url || 'assets/images/logo-placeholder.png'}" alt="${exchange.name} Logo" class="card-logo">
                    <h3 class="card-title">${exchange.name}</h3>
                </div>
                <div class="card-body">
                    <div class="card-info-row">
                        <span class="card-info-label">Рейтинг:</span> <!-- Translated -->
                        <span class="card-info-value card-rating"><span style="font-weight: bold; color: gold;">${formattedRating}</span></span>
                    </div>
                    <div class="card-info-row">
                        <span class="card-info-label">Отзывы:</span> <!-- Translated -->
                        <span class="card-info-value">${reviewCount}</span>
                    </div>
                    <div class="card-info-row">
                        <span class="card-info-label">Объем (24ч):</span> <!-- Translated -->
                        <span class="card-info-value">${formattedVolume}</span>
                    </div>
                    <div class="card-info-row">
                        <span class="card-info-label">P2P:</span>
                        <span class="card-info-value">${p2pText}</span>
                    </div>
                     <div class="card-info-row">
                        <span class="card-info-label">KYC:</span>
                        <span class="card-info-value">${kycText}</span>
                    </div>
                    <div class="card-info-row">
                        <div class="card-info-label">Info:</div>
                        <div class="card-info-value">${exchange.website_url}</div>
                    </div>
                </div>
                <div class="card-footer">
                    <a href="exchanges/details.html?slug=${exchange.slug}" class="btn btn-primary btn-sm">Подробнее</a> <!-- Translated -->
                </div>
            `;
            // Add click listener to the card itself for navigation
            card.addEventListener('click', (e) => {
                 // Prevent navigation if the click was on the button itself
                if (!e.target.closest('a')) {
                    window.location.href = `exchanges/details.html?slug=${exchange.slug}`;
                }
            });


            container.appendChild(card);
        });
    } else {
        // Display no results message
        const noResults = document.createElement('div');
        noResults.className = 'no-results-message';
        noResults.textContent = 'Биржи, соответствующие вашим критериям, не найдены.'; // Translated
        container.appendChild(noResults);
    }
}