// Generic UI Rendering Utilities

// Define the API base URL directly. For production, consider a configuration approach.
// TODO: Move BASE_URL_API to a config.js file
const BASE_URL_API = 'http://176.124.219.116:8300/api/v1';

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
            <a href="/exchanges/overview.html?slug=${exchange.slug}" class="btn btn-primary">Details</a>
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
             <!-- <a href="guide.html?slug=..." class="btn btn-outline-secondary btn-sm">Back to Инструкции List</a> -->
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
    const title = guideItem.title || 'Untitled Инструкции';

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
            <a href="${readMoreUrl}" class="guide-card-link">Read Инструкции &rarr;</a>
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

            // 0. Number Cell
            const numberTd = document.createElement('td');
            numberTd.className = 'number-cell';
            numberTd.setAttribute('data-label', '#');
            numberTd.textContent = index + 1;
            tr.appendChild(numberTd);

            // 1. Logo & Name Cell (Combined)
            const nameTd = document.createElement('td');
            nameTd.className = 'name-cell'; // Keep class, adjust content
            nameTd.setAttribute('data-label', 'Exchange'); // Use combined label
            // Create and append logo
            const logoImg = document.createElement('img');
            logoImg.src = exchange.logo_url || '../assets/images/logo-placeholder.png';
            logoImg.alt = `${exchange.name} Logo`;
            logoImg.loading = 'lazy';
            logoImg.style.height = '20px'; // Consistent styling
            logoImg.style.width = 'auto';
            logoImg.style.marginRight = '4px'; // Reduced space
            logoImg.style.verticalAlign = 'middle';
            nameTd.appendChild(logoImg);
            // Create and append name text
            const nameSpan = document.createElement('span');
            nameSpan.textContent = exchange.name;
            nameTd.appendChild(nameSpan);
            tr.appendChild(nameTd);

            // 2. Rating Cell
            const ratingTd = document.createElement('td');
            ratingTd.className = 'rating-cell';
            ratingTd.setAttribute('data-label', 'Rating');
            const ratingValue = parseFloat(exchange.overall_average_rating);
            const ratingSpan = document.createElement('span');
            ratingSpan.className = 'rating-value';
            ratingSpan.textContent = isNaN(ratingValue) ? 'N/A' : ratingValue.toFixed(1);
            ratingTd.appendChild(ratingSpan);
            tr.appendChild(ratingTd);

            // 3. Reviews Cell
            const reviewsTd = document.createElement('td');
            reviewsTd.className = 'reviews-cell';
            reviewsTd.setAttribute('data-label', 'Reviews');
            const reviewCount = exchange.total_review_count?.toLocaleString() ?? 'N/A';
            // Wrap the count in a link
            const reviewsLink = document.createElement('a');
            reviewsLink.href = `exchanges/reviews.html?slug=${exchange.slug}`;
            reviewsLink.textContent = reviewCount;
            reviewsLink.classList.add('reviews-link'); // Add class to identify the link
            // Prevent row click when clicking the link itself
            reviewsLink.addEventListener('click', (event) => {
                event.stopPropagation();
            });
            reviewsTd.appendChild(reviewsLink);
            tr.appendChild(reviewsTd);

            // 4. Volume Cell
            const volumeTd = document.createElement('td');
            volumeTd.className = 'volume-cell';
            volumeTd.setAttribute('data-label', 'Volume');
            const volumeValue = exchange.trading_volume_24h ? parseFloat(exchange.trading_volume_24h) : null;
            volumeTd.textContent = volumeValue ? '$' + volumeValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : 'N/A';
            tr.appendChild(volumeTd);

            // 5. P2P Cell
            const p2pTd = document.createElement('td');
            p2pTd.className = 'p2p-cell'; // Add specific class
            p2pTd.setAttribute('data-label', 'P2P');
            p2pTd.innerHTML = exchange.has_p2p ?
                '<img src="https://img.icons8.com/?size=100&id=11849&format=png&color=000000" alt="Yes" width="25" height="25" style="vertical-align: middle;">' :
                '<img src="https://img.icons8.com/?size=100&id=8112&format=png&color=FA5252" alt="No" width="25" height="25" style="vertical-align: middle;">';
            p2pTd.style.textAlign = 'center';
            tr.appendChild(p2pTd);

            // 6. KYC Cell
            const kycTd = document.createElement('td');
            kycTd.className = 'kyc-cell'; // Add specific class
            kycTd.setAttribute('data-label', 'KYC');
            kycTd.innerHTML = exchange.has_kyc ?
                '<img src="https://img.icons8.com/?size=100&id=11849&format=png&color=000000" alt="Yes" width="25" height="25" style="vertical-align: middle;">' :
                '<img src="https://img.icons8.com/?size=100&id=8112&format=png&color=FA5252" alt="No" width="25" height="25" style="vertical-align: middle;">';
            kycTd.style.textAlign = 'center';
            tr.appendChild(kycTd);

            // 7. Action Cell
            const actionTd = document.createElement('td');
            actionTd.className = 'action-cell';
            actionTd.setAttribute('data-label', 'Action'); // Keep label for card view consistency

            // Create Website button/link
            const websiteBtn = document.createElement('a');
            websiteBtn.href = `${BASE_URL_API}/exchanges/go/${exchange.slug}`;
            websiteBtn.textContent = 'Сайт';
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
        const columnCount = tbody.previousElementSibling?.rows?.[0]?.cells?.length || 7; // Updated column count to 7
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
 * Renders the list of books as rows in a table body.
 * @param {Array<object>} books - Array of book data objects (expecting BookRead structure).
 * @param {string} tbodyId - ID of the table body element (tbody).
 * @param {string} loadingElementId - ID of the loading indicator element.
 * @param {string} errorContainerId - ID of the error message container.
 * @param {number} startIndex - The starting index for numbering (e.g., (page - 1) * limit).
 */
export function renderBookList(books, tbodyId, loadingElementId, errorContainerId, startIndex = 0) {
    const tbody = document.getElementById(tbodyId);
    const loadingIndicator = document.getElementById(loadingElementId);
    const errorContainer = document.getElementById(errorContainerId);

    if (!tbody) {
        console.error(`Book list tbody #${tbodyId} not found.`);
        return;
    }

    // Clear previous content
    tbody.innerHTML = '';
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    if (errorContainer) errorContainer.classList.remove('visible');

    if (books && books.length > 0) {
        books.forEach((book, index) => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-book-id', book.id); // Keep book ID
            tr.classList.add('clickable-row'); // Consistent class for click handling/styling

            // --- Create Table Cells (td) - Ensure consistent structure ---

            // 0. Number Cell
            const numberTd = document.createElement('td');
            numberTd.className = 'number-cell'; // Consistent class
            numberTd.setAttribute('data-label', '#'); // Consistent attribute
            numberTd.textContent = startIndex + index + 1;
            tr.appendChild(numberTd);

            // 1. Cover Cell
            const coverTd = document.createElement('td');
            coverTd.className = 'cover-cell'; // Specific class for books
            coverTd.setAttribute('data-label', 'Cover'); // Consistent attribute
            const coverImg = document.createElement('img');
            coverImg.src = book.logo_url || '../assets/images/book-placeholder.png'; // Use logo_url if available, else placeholder
            coverImg.alt = `${book.name} Cover`; // Use book.name
            coverImg.loading = 'lazy';
            coverImg.style.maxWidth = '50px';
            coverImg.style.maxHeight = '75px';
            coverImg.onerror = function() { this.onerror=null; this.src='../assets/images/book-placeholder.png'; };
            coverTd.appendChild(coverImg);
            tr.appendChild(coverTd);

            // 2. Title Cell
            const titleTd = document.createElement('td');
            titleTd.className = 'title-cell'; // Specific class for books
            titleTd.setAttribute('data-label', 'Title'); // Consistent attribute
            titleTd.textContent = book.name; // Use book.name
            tr.appendChild(titleTd);

            // 3. Rating Cell
            const ratingTd = document.createElement('td');
            ratingTd.className = 'rating-cell';
            ratingTd.setAttribute('data-label', 'Rating');
            const ratingValue = parseFloat(book.overall_average_rating);
            const ratingSpan = document.createElement('span');
            ratingSpan.className = 'rating-value';
            ratingSpan.textContent = isNaN(ratingValue) ? 'N/A' : ratingValue.toFixed(1);
            ratingTd.appendChild(ratingSpan);
            tr.appendChild(ratingTd);

            // 4. Reviews Cell (Updated to be a clickable link)
            const reviewsTd = document.createElement('td');
            reviewsTd.className = 'reviews-cell'; // Consistent class
            reviewsTd.setAttribute('data-label', 'Reviews'); // Consistent attribute
            const reviewCount = book.total_review_count?.toLocaleString() ?? 'N/A';
            // Wrap the count in a link
            const reviewsLink = document.createElement('a');
            reviewsLink.href = `books/reviews.html?id=${book.id}`; // Link to book reviews page
            reviewsLink.textContent = reviewCount;
            reviewsLink.classList.add('reviews-link'); // Add class to identify the link
            // Prevent row click when clicking the link itself
            reviewsLink.addEventListener('click', (event) => {
                event.stopPropagation();
            });
            reviewsTd.appendChild(reviewsLink); // Append link to td
            tr.appendChild(reviewsTd);

            // 5. Year Cell
            const yearTd = document.createElement('td');
            yearTd.className = 'year-cell'; // Specific class for books
            yearTd.setAttribute('data-label', 'Year'); // Consistent attribute
            yearTd.textContent = book.year || 'N/A';
            tr.appendChild(yearTd);

            // 6. Info Cell (e.g., Author, Topic)
            const infoTd = document.createElement('td');
            infoTd.className = 'info-cell'; // Consistent class
            infoTd.setAttribute('data-label', 'Info'); // Consistent attribute
            const author = book.author || 'Unknown Author';
            infoTd.textContent = `${author}`; // Combine relevant info
            tr.appendChild(infoTd);

            // 7. Action Cell (e.g., Link to details)
            const actionTd = document.createElement('td');
            actionTd.className = 'action-cell'; // Consistent class
            actionTd.setAttribute('data-label', 'Action'); // Consistent attribute
            const detailBtn = document.createElement('a');
            detailBtn.href = `/books/overview.html?id=${book.id}`;
            detailBtn.textContent = 'Details';
            detailBtn.classList.add('btn', 'btn-sm', 'btn-secondary', 'details-link'); // Consistent button styling

            detailBtn.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent row click
            });
            actionTd.appendChild(detailBtn);
            tr.appendChild(actionTd);

            // --- Append row to table body ---
            tbody.appendChild(tr);
        });
    } else {
        // Display a "no results" message - structure is consistent
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        const columnCount = tbody.previousElementSibling?.rows?.[0]?.cells?.length || 8; // Ensure correct colspan
        td.colSpan = columnCount;
        td.textContent = 'No books found matching your criteria.';
        td.style.textAlign = 'center';
        td.style.padding = '2rem';
        td.style.color = '#6c757d';
        tr.appendChild(td);
        tbody.appendChild(tr);
    }
}

/**
 * Renders a single book card.
 * Assumes BookRead schema: { id, name, logo_url, overall_average_rating, total_review_count, year, author, topic, amazon_link }
 * @param {object} book - The book data object.
 * @returns {HTMLElement|null} - The created card element or null if book is invalid.
 */
export function renderBookCard(book) {
    if (!book || !book.id) return null;

    const card = document.createElement('div');
    card.className = 'book-card'; // Use a specific class for styling, but structure will be similar to exchange-card

    // Use logo_url for consistency with table view, fallback to placeholder
    const imageUrl = book.logo_url || '../assets/images/book-placeholder.png';
    const title = book.name || 'Untitled Book'; // Use name field
    const author = book.author || 'Unknown Author';
    const year = book.year || 'N/A';
    const ratingValue = parseFloat(book.overall_average_rating);
    const formattedRating = isNaN(ratingValue) ? 'N/A' : ratingValue.toFixed(1);
    const reviewCount = book.total_review_count?.toLocaleString() ?? '0';
    const topicName = book.topic?.name || 'General';

    // Use amazon_link for the primary action, link to details page otherwise
    const actionButton = book.amazon_link
        ? `<a href="${book.amazon_link}" target="_blank" rel="noopener noreferrer sponsored" class="btn btn-primary btn-sm external-link">View on Amazon</a>`
        : `<a href="/books/overview.html?id=${book.id}" class="btn btn-secondary btn-sm details-link">Details</a>`;

    card.innerHTML = `
        <div class="card-header">
             <img src="${imageUrl}" alt="${title} Cover" class="card-cover-image" loading="lazy" onerror="this.onerror=null; this.src='../assets/images/book-placeholder.png';">
             <h3 class="card-title">${title}</h3>
        </div>
        <div class="card-body">
            <div class="card-info-row">
                <div class="card-info-label">Author:</div>
                <div class="card-info-value">${author}</div>
            </div>
             <div class="card-info-row">
                <div class="card-info-label">Year:</div>
                <div class="card-info-value">${year}</div>
            </div>
            <div class="card-info-row">
                <div class="card-info-label">Rating:</div>
                <div class="card-info-value card-rating">
                    ${formattedRating !== 'N/A' ? `★ ${formattedRating}` : 'N/A'}
                    <span class="review-count">(${reviewCount} reviews)</span>
                </div>
            </div>
            <div class="card-info-row">
                <div class="card-info-label">Topic:</div>
                <div class="card-info-value">${topicName}</div>
            </div>
        </div>
        <div class="card-footer">
            <div class="card-action">
                ${actionButton}
            </div>
        </div>
    `;

    // Add event listener to external link if needed (e.g., for analytics)
    const externalLink = card.querySelector('.external-link');
    externalLink?.addEventListener('click', (event) => {
        // Optional: Add analytics tracking here
        console.log(`Clicked external link for book ID: ${book.id}`);
        // Allow default link behavior
    });

    // Add event listener for internal details link to prevent card click if needed
    const detailsLink = card.querySelector('.details-link');
    detailsLink?.addEventListener('click', (event) => {
        // Prevent card click handler if card itself becomes clickable later
        event.stopPropagation();
        console.log(`Clicked details link for book ID: ${book.id}`);
    });


    return card;
}

/**
 * Renders pagination controls.
 * @param {string} containerId - The ID of the container element for pagination buttons.
 * @param {number} totalItems - Total number of items available.
 * @param {number} currentPage - The current active page (1-based).
 * @param {number} itemsPerPage - How many items are displayed per page.
 * @param {number} maxPagesToShow - Maximum number of page buttons to display directly (e.g., 5 or 7).
 */
export function renderPaginationControls(containerId, totalItems, currentPage, itemsPerPage, maxPagesToShow = 5) {
    const container = document.getElementById(containerId);
    if (!container || totalItems <= itemsPerPage) {
        if (container) container.innerHTML = ''; // Clear if not needed
        return; // No pagination needed if only one page or container missing
    }

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    container.innerHTML = ''; // Clear previous controls

    // --- Helper function to create a button ---
    const createButton = (text, page, isDisabled = false, isActive = false, isEllipsis = false) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.dataset.page = page;
        button.disabled = isDisabled;
        button.classList.add('btn', 'btn-sm');
        if (isActive) {
            button.classList.add('btn-primary'); // Active page style
            button.classList.remove('btn-outline-secondary');
        } else if (isEllipsis) {
             button.classList.add('btn-light', 'disabled'); // Ellipsis style
             button.style.pointerEvents = 'none'; // Make unclickable
        }
        else {
            button.classList.add('btn-outline-secondary'); // Default style
        }
        return button;
    };

    // --- Previous Button ---
    container.appendChild(createButton('« Prev', currentPage - 1, currentPage === 1));

    // --- Page Number Buttons ---
    if (totalPages <= maxPagesToShow) {
        // Show all pages if total is less than or equal to max
        for (let i = 1; i <= totalPages; i++) {
            container.appendChild(createButton(i, i, false, i === currentPage));
        }
    } else {
        // Show truncated pages with ellipsis
        const halfMax = Math.floor(maxPagesToShow / 2);
        let startPage, endPage;

        if (currentPage <= halfMax) {
            // Near the beginning
            startPage = 1;
            endPage = maxPagesToShow - 1; // Leave space for ellipsis and last page
            container.appendChild(createButton(1, 1, false, 1 === currentPage));
            for (let i = 2; i <= endPage; i++) {
                container.appendChild(createButton(i, i, false, i === currentPage));
            }
            container.appendChild(createButton('...', -1, true, false, true)); // Ellipsis
            container.appendChild(createButton(totalPages, totalPages, false, totalPages === currentPage));
        } else if (currentPage + halfMax >= totalPages) {
            // Near the end
            startPage = totalPages - (maxPagesToShow - 2); // Leave space for first page and ellipsis
            endPage = totalPages;
            container.appendChild(createButton(1, 1, false, 1 === currentPage));
            container.appendChild(createButton('...', -1, true, false, true)); // Ellipsis
            for (let i = startPage; i <= endPage; i++) {
                container.appendChild(createButton(i, i, false, i === currentPage));
            }
        } else {
            // In the middle
            startPage = currentPage - Math.floor((maxPagesToShow - 3) / 2); // Adjust for first, last, and two ellipses
            endPage = currentPage + Math.ceil((maxPagesToShow - 3) / 2);

            container.appendChild(createButton(1, 1, false, 1 === currentPage));
            container.appendChild(createButton('...', -1, true, false, true)); // Ellipsis start

            for (let i = startPage; i <= endPage; i++) {
                container.appendChild(createButton(i, i, false, i === currentPage));
            }

            container.appendChild(createButton('...', -1, true, false, true)); // Ellipsis end
            container.appendChild(createButton(totalPages, totalPages, false, totalPages === currentPage));
        }
    }


    // --- Next Button ---
    container.appendChild(createButton('Next »', currentPage + 1, currentPage === totalPages));
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
