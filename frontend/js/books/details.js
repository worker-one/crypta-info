// Book Detail Page Logic
import { getBookDetails, listItemReviews, voteOnReview } from '../api.js'; // Added listItemReviews, voteOnReview
import { checkAndCacheUserProfile, handleLogout, isLoggedIn } from '../auth.js'; // Added isLoggedIn

// --- Global variable to store fetched reviews ---
let currentReviews = [];

// --- DOM Elements for Reviews (assuming these IDs exist in the HTML) ---
const reviewsList = document.getElementById('reviews-list');
const reviewsLoading = document.getElementById('reviews-loading');
const reviewsError = document.getElementById('reviews-error');
const reviewsPagination = document.getElementById('reviews-pagination');
const sortPositiveBtn = document.getElementById('sort-reviews-positive'); // Assuming this ID exists
const sortNegativeBtn = document.getElementById('sort-reviews-negative'); // Assuming this ID exists

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
            // Load book reviews using the new function
            await loadBookReviews(book.id);
            // Setup sorting buttons (now uses global currentReviews)
            setupSortingButtons();
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
                <h3>Общая информация</h3>
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

    // --- Populate Book Description ---
    const descriptionElement = document.getElementById('book-description-text');
    if (descriptionElement) {
        descriptionElement.textContent = book.description || 'No description available.';
        console.log('Book description populated.');
    } else {
        console.warn('Book description element not found.');
    }
    // --- End Populate Book Description ---

    const addReviewLink = document.getElementById('add-review-link');
    if (addReviewLink && book && book.id) {
        addReviewLink.href = `./reviews.html?id=${book.id}#add-review-section`;
        console.log(`Add review link updated to: ${addReviewLink.href}`);
    } else if (addReviewLink) {
        console.warn('Could not set Add Review link: Book ID missing or link element not found.');
        addReviewLink.classList.add('hidden');
    }
}

// --- Review Loading, Rendering, Voting, and Sorting Functions ---

/**
 * Loads reviews for a specific book.
 * @param {string|number} bookId - The ID of the book.
 */
async function loadBookReviews(bookId) {
    console.log(`Loading reviews for book ID: ${bookId}`);

    if (!reviewsList || !reviewsLoading || !reviewsError) {
        console.error('Required DOM elements for reviews not found');
        return;
    }

    reviewsLoading.classList.remove('hidden');
    reviewsError.classList.remove('visible');
    reviewsList.innerHTML = '';
    if (reviewsPagination) reviewsPagination.innerHTML = ''; // Clear pagination if exists
    currentReviews = []; // Reset reviews before fetch
    updateSortButtonCounts(); // Update counts to 0 initially

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

        currentReviews = response.items;
        updateSortButtonCounts(); // Update counts after fetching

        if (currentReviews.length === 0) {
            console.log('No reviews found for this book');
            reviewsList.innerHTML = '<p>No reviews found for this book yet.</p>';
        } else {
            console.log(`Rendering ${currentReviews.length} reviews initially (sorted by date)...`);
            renderReviewsList(currentReviews); // Render reviews sorted by date initially
        }

        // TODO: Implement pagination if response.total > response.limit

    } catch (error) {
        console.error("Error loading book reviews:", error);
        reviewsLoading.classList.add('hidden');
        reviewsError.textContent = error.message || 'Failed to load reviews.';
        reviewsError.classList.add('visible');
        currentReviews = [];
        updateSortButtonCounts(); // Update counts on error (to 0)
    }
}

/**
 * Renders a list of reviews into the DOM.
 * @param {Array<object>} reviews - The array of review objects to render.
 */
const renderReviewsList = (reviews) => {
    if (!reviewsList) return;
    reviewsList.innerHTML = ''; // Clear previous reviews

    if (reviews && reviews.length > 0) {
        reviews.forEach(review => {
            const reviewElement = document.createElement('div');
            reviewElement.classList.add('review-item');
            // Books use a single 'rating' field directly
            const ratingDisplay = review.rating ? `${review.rating.toFixed(1)} ★` : 'N/A';

            reviewElement.innerHTML = `
                <div class="review-header">
                    <span class="review-author">${review.user?.nickname || review.guest_name}</span>
                    <span class="review-date">${new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                <div class="review-rating">Rating: ${ratingDisplay}</div>
                <div class="review-content">
                    <p>${review.comment || 'No comment provided.'}</p>
                </div>
                <div class="review-footer">
                    <button class="vote-btn useful transparent-btn" data-review-id="${review.id}" data-vote="true">👍 (${review.useful_votes_count || 0})</button>
                    <button class="vote-btn not-useful transparent-btn" data-review-id="${review.id}" data-vote="false">👎 (${review.not_useful_votes_count || 0})</button>
                    <span class="vote-feedback" data-review-id="${review.id}"></span>
                </div>
            `;
            reviewsList.appendChild(reviewElement);
        });
        setupVoteButtons(); // Re-attach event listeners after rendering
    } else {
        reviewsList.innerHTML = '<p>No reviews match the criteria or none available.</p>';
    }
    updateSortButtonCounts(); // Update counts whenever list is rendered
};

/**
 * Sets up event listeners for vote buttons on reviews.
 */
function setupVoteButtons() {
    console.log('Setting up vote button event handlers');
    const voteButtons = document.querySelectorAll('.vote-btn');
    console.log(`Found ${voteButtons.length} vote buttons`);

    voteButtons.forEach(button => {
        // Prevent adding multiple listeners if called repeatedly
        if (button.dataset.listenerAttached === 'true') return;
        button.dataset.listenerAttached = 'true';

        button.addEventListener('click', async (event) => {
            const reviewId = event.target.dataset.reviewId;
            const isUseful = event.target.dataset.vote === 'true';
            console.log(`Vote button clicked for review ${reviewId}, isUseful: ${isUseful}`);

            if (!isLoggedIn()) {
                console.log('User not logged in, showing alert');
                alert('Please log in to vote on reviews.');
                return;
            }

            const feedbackElement = document.querySelector(`.vote-feedback[data-review-id="${reviewId}"]`);
            const footerElement = event.target.closest('.review-footer');
            if (!footerElement) return;

            console.log('Disabling vote buttons during processing...');
            footerElement.querySelectorAll('.vote-btn').forEach(btn => btn.disabled = true);
            if(feedbackElement) feedbackElement.textContent = 'Voting...';

            try {
                console.log(`Submitting vote for review ${reviewId}`);
                const updatedReview = await voteOnReview(reviewId, isUseful);
                console.log('Vote successful, updated review:', updatedReview);

                // Update counts in the UI
                const usefulBtn = footerElement.querySelector(`.vote-btn.useful[data-review-id="${reviewId}"]`);
                const notUsefulBtn = footerElement.querySelector(`.vote-btn.not-useful[data-review-id="${reviewId}"]`);
                if (usefulBtn) usefulBtn.textContent = `👍 (${updatedReview.useful_votes_count || 0})`;
                if (notUsefulBtn) notUsefulBtn.textContent = `👎 (${updatedReview.not_useful_votes_count || 0})`;

                // Update the review in the local currentReviews array
                const reviewIndex = currentReviews.findIndex(r => r.id === reviewId);
                if (reviewIndex > -1) {
                    currentReviews[reviewIndex].useful_votes_count = updatedReview.useful_votes_count;
                    currentReviews[reviewIndex].not_useful_votes_count = updatedReview.not_useful_votes_count;
                }


                if(feedbackElement) feedbackElement.textContent = 'Voted!';
                console.log('Vote UI updated with new counts');

                setTimeout(() => {
                    console.log('Clearing vote feedback message');
                    if(feedbackElement) feedbackElement.textContent = '';
                }, 2000);
            } catch (error) {
                console.error(`Vote failed for review ${reviewId}:`, error);
                if(feedbackElement) feedbackElement.textContent = `Error: ${error.message || 'Vote failed'}`;
                setTimeout(() => {
                    console.log('Clearing error message');
                    if(feedbackElement) feedbackElement.textContent = '';
                }, 3000);
            } finally {
                console.log('Re-enabling vote buttons');
                footerElement.querySelectorAll('.vote-btn').forEach(btn => btn.disabled = false);
            }
        });
    });
    console.log('Vote button setup complete');
}

/**
 * Updates the text content of sorting buttons to include review counts.
 */
const updateSortButtonCounts = () => {
    if (!sortPositiveBtn || !sortNegativeBtn) return;

    let positiveCount = 0;
    let negativeCount = 0;

    currentReviews.forEach(review => {
        // Books have a single 'rating' field
        if (review.rating >= 4) {
            positiveCount++;
        } else if (review.rating > 0 && review.rating < 4) { // Count reviews with rating < 4 but > 0 as negative
            negativeCount++;
        }
        // Reviews with rating 0 or null are not counted in either category
    });

    sortPositiveBtn.textContent = `Positive (${positiveCount})`;
    sortNegativeBtn.textContent = `Negative (${negativeCount})`;
};


/**
 * Sets up event listeners for sorting buttons. Relies on global `currentReviews`.
 */
function setupSortingButtons() {
    console.log('Setting up sorting button event handlers');

    if (sortPositiveBtn) {
        sortPositiveBtn.addEventListener('click', () => {
            console.log('Sort Positive clicked');
            // Sort by rating descending (highest first)
            const sortedReviews = [...currentReviews].sort((a, b) => {
                // Handle null/undefined ratings if necessary
                const ratingA = a.rating || 0;
                const ratingB = b.rating || 0;
                return ratingB - ratingA;
            });
            renderReviewsList(sortedReviews);
        });
    } else {
        console.warn('Sort Positive button not found (expected ID: sort-reviews-positive)');
    }

    if (sortNegativeBtn) {
        sortNegativeBtn.addEventListener('click', () => {
            console.log('Sort Negative clicked');
            // Sort by rating ascending (lowest first)
             const sortedReviews = [...currentReviews].sort((a, b) => {
                // Handle null/undefined ratings if necessary
                const ratingA = a.rating || 0;
                const ratingB = b.rating || 0;
                return ratingA - ratingB;
            });
            renderReviewsList(sortedReviews);
        });
    } else {
        console.warn('Sort Negative button not found (expected ID: sort-reviews-negative)');
    }
    // Initial update of counts based on potentially pre-loaded reviews
    updateSortButtonCounts();
}