// Book Detail Page Logic
import { getBookDetails } from './api.js'; // Assuming getBookDetails exists in api.js
import { updateHeaderNav, displayErrorMessage } from './ui.js';
import { checkAndCacheUserProfile, handleLogout } from './auth.js';
// Import review functions
import { loadReviews, setupSortingButtons } from './books-reviews.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Book detail page initializing...');
    // Check login status and update navigation
    checkAndCacheUserProfile(); // This calls updateHeaderNav internally
    console.log('Header navigation updated.');

    // Add logout listener
    const logoutBtn = document.getElementById('nav-logout-btn');
    logoutBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        console.log("Logout button clicked on book detail page");
        handleLogout();
    });

    // Get the book identifier (assuming 'id' for now, could be 'slug')
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id'); // Or urlParams.get('slug') if using slugs
    console.log(`Retrieved book identifier from URL: ${bookId}`);

    // Get DOM elements
    const loadingElement = document.getElementById('book-detail-loading');
    const errorElement = document.getElementById('book-detail-error');
    const detailContainer = document.getElementById('book-detail');
    const breadcrumbBookName = document.getElementById('book-name-breadcrumb');
    const reviewSection = document.getElementById('review-section');
    const reviewsLoading = document.getElementById('reviews-loading');
    const reviewsError = document.getElementById('reviews-error');
    const reviewsList = document.getElementById('reviews-list');
    const reviewsPagination = document.getElementById('reviews-pagination');
    const additionalInfoContainer = document.getElementById('additional-info-content'); // Container for additional details
    const whereToBuyContainer = document.getElementById('where-to-buy-content'); // Container for buy links

    console.log('DOM elements retrieved');

    if (!bookId) {
        console.error('No book identifier found in URL');
        if (errorElement) {
            errorElement.textContent = 'No book identifier provided.';
            errorElement.classList.add('visible');
        }
        if (loadingElement) loadingElement.classList.add('hidden');
        return; // Stop execution
    }

    // --- Load Book Details ---
    try {
        // Show loading indicator
        if (loadingElement) loadingElement.classList.remove('hidden');
        if (detailContainer) detailContainer.classList.add('hidden');
        if (errorElement) errorElement.classList.remove('visible');

        console.log(`Fetching book details for ID: ${bookId}`);
        const book = await getBookDetails(bookId); // Use the identifier
        console.log("Book details received:", book);

        // Hide loading, show content
        if (loadingElement) loadingElement.classList.add('hidden');
        if (detailContainer) detailContainer.classList.remove('hidden');

        // Update page title and breadcrumb
        if (book && book.name) {
            console.log(`Updating page title to: ${book.name} - Crypta.Info`);
            document.name = `${book.name} - Crypta.Info`;
            if (breadcrumbBookName) breadcrumbBookName.textContent = book.name;
        } else {
             if (breadcrumbBookName) breadcrumbBookName.textContent = "Book Details";
        }

        // Render book details
        renderBookDetails(book, detailContainer);
        console.log('Book detail HTML built and inserted into DOM');

        // --- Populate Additional Information ---
        if (additionalInfoContainer) {
            additionalInfoContainer.innerHTML = `
                <div class="details">
                    <div class="detail-card">
                        <h3>Details</h3>
                        <p><strong>ISBN:</strong> ${book.isbn || 'N/A'}</p>
                        <p><strong>Publisher:</strong> ${book.publisher || 'N/A'}</p>
                        <p><strong>Pages:</strong> ${book.pages || 'N/A'}</p>
                        <p><strong>Language:</strong> ${book.language || 'N/A'}</p>
                        <p><strong>Categories:</strong> ${book.categories?.map(c => c.name).join(', ') || 'N/A'}</p>
                    </div>
                </div>
            `;
        }

        // --- Populate Where to Buy ---
        if (whereToBuyContainer) {
            let buyLinksHtml = '<p>No purchase links available.</p>';
            if (book.purchase_links && book.purchase_links.length > 0) {
                buyLinksHtml = '<ul>';
                book.purchase_links.forEach(link => {
                    buyLinksHtml += `<li><a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.store}</a></li>`;
                });
                buyLinksHtml += '</ul>';
            }

            whereToBuyContainer.innerHTML = `
                <div class="details">
                    <div class="detail-card">
                        <h3>Purchase Options</h3>
                        ${buyLinksHtml}
                    </div>
                </div>
            `;
        }

        // --- Load Reviews ---
        if (reviewSection && book && book.id) {
            console.log('Showing and loading review section...');
            reviewSection.classList.remove('hidden');
            // Load book reviews
            await loadReviews(book.id, 'book', reviewsList, reviewsLoading, reviewsError, reviewsPagination);
            setupSortingButtons(book.id, 'book', reviewsList, reviewsLoading, reviewsError, reviewsPagination); // Setup sorting for reviews
        } else {
            console.log('Review section not found or book ID missing, skipping review load.');
            if (reviewSection) reviewSection.classList.add('hidden');
        }

    } catch (error) {
        console.error("Error fetching book details:", error);
        if (loadingElement) loadingElement.classList.add('hidden');
        if (errorElement) {
            errorElement.textContent = error.message || 'Failed to load book details. Please try again later.';
            errorElement.classList.add('visible');
        }
        if (detailContainer) detailContainer.classList.add('hidden'); // Hide container on error
    }
});

/**
 * Renders the fetched book details into the specified container.
 * @param {object} book - The book data object.
 * @param {HTMLElement} container - The DOM element to render into.
 */
function renderBookDetails(book, container) {
    if (!container || !book) {
        console.error('Cannot render book details: Invalid book data or container.');
        if (container) container.innerHTML = '<p>Could not display book details.</p>';
        return;
    }

    // Format data for display
    const ratingValue = parseFloat(book.overall_average_rating);
    const formattedRating = isNaN(ratingValue) ? 'N/A' : ratingValue.toFixed(1) + ' ★';
    const reviewCount = book.total_review_count?.toLocaleString() ?? '0';
    const topics = book.topics && book.topics.length > 0
        ? book.topics.map(topic => `<span class="topic-tag">${topic.name}</span>`).join(' ')
        : 'N/A';

    container.innerHTML = `
        <div class="book-detail-header">
            <div class="book-cover">
                <img src="${book.logo_url || '../assets/images/book-cver-placeholder.png'}" alt="${book.name} Cover">
            </div>
            <div class="book-meta">
                <h1>${book.name || 'N/A'}</h1>
                <p class="author">By: ${book.author || 'N/A'}</p>
                <p class="year">Published: ${book.year || 'N/A'}</p>
                <div class="stats-overview">
                    <div class="stat-item">
                        <div class="value">${formattedRating}</div>
                        <div class="label">Overall Rating</div>
                    </div>
                    <div class="stat-item">
                        <div class="value">${reviewCount}</div>
                        <div class="label">Total Reviews</div>
                    </div>
                </div>
                 <div class="topics">
                    <strong>Topics:</strong> ${topics}
                </div>
            </div>
        </div>

        <div class="details">
            <div class="detail-card">
                <h3>Basic Information</h3>
                <p><strong>Publisher:</strong> ${book.publisher || 'N/A'}</p>
                <p><strong>ISBN:</strong> ${book.isbn || book.number || 'N/A'}</p>
                <p><strong>Pages:</strong> ${book.pages || 'N/A'}</p>
            </div>
            
            <div class="detail-card">
                <h3>Where to buy</h3>
                <p><a href="${book.website_url || '#'}" target="_blank">${book.website_url ? 'Link 1' : 'Not available'}</a></p>
            </div>
        </div>
    `;

    const addReviewLink = document.getElementById('add-review-link');
    if (addReviewLink && book && book.id) {
        addReviewLink.href = `reviews.html?id=${book.id}`;
        console.log(`Add review link updated to: ${addReviewLink.href}`);
    } else if (addReviewLink) {
        console.warn('Could not set Add Review link: Book ID missing or link element not found.');
        addReviewLink.classList.add('hidden');
    }
}
