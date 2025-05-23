import { getExchangeDetails, submitItemReview, listItemReviews, voteOnReview } from '../api.js'; // Removed getRatingCategories
import { displayErrorMessage, clearErrorMessage } from '../renderUtils.js';
import { updateHeaderNav } from '../header.js'; // Import updateHeaderNav
import { handleLogout, isLoggedIn } from '../auth.js';
import { setupReviewVoting, setupSortingButtons, renderReviewsList, updateSortButtonCounts } from '../common/reviews.js'; // Import setupReviewVoting and updateSortButtonCounts

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
const guestNameInputContainer = document.getElementById('guest-name-input-container');
const guestNameInput = document.getElementById('guest-name');

const exchangeNameHeading = document.getElementById('exchange-name-heading');
const exchangeLinkBreadcrumb = document.getElementById('exchange-link-breadcrumb');
const exchangeReviewsPageContent = document.getElementById('exchange-reviews-page-content'); // Added
const pageErrorContainer = document.getElementById('page-error'); // General page error
const pageLoadingIndicator = document.getElementById('page-loading'); // General page loading
const reviewSectionContainer = document.getElementById('review-section'); // Main content container
const reviewsHistogramContainer = document.getElementById('reviews-histogram-container'); // Added

// --- Global variable to store fetched reviews ---
let currentReviews = [];

// --- Helper Functions ---
const showElement = (el) => el?.classList.remove('hidden');
const hideElement = (el) => el?.classList.add('hidden');

/**
 * Updates breadcrumbs and heading.
 * @param {string} exchangeName - The name of the exchange.
 * @param {string} exchangeSlug - The slug of the exchange.
 * @param {string} reviewsPageContent - The HTML content for the reviews page.
 * @param {Array<object>} [reviews] - Optional array of reviews to compute count.
 */
function updatePageUI(exchangeName, exchangeSlug, reviewsPageContent, reviews = []) {
    const overviewPageUrl = `details.html?slug=${exchangeSlug}`;
    if (exchangeNameHeading) exchangeNameHeading.textContent = `Отзывы о криптобирже ${exchangeName}`;
    if (exchangeLinkBreadcrumb) {
        exchangeLinkBreadcrumb.textContent = exchangeName;
        exchangeLinkBreadcrumb.href = overviewPageUrl;
    }
    exchangeReviewsPageContent.innerHTML = reviewsPageContent || 'Empty'; // Added
    document.title = `Отзывы ${exchangeName}  - Crypta.Info`;

    const overviewTabLink = document.getElementById('tab-overview');
    const newsTabLink = document.getElementById('tab-news');
    const guideTabLink = document.getElementById('tab-guide');
    const reviewsTabLink = document.getElementById('tab-reviews');

    if (reviewsTabLink) {
        reviewsTabLink.textContent = `Отзывы (${Array.isArray(currentReviews) ? currentReviews.length : 0})`;
    }

    if (overviewTabLink) overviewTabLink.href = `details.html?slug=${exchangeSlug}`;
    if (newsTabLink) newsTabLink.href = `news.html?slug=${exchangeSlug}`;
    if (guideTabLink) guideTabLink.href = `guide.html?slug=${exchangeSlug}`;
    if (reviewsTabLink) {
        reviewsTabLink.classList.add('active');
        reviewsTabLink.href = `reviews.html?slug=${exchangeSlug}`;
    }
}

/**
 * Renders a rating histogram based on the current reviews.
 * @param {Array<object>} reviews - The array of review objects.
 */
const renderRatingHistogram = (reviews) => {
    if (!reviewsHistogramContainer) {
        console.warn("Histogram container not found.");
        return;
    }
    reviewsHistogramContainer.innerHTML = ''; // Clear previous histogram

    if (!reviews || reviews.length === 0) {
        // reviewsHistogramContainer.innerHTML = '<p>No rating data available to display histogram.</p>';
        return;
    }

    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalReviewsWithRating = 0;

    reviews.forEach(review => {
        if (review.rating >= 1 && review.rating <= 5) {
            ratingCounts[review.rating]++;
            totalReviewsWithRating++;
        }
    });

    if (totalReviewsWithRating === 0) {
        reviewsHistogramContainer.innerHTML = '<p>No valid ratings found to display histogram.</p>';
        return;
    }

    const statContainer = document.createElement('div');
    statContainer.className = 'stat';

    for (let i = 5; i >= 1; i--) {
        const count = ratingCounts[i];
        const percentage = totalReviewsWithRating > 0 ? (count / totalReviewsWithRating) * 100 : 0;

        const statItem = document.createElement('div');
        statItem.className = 'stat-item';

        const starsDiv = document.createElement('div');
        starsDiv.className = 'stat-item__stars';
        for (let j = 0; j < 5; j++) {
            const star = document.createElement('div');
            star.className = 'stat-item__star';
            if (j >= i) {
                star.classList.add('stat-item__star--empty');
            }
            starsDiv.appendChild(star);
        }

        const progressDiv = document.createElement('div');
        progressDiv.className = 'stat-item__progress';
        const progressBar = document.createElement('div');
        progressBar.className = 'stat-item__progress-bar';
        progressBar.style.width = `${percentage.toFixed(0)}%`; // Use toFixed(0) for whole numbers
        progressDiv.appendChild(progressBar);

        const percentsDiv = document.createElement('div');
        percentsDiv.className = 'stat-item__percents';
        percentsDiv.textContent = `${percentage.toFixed(0)}%`;

        statItem.appendChild(starsDiv);
        statItem.appendChild(progressDiv);
        statItem.appendChild(percentsDiv);
        statContainer.appendChild(statItem);
    }
    reviewsHistogramContainer.appendChild(statContainer);
};


/**
 * Loads and displays reviews for a given exchange ID.
 * @param {number} exchangeId - The ID of the exchange.
 */
const loadReviews = async (exchangeId, exchangeName, exchangeSlug, reviewsPageContent) => {
    if (!reviewsListContainer || !reviewsLoadingIndicator || !reviewsErrorContainer) return;

    showElement(reviewsLoadingIndicator);
    hideElement(reviewsErrorContainer);
    if (reviewsHistogramContainer) reviewsHistogramContainer.innerHTML = ''; // Clear histogram
    reviewsListContainer.innerHTML = '';
    currentReviews = [];
    updateSortButtonCounts(currentReviews);
    updatePageUI(exchangeName, exchangeSlug, reviewsPageContent, currentReviews); // Update UI with 0 reviews initially

    try {
        const reviewsData = await listItemReviews(exchangeId, { limit: 100, sort_by: 'created_at', direction: 'desc' });
        hideElement(reviewsLoadingIndicator);

        if (reviewsData && reviewsData.items) {
            currentReviews = reviewsData.items.filter(review => review.comment !== null);
            renderReviewsList(currentReviews, reviewsListContainer);
            renderRatingHistogram(currentReviews); // Add this call
        } else {
            currentReviews = [];
            reviewsListContainer.innerHTML = '<p>No reviews yet. Be the first to add one!</p>';
            renderRatingHistogram([]); // Render empty/message for histogram
        }
        updateSortButtonCounts(currentReviews);
        updatePageUI(exchangeName, exchangeSlug, reviewsPageContent, currentReviews); // Pass reviews array
    } catch (error) {
        console.error('Failed to load reviews:', error);
        hideElement(reviewsLoadingIndicator);
        currentReviews = [];
        updateSortButtonCounts(currentReviews);
        renderRatingHistogram([]); // Render empty/message for histogram
        reviewsListContainer.innerHTML = '';
        displayErrorMessage('reviews-error', `Failed to load reviews. ${error.message}`);
        showElement(reviewsErrorContainer);
        updatePageUI(exchangeName, exchangeSlug, reviewsPageContent, []); // Ensure UI is updated with 0 reviews
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
         submitButton.textContent = 'Опубликовать';
         return;
    }
    if (ratingValue === null) {
        displayErrorMessage('review-submit-error', 'Please select a star rating.');
        showElement(reviewSubmitError);
        submitButton.disabled = false;
        submitButton.textContent = 'Опубликовать';
        return;
    }

    const reviewData = {
        comment: commentText.trim(),
        rating: ratingValue,
    };

    if (!isLoggedIn()) {
        const guestName = guestNameInput.value.trim();
        if (!guestName) {
            displayErrorMessage('review-submit-error', 'Please provide your name as a guest.');
            showElement(reviewSubmitError);
            submitButton.disabled = false;
            submitButton.textContent = 'Опубликовать';
            guestNameInput.focus();
            return;
        }
        if (guestName.length > 50) {
            displayErrorMessage('review-submit-error', 'Guest name cannot exceed 50 characters.');
            showElement(reviewSubmitError);
            submitButton.disabled = false;
            submitButton.textContent = 'Опубликовать';
            guestNameInput.focus();
            return;
        }
        reviewData.guest_name = guestName;
    }
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
        submitButton.textContent = 'Опубликовать';
    }
};

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
            <div class="review-sort-controls" style="margin-top: 15px; margin-bottom: 15px;">
            <button id="sort-reviews-positive" class="btn btn-success btn-sm">Хорошие</button>
            <button id="sort-reviews-negative" class="btn btn-danger btn-sm">Плохие</button>
            </div>
        `;
    } else if (!sortControlsContainer) {
        console.warn('Sort controls container not found. Cannot add buttons dynamically.');
    }

    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    const ratingFromUrl = urlParams.get('rating'); // Get rating from URL

    if (!slug) {
        displayErrorMessage('page-error', 'Cannot load page: Exchange identifier (slug) is missing.');
        showElement(pageErrorContainer);
        hideElement(pageLoadingIndicator);
        hideElement(reviewSectionContainer);
        return;
    }

    // Always show the review form section, hide login prompt
    showElement(addReviewSection);
    hideElement(loginPrompt);

    try {
        showElement(pageLoadingIndicator);
        hideElement(pageErrorContainer);
        if (exchangeReviewsPageContent) hideElement(exchangeReviewsPageContent); // Hide initially

        const exchange = await getExchangeDetails(slug);
        hideElement(pageLoadingIndicator);

        if (!exchange || !exchange.id) {
            throw new Error(`Exchange with slug "${slug}" not found.`);
        }

        const exchangeId = exchange.id;
        // Initial call to updatePageUI. currentReviews is empty here, so tab count will be 0.
        updatePageUI(exchange.name, slug, exchange.reviews_page_content, []); // Pass empty array initially
        if (exchangeReviewsPageContent && exchange.reviews_page_content) { // Show if content exists
            showElement(exchangeReviewsPageContent);
        }

        showElement(reviewSectionContainer);

        await loadReviews(exchangeId, exchange.name, slug, exchange.reviews_page_content); // Pass info for updatePageUI

        // The call to updatePageUI inside loadReviews will now correctly update the count
        // after reviews are fetched.

        setupSortingButtons(currentReviews); // Pass currentReviews
        setupReviewVoting();

        // Pre-select rating if passed in URL and scroll to form
        if (ratingFromUrl) {
            const ratingValue = parseInt(ratingFromUrl, 10);
            if (ratingValue >= 1 && ratingValue <= 5) {
                const ratingInput = document.querySelector(`#review-rating-input-container .single-rating input[name="rating-overall"][value="${ratingValue}"]`);
                if (ratingInput) {
                    ratingInput.checked = true;
                    console.log(`Pre-selected rating from URL: ${ratingValue}`);
                    const reviewFormSection = document.getElementById('add-review-section');
                    if (reviewFormSection) {
                        // Ensure the form is visible before scrolling
                        if (addReviewSection.classList.contains('hidden')) {
                            showElement(addReviewSection);
                        }
                        reviewFormSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } else {
                    console.warn(`Rating input for value ${ratingValue} not found.`);
                }
            } else {
                console.warn(`Invalid rating value from URL: ${ratingFromUrl}`);
            }
        }

        // Configure form based on login state
        if (isLoggedIn()) {
            hideElement(guestNameInputContainer);
            guestNameInput.required = false;
        } else {
            showElement(guestNameInputContainer);
            guestNameInput.required = true;
        }
        
        console.log('Checking if review form exists before adding listener:', reviewForm);
        reviewForm?.addEventListener('submit', (event) => handleReviewSubmit(event, exchangeId));
        if (!reviewForm) {
            console.error('Review form element not found when trying to add submit listener.');
        } else {
            console.log('Submit event listener added to review form.');
        }

    } catch (error) {
        console.error('Failed to initialize exchange reviews page:', error);
        hideElement(pageLoadingIndicator);
        displayErrorMessage('page-error', `Error loading exchange data: ${error.message}`);
        showElement(pageErrorContainer);
        hideElement(reviewSectionContainer);
        if (exchangeReviewsPageContent) hideElement(exchangeReviewsPageContent); // Hide on error
        if (exchangeNameHeading) exchangeNameHeading.textContent = 'Error Loading Exchange';
    }
});