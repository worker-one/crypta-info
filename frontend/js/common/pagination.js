
// --- Global State for Sorting ---
let currentSortKey = 'overall_average_rating'; // Default sort
let currentSortDirection = 'desc'; // Default direction
let currentPage = 1; // Initial page number
let totalPagesG = 1; // Global state for total pages

const ITEMS_PER_PAGE = 20; // Define items per page


/**
 * Updates the pagination controls based on the total number of items.
 * @param {number} totalItems - The total number of items.
 */
export function updatePaginationControls(totalItems) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1; // Ensure totalPages is at least 1, use constant
    totalPagesG = totalPages; // Update global total pages

    const prevButton = document.getElementById('prev-page-btn');
    const nextButton = document.getElementById('next-page-btn');
    const currentPageSpan = document.getElementById('current-page');
    const totalPagesSpan = document.getElementById('total-pages');

    if (currentPageSpan) currentPageSpan.textContent = currentPage;
    if (totalPagesSpan) totalPagesSpan.textContent = totalPagesG;

    if (prevButton) {
        prevButton.disabled = currentPage <= 1;
        // Event listener moved to DOMContentLoaded
    }

    if (nextButton) {
        nextButton.disabled = currentPage >= totalPagesG;
        // Event listener moved to DOMContentLoaded
    }
}
