import { getBookDetails, submitItemReview } from '../api.js';
import { displayErrorMessage, clearErrorMessage } from '../renderUtils.js';
import { setupSortingButtons, renderReviewsList, updateSortButtonCounts, setupReviewVoting } from '../reviews.js'; // Import all needed
import { updateHeaderNav } from '../header.js'; // Import from header.js
import { handleLogout, isLoggedIn, getAccessToken } from '../auth.js';

// --- DOM Elements (Declare with let, assign inside DOMContentLoaded) ---
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
let guestNameGroup; // Added for guest name input
let guestNameInput; // Added for guest name input

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
    const overviewPageUrl = `details.html?id=${bookId}`; // Use ID
    if (bookNameHeading) bookNameHeading.textContent = `${bookName} Отзывы`;
    if (bookLinkBreadcrumb) {
        bookLinkBreadcrumb.textContent = bookName;
        bookLinkBreadcrumb.href = overviewPageUrl;
    }
    document.title = `${bookName} Отзывы - Crypta.Info`;

    // Update tab links for books
    const overviewTabLink = document.getElementById('tab-overview');
    const reviewsTabLink = document.getElementById('tab-reviews');

    if (overviewTabLink) overviewTabLink.href = `details.html?id=${bookId}`; // Use ID
    if (reviewsTabLink) {
        reviewsTabLink.classList.add('active');
        reviewsTabLink.href = '#'; // Current page
    }
}

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
    let guestNameValue = null;

    const selectedRatingInput = reviewRatingInputContainer?.querySelector('.single-rating input[type="radio"]:checked');

    if (selectedRatingInput) {
        ratingValue = parseInt(selectedRatingInput.value, 10);
        console.log('Rating selected:', ratingValue);
    } else {
        console.log('No rating selected.');
    }

    if (!authToken) {
        guestNameValue = guestNameInput?.value.trim();
        if (!guestNameValue) {
            displayErrorMessage('review-submit-error', 'Please provide your name as a guest.');
            showElement(reviewSubmitError);
            submitButton.disabled = false;
            submitButton.textContent = 'Опубликовать';
            return;
        }
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

    if (!authToken && guestNameValue) {
        reviewData.guest_name = guestNameValue;
    }
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
        submitButton.textContent = 'Опубликовать';
    }
};


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
    addReviewSection = document.getElementById('add-review-section'); // Should always be found if reviewForm is
    reviewRatingInputContainer = document.getElementById('review-rating-input-container');
    reviewSubmitError = document.getElementById('review-submit-error');
    reviewSubmitSuccess = document.getElementById('review-submit-success');
    loginPrompt = document.getElementById('login-prompt-review'); // For hiding it
    bookNameHeading = document.getElementById('book-name-heading');
    bookLinkBreadcrumb = document.getElementById('book-link-breadcrumb');
    pageErrorContainer = document.getElementById('page-error');
    pageLoadingIndicator = document.getElementById('page-loading');
    reviewSectionContainer = document.getElementById('review-section');
    guestNameGroup = document.getElementById('guest-name-group'); // Assign guest name group
    guestNameInput = document.getElementById('guest-name'); // Assign guest name input
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
                <button id="sort-reviews-positive" class="btn btn-secondary btn-sm">Хорошие</button>
                <button id="sort-reviews-negative" class="btn btn-secondary btn-sm">Плохие</button>
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
        showElement(addReviewSection); // Ensure add review section is visible

        // Fetch reviews for this book and store in currentReviews
        // Assume you have a function to fetch reviews, e.g., getBookReviews(bookId)
        // Replace with your actual fetch logic if different
        currentReviews = await window.getBookReviews(bookId); // You may need to import or define getBookReviews
        renderReviewsList(currentReviews);
        updateSortButtonCounts(currentReviews);
        setupSortingButtons(currentReviews);
        setupReviewVoting();

        if (isLoggedIn()) {
            hideElement(loginPrompt);
            hideElement(guestNameGroup); // Hide guest name field if logged in
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
            showElement(guestNameGroup); // Show guest name field if not logged in
            hideElement(loginPrompt); // Hide "login to review" prompt as guests can review
            if (reviewForm) {
                reviewForm.addEventListener('submit', (event) => handleReviewSubmit(event, bookId));
                console.log('Submit event listener added to review form for guest.');
            } else {
                console.error('Review form element not found when trying to add submit listener for guest (unexpected).');
            }
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