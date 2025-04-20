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
        <div class="news-detail-footer">
             <a href="${newsItem.url}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">View Original Source</a>
             <!-- Optional: Add a link back to the news list for the exchange -->
             <!-- <a href="news.html?slug=..." class="btn btn-outline-secondary btn-sm">Back to News List</a> -->
        </div>
    `;

    return detailElement;
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
        exchanges.forEach(exchange => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-exchange-id', exchange.id); // Optional: add data attribute

            // --- Create Table Cells (td) ---

            // 1. Logo Cell
            const logoTd = document.createElement('td');
            logoTd.className = 'logo-cell';
            logoTd.setAttribute('data-label', 'Exchange');
            const logoImg = document.createElement('img');
            logoImg.src = exchange.logo_url || 'assets/images/logo-placeholder.png';
            logoImg.alt = `${exchange.name} Logo`;
            logoImg.loading = 'lazy'; // Lazy load logos
            logoTd.appendChild(logoImg);

            // Add name span for card view (good for responsive design)
            const nameSpan = document.createElement('span');
            nameSpan.className = 'exchange-name-in-logo-cell';
            nameSpan.textContent = exchange.name;
            logoTd.appendChild(nameSpan);

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
            reviewsTd.textContent = exchange.total_review_count?.toLocaleString() ?? 'N/A';
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

            // 7. Action Cell
            const actionTd = document.createElement('td');
            actionTd.className = 'action-cell';
            actionTd.setAttribute('data-label', 'Action');
            const detailsLink = document.createElement('a');
            detailsLink.href = `exchange/overview.html?slug=${exchange.slug}`;
            detailsLink.className = 'btn btn-primary btn-sm';
            detailsLink.textContent = 'Details';
            actionTd.appendChild(detailsLink);
            tr.appendChild(actionTd);

            // --- Append row to table body ---
            tbody.appendChild(tr);
        });
    } else {
        // Display a "no results" message within the table structure
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        const columnCount = tbody.previousElementSibling?.rows?.[0]?.cells?.length || 7; // Get column count from thead
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
    const toggleBtn = document.getElementById('toggle-view-btn');
    const table = document.getElementById('exchange-table');
    const tableBody = document.getElementById('exchange-list-body');

    if (!toggleBtn || !table || !tableBody) {
        console.warn('Table view toggle elements not found');
        return;
    }

    toggleBtn.addEventListener('click', () => {
        // Toggle card-mode class
        table.classList.toggle('card-mode');

        // Update button text
        toggleBtn.textContent = table.classList.contains('card-mode')
            ? 'Switch to Table View'
            : 'Switch to Card View';

        // When switching to card mode, ensure cells have proper data-label attributes
        if (table.classList.contains('card-mode')) {
            const rows = tableBody.querySelectorAll('tr');
            rows.forEach(row => {
                // Set data-label attributes based on column headers
                const headers = table.querySelectorAll('thead th');
                const cells = row.querySelectorAll('td');

                cells.forEach((cell, index) => {
                    if (index < headers.length && !cell.hasAttribute('data-label')) {
                        const headerText = headers[index].textContent.trim();
                        cell.setAttribute('data-label', headerText);
                    }
                });

                // For rating cell, ensure it has the correct inner structure
                const ratingCell = row.querySelector('.rating-cell');
                if (ratingCell && !ratingCell.querySelector('.rating-value')) {
                    const ratingText = ratingCell.textContent.trim();
                    ratingCell.innerHTML = `<span class="rating-value">${ratingText.replace(' ★', '')}</span>`;
                }
            });
        }
    });

    // Set initial state based on screen size
    if (window.innerWidth <= 767) {
        table.classList.add('card-mode');
        toggleBtn.textContent = 'Switch to Table View';

        // Trigger the same data-attribute setup logic
        const event = new Event('click');
        toggleBtn.dispatchEvent(event);
    }

    // Update view when window is resized
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 767 && !table.classList.contains('card-mode')) {
            table.classList.add('card-mode');
            toggleBtn.textContent = 'Switch to Table View';

            // Trigger the same data-attribute setup logic
            const event = new Event('click');
            toggleBtn.dispatchEvent(event);
        }
    });
}
