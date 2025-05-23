// Book Detail Page Logic
import { getBookDetails, listItemReviews, voteOnReview } from '../api.js'; // Added listItemReviews, voteOnReview
import { checkAndCacheUserProfile, handleLogout, isLoggedIn } from '../auth.js'; // Added isLoggedIn
import { renderReviewsList, setupSortingButtons, updateSortButtonCounts, setupReviewVoting } from '../common/reviews.js';
import { renderStarRating, attachStarClickHandlers } from '../common/details.js'; // Import the star rating function

// --- Global variable to store fetched reviews ---
let currentReviews = [];
let reviewsTabLink;
window.currentReviews = currentReviews; // Make it available globally

// --- DOM Elements for Отзывы (assuming these IDs exist in the HTML) ---
const reviewsList = document.getElementById('reviews-list');
const reviewsLoading = document.getElementById('reviews-loading');
const reviewsError = document.getElementById('reviews-error');
const reviewsPagination = document.getElementById('reviews-pagination');



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
    const additionalInfoContainer = document.getElementById('additional-info-content'); // Container for additional details
    const whereToBuyContainer = document.getElementById('where-to-buy-content'); // Now always present
    reviewsTabLink = document.getElementById('tab-reviews'); // Assign to module-scoped variable
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

    // --- Load Book Обзор ---
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
            document.title = `${book.name} - Crypta.Info`; // Fix: set document.title, not document.name
            if (breadcrumbBookName) breadcrumbBookName.textContent = book.name;
        } else {
            if (breadcrumbBookName) breadcrumbBookName.textContent = "Book Обзор";
        }

        // Render book details using exchange layout
        renderBookDetails(book, detailContainer);

        // --- Populate Where to Buy (reuse detail-card style) ---
        if (whereToBuyContainer) {
            let buyLinksHtml = '<p>Нет ссылок для покупки.</p>';
            if (book.purchase_links && book.purchase_links.length > 0) {
                buyLinksHtml = '<ul>';
                book.purchase_links.forEach(link => {
                    buyLinksHtml += `<li><a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.store}</a></li>`;
                });
                buyLinksHtml += '</ul>';
            }
            whereToBuyContainer.innerHTML = `
                <div class="detail-card">
                    <h3>Где купить</h3>
                    ${buyLinksHtml}
                </div>
            `;
        }

        // --- Load Reviews ---
        if (reviewSection && book && book.id) {
            console.log('Showing and loading review section...');
            reviewSection.classList.remove('hidden');
            // Load book reviews using the new function
            await loadBookReviews(book.id);
            // Setup sorting buttons (now uses global currentReviews)
            window.currentReviews = currentReviews; // Ensure global is set
            setupSortingButtons(currentReviews);
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
 * Renders the fetched book details into the specified container using exchange layout.
 * @param {object} book - The book data object.
 * @param {HTMLElement} container - The DOM element to render into.
 */
export function renderBookDetails(book, container) {
    if (!container || !book) {
        container.innerHTML = '<p>Could not display book details.</p>';
        return;
    }

    // Format data for display
    const ratingValue = parseFloat(book.overall_average_rating);
    const formattedRating = isNaN(ratingValue) ? 'N/A' : ratingValue.toFixed(1) + ' ★';
    const reviewCount = book.total_review_count?.toLocaleString() ?? '0';
    const topics = book.topics && book.topics.length > 0
        ? book.topics.map(topic => `<span class="topic-tag">${topic.name}</span>`).join(' ')
        : 'N/A';

    // Adopt exchange layout: .stats-overview, .stat-grid, .stat-item, .detail-card
    container.innerHTML = `
        <div class="stats-overview">
            <h1 style="margin: 0;">${book.name || 'N/A'}</h1>
            <div class="stat-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px;">
                <div class="header-with-logo" style="display: flex; align-items: center; margin-bottom: 0px;">
                    <div class="logo" style="margin-right: 15px;">
                        <img src="${book.logo_url || '../assets/images/book-cver-placeholder.png'}" alt="${book.name} Cover">
                    </div>
                </div>
                <div class="stat-item">
                    <div class="value">${renderStarRating(book.overall_average_rating, 5, true)}</div>
                    <div class="label">${book.total_rating_count} голосов</div>
                </div>
                <div class="stat-item">
                    <div class="value">${formattedRating}</div>
                    <div class="label">Рейтинг</div>
                </div>
                <div class="stat-item">
                    <div class="value">${book.year || 'N/A'}</div>
                    <div class="label">Издание</div>
                </div>
                <div class="stat-item">
                    <div class="value">${book.pages || 'N/A'}</div>
                    <div class="label">Страниц</div>
                </div>
            </div>
        </div>
        <div class="details">
            <div class="detail-card">
                <p><strong>Категории:</strong> ${book.categories?.map(c => c.name).join(', ') || 'N/A'}</p>
                <div class="topics" style="margin-top: 10px;">
                    <strong>Темы:</strong> ${topics}
                </div>
            </div>
        </div>
    `;

    // Attach click handlers to the stars
    attachStarClickHandlers();

    // --- Populate Book Описание ---
    const ОписаниеElement = document.getElementById('book-Описание-text');
    if (ОписаниеElement) {
        ОписаниеElement.textContent = book.Описание || 'Нет описания.';
    }

    const addReviewLink = document.getElementById('add-review-link');
    if (addReviewLink && book && book.id) {
        addReviewLink.href = `./reviews.html?id=${book.id}#add-review-section`;
    } else if (addReviewLink) {
        addReviewLink.classList.add('hidden');
    }
}

// --- Review Loading, Rendering, Voting, and Sorting Functions ---
/**
 * Loads reviews for a specific book and updates the reviews tab count.
 * @param {string|number} bookId - The ID of the book.
 */
async function loadBookReviews(bookId) {
    console.log(`Loading reviews for book ID: ${bookId}`);

    if (reviewsTabLink) {
        reviewsTabLink.textContent = 'Отзывы (...)'; // Indicate loading
    }

    if (!reviewsList || !reviewsLoading || !reviewsError) {
        console.error('Required DOM elements for reviews not found');
        return;
    }

    reviewsLoading.classList.remove('hidden');
    reviewsError.classList.remove('visible');
    reviewsList.innerHTML = '';
    if (reviewsPagination) reviewsPagination.innerHTML = '';
    currentReviews = []; // Reset reviews before fetch
    window.currentReviews = currentReviews; // Update global
    updateSortButtonCounts(currentReviews); // Update counts to 0 initially

    try {
        console.log('Calling API to list book reviews...');
        // Fetch reviews, sorted by creation date descending by default
        const response = await listItemReviews(bookId, { limit: 100, sort_by: 'created_at', direction: 'desc' });
        console.log('Reviews response received:', response);

        reviewsLoading.classList.add('hidden');

        if (!response || !response.items) {
            console.error('Invalid response structure:', response);
            throw new Error("Invalid response structure for reviews.");
        }

        // Filter out reviews with null comments
        currentReviews = response.items.filter(review => review.comment !== null);
        window.currentReviews = currentReviews; // Update global
        console.log(`Filtered ${response.items.length - currentReviews.length} reviews with null comments`);

        updateSortButtonCounts(currentReviews); // Update counts after fetching

        if (reviewsTabLink) {
            reviewsTabLink.textContent = `Отзывы (${currentReviews.length})`;
        }

        if (currentReviews.length === 0) {
            console.log('No reviews found for this book');
            reviewsList.innerHTML = '<p>Для этой книги отзывов пока нет.</p>';
        } else {
            console.log(`Rendering ${currentReviews.length} reviews initially (sorted by date)...`);
            renderReviewsList(currentReviews); // Render reviews sorted by date initially
        }

        // Setup sorting and voting after
        setupSortingButtons(currentReviews);
        setupReviewVoting(currentReviews); // Pass currentReviews to setupReviewVoting
        console.log('Review voting and sorting setup complete');
    }
    catch (error) {
        console.error('Error loading reviews:', error);
        reviewsLoading.classList.add('hidden');
        reviewsError.textContent = 'Ошибка загрузки отзывов. Пожалуйста, попробуйте позже.';
        reviewsError.classList.add('visible');
    }
    finally {
        if (reviewsLoading) reviewsLoading.classList.add('hidden');
        if (reviewsError) reviewsError.classList.remove('visible');
    }
}