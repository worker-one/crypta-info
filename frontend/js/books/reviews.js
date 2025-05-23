import { getBookDetails, submitItemReview, listItemReviews, voteOnReview } from '../api.js'; // Removed getRatingCategories
import { displayErrorMessage, clearErrorMessage } from '../renderUtils.js';
import { updateHeaderNav } from '../header.js'; // Import updateHeaderNav
import { handleLogout, isLoggedIn } from '../auth.js';
import { setupReviewVoting, setupSortingButtons, renderReviewsList, updateSortButtonCounts } from '../common/reviews.js'; // Import setupReviewVoting and updateSortButtonCounts

// --- DOM Elements (Changed to global const/let assignments) ---
const addReviewSection = document.getElementById('add-review-section');
const reviewForm = document.getElementById('review-form');
const reviewRatingInputContainer = document.getElementById('review-rating-input-container');
const reviewSubmitError = document.getElementById('review-submit-error');
const loginPrompt = document.getElementById('login-prompt-review');
const bookNameHeading = document.getElementById('book-name-heading');
const bookLinkBreadcrumb = document.getElementById('book-link-breadcrumb');
const pageErrorContainer = document.getElementById('page-error');
const pageLoadingIndicator = document.getElementById('page-loading');
const reviewSectionContainer = document.getElementById('review-section');
const guestNameGroup = document.getElementById('guest-name-input-container'); // <-- Fix: use correct ID

const reviewsListContainer = document.getElementById('reviews-list');
const reviewsLoadingIndicator = document.getElementById('reviews-loading');
const reviewsErrorContainer = document.getElementById('reviews-error');
const reviewsHistogramContainer = document.getElementById('reviews-histogram-container'); // Added
const reviewSubmitSuccess = document.getElementById('review-submit-success');
const guestNameInputContainer = document.getElementById('guest-name-input-container');

// --- Global variable to store fetched reviews ---
let currentReviews = [];

// --- Helper Functions ---
const showElement = (el) => el?.classList.remove('hidden');
const hideElement = (el) => el?.classList.add('hidden');

/**
 * Updates breadcrumbs and heading for books (adapted from exchange version).
 * @param {string} bookName - The name of the book.
 * @param {string} bookId - The ID of the book.
 * @param {string} [reviewsPageContent] - Optional HTML content for the reviews page.
 * @param {Array<object>} [reviews] - Optional array of reviews to compute count.
 */
export function updatePageUI(bookName, bookId, reviewsPageContent, reviews = []) {
    const overviewPageUrl = `details.html?id=${bookId}`;
    const buyPageUrl = `buy.html?id=${bookId}`; // Added
    if (bookNameHeading) bookNameHeading.textContent = `Отзывы о книге ${bookName}`;
    if (bookLinkBreadcrumb) {
        bookLinkBreadcrumb.textContent = bookName;
        bookLinkBreadcrumb.href = overviewPageUrl;
    }
    if (reviewsPageContent && typeof reviewsPageContent !== 'undefined') {
        // Assuming reviewsPageContent is a DOM element if it's not a string
        if (typeof reviewsPageContent === 'string') {
            // If it's a string, we need a target element to set its innerHTML
            // This part might need adjustment based on how reviewsPageContent is actually used/passed
            // For now, let's assume there's a specific element for book review content if it's a string
            const bookReviewsContentContainer = document.getElementById('book-reviews-page-content'); // Example ID
            if (bookReviewsContentContainer) {
                bookReviewsContentContainer.innerHTML = reviewsPageContent || 'Empty';
            }
        } else if (reviewsPageContent.innerHTML !== undefined) { // If it's a DOM element
             reviewsPageContent.innerHTML = reviewsPageContent.innerHTML || 'Empty'; // This line seems problematic, might be a typo
        }
    }
    document.title = `Отзывы ${bookName} - Crypta.Info`;

    const overviewTabLink = document.getElementById('tab-overview');
    const reviewsTabLink = document.getElementById('tab-reviews');
    const buyTabLink = document.getElementById('tab-buy'); // Added

    if (reviewsTabLink) {
            reviewsTabLink.textContent = `Отзывы (${Array.isArray(reviews) ? reviews.length : 0})`;
    }
    // Books may not have news/guide tabs, but add if needed:
    const newsTabLink = document.getElementById('tab-news');
    const guideTabLink = document.getElementById('tab-guide');

    if (overviewTabLink) overviewTabLink.href = `details.html?id=${bookId}`;
    if (newsTabLink) newsTabLink.href = `news.html?id=${bookId}`;
    if (guideTabLink) guideTabLink.href = `guide.html?id=${bookId}`;
    if (buyTabLink) buyTabLink.href = buyPageUrl; // Added
    if (reviewsTabLink) {
        reviewsTabLink.classList.add('active');
        reviewsTabLink.href = '#'; // Current page
    }
    if (overviewTabLink) overviewTabLink.classList.remove('active'); // Ensure other tabs are not active
    if (buyTabLink) buyTabLink.classList.remove('active'); // Ensure other tabs are not active
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
 * Loads and displays reviews for a given book ID.
 * @param {string} bookId - The ID of the book.
 */
const loadReviews = async (bookId, bookName, bookReviewsPageContent) => { // Added bookName and bookReviewsPageContent
    if (!reviewsListContainer || !reviewsLoadingIndicator || !reviewsErrorContainer) return;

    showElement(reviewsLoadingIndicator);
    hideElement(reviewsErrorContainer);
    if (reviewsHistogramContainer) reviewsHistogramContainer.innerHTML = ''; // Clear histogram
    reviewsListContainer.innerHTML = '';
    currentReviews = [];
    updateSortButtonCounts(currentReviews);
    updatePageUI(bookName, bookId, bookReviewsPageContent, currentReviews); // Update UI with 0 reviews initially


    try {
        const reviewsData = await listItemReviews(bookId, { limit: 100, sort_by: 'created_at', direction: 'desc' });
        hideElement(reviewsLoadingIndicator);

        if (reviewsData && reviewsData.items) {
            currentReviews = reviewsData.items.filter(review => review.comment !== null);
            renderReviewsList(currentReviews, reviewsListContainer);
            renderRatingHistogram(currentReviews);
        } else {
            currentReviews = [];
            reviewsListContainer.innerHTML = '<p>No reviews yet. Be the first to add one!</p>';
            renderRatingHistogram([]);
        }
        updateSortButtonCounts(currentReviews);
        // Pass currentReviews to updatePageUI for correct count
        updatePageUI(bookName, bookId, bookReviewsPageContent, currentReviews);
    } catch (error) {
        console.error('Failed to load reviews:', error);
        hideElement(reviewsLoadingIndicator);
        currentReviews = [];
        updateSortButtonCounts(currentReviews);
        renderRatingHistogram([]);
        reviewsListContainer.innerHTML = '';
        displayErrorMessage('reviews-error', `Failed to load reviews. ${error.message}`);
        showElement(reviewsErrorContainer);
        updatePageUI(bookName, bookId, bookReviewsPageContent, []); // Update UI with 0 reviews on error
    }
};


/**
 * Handles the submission of the review form.
 * Reads the single rating value.
 * @param {Event} event - The form submission event.
 * @param {number} bookId - The ID of the exchange being reviewed.
 */
const handleReviewSubmit = async (event, bookId) => {
    console.log('handleReviewSubmit called for bookId:', bookId);
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
        showElement(guestNameGroup); // Always show guest name input for guests
        const guestName = guestNameInput.value.trim();
        if (!guestName) {
            displayErrorMessage('review-submit-error', 'Пожалуйте, укажите ваше имя.');
            showElement(reviewSubmitError);
            submitButton.disabled = false;
            submitButton.textContent = 'Опубликовать';
            guestNameInput.focus();
            return;
        }
        if (guestName.length > 50) {
            displayErrorMessage('review-submit-error', 'Иямя не должно превышать 50 символов.');
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
        await submitItemReview(bookId, reviewData);
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
    // --- Assign DOM Elements --- (Declarations moved to top)
    // reviewForm is assigned globally. Check its existence for page context.
    if (!reviewForm) {
        console.log('Review form not found. Assuming not on dedicated book reviews page. Exiting reviews page initialization.');
        return;
    }
    // Other elements are also assigned globally.

    console.log('Initializing dedicated book reviews page...');

    updateHeaderNav();

    const logoutBtn = document.getElementById('nav-logout-btn');
    logoutBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        console.log("Logout button clicked on book reviews page");
        handleLogout();
    });

    const sortControlsContainer = document.getElementById('review-sort-controls-container');
    if (sortControlsContainer && !document.getElementById('sort-reviews-positive')) {
        console.log('Dynamically adding sort controls for books...');
        sortControlsContainer.innerHTML = `
            <div class="review-sort-controls" style="margin-top: 15px; margin-bottom: 15px;">
            <button id="sort-reviews-positive" class="btn btn-success btn-sm">Хорошие</button>
            <button id="sort-reviews-negative" class="btn btn-danger btn-sm">Плохие</button>
            </div>
        `;
    } else if (!sortControlsContainer) {
        console.warn('Sort controls container not found. Cannot add buttons dynamically for book reviews.');
    }

    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');
    const ratingFromUrl = urlParams.get('rating'); // Get rating from URL

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
        // Hide reviews error/loading initially handled by loadReviews

        const book = await getBookDetails(bookId);
        hideElement(pageLoadingIndicator);

        if (!book || !book.id) {
            throw new Error(`Book with ID "${bookId}" not found.`);
        }

        updatePageUI(book.name, bookId, book.reviews_page_content, []); // Pass empty array initially

        showElement(reviewSectionContainer);
        showElement(addReviewSection);

        await loadReviews(bookId, book.name, book.reviews_page_content); // Pass book name and content to loadReviews
        setupSortingButtons(currentReviews); // Call imported function, pass currentReviews
        setupReviewVoting();   // Call imported general voting setup
        // The call to updatePageUI inside loadReviews will handle updating the count.
        // updatePageUI(book.name, bookId, book.reviews_page_content, currentReviews); // This call is now redundant here

        // Pre-select rating if passed in URL and scroll to form
        if (ratingFromUrl && reviewRatingInputContainer && addReviewSection) {
            const ratingValue = parseInt(ratingFromUrl, 10);
            if (ratingValue >= 1 && ratingValue <= 5) {
                const ratingInput = reviewRatingInputContainer.querySelector(`.single-rating input[name="rating-overall"][value="${ratingValue}"]`);
                if (ratingInput) {
                    ratingInput.checked = true;
                    console.log(`Pre-selected rating for book from URL: ${ratingValue}`);
                    // Ensure the form is visible before scrolling
                    if (addReviewSection.classList.contains('hidden')) {
                        showElement(addReviewSection);
                    }
                    addReviewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    console.warn(`Rating input for value ${ratingValue} not found for book.`);
                }
            } else {
                console.warn(`Invalid rating value from URL for book: ${ratingFromUrl}`);
            }
        }

        if (isLoggedIn()) {
            hideElement(loginPrompt);
            hideElement(guestNameGroup); // Hide guest name input for logged-in users
            reviewForm.addEventListener('submit', (event) => handleReviewSubmit(event, bookId));
            console.log('Submit event listener added to review form for logged-in user.');
        } else {
            showElement(guestNameGroup); // Show guest name input for guests
            hideElement(loginPrompt);
            reviewForm.addEventListener('submit', (event) => handleReviewSubmit(event, bookId));
            console.log('Submit event listener added to review form for guest.');
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