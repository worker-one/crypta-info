import { getExchangeDetails, submitItemReview, listItemReviews, voteOnReview } from '../api.js'; // Removed getRatingCategories
import { displayErrorMessage, clearErrorMessage } from '../renderUtils.js';
import { updateHeaderNav } from '../header.js'; // Import updateHeaderNav
import { handleLogout, isLoggedIn, getAccessToken } from '../auth.js';

// --- DOM Elements ---
const reviewsListContainer = document.getElementById('reviews-list');
const reviewsLoadingIndicator = document.getElementById('reviews-loading');
const reviewsErrorContainer = document.getElementById('reviews-error');
const addReviewSection = document.getElementById('add-review-section');
const reviewForm = document.getElementById('review-form');
const reviewRatingInputContainer = document.getElementById('review-rating-input-container'); // Renamed/repurposed from review-ratings-container
const reviewSubmitError = document.getElementById('review-submit-error');
const reviewSubmitSuccess = document.getElementById('review-submit-success');
const loginPrompt = document.getElementById('login-prompt-review');

const exchangeNameHeading = document.getElementById('exchange-name-heading');
const exchangeLinkBreadcrumb = document.getElementById('exchange-link-breadcrumb');
const pageErrorContainer = document.getElementById('page-error'); // General page error
const pageLoadingIndicator = document.getElementById('page-loading'); // General page loading
const reviewSectionContainer = document.getElementById('review-section'); // Main content container
const sortPositiveBtn = document.getElementById('sort-reviews-positive'); // Added
const sortNegativeBtn = document.getElementById('sort-reviews-negative'); // Added

// --- Global variable to store fetched reviews ---
let currentReviews = [];

// --- Helper Functions ---
const showElement = (el) => el?.classList.remove('hidden');
const hideElement = (el) => el?.classList.add('hidden');

/**
 * Updates breadcrumbs and heading.
 * @param {string} exchangeName - The name of the exchange.
 * @param {string} exchangeSlug - The slug of the exchange.
 */
function updatePageUI(exchangeName, exchangeSlug) {
    const overviewPageUrl = `overview.html?slug=${exchangeSlug}`;
    if (exchangeNameHeading) exchangeNameHeading.textContent = `${exchangeName} Reviews`;
    if (exchangeLinkBreadcrumb) {
        exchangeLinkBreadcrumb.textContent = exchangeName;
        exchangeLinkBreadcrumb.href = overviewPageUrl;
    }
    document.title = `${exchangeName} Reviews - Crypta.Info`;

    const overviewTabLink = document.getElementById('tab-overview');
    const newsTabLink = document.getElementById('tab-news');
    const guideTabLink = document.getElementById('tab-guide');
    const reviewsTabLink = document.getElementById('tab-reviews');

    if (overviewTabLink) overviewTabLink.href = `overview.html?slug=${exchangeSlug}`;
    if (newsTabLink) newsTabLink.href = `news.html?slug=${exchangeSlug}`;
    if (guideTabLink) guideTabLink.href = `guide.html?slug=${exchangeSlug}`;
    if (reviewsTabLink) {
        reviewsTabLink.classList.add('active');
    }
}

/**
 * Updates the text content of sorting buttons to include review counts.
 * Counts based on the single 'rating' property.
 */
const updateSortButtonCounts = () => {
    const sortPositiveBtn = document.getElementById('sort-reviews-positive');
    const sortNegativeBtn = document.getElementById('sort-reviews-negative');

    if (!sortPositiveBtn || !sortNegativeBtn) {
        console.warn("Sorting buttons not found during count update.");
        return;
    }

    let positiveCount = 0;
    let negativeCount = 0;

    currentReviews.forEach(review => {
        const rating = review.rating;
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
 * Renders a list of reviews into the DOM.
 * Displays the single 'rating' property.
 * Assumes the API returns 'rating' instead of 'ratings'.
 * @param {Array<object>} reviews - The array of review objects to render.
 */
const renderReviewsList = (reviews) => {
    if (!reviewsListContainer) return;
    reviewsListContainer.innerHTML = '';

    if (reviews && reviews.length > 0) {
        reviews.forEach(review => {
            const reviewElement = document.createElement('div');
            reviewElement.classList.add('review-item');
            const ratingValue = review.rating;

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
        setupVoteButtons();
    } else {
        reviewsListContainer.innerHTML = '<p>No reviews match the criteria or none available.</p>';
    }
};

/**
 * Loads and displays reviews for a given exchange ID.
 * @param {number} exchangeId - The ID of the exchange.
 */
const loadReviews = async (exchangeId) => {
    if (!reviewsListContainer || !reviewsLoadingIndicator || !reviewsErrorContainer) return;

    showElement(reviewsLoadingIndicator);
    hideElement(reviewsErrorContainer);
    reviewsListContainer.innerHTML = '';
    currentReviews = [];
    updateSortButtonCounts();

    try {
        const reviewsData = await listItemReviews(exchangeId, { limit: 100, sort_by: 'created_at', direction: 'desc' });
        hideElement(reviewsLoadingIndicator);

        if (reviewsData && reviewsData.items) {
            currentReviews = reviewsData.items;
            renderReviewsList(currentReviews);
        } else {
            currentReviews = [];
            reviewsListContainer.innerHTML = '<p>No reviews yet. Be the first to add one!</p>';
        }
        updateSortButtonCounts();
    } catch (error) {
        console.error('Failed to load reviews:', error);
        hideElement(reviewsLoadingIndicator);
        currentReviews = [];
        updateSortButtonCounts();
        reviewsListContainer.innerHTML = '';
        displayErrorMessage('reviews-error', `Failed to load reviews. ${error.message}`);
        showElement(reviewsErrorContainer);
    }
};

/**
 * Handles the submission of the review form.
 * Reads the single rating value.
 * @param {Event} event - The form submission event.
 * @param {number} exchangeId - The ID of the exchange being reviewed.
 */
const handleReviewSubmit = async (event, exchangeId) => {
    console.log('handleReviewSubmit called for exchangeId:', exchangeId);
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
        console.log('Attempting to submit review via API...');
        await submitItemReview(exchangeId, reviewData);
        console.log('Review submission successful (API call).');
        showElement(reviewSubmitSuccess);
        reviewSubmitSuccess.textContent = 'Review submitted successfully! It is pending moderation.';
        reviewForm.reset();
    } catch (error) {
        console.error('Failed to submit review (API error):', error);
        displayErrorMessage('review-submit-error', `Failed to submit review: ${error.message}`);
        showElement(reviewSubmitError);
    } finally {
        console.log('Re-enabling submit button.');
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Review';
    }
};

/**
 * Sets up event listeners for vote buttons.
 */
function setupVoteButtons() {
    const voteButtons = document.querySelectorAll('.vote-btn');
    voteButtons.forEach(button => {
        button.replaceWith(button.cloneNode(true));
    });
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
 * Sets up event listeners for sorting buttons.
 * Sorts based on the single 'rating' property.
 */
function setupSortingButtons() {
    const sortPositiveBtn = document.getElementById('sort-reviews-positive');
    const sortNegativeBtn = document.getElementById('sort-reviews-negative');

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
    updateHeaderNav();

    const logoutBtn = document.getElementById('nav-logout-btn');
    logoutBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        console.log("Logout button clicked on reviews page");
        handleLogout();
    });

    const sortControlsContainer = document.getElementById('review-sort-controls-container');
    if (sortControlsContainer && !document.getElementById('sort-reviews-positive')) {
        console.log('Dynamically adding sort controls...');
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
    const slug = urlParams.get('slug');

    if (!slug) {
        displayErrorMessage('page-error', 'Cannot load page: Exchange identifier (slug) is missing.');
        showElement(pageErrorContainer);
        hideElement(pageLoadingIndicator);
        hideElement(reviewSectionContainer);
        return;
    }

    try {
        showElement(pageLoadingIndicator);
        hideElement(pageErrorContainer);

        const exchange = await getExchangeDetails(slug);
        hideElement(pageLoadingIndicator);

        if (!exchange || !exchange.id) {
            throw new Error(`Exchange with slug "${slug}" not found.`);
        }

        const exchangeId = exchange.id;
        updatePageUI(exchange.name, slug);

        showElement(reviewSectionContainer);

        await loadReviews(exchangeId);
        setupSortingButtons();

        if (isLoggedIn()) {
            hideElement(loginPrompt);
            showElement(addReviewSection);
            console.log('Checking if review form exists before adding listener:', reviewForm);
            reviewForm?.addEventListener('submit', (event) => handleReviewSubmit(event, exchangeId));
            if (!reviewForm) {
                console.error('Review form element not found when trying to add submit listener.');
            } else {
                console.log('Submit event listener added to review form.');
            }
        } else {
            hideElement(addReviewSection);
            showElement(loginPrompt);
        }

    } catch (error) {
        console.error('Failed to initialize exchange reviews page:', error);
        hideElement(pageLoadingIndicator);
        displayErrorMessage('page-error', `Error loading exchange data: ${error.message}`);
        showElement(pageErrorContainer);
        hideElement(reviewSectionContainer);
        if (exchangeNameHeading) exchangeNameHeading.textContent = 'Error Loading Exchange';
    }
});