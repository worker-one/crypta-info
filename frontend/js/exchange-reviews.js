import { getExchangeDetails, submitExchangeReview, getRatingCategories, listExchangeReviews, voteOnReview } from './api.js'; // Added voteOnReview
import { updateHeaderNav, displayErrorMessage, clearErrorMessage } from './ui.js'; // Added updateHeaderNav
import { handleLogout, isLoggedIn, getAccessToken } from './auth.js'; // Updated imports

// --- DOM Elements ---
const reviewsListContainer = document.getElementById('reviews-list');
const reviewsLoadingIndicator = document.getElementById('reviews-loading');
const reviewsErrorContainer = document.getElementById('reviews-error');
const addReviewSection = document.getElementById('add-review-section');
const reviewForm = document.getElementById('review-form');
const reviewRatingsContainer = document.getElementById('review-ratings-container');
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
const sortDateBtn = document.getElementById('sort-reviews-date'); // Added

// --- Global variable to store fetched reviews ---
let currentReviews = []; // Added

// --- Helper Functions ---
const showElement = (el) => el?.classList.remove('hidden');
const hideElement = (el) => el?.classList.add('hidden');

/**
 * Updates breadcrumbs and heading.
 * @param {string} exchangeName - The name of the exchange.
 * @param {string} exchangeSlug - The slug of the exchange.
 */
function updatePageUI(exchangeName, exchangeSlug) {
    const overviewPageUrl = `overview.html?slug=${exchangeSlug}`; // Corrected path
    if (exchangeNameHeading) exchangeNameHeading.textContent = `${exchangeName} Reviews`;
    if (exchangeLinkBreadcrumb) {
        exchangeLinkBreadcrumb.textContent = exchangeName;
        exchangeLinkBreadcrumb.href = overviewPageUrl;
    }
    document.title = `${exchangeName} Reviews - Crypta.Info`;

    // Also update tab links here as slug is confirmed
    const overviewTabLink = document.getElementById('tab-overview');
    const newsTabLink = document.getElementById('tab-news');
    const guideTabLink = document.getElementById('tab-guide');
    const reviewsTabLink = document.getElementById('tab-reviews'); // Added reviews tab link

    if (overviewTabLink) overviewTabLink.href = `overview.html?slug=${exchangeSlug}`;
    if (newsTabLink) newsTabLink.href = `news.html?slug=${exchangeSlug}`;
    if (guideTabLink) guideTabLink.href = `guide.html?slug=${exchangeSlug}`;
    // No need to set href for the current page tab (reviews), but ensure it's correctly styled if needed
    if (reviewsTabLink) {
        // reviewsTabLink.href = `reviews.html?slug=${exchangeSlug}`; // Optional: set href anyway
        reviewsTabLink.classList.add('active'); // Example: Mark as active
    }
}

/**
 * Loads and displays rating categories in the review form.
 */
const loadRatingCategoriesForForm = async () => {
    if (!reviewRatingsContainer) return;
    reviewRatingsContainer.innerHTML = '<p>Loading rating options...</p>'; // Placeholder
    try {
        const categories = await getRatingCategories();
        reviewRatingsContainer.innerHTML = ''; // Clear placeholder

        if (categories && categories.length > 0) {
            // Create a grid container for the rating categories
            const gridContainer = document.createElement('div');
            gridContainer.classList.add('rating-categories-grid'); // Use class for styling
            gridContainer.style.display = 'grid'; // Apply grid styles directly
            gridContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(150px, 1fr))'; // Responsive grid
            gridContainer.style.gap = '15px';

            categories.forEach(category => {
                const categoryDiv = document.createElement('div');
                categoryDiv.classList.add('form-group', 'rating-category-group');
                categoryDiv.innerHTML = `
                    <label>${category.name}:</label>
                    <div class="star-rating" data-category-id="${category.id}">
                        ${[5, 4, 3, 2, 1].map(value => `
                            <input type="radio" id="star-${category.id}-${value}" name="rating-${category.id}" value="${value}" required>
                            <label for="star-${category.id}-${value}"></label>
                        `).join('')}
                    </div>
                `;
                gridContainer.appendChild(categoryDiv);
            });
            reviewRatingsContainer.appendChild(gridContainer); // Add the grid
        } else {
            reviewRatingsContainer.innerHTML = '<p>Could not load rating categories.</p>';
        }
    } catch (error) {
        console.error('Failed to load rating categories:', error);
        reviewRatingsContainer.innerHTML = `<p class="error-message">Error loading rating options: ${error.message}</p>`;
    }
};

/**
 * Calculates the average rating for a review.
 * @param {object} review - The review object.
 * @returns {number} The average rating, or 0 if no ratings.
 */
const calculateAverageRating = (review) => {
    if (!review.ratings || review.ratings.length === 0) {
        return 0; // Or handle as needed, e.g., return -1 or null
    }
    const sum = review.ratings.reduce((acc, r) => acc + r.rating_value, 0);
    return sum / review.ratings.length;
};

/**
 * Updates the text content of sorting buttons to include review counts.
 */
const updateSortButtonCounts = () => {
    // Get button elements inside the function to ensure they are found, even if added dynamically.
    const sortPositiveBtn = document.getElementById('sort-reviews-positive');
    const sortNegativeBtn = document.getElementById('sort-reviews-negative');

    if (!sortPositiveBtn || !sortNegativeBtn) {
        console.warn("Sorting buttons not found during count update."); // Add warning if buttons aren't found
        return;
    }

    let positiveCount = 0;
    let negativeCount = 0;

    currentReviews.forEach(review => {
        const avgRating = calculateAverageRating(review);
        if (avgRating >= 4) {
            positiveCount++;
        } else if (avgRating > 0) { // Count reviews with a rating < 4 but > 0 as negative
            negativeCount++;
        }
        // Reviews with avgRating 0 (or N/A) are not counted in either category
    });

    sortPositiveBtn.textContent = `Positive (${positiveCount})`;
    sortNegativeBtn.textContent = `Negative (${negativeCount})`;
};

/**
 * Renders a list of reviews into the DOM.
 * @param {Array<object>} reviews - The array of review objects to render.
 */
const renderReviewsList = (reviews) => {
    if (!reviewsListContainer) return;
    reviewsListContainer.innerHTML = ''; // Clear previous reviews

    if (reviews && reviews.length > 0) {
        reviews.forEach(review => {
            const reviewElement = document.createElement('div');
            reviewElement.classList.add('review-item');
            const averageRating = calculateAverageRating(review); // Use helper

            reviewElement.innerHTML = `
                <div class="review-header">
                    <span class="review-author">${review.user.nickname}</span>
                    <span class="review-date">${new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                <div class="review-rating">Overall Rating: ${averageRating > 0 ? averageRating.toFixed(1) + ' ★' : 'N/A'}</div>
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
        setupVoteButtons(); // Re-attach event listeners after rendering
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
    reviewsListContainer.innerHTML = ''; // Clear previous reviews
    currentReviews = []; // Reset reviews before fetch
    updateSortButtonCounts(); // Update counts to 0 initially

    try {
        // Fetch reviews (default sort by date from API)
        const reviewsData = await listExchangeReviews(exchangeId, { limit: 100, sort_by: 'created_at', direction: 'desc' }); // Increased limit for client sorting
        hideElement(reviewsLoadingIndicator);

        if (reviewsData && reviewsData.items) {
            currentReviews = reviewsData.items; // Store fetched reviews
            renderReviewsList(currentReviews); // Initial render (sorted by date)
        } else {
            currentReviews = []; // Clear stored reviews
            reviewsListContainer.innerHTML = '<p>No reviews yet. Be the first to add one!</p>';
        }
        updateSortButtonCounts(); // Update counts after fetching
    } catch (error) {
        console.error('Failed to load reviews:', error);
        hideElement(reviewsLoadingIndicator);
        currentReviews = []; // Clear stored reviews
        updateSortButtonCounts(); // Update counts on error (to 0)
        reviewsListContainer.innerHTML = ''; // Clear potential partial content
        displayErrorMessage('reviews-error', `Failed to load reviews. ${error.message}`);
        showElement(reviewsErrorContainer); // Show the error container
    }
};

/**
 * Handles the submission of the review form.
 * @param {Event} event - The form submission event.
 * @param {number} exchangeId - The ID of the exchange being reviewed.
 */
const handleReviewSubmit = async (event, exchangeId) => {
    event.preventDefault();
    if (!reviewForm) return;

    const authToken = getAccessToken();
    if (!authToken) {
        displayErrorMessage('review-submit-error', 'You must be logged in to submit a review.');
        showElement(reviewSubmitError);
        return;
    }

    clearErrorMessage('review-submit-error');
    hideElement(reviewSubmitError);
    hideElement(reviewSubmitSuccess);
    const submitButton = reviewForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    const commentText = document.getElementById('review-text').value; // Get text directly
    const ratings = [];
    const ratingGroups = reviewRatingsContainer.querySelectorAll('.rating-category-group .star-rating');

    let allRatingsSelected = true;
    ratingGroups.forEach(group => {
        const categoryId = group.dataset.categoryId;
        const selectedRatingInput = group.querySelector('input[type="radio"]:checked');
        if (selectedRatingInput) {
            ratings.push({
                category_id: parseInt(categoryId, 10),
                rating_value: parseInt(selectedRatingInput.value, 10) // Correct field name
            });
        } else {
            allRatingsSelected = false;
        }
    });

    // Basic validation
    if (!commentText || commentText.trim().length < 10) {
         displayErrorMessage('review-submit-error', 'Please provide a review text (at least 10 characters).');
         showElement(reviewSubmitError);
         submitButton.disabled = false;
         submitButton.textContent = 'Submit Review';
         return;
    }
     if (!allRatingsSelected) {
        displayErrorMessage('review-submit-error', 'Please rate all categories.');
        showElement(reviewSubmitError);
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Review';
        return;
    }

    const reviewData = {
        comment: commentText.trim(),
        ratings: ratings,
    };

    try {
        await submitExchangeReview(exchangeId, reviewData);
        showElement(reviewSubmitSuccess);
        reviewSubmitSuccess.textContent = 'Review submitted successfully! It is pending moderation.';
        reviewForm.reset(); // Clear the form
    } catch (error) {
        console.error('Failed to submit review:', error);
        displayErrorMessage('review-submit-error', `Failed to submit review: ${error.message}`);
        showElement(reviewSubmitError);
    } finally {
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
 */
function setupSortingButtons() {
    // Get button elements *inside* the function to ensure they exist, especially if dynamically added.
    const sortPositiveBtn = document.getElementById('sort-reviews-positive');
    const sortNegativeBtn = document.getElementById('sort-reviews-negative');
    // const sortDateBtn = document.getElementById('sort-reviews-date'); // Ensure this ID exists if you need date sort here

    if (sortPositiveBtn) {
        sortPositiveBtn.addEventListener('click', () => {
            console.log('Sort Positive clicked'); // Added console log for debugging
            const sortedReviews = [...currentReviews].sort((a, b) => {
                return calculateAverageRating(b) - calculateAverageRating(a); // Descending
            });
            renderReviewsList(sortedReviews);
        });
    } else {
        console.warn('Sort Positive button not found during setup'); // Added warning
    }

    if (sortNegativeBtn) {
        sortNegativeBtn.addEventListener('click', () => {
            console.log('Sort Negative clicked'); // Added console log for debugging
            const sortedReviews = [...currentReviews].sort((a, b) => {
                return calculateAverageRating(a) - calculateAverageRating(b); // Ascending
            });
            renderReviewsList(sortedReviews);
        });
    } else {
        console.warn('Sort Negative button not found during setup'); // Added warning
    }

    //  if (sortDateBtn) {
    //     sortDateBtn.addEventListener('click', () => {
    //         console.log('Sort Date clicked'); // Added console log for debugging
    //         const sortedReviews = [...currentReviews].sort((a, b) => {
    //             return new Date(b.created_at) - new Date(a.created_at); // Descending (Newest first)
    //         });
    //         renderReviewsList(sortedReviews);
    //     });
    // } else {
    //      console.warn('Sort Date button not found during setup'); // Added warning
    //  }
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

    // Dynamically add sorting buttons if they don't exist in HTML
    const sortControlsContainer = document.getElementById('review-sort-controls-container'); // Assuming a container exists
    if (sortControlsContainer && !document.getElementById('sort-reviews-positive')) {
        console.log('Dynamically adding sort controls...'); // Log dynamic addition
        sortControlsContainer.innerHTML = `
            <div class="review-sort-controls" style="margin-bottom: 15px;">
                <button id="sort-reviews-positive" class="btn btn-secondary btn-sm">Positive</button>
                <button id="sort-reviews-negative" class="btn btn-secondary btn-sm">Negative</button>
            </div>
        `;
        // No need to insertBefore if using innerHTML on a dedicated container
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

        await loadReviews(exchangeId); // Load reviews (will store and render)
        setupSortingButtons(); // Setup sorting button listeners *after* potential dynamic creation and loading reviews

        if (isLoggedIn()) {
            hideElement(loginPrompt);
            showElement(addReviewSection);
            await loadRatingCategoriesForForm();
            reviewForm?.addEventListener('submit', (event) => handleReviewSubmit(event, exchangeId));
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
