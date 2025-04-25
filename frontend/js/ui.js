// DOM Manipulation and UI Update Logic
import { isLoggedIn, getUserProfileData } from './auth.js'; // Need auth state

/**
 * Updates the main navigation based on login status.
 */
export function updateHeaderNav() {
    const loginBtn = document.getElementById('nav-login-btn');
    const registerBtn = document.getElementById('nav-register-btn');
    const profileLink = document.getElementById('nav-profile-link');
    const logoutBtn = document.getElementById('nav-logout-btn');
    const adminLink = document.getElementById('nav-admin-link'); // Add admin link reference
    const userProfile = getUserProfileData(); // Get profile data if available

    if (isLoggedIn()) {
        loginBtn?.classList.add('hidden');
        registerBtn?.classList.add('hidden');
        profileLink?.classList.remove('hidden');
        logoutBtn?.classList.remove('hidden');

        // Update profile link text if profile data is available
        if (profileLink && userProfile?.nickname) {
            profileLink.textContent = `Hi, ${userProfile.nickname}`;
        } else if (profileLink) {
             profileLink.textContent = 'My Profile'; // Fallback
        }

        // Show admin link if user has admin privileges
        if (adminLink && userProfile?.is_admin) {
            adminLink.classList.remove('hidden');
        } else if (adminLink) {
            adminLink.classList.add('hidden');
        }

    } else {
        loginBtn?.classList.remove('hidden');
        registerBtn?.classList.remove('hidden');
        profileLink?.classList.add('hidden');
        logoutBtn?.classList.add('hidden');
        adminLink?.classList.add('hidden'); // Always hide admin link when logged out
    }
}

/**
 * Clears an error message from a designated element.
 * @param {string} elementId - The ID of the error message container.
 */
export function clearErrorMessage(elementId) {
     const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.remove('visible'); // Hide it
    }
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
            <img src="${exchange.logo_url || 'assets/images/logo-placeholder.png'}"">
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
            <a href="/exchange/overview.html?slug=${exchange.slug}" class="btn btn-primary">Details</a>
        </div>
    `;

    return card;
}

/**
 * Renders a single news item card.
 * Assumes NewsItemRead schema: { id, title, url, source_name, published_at, image_url, excerpt }
 * @param {object} newsItem - The news item data object.
 * @param {string} slug - The exchange slug for context (used in the link).
 * @returns {HTMLElement} - The created card element.
 */
export function renderNewsCard(newsItem, slug) { // Added slug parameter
    const card = document.createElement('article'); // Use article for semantic meaning
    card.className = 'news-card';

    const imageUrl = newsItem.image_url || '../assets/images/news-placeholder.png'; // Adjust placeholder path
    /// excerpt is the first 200 characters of the content
    const excerpt = newsItem.content ? newsItem.content.substring(0, 200) + '...' : 'No excerpt available';
    const publishedDate = newsItem.published_at ? new Date(newsItem.published_at).toLocaleDateString() : 'N/A';
    const sourceName = newsItem.source_name || 'Unknown Source';

    // Construct the link URL using the slug and news item ID
    // Ensure newsItem.id exists and is valid
    const readMoreUrl = `news.html?slug=${slug}&news_id=${newsItem.id}`;

    // Removed the outer content div as innerHTML replaces everything anyway
    card.innerHTML = `
        <img src="${imageUrl}" alt="${newsItem.title}" class="news-card-image" loading="lazy" onerror="this.onerror=null; this.src='../assets/images/news-placeholder.png';">
        <div class="news-card-content">
            <h3 class="news-card-title">${newsItem.title}</h3>
            <div class="news-card-meta">
                <span>${sourceName}</span>
                <span>${publishedDate}</span>
            </div>
            <p class="news-card-excerpt">${excerpt}</p>
            <a href="${readMoreUrl}" class="news-card-link">Read More &rarr;</a>
        </div>
    `;

    return card;
}

/**
 * Renders the full detail of a single news item.
 * Assumes NewsItemRead schema: { id, title, url, source_name, published_at, image_url, content }
 * @param {object} newsItem - The news item data object.
 * @returns {HTMLElement} - The created detail element.
 */
export function renderNewsDetail(newsItem) {
    const detailElement = document.createElement('article');
    detailElement.className = 'news-detail-content'; // Add a class for styling if needed

    const imageUrl = newsItem.image_url || '../assets/images/news-placeholder.png'; // Adjust placeholder path
    const publishedDate = newsItem.published_at ? new Date(newsItem.published_at).toLocaleString() : 'N/A';
    const sourceName = newsItem.source_name || 'Unknown Source';
    // Use the full content, assuming it's safe HTML or plain text.
    // If content can be unsafe, sanitize it here using DOMPurify or similar.
    const contentHtml = newsItem.content || '<p>Full content not available.</p>';

    detailElement.innerHTML = `
        ${newsItem.image_url ? `<img src="${imageUrl}" alt="${newsItem.title}" class="news-detail-image" loading="lazy" onerror="this.onerror=null; this.src='../assets/images/news-placeholder.png';">` : ''}
        <div class="news-detail-meta">
            <span>Source: <a href="${newsItem.url}" target="_blank" rel="noopener noreferrer">${sourceName}</a></span>
            <span>Published: ${publishedDate}</span>
        </div>
        <div class="news-detail-body">
            ${contentHtml}
        </div>
    `;

    return detailElement;
}

/**
 * Renders the full detail of a single guide item.
 * Assumes GuideItem schema: { id, title, image_url, content }
 * @param {object} guideItem - The guide item data object.
 * @returns {HTMLElement} - The created detail element.
 */
export function renderGuideDetail(guideItem) {
    const detailElement = document.createElement('article');
    detailElement.className = 'guide-detail-content'; // Add a class for styling

    const imageUrl = guideItem.image_url || '../assets/images/guide-placeholder.png';
    // Use the full content, assuming it's safe HTML or plain text.
    // If content can be unsafe, sanitize it here using DOMPurify or similar.
    const contentHtml = guideItem.content || '<p>Full content not available.</p>';

    detailElement.innerHTML = `
        ${guideItem.image_url ? `<img src="${imageUrl}" alt="${guideItem.title}" class="guide-detail-image" loading="lazy" onerror="this.onerror=null; this.src='../assets/images/guide-placeholder.png';">` : ''}
        <div class="guide-detail-body">
            ${contentHtml}
        </div>
        <div class="guide-detail-footer">
             <!-- Optional: Add a link back to the guide list for the exchange -->
             <!-- <a href="guide.html?slug=..." class="btn btn-outline-secondary btn-sm">Back to Guide List</a> -->
        </div>
    `;

    return detailElement;
}

/**
 * Renders a single guide item card.
 * Assumes GuideItem schema: { id, title, image_url, excerpt }
 * @param {object} guideItem - The guide item data object.
 * @param {string} slug - The exchange slug for context (used in the link if needed).
 * @returns {HTMLElement} - The created card element.
 */
export function renderGuideCard(guideItem, slug) {
    const card = document.createElement('article');
    card.className = 'guide-card'; // Use a specific class for styling

    const imageUrl = guideItem.image_url || '../assets/images/guide-placeholder.png'; // Adjust placeholder path
    // const excerpt = guideItem.excerpt || 'No description available.'; // Use excerpt or fallback
    // except is the first 200 characters of the content
    const excerpt = guideItem.content ? guideItem.content.substring(0, 200) + '...' : 'No description available.';
    const title = guideItem.title || 'Untitled Guide';

    // Decide on the link - does clicking a guide card go somewhere?
    // Option 1: Link to a detail page (like news) - NOW points back to guide.html with guide_id
    const readMoreUrl = `guide.html?slug=${slug}&guide_id=${guideItem.id}`;
    // Option 2: Link directly to the guide content if it's simple, or no link if it expands in place.
    // For now, let's assume no detail page link, just display info.
    // If a detail view is needed later, add an <a> tag like in renderNewsCard.

    card.innerHTML = `
        <img src="${imageUrl}" alt="${title}" class="guide-card-image" loading="lazy" onerror="this.onerror=null; this.src='../assets/images/guide-placeholder.png';">
        <div class="guide-card-content">
            <h3 class="guide-card-title">${title}</h3>
            <p class="guide-card-excerpt">${excerpt}</p>
            <!-- Optional: Add a link/button if needed -->
            <a href="${readMoreUrl}" class="guide-card-link">Read Guide &rarr;</a>
        </div>
    `;

    return card;
}

/**
 * Renders the list of exchanges as rows in a table body.
 * @param {Array<object>} exchanges - Array of exchange data objects (expecting ExchangeReadBrief structure).
 * @param {string} tbodyId - ID of the table body element (tbody).
 * @param {string} loadingElementId - ID of the loading indicator element.
 * @param {string} errorContainerId - ID of the error message container.
 */
export function renderExchangeList(exchanges, tbodyId, loadingElementId, errorContainerId) {
    const tbody = document.getElementById(tbodyId);
    const loadingIndicator = document.getElementById(loadingElementId);
    const errorContainer = document.getElementById(errorContainerId); // For general list errors

    if (!tbody) {
        console.error(`Exchange list tbody #${tbodyId} not found.`);
        return;
    }

    // Clear previous content (loading message, old rows, or no-results message)
    tbody.innerHTML = '';
    if (loadingIndicator) loadingIndicator.style.display = 'none'; // Hide loading
    if (errorContainer) errorContainer.classList.remove('visible'); // Hide list-specific errors

    if (exchanges && exchanges.length > 0) {
        exchanges.forEach((exchange, index) => { // Add index parameter here
            const tr = document.createElement('tr');
            tr.setAttribute('data-exchange-id', exchange.id); // Optional: add data attribute
            tr.setAttribute('data-slug', exchange.slug); // Add slug for navigation
            tr.classList.add('clickable-row'); // Add class for styling and event handling

            // --- Create Table Cells (td) ---

            // 0. Number Cell (NEW)
            const numberTd = document.createElement('td');
            numberTd.className = 'number-cell'; // Add class for potential styling
            numberTd.setAttribute('data-label', '#'); // Label for card view
            numberTd.textContent = index + 1; // Display 1-based index
            tr.appendChild(numberTd); // Add it first

            // 1. Logo Cell
            const logoTd = document.createElement('td');
            logoTd.className = 'logo-cell';
            logoTd.setAttribute('data-label', 'Exchange');
            const logoImg = document.createElement('img');
            logoImg.src = exchange.logo_url || 'assets/images/logo-placeholder.png';
            logoImg.alt = `${exchange.name} Logo`;
            logoImg.loading = 'lazy'; // Lazy load logos
            logoTd.appendChild(logoImg);

            tr.appendChild(logoTd);

            // 2. Name Cell
            const nameTd = document.createElement('td');
            nameTd.className = 'name-cell';
            nameTd.setAttribute('data-label', 'Name');
            nameTd.textContent = exchange.name;
            tr.appendChild(nameTd);

            // 3. Rating Cell
            const ratingTd = document.createElement('td');
            ratingTd.className = 'rating-cell';
            ratingTd.setAttribute('data-label', 'Rating');
            const ratingValue = parseFloat(exchange.overall_average_rating);
            const ratingSpan = document.createElement('span');
            ratingSpan.className = 'rating-value';
            ratingSpan.textContent = isNaN(ratingValue) ? 'N/A' : ratingValue.toFixed(1);
            ratingTd.appendChild(ratingSpan);
            tr.appendChild(ratingTd);

            // 4. Reviews Cell
            const reviewsTd = document.createElement('td');
            reviewsTd.className = 'reviews-cell';
            reviewsTd.setAttribute('data-label', 'Reviews');
            const reviewCount = exchange.total_review_count?.toLocaleString() ?? 'N/A';
            // Wrap the count in a link
            const reviewsLink = document.createElement('a');
            reviewsLink.href = `exchange/reviews.html?slug=${exchange.slug}`;
            reviewsLink.textContent = reviewCount;
            reviewsLink.classList.add('reviews-link'); // Add class to identify the link
            // Prevent row click when clicking the link itself
            reviewsLink.addEventListener('click', (event) => {
                event.stopPropagation();
            });
            reviewsTd.appendChild(reviewsLink);
            tr.appendChild(reviewsTd);

            // 5. Volume Cell
            const volumeTd = document.createElement('td');
            volumeTd.className = 'volume-cell';
            volumeTd.setAttribute('data-label', 'Volume');
            const volumeValue = exchange.trading_volume_24h ? parseFloat(exchange.trading_volume_24h) : null;
            volumeTd.textContent = volumeValue ? '$' + volumeValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : 'N/A';
            tr.appendChild(volumeTd);

            // 6. Info Cell
            const infoTd = document.createElement('td');
            infoTd.className = 'info-cell';
            infoTd.setAttribute('data-label', 'Info');
            const year = exchange.year_founded || '??';
            const country = exchange.registration_country?.name || 'Unknown';
            infoTd.textContent = `Est: ${year}, ${country}`; // Simplified info
            tr.appendChild(infoTd);

            // 7. Action Cell (Now contains the Website button)
            const actionTd = document.createElement('td');
            actionTd.className = 'action-cell';
            actionTd.setAttribute('data-label', 'Action'); // Keep label for card view consistency

            // Create Website button/link
            const websiteBtn = document.createElement('a');
            websiteBtn.href = `http://localhost:8000/api/v1/exchanges/go/${exchange.slug}`;
            websiteBtn.textContent = 'Website';
            websiteBtn.target = '_blank'; // Open in new tab
            // websiteBtn.rel = 'noopener noreferrer'; // Security best practice
            websiteBtn.classList.add('btn', 'btn-sm', 'btn-secondary', 'website-link'); // Style as button

            // Prevent row click when clicking the button
            websiteBtn.addEventListener('click', (event) => {
                event.stopPropagation();
            });
            actionTd.appendChild(websiteBtn);

            tr.appendChild(actionTd); // Add the action cell to the row

            // --- Append row to table body ---
            tbody.appendChild(tr);
        });
    } else {
        // Display a "no results" message within the table structure
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        const columnCount = tbody.previousElementSibling?.rows?.[0]?.cells?.length || 8; // Updated column count to 8
        td.colSpan = columnCount; // Span across all columns
        td.textContent = 'No exchanges found matching your criteria.';
        td.style.textAlign = 'center';
        td.style.padding = '2rem'; // Add some padding to the message
        td.style.color = '#6c757d'; // Muted color
        tr.appendChild(td);
        tbody.appendChild(tr);
    }
}


/**
 * Displays a success message in a designated element.
 * @param {string} elementId - The ID of the success message container.
 * @param {string} message - The success message to display.
 */
export function displaySuccessMessage(elementId, message) {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = message;
        // Add 'visible' class assuming you added .success-message.visible style
        successElement.classList.add('visible');
        // Hide any general error messages that might be visible
        const errorElementId = elementId.replace('-success-', '-error-'); // Guess error ID
        clearErrorMessage(errorElementId);
    } else {
        console.warn(`Success element with ID "${elementId}" not found.`);
    }
}

/**
 * Clears a success message from a designated element.
 * @param {string} elementId - The ID of the success message container.
 */
export function clearSuccessMessage(elementId) {
     const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = '';
        successElement.classList.remove('visible'); // Hide it
    }
}

// Also update displayErrorMessage and clearErrorMessage to use the new .visible class if you changed it
export function displayErrorMessage(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('visible'); // Make it visible
         // Hide any general success messages that might be visible
        const successElementId = elementId.replace('-error-', '-success-'); // Guess success ID
        clearSuccessMessage(successElementId);
    } else {
        console.warn(`Error element with ID "${elementId}" not found.`);
    }
}

/**
 * Initialize table view toggle functionality
 * Sets up event listener on the toggle button to switch between table and card view
 * Also sets initial state based on screen size
 */
export function initTableViewToggle() {
    const toggleBtn = document.getElementById('toggle-view-btn'); // Button still exists but is hidden
    const tableView = document.getElementById('exchange-table');
    const cardView = document.getElementById('exchange-card-container');

    // Check if essential elements exist
    if (!tableView || !cardView) { // Removed toggleBtn check as it's not essential for logic anymore
        console.warn('Table/Card view elements not found. Aborting toggle initialization.');
        return;
    }

    // Get references to the text spans inside the button (keep for potential future use, but not strictly needed now)
    // const tableViewText = toggleBtn?.querySelector('.table-view-text');
    // const cardViewText = toggleBtn?.querySelector('.card-view-text');

    // Helper functions to manage view state
    function toggleToCardView() {
        tableView.classList.add('hidden');
        cardView.classList.remove('hidden');
        // Remove button text updates
        // if (tableViewText) tableViewText.classList.remove('hidden');
        // if (cardViewText) cardViewText.classList.add('hidden');
        console.log("Switched to Card View (responsive)");
    }

    function toggleToTableView() {
        tableView.classList.remove('hidden');
        cardView.classList.add('hidden');
        // Remove button text updates
        // if (tableViewText) tableViewText.classList.add('hidden');
        // if (cardViewText) cardViewText.classList.remove('hidden');
        console.log("Switched to Table View (responsive)");
    }

    // Set initial state based on screen size
    const checkInitialView = () => {
        const isSmallScreen = window.innerWidth <= 767;
        if (isSmallScreen) {
            toggleToCardView();
        } else {
            // Default to table view on larger screens
            toggleToTableView();
        }
    };

    // Remove the click listener for the button
    // toggleBtn?.addEventListener('click', () => {
    //     if (tableView.classList.contains('hidden')) {
    //         toggleToTableView();
    //     } else {
    //         toggleToCardView();
    //     }
    // });

    // Add resize listener to handle responsive switching
    let resizeTimeout;
    window.addEventListener('resize', () => {
        // Debounce resize event
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const isSmallScreen = window.innerWidth <= 767;
            if (isSmallScreen && !tableView.classList.contains('hidden')) {
                // Small screen but currently in table view - switch to card
                toggleToCardView();
            } else if (!isSmallScreen && tableView.classList.contains('hidden')) {
                // Large screen but currently in card view - switch to table
                toggleToTableView();
            }
            // No action needed if the view already matches the screen size
        }, 250); // Adjust debounce delay as needed
    });

    // Set the initial view when the function runs
    checkInitialView();
}
