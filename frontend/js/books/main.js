// Main Application Logic for Books Page
import { handleLogout, checkAndCacheUserProfile } from '../auth.js';
import {
    renderPaginationControls, // New function needed in ui.js
    displayErrorMessage
} from '../renderUtils.js'; // Assuming this file exists for rendering
import { fetchBooks, fetchBookTopics } from '../api.js'; // Assuming these exist
import { initTableViewToggle } from '../viewToggle.js'; // Import the view toggle function

// --- Global State ---
let currentSortKey = 'overall_average_rating'; // Default sort for books
let currentSortDirection = 'desc';
let currentPage = 1;
const booksPerPage = 10; // Or get from API/config

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("Books page DOM fully loaded and parsed");

    // Check login status and update UI immediately
    checkAndCacheUserProfile(); // This calls updateHeaderNav internally

    // --- Page-Specific Logic ---
    const pathname = window.location.pathname;

    console.log("On books index page");

    // Initialize view toggle (if needed, adapt from exchanges)
    initTableViewToggle(); // Initialize the view toggle logic

    // Populate filter dropdowns
    populateBookFilterOptions();

    // Load initial books list
    if (document.getElementById('item-list-body')) {
        loadBooks(); // Initial load with default sort and page 1
    }

    // --- Event Listeners ---

    // Search Form
    const searchForm = document.getElementById('search-filter-form');
    searchForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        console.log("Book search submitted");
        currentPage = 1; // Reset to first page on new search
        applyFilters();
    });

    // Apply Filters Button
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    applyFiltersBtn?.addEventListener('click', () => {
        currentPage = 1; // Reset to first page on filter apply
        applyFilters();
    });

    // Reset Filters Button
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    resetFiltersBtn?.addEventListener('click', () => {
        document.getElementById('filter-form')?.reset();
        document.getElementById('search-input').value = '';
        // Reset sort to default
        currentSortKey = 'overall_average_rating';
        currentSortDirection = 'desc';
        currentPage = 1;
        updateSortIndicators(); // Update visual indicators
        loadBooks(); // Reload with default filters/sort
    });

    // Table Header Sorting
    const tableHeader = document.querySelector('#item-table thead tr');
    tableHeader?.addEventListener('click', (event) => {
        const headerCell = event.target.closest('th');
        if (headerCell && headerCell.classList.contains('sortable')) {
            const sortKey = headerCell.dataset.sortKey;
            if (sortKey) {
                handleSortClick(sortKey);
            }
        }
    });

    // Table Body Click Listener (Row Navigation)
    const tableBody = document.getElementById('item-list-body');
    tableBody?.addEventListener('click', (event) => {
        // Check if the click target is the details link or inside it
        if (event.target.closest('a.details-link')) {
            // Click was on the details link, let the default link behavior happen
            return;
        }

        // Otherwise, handle the row click for navigation
        const row = event.target.closest('tr.clickable-row'); // Find the closest clickable row
        if (row && row.dataset.bookId) {
            const bookId = row.dataset.bookId;
            console.log(`Navigating to book details for ID: ${bookId}`);
            // Navigate to the book details page
            window.location.href = `/books/details.html?id=${bookId}`;
        }
    });

    // Pagination Controls (Event delegation)
    const paginationContainer = document.getElementById('pagination-controls');
    paginationContainer?.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON' && event.target.dataset.page) {
            const page = parseInt(event.target.dataset.page, 10);
            if (!isNaN(page) && page !== currentPage) {
                currentPage = page;
                loadBooks(); // Load the new page
            }
        }
    });

    // Set initial sort indicators
    updateSortIndicators();

    // == Global Event Listeners ==
    const logoutBtn = document.getElementById('nav-logout-btn');
    logoutBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        console.log("Logout button clicked");
        handleLogout();
    });

});


/**
 * Renders books into the provided table body element.
 * @param {Array<object>} items - Array of book items to render.
 * @param {HTMLTableSectionElement} tbodyElement - The tbody element to populate.
 * @param {number} startIndex - The starting index for numbering items (for pagination).
 */
function renderBookTable(items, tbodyElement, startIndex = 0) {
    // tbodyElement is assumed to be valid and cleared by the caller (loadBooks)

    if (!items || items.length === 0) {
        const row = tbodyElement.insertRow();
        const cell = row.insertCell();
        // Dynamically determine colspan based on header row if available, otherwise use a default
        const headerRow = tbodyElement.previousElementSibling?.rows?.[0];
        const columnCount = headerRow ? headerRow.cells.length : 8; // Default to 8 columns if header not found
        cell.colSpan = columnCount;
        cell.textContent = 'No books found matching your criteria.';
        cell.style.textAlign = 'center';
        cell.style.padding = '2rem'; // Add padding for better appearance
        cell.style.color = '#6c757d'; // Muted text color
    } else {
        items.forEach((book, index) => {
            const row = tbodyElement.insertRow();
            row.className = 'clickable-row'; // Keep row clickable
            row.dataset.bookId = book.id; // Use data attribute for book ID

            // Format data for display
            const ratingValue = parseFloat(book.overall_average_rating);
            const formattedRating = isNaN(ratingValue) ? 'N/A' : ratingValue.toFixed(1);
            const reviewCount = book.total_review_count?.toLocaleString() ?? 'N/A';

            // Populate cells
            let cell;

            // # Cell
            cell = row.insertCell();
            cell.textContent = startIndex + index + 1; // Use startIndex for correct numbering
            cell.style.textAlign = 'center';
            cell.style.verticalAlign = 'middle';
            cell.className = 'number-cell';

            // Cover Cell
            cell = row.insertCell();
            cell.style.textAlign = 'center';
            cell.style.verticalAlign = 'middle';
            cell.className = 'cover-cell';

            const coverImg = document.createElement('img');
            coverImg.src = book.cover_image_url || book.logo_url || '../assets/images/book-placeholder.png';
            coverImg.alt = `${book.name || 'Book'} Cover`;
            coverImg.loading = 'lazy';
            coverImg.style.maxWidth = '50px';
            coverImg.style.maxHeight = '75px';
            coverImg.style.objectFit = 'contain';
            coverImg.onerror = function() { this.onerror=null; this.src='../assets/images/book-placeholder.png'; };
            cell.appendChild(coverImg);

            // Title Cell
            cell = row.insertCell();
            cell.textContent = book.name || 'N/A';
            cell.style.verticalAlign = 'middle';
            cell.className = 'title-cell';

            // Rating Cell
            cell = row.insertCell();
            cell.innerHTML = formattedRating !== 'N/A' ? `<span style="font-weight: bold; color: gold;"> ★ ${formattedRating}</span>` : formattedRating;
            cell.style.textAlign = 'center';
            cell.style.verticalAlign = 'middle';
            cell.className = 'rating-cell';

            // Reviews Cell
            const reviewsTd = row.insertCell();
            reviewsTd.className = 'reviews-cell';
            reviewsTd.style.textAlign = 'center';
            reviewsTd.style.verticalAlign = 'middle';

            const reviewsLink = document.createElement('a');
            reviewsLink.href = `books/reviews.html?id=${book.id}`;
            reviewsLink.textContent = reviewCount;
            reviewsLink.classList.add('reviews-link');
            reviewsLink.addEventListener('click', (event) => {
                event.stopPropagation();
            });
            reviewsTd.appendChild(reviewsLink);

            // Year Cell
            cell = row.insertCell();
            cell.textContent = book.year || 'N/A';
            cell.style.textAlign = 'center';
            cell.style.verticalAlign = 'middle';
            cell.className = 'year-cell';

            // Info Cell (Author)
            cell = row.insertCell();
            cell.textContent = book.author || 'Unknown Author';
            cell.style.verticalAlign = 'middle';
            cell.className = 'info-cell';

            // Action Cell (Overview Button)
            const actionTd = row.insertCell();
            actionTd.className = 'action-cell';
            actionTd.style.textAlign = 'center';
            actionTd.style.verticalAlign = 'middle';

            const detailBtn = document.createElement('a');
            detailBtn.href = `/books/details.html?id=${book.id}`;
            detailBtn.textContent = 'Обзор';
            detailBtn.classList.add('btn', 'btn-sm', 'btn-secondary', 'details-link');
            detailBtn.addEventListener('click', (event) => {
                event.stopPropagation();
            });
            actionTd.appendChild(detailBtn);
        });
    }
}


/**
 * Fetches data and populates book filter select options.
 */
async function populateBookFilterOptions() {
    const topicSelect = document.getElementById('filter-topic');

    // Populate Topics
    if (topicSelect) {
        try {
            const topics = await fetchBookTopics();
            topics.sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
            topics.forEach(topic => {
                const option = document.createElement('option');
                option.value = topic.id;
                option.textContent = topic.name;
                topicSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Failed to load book topics for filter:", error);
            // Optionally display an error message near the select
        }
    }
    // Add other filters like year range if implemented
}

/**
 * Handles clicking on a sortable table header for books.
 * @param {string} newSortKey - The key to sort by (from data-sort-key).
 */
function handleSortClick(newSortKey) {
    if (currentSortKey === newSortKey) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortKey = newSortKey;
        currentSortDirection = 'desc'; // Default to descending for new column
    }
    console.log(`Sorting books by: ${currentSortKey}, Direction: ${currentSortDirection}`);
    currentPage = 1; // Reset to first page when sort changes
    updateSortIndicators();
    applyFilters(); // Re-apply filters which will include the new sort order
}

/**
 * Updates the visual indicators (classes) on book table headers.
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
 * Gathers filter values and triggers loading books.
 */
function applyFilters() {
    currentPage = 1; // Reset to first page when applying filters
    const params = {};
    const searchTerm = document.getElementById('search-input')?.value;
    const topicId = document.getElementById('filter-topic')?.value;
    // Add other filters like year range if implemented
    // const minYear = document.getElementById('filter-min-year')?.value;
    // const maxYear = document.getElementById('filter-max-year')?.value;

    if (searchTerm) params.title = searchTerm; // Assuming API filters by 'title'
    if (topicId) params.topic_id = topicId;
    // if (minYear) params.min_year = minYear;
    // if (maxYear) params.max_year = maxYear;

    // Add sort parameters
    params.field = currentSortKey;
    params.direction = currentSortDirection;

    // Add pagination parameters (handled in loadBooks)

    console.log("Applying book filters and sort:", params);
    loadBooks(params); // Pass filters, loadBooks will add pagination/sort
}

/**
 * Fetches and displays books.
 * @param {object} filterParams - Optional parameters for filtering/searching books.
 */
async function loadBooks(filterParams = {}) {
    const tbodyId = 'item-list-body';
    const cardContainerId = 'book-card-container';
    const loadingIndicatorId = 'loading-books';
    const errorContainerId = 'item-list-error';
    const paginationContainerId = 'pagination-controls';

    const loadingIndicator = document.getElementById(loadingIndicatorId);
    const tbody = document.getElementById(tbodyId); // Get tbody DOM element
    const cardContainer = document.getElementById(cardContainerId);
    const errorContainer = document.getElementById(errorContainerId);
    const paginationContainer = document.getElementById(paginationContainerId);

    // Early exit if critical display areas are missing
    // If your page might sometimes have only one view (e.g. only table or only cards), adjust this check.
    if (!tbody && !cardContainer) {
        console.error("Neither table body nor card container found. Cannot display books.");
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        // Ensure errorContainer exists before trying to use it
        if (errorContainer) displayErrorMessage(errorContainerId, "Book display area not found.");
        else console.error("Error container not found to display message: Book display area not found.");
        return;
    }


    // Show loading, clear previous state
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (tbody) tbody.innerHTML = ''; // Clear tbody content
    if (cardContainer) cardContainer.innerHTML = ''; // Clear card container content
    if (paginationContainer) paginationContainer.innerHTML = ''; // Clear old pagination
    if (errorContainer) errorContainer.classList.remove('visible');

    try {
        // Combine filters, sorting, and pagination
        const queryParams = {
            ...filterParams, // Filters from applyFilters
            field: currentSortKey,
            direction: currentSortDirection,
            page: currentPage,
            limit: booksPerPage,
        };

        // Remove empty/null parameters
        Object.keys(queryParams).forEach(key => {
            if (queryParams[key] === '' || queryParams[key] === null || queryParams[key] === undefined) {
                delete queryParams[key];
            }
        });

        console.log("Loading books with params:", queryParams);
        const data = await fetchBooks(queryParams); // Single fetch call
        console.log("Books received:", data);

        if (data && data.items) {
            // Render table view if tbody exists
            if (tbody) {
                renderBookTable(data.items, tbody, (currentPage - 1) * booksPerPage);
            }

            // Render card view if cardContainer exists
            if (cardContainer) {
                renderBookCardView(data.items, cardContainerId); // renderBookCardView uses ID
            }
            
            // Render pagination if container exists
            if (paginationContainer) {
                renderPaginationControls(paginationContainerId, data.total, data.page, data.limit);
            }

            // Ensure sort indicators are correct
            updateSortIndicators();

            if (loadingIndicator) loadingIndicator.style.display = 'none';
        } else {
            // Handle case where data or data.items is missing
            if (tbody) {
                renderBookTable([], tbody, 0); // Pass empty array and tbody element
            }
            if (cardContainer) {
                renderBookCardView([], cardContainerId); // Pass empty array
            }
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (errorContainer && !errorContainer.classList.contains('visible')) {
                displayErrorMessage(errorContainerId, 'Could not load book data or no books found.');
            }
        }

    } catch (error) {
        console.error("Failed to load books:", error);
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (errorContainer) displayErrorMessage(errorContainerId, `Error loading books: ${error.message}`);
        // tbody, cardContainer, paginationContainer are already cleared at the start of loadBooks or on error.
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
        : `<a href="/books/details.html?id=${book.id}" class="btn btn-secondary btn-sm details-link">Обзор</a>`;

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
 * Renders books as cards in the card container.
 * @param {Array} books - Array of book objects.
 * @param {string} containerId - ID of the card container element.
 */
function renderBookCardView(books, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Card container #${containerId} not found.`);
        return;
    }
    container.innerHTML = ''; // Clear previous cards

    if (books && books.length > 0) {
        books.forEach(book => {
            // Assuming renderBookCard exists in ui.js and returns an HTMLElement
            const cardElement = renderBookCard(book);
            if (cardElement) {
                container.appendChild(cardElement);
            }
        });
    } else {
        // Display a "no results" message within the card container
        const noResults = document.createElement('div');
        noResults.className = 'no-results-message'; // Add class for styling
        noResults.textContent = 'No books found matching your criteria.';
        noResults.style.textAlign = 'center';
        noResults.style.padding = '2rem';
        noResults.style.color = '#6c757d';
        container.appendChild(noResults);
    }
}
