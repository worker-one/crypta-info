import { getBookDetails, submitItemReview, listItemReviews, voteOnReview } from '../api.js'; // Use book-related API functions
import { displayErrorMessage, clearErrorMessage } from '../renderUtils.js';
import { updateHeaderNav } from '../header.js'; // Import from header.js
import { handleLogout, isLoggedIn, getAccessToken } from '../auth.js';

// --- DOM Elements (Declare with let, assign inside DOMContentLoaded) ---
let reviewsListContainer;
let reviewsLoadingIndicator;
let reviewsErrorContainer;
let addReviewSection;
let reviewForm;
let reviewRatingInputContainer;
let reviewSubmitError;
let reviewSubmitSuccess;
let loginPrompt;
let bookNameHeading;
let bookLinkBreadcrumb;
let pageErrorContainer;
let pageLoadingIndicator;
let reviewSectionContainer;

// --- Global variable to store fetched reviews ---
let currentReviews = [];

// --- Helper Functions ---
const showElement = (el) => el?.classList.remove('hidden');
const hideElement = (el) => el?.classList.add('hidden');

/**
 * Updates breadcrumbs and heading for books.
 * @param {string} bookName - The name of the book.
 * @param {string} bookId - The ID of the book.
 */
export function updatePageUI(bookName, bookId) { // Added export
    const overviewPageUrl = `overview.html?id=${bookId}`; // Use ID
    if (bookNameHeading) bookNameHeading.textContent = `${bookName} Reviews`;
    if (bookLinkBreadcrumb) {
        bookLinkBreadcrumb.textContent = bookName;
        bookLinkBreadcrumb.href = overviewPageUrl;
    }
    document.title = `${bookName} Reviews - Crypta.Info`;

    // Update tab links for books
    const overviewTabLink = document.getElementById('tab-overview');
    const reviewsTabLink = document.getElementById('tab-reviews');

    if (overviewTabLink) overviewTabLink.href = `overview.html?id=${bookId}`; // Use ID
    if (reviewsTabLink) {
        reviewsTabLink.classList.add('active');
        reviewsTabLink.href = '#'; // Current page
    }
}

/**
 * Updates the text content of sorting buttons to include review counts.
 * Counts based on the single 'rating' property.
 */
export const updateSortButtonCounts = () => { // Added export
    const sortPositiveBtn = document.getElementById('sort-reviews-positive'); // Use book-specific ID if different
    const sortNegativeBtn = document.getElementById('sort-reviews-negative'); // Use book-specific ID if different

    if (!sortPositiveBtn || !sortNegativeBtn) {
        console.warn("Sorting buttons not found during count update.");
        return;
    }

    let positiveCount = 0;
    let negativeCount = 0;

    currentReviews.forEach(review => {
        const rating = review.rating; // Assuming 'rating' field exists for book reviews
        if (rating >= 4) {
            positiveCount++;
        } else if (rating > 0 && rating < 4) {
            negativeCount++;
        }
    });

    sortPositiveBtn.textContent = `Positive (${positiveCount})`;
    sortNegativeBtn.textContent = `Negative (${negativeCount})`;
};

/**
 * Renders a list of book reviews into the DOM.
 * Displays the single 'rating' property.
 * @param {Array<object>} reviews - The array of review objects to render.
 */
export const renderReviewsList = (reviews) => { // Added export
    if (!reviewsListContainer) return;
    reviewsListContainer.innerHTML = '';

    if (reviews && reviews.length > 0) {
        reviews.forEach(review => {
            const reviewElement = document.createElement('div');
            reviewElement.classList.add('review-item');
            const ratingValue = review.rating; // Assuming 'rating' field

            reviewElement.innerHTML = `
                <div class="review-header">
                    <span class="review-author">${review.user.nickname}</span>
                    <span class="review-date">${new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                <div class="review-rating">Rating: ${ratingValue ? `${ratingValue} ★` : 'N/A'}</div>
                <div class="review-content">
                    <p>${review.comment}</p>
                </div>
                <div class="review-footer">
                    <button class="vote-btn useful transparent-btn" data-review-id="${review.id}" data-vote="true">👍 (${review.useful_votes_count})</button>
                    <button class="vote-btn not-useful transparent-btn" data-review-id="${review.id}" data-vote="false">👎 (${review.not_useful_votes_count})</button>
                    <span class="vote-feedback" data-review-id="${review.id}"></span>
                </div>
            `;
            reviewsListContainer.appendChild(reviewElement);
        });
        setupVoteButtons(); // Setup voting after rendering
    } else {
        reviewsListContainer.innerHTML = '<p>No reviews match the criteria or none available.</p>';
    }
};

/**
 * Loads and displays reviews for a given book ID.
 * @param {string} bookId - The ID of the book.
 */
export const loadReviews = async (bookId) => { // Already exported
    if (!reviewsListContainer || !reviewsLoadingIndicator || !reviewsErrorContainer) return;

    showElement(reviewsLoadingIndicator);
    hideElement(reviewsErrorContainer);
    reviewsListContainer.innerHTML = '';
    currentReviews = [];
    updateSortButtonCounts(); // Reset counts

    try {
        // Assuming listItemReviews can take a bookId and type, or use a specific book review function
        const reviewsData = await listItemReviews(bookId, { limit: 100, sort_by: 'created_at', direction: 'desc' }, 'book'); // Added type 'book'
        hideElement(reviewsLoadingIndicator);

        if (reviewsData && reviewsData.items) {
            currentReviews = reviewsData.items;
            renderReviewsList(currentReviews);
        } else {
            currentReviews = [];
            reviewsListContainer.innerHTML = '<p>No reviews yet. Be the first to add one!</p>';
        }
        updateSortButtonCounts(); // Update counts after loading
    } catch (error) {
        console.error('Failed to load book reviews:', error);
        hideElement(reviewsLoadingIndicator);
        currentReviews = [];
        updateSortButtonCounts(); // Reset counts on error
        reviewsListContainer.innerHTML = '';
        displayErrorMessage('reviews-error', `Failed to load reviews. ${error.message}`);
        showElement(reviewsErrorContainer);
    }
};

/**
 * Handles the submission of the book review form.
 * @param {Event} event - The form submission event.
 * @param {string} bookId - The ID of the book being reviewed.
 */
export const handleReviewSubmit = async (event, bookId) => { // Added export
    console.log('handleReviewSubmit called for bookId:', bookId);
    event.preventDefault();
    if (!reviewForm) {
        console.error('Review form element not found in handleReviewSubmit.');
        return;
    }
    console.log('Review form found:', reviewForm);

    const authToken = getAccessToken();
    console.log('Auth token present:', !!authToken);
    if (!authToken) {
        displayErrorMessage('review-submit-error', 'You must be logged in to submit a review.');
        showElement(reviewSubmitError);
        return;
    }

    clearErrorMessage('review-submit-error');
    hideElement(reviewSubmitError);
    hideElement(reviewSubmitSuccess);
    const submitButton = reviewForm.querySelector('button[type="submit"]');
    if (!submitButton) {
        console.error('Submit button not found within the form.');
        return;
    }
    console.log('Disabling submit button');
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    const commentText = document.getElementById('review-text').value;
    let ratingValue = null;

    const selectedRatingInput = reviewRatingInputContainer?.querySelector('.single-rating input[type="radio"]:checked');

    if (selectedRatingInput) {
        ratingValue = parseInt(selectedRatingInput.value, 10);
        console.log('Rating selected:', ratingValue);
    } else {
        console.log('No rating selected.');
    }

    if (!commentText || commentText.trim().length < 3) {
         displayErrorMessage('review-submit-error', 'Please provide a review text (at least 3 characters).');
         showElement(reviewSubmitError);
         submitButton.disabled = false;
         submitButton.textContent = 'Submit Review';
         return;
    }
    if (ratingValue === null) {
        displayErrorMessage('review-submit-error', 'Please select a star rating.');
        showElement(reviewSubmitError);
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Review';
        return;
    }

    const reviewData = {
        comment: commentText.trim(),
        rating: ratingValue,
    };
    console.log('Review data prepared:', reviewData);

    try {
        console.log('Attempting to submit book review via API...');
        // Assuming submitItemReview takes ID and type
        await submitItemReview(bookId, reviewData, 'book'); // Added type 'book'
        console.log('Book review submission successful (API call).');
        showElement(reviewSubmitSuccess);
        reviewSubmitSuccess.textContent = 'Review submitted successfully! It is pending moderation.';
        reviewForm.reset();
    } catch (error) {
        console.error('Failed to submit book review (API error):', error);
        displayErrorMessage('review-submit-error', `Failed to submit review: ${error.message}`);
        showElement(reviewSubmitError);
    } finally {
        console.log('Re-enabling submit button.');
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Review';
    }
};

/**
 * Sets up event listeners for vote buttons on book reviews.
 */
export function setupVoteButtons() { // Added export
    const voteButtons = document.querySelectorAll('.vote-btn');
    // Clear existing listeners before adding new ones
    voteButtons.forEach(button => {
        button.replaceWith(button.cloneNode(true));
    });
    // Add new listeners
    document.querySelectorAll('.vote-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const reviewId = event.target.dataset.reviewId;
            const isUseful = event.target.dataset.vote === 'true';

            if (!isLoggedIn()) {
                alert('Please log in to vote on reviews.');
                return;
            }

            const feedbackElement = document.querySelector(`.vote-feedback[data-review-id="${reviewId}"]`);
            const footer = event.target.closest('.review-footer');
            footer.querySelectorAll('.vote-btn').forEach(btn => btn.disabled = true);
            feedbackElement.textContent = 'Voting...';
            feedbackElement.classList.remove('error');

            try {
                // Assuming voteOnReview works for any review ID
                const updatedReview = await voteOnReview(reviewId, isUseful);

                const usefulBtn = footer.querySelector(`.vote-btn.useful`);
                const notUsefulBtn = footer.querySelector(`.vote-btn.not-useful`);
                usefulBtn.textContent = `👍 (${updatedReview.useful_votes_count})`;
                notUsefulBtn.textContent = `👎 (${updatedReview.not_useful_votes_count})`;
                feedbackElement.textContent = 'Voted!';

                setTimeout(() => { feedbackElement.textContent = ''; }, 2000);
            } catch (error) {
                console.error(`Vote failed for review ${reviewId}:`, error);
                feedbackElement.textContent = `Error: ${error.message || 'Vote failed'}`;
                feedbackElement.classList.add('error');
                setTimeout(() => { feedbackElement.textContent = ''; feedbackElement.classList.remove('error'); }, 3000);
            } finally {
                footer.querySelectorAll('.vote-btn').forEach(btn => btn.disabled = false);
            }
        });
    });
}

/**
 * Sets up event listeners for sorting buttons for book reviews.
 * Sorts based on the single 'rating' property.
 */
export function setupSortingButtons() { // Added export
    const sortPositiveBtn = document.getElementById('sort-reviews-positive'); // Use book-specific ID if different
    const sortNegativeBtn = document.getElementById('sort-reviews-negative'); // Use book-specific ID if different

    if (sortPositiveBtn) {
        sortPositiveBtn.addEventListener('click', () => {
            console.log('Sort Positive clicked');
            const sortedReviews = [...currentReviews].sort((a, b) => (b.rating || 0) - (a.rating || 0));
            renderReviewsList(sortedReviews);
        });
    } else {
        console.warn('Sort Positive button not found during setup');
    }

    if (sortNegativeBtn) {
        sortNegativeBtn.addEventListener('click', () => {
            console.log('Sort Negative clicked');
            const sortedReviews = [...currentReviews].sort((a, b) => (a.rating || 0) - (b.rating || 0));
            renderReviewsList(sortedReviews);
        });
    } else {
        console.warn('Sort Negative button not found during setup');
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // --- Assign DOM Elements ---
    // Assign reviewForm first to check if we are on the correct page
    reviewForm = document.getElementById('review-form');

    // If reviewForm doesn't exist, we are likely not on the dedicated reviews page.
    // Exit early to prevent errors when trying to access other review-page-specific elements.
    // Functions exported from this module might still be used by other pages (like overview).
    if (!reviewForm) {
        console.log('Review form not found. Assuming not on dedicated reviews page. Exiting reviews page initialization.');
        return;
    }

    // Continue assigning other elements only if reviewForm exists
    reviewsListContainer = document.getElementById('reviews-list');
    reviewsLoadingIndicator = document.getElementById('reviews-loading');
    reviewsErrorContainer = document.getElementById('reviews-error');
    addReviewSection = document.getElementById('add-review-section');
    reviewRatingInputContainer = document.getElementById('review-rating-input-container');
    reviewSubmitError = document.getElementById('review-submit-error');
    reviewSubmitSuccess = document.getElementById('review-submit-success');
    loginPrompt = document.getElementById('login-prompt-review');
    bookNameHeading = document.getElementById('book-name-heading');
    bookLinkBreadcrumb = document.getElementById('book-link-breadcrumb');
    pageErrorContainer = document.getElementById('page-error');
    pageLoadingIndicator = document.getElementById('page-loading');
    reviewSectionContainer = document.getElementById('review-section');
    // --- End Assign DOM Elements ---

    console.log('Initializing dedicated book reviews page...'); // Log that full init is proceeding

    updateHeaderNav();

    const logoutBtn = document.getElementById('nav-logout-btn');
    logoutBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        console.log("Logout button clicked on book reviews page");
        handleLogout();
    });

    // Dynamically add sort buttons if container exists but buttons don't
    const sortControlsContainer = document.getElementById('review-sort-controls-container');
    if (sortControlsContainer && !document.getElementById('sort-reviews-positive')) {
        console.log('Dynamically adding sort controls for books...');
        sortControlsContainer.innerHTML = `
            <div class="review-sort-controls" style="margin-bottom: 15px;">
                <button id="sort-reviews-positive" class="btn btn-secondary btn-sm">Positive</button>
                <button id="sort-reviews-negative" class="btn btn-secondary btn-sm">Negative</button>
            </div>
        `;
    } else if (!sortControlsContainer) {
        console.warn('Sort controls container not found. Cannot add buttons dynamically.');
    }

    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id'); // Use 'id' for books

    if (!bookId) {
        displayErrorMessage('page-error', 'Cannot load page: Book identifier (ID) is missing.');
        showElement(pageErrorContainer);
        hideElement(pageLoadingIndicator);
        hideElement(reviewSectionContainer);
        return;
    }

    try {
        showElement(pageLoadingIndicator);
        hideElement(pageErrorContainer);

        // Fetch book details to get name and confirm ID exists
        const book = await getBookDetails(bookId);
        hideElement(pageLoadingIndicator);

        if (!book || !book.id) {
            throw new Error(`Book with ID "${bookId}" not found.`);
        }

        updatePageUI(book.name, bookId); // Update heading, breadcrumb, tabs

        showElement(reviewSectionContainer);

        await loadReviews(bookId); // Load reviews for this book ID
        setupSortingButtons(); // Setup sorting after loading

        if (isLoggedIn()) {
            hideElement(loginPrompt);
            showElement(addReviewSection);
            console.log('Checking if review form exists before adding listener:', reviewForm);
            // The check 'if (reviewForm)' is now redundant here because we exit early if it's null,
            // but keeping it doesn't hurt.
            if (reviewForm) {
                reviewForm.addEventListener('submit', (event) => handleReviewSubmit(event, bookId));
                console.log('Submit event listener added to review form.');
            } else {
                // This path should theoretically not be reached anymore due to the early exit.
                console.error('Review form element not found when trying to add submit listener (unexpected).');
                displayErrorMessage('review-submit-error', 'Could not find the review form element.');
                showElement(reviewSubmitError);
            }
        } else {
            hideElement(addReviewSection);
            showElement(loginPrompt);
        }

    } catch (error) {
        console.error('Failed to initialize book reviews page:', error);
        hideElement(pageLoadingIndicator);
        displayErrorMessage('page-error', `Error loading book data: ${error.message}`);
        showElement(pageErrorContainer);
        hideElement(reviewSectionContainer);
        if (bookNameHeading) bookNameHeading.textContent = 'Error Loading Book';
    }
});