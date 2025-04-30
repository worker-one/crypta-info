// Main Application Logic for Books Page
import { handleLogout, checkAndCacheUserProfile } from './auth.js';
import {
    updateHeaderNav,
    renderBookList, // New function needed in ui.js
    renderBookCard, // New function needed in ui.js
    renderPaginationControls, // New function needed in ui.js
    displayErrorMessage,
    clearErrorMessage,
    // initTableViewToggle // Assuming similar responsive behavior, maybe reuse or adapt
} from './ui.js';
import { fetchBooks, fetchBookTopics } from './api.js'; // Assuming these exist

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
    // initTableViewToggle(); // Reuse or adapt if card/table toggle is desired

    // Populate filter dropdowns
    populateBookFilterOptions();

    // Load initial books list
    if (document.getElementById('book-list-body')) {
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
    const tableHeader = document.querySelector('#book-table thead tr');
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
    const tableBody = document.getElementById('book-list-body');
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
            window.location.href = `/books/overview.html?id=${bookId}`;
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
    const headers = document.querySelectorAll('#book-table th.sortable');
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
    const tbodyId = 'book-list-body';
    const cardContainerId = 'book-card-container';
    const loadingIndicatorId = 'loading-books';
    const errorContainerId = 'book-list-error';
    const paginationContainerId = 'pagination-controls';

    const loadingIndicator = document.getElementById(loadingIndicatorId);
    const tbody = document.getElementById(tbodyId);
    const cardContainer = document.getElementById(cardContainerId);
    const errorContainer = document.getElementById(errorContainerId);
    const paginationContainer = document.getElementById(paginationContainerId);

    // Show loading, clear previous state
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (tbody) tbody.innerHTML = '';
    if (cardContainer) cardContainer.innerHTML = '';
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
        const data = await fetchBooks(queryParams); // Assume fetchBooks returns { items: [], total: number, page: number, limit: number }
        console.log("Books received:", data);

        if (data && data.items) {
            // Render table view
            renderBookList(data.items, tbodyId, loadingIndicatorId, errorContainerId, (currentPage - 1) * booksPerPage); // Pass offset for numbering

            // Render card view (assuming renderBookCard exists in ui.js)
            renderBookCardView(data.items, cardContainerId); // New function needed

            // Render pagination
            renderPaginationControls(paginationContainerId, data.total, data.page, data.limit);

            // Ensure sort indicators are correct
            updateSortIndicators();

            if (loadingIndicator) loadingIndicator.style.display = 'none';
        } else {
            // Handle case where data or data.items is missing
            renderBookList([], tbodyId, loadingIndicatorId, errorContainerId, 0);
            renderBookCardView([], cardContainerId);
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (!errorContainer?.classList.contains('visible')) {
                displayErrorMessage(errorContainerId, 'Could not load book data.');
            }
        }

    } catch (error) {
        console.error("Failed to load books:", error);
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        displayErrorMessage(errorContainerId, `Error loading books: ${error.message}`);
        if (tbody) tbody.innerHTML = '';
        if (cardContainer) cardContainer.innerHTML = '';
        if (paginationContainer) paginationContainer.innerHTML = ''; // Clear pagination on error too
    }
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
