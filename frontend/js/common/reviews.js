import { isLoggedIn } from '../auth.js';

const reviewsList = document.getElementById('reviews-list');
/**
 * Updates the text content of sorting buttons to include review counts.
 * Counts based on the single 'rating' property.
 * @param {Array<object>} currentReviews - The array of review objects.
 */
export const updateSortButtonCounts = (currentReviews) => {
    const sortPositiveBtn = document.getElementById('sort-reviews-positive');
    const sortNegativeBtn = document.getElementById('sort-reviews-negative');

    if (!sortPositiveBtn || !sortNegativeBtn) {
        console.warn("Sorting buttons not found during count update.");
        return;
    }

    if (!currentReviews || currentReviews.length === 0) {
        sortPositiveBtn.textContent = `Хорошие (0)`;
        sortNegativeBtn.textContent = `Плохие (0)`;
        return;
    }

    let positiveCount = 0;
    let negativeCount = 0;

    // Filter reviews based on those that have comments
    const reviewsWithComments = currentReviews.filter(review => review.comment && review.comment.trim() !== '');
    
    // Count positive and negative ratings from reviews with comments
    reviewsWithComments.forEach(review => {
        const rating = review.rating;
        if (rating >= 4) {
            positiveCount++;
        } else if (rating > 0 && rating < 4) {
            negativeCount++;
        }
    });

    sortPositiveBtn.textContent = `Хорошие (${positiveCount})`;
    sortNegativeBtn.textContent = `Плохие (${negativeCount})`;
};


/**
 * Sets up event listeners for sorting buttons.
 * Accepts currentReviews as parameter.
 */
export function setupSortingButtons(currentReviews) {
    console.log('Setting up sorting button event handlers');
    const sortPositiveBtn = document.getElementById('sort-reviews-positive');
    const sortNegativeBtn = document.getElementById('sort-reviews-negative');
    if (sortPositiveBtn) {
        sortPositiveBtn.addEventListener('click', () => {
            console.log('Sort Хорошие clicked');
            // Filter for good reviews (rating >= 4) and then sort by rating descending
            const goodReviews = [...(currentReviews || [])]
                .filter(review => review.comment !== null)
                .sort((a, b) => b.rating - a.rating); // Highest rating first
            renderReviewsList(goodReviews);
        });
    } else {
        console.warn('Sort Хорошие button not found');
    }

    if (sortNegativeBtn) {
        sortNegativeBtn.addEventListener('click', () => {
            console.log('Sort Плохие clicked');
            // Filter for bad reviews (rating > 0 && rating < 4) and then sort by rating ascending
            const badReviews = [...(currentReviews || [])]
                .filter(review => review.comment !== null)
                .sort((a, b) => a.rating - b.rating); // Lowest rating first
            renderReviewsList(badReviews);
        });
    } else {
        console.warn('Sort Плохие button not found');
    }
}


/**
 * Renders a list of reviews into the DOM.
 * Accepts reviews and optionally a container.
 */
export const renderReviewsList = (reviews, container = document.getElementById('reviews-list')) => {
    if (!container) return;
    container.innerHTML = ''; // Clear previous reviews

    if (reviews && reviews.length > 0) {
        reviews.forEach(review => {
            const reviewElement = document.createElement('div');
            reviewElement.classList.add('review-item');
            const ratingValue = review.rating

            // Generate stars based on rating value 
            let starsHtml = '<div class="review-rating">';
            for (let i = 1; i <= 5; i++) {
                if (i <= ratingValue) {
                starsHtml += '<span class="star filled" style="color: #ffc107;">★</span>';
                } else {
                starsHtml += '<span class="star empty" style="color: #e4e5e9;">☆</span>';
                }
            }
            starsHtml += '</div>';

            const authorName = review.user ? review.user.nickname : (review.guest_name ? `${review.guest_name} (Гость)` : 'Anonymous');
            
            reviewElement.innerHTML = `
                <div class="review-header">
                    <span class="review-author">${authorName}</span>
                    <span class="review-date">${new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                <div>${starsHtml}</div>
                <div class="review-content">
                    <p>${review.comment}</p>
                </div>
                <div class="review-footer" style="margin-top: 5px;">
                <button class="vote-btn useful transparent-btn" data-review-id="${review.id}" data-vote="true" style="background: transparent; outline: none; border: none;">👍 ${review.useful_votes_count}</button>
                <button class="vote-btn not-useful transparent-btn" data-review-id="${review.id}" data-vote="false" style="background: transparent; outline: none; border: none;">👎 ${review.not_useful_votes_count}</button>
                <span class="vote-feedback" data-review-id="${review.id}"></span>
                </div>
            `;
            container.appendChild(reviewElement);
        });
    } else {
        container.innerHTML = '<p>No reviews match the criteria or none available.</p>';
    }
};



/**
 * Sets up the event listener for review voting using event delegation.
 */
export function setupReviewVoting() {
    if (!reviewsList) return;
    console.log('Setting up review voting listener on reviewsList container');
    // Remove previous listeners if any (though ideally called once)
    reviewsList.removeEventListener('click', handleReviewVoteClick);
    // Add single listener to the container
    reviewsList.addEventListener('click', handleReviewVoteClick);
}



/**
 * Handles clicks within the reviews list, specifically for vote buttons.
 * Uses event delegation.
 * @param {Event} event - The click event object.
 */
export async function handleReviewVoteClick(event) {
    const button = event.target.closest('.vote-btn'); // Find the closest vote button
    if (!button) return; // Exit if the click wasn't on a vote button or its child

    const reviewId = button.dataset.reviewId;
    const isUseful = button.dataset.vote === 'true';
    console.log(`Vote button clicked (delegated) for review ${reviewId}, isUseful: ${isUseful}`);

    if (!isLoggedIn()) {
        // Show a small popup with a Login button
        showLoginPopup();
        return;
    }

    const reviewItem = button.closest('.review-item');
    const feedbackElement = reviewItem.querySelector(`.vote-feedback[data-review-id="${reviewId}"]`);
    const voteButtons = reviewItem.querySelectorAll('.vote-btn');

    console.log('Disabling vote buttons during processing...');
    voteButtons.forEach(btn => btn.disabled = true);
    feedbackElement.textContent = 'Voting...';

    try {
        console.log(`Submitting vote for review ${reviewId}`);
        const updatedReview = await voteOnReview(reviewId, isUseful);
        console.log('Vote successful, updated review:', updatedReview);

        const usefulBtn = reviewItem.querySelector(`.vote-btn.useful[data-review-id="${reviewId}"]`);
        const notUsefulBtn = reviewItem.querySelector(`.vote-btn.not-useful[data-review-id="${reviewId}"]`);
        usefulBtn.textContent = `👍 (${updatedReview.useful_votes_count})`;
        notUsefulBtn.textContent = `👎 (${updatedReview.not_useful_votes_count})`;
        feedbackElement.textContent = 'Voted!';
        console.log('Vote UI updated with new counts');

        setTimeout(() => {
            console.log('Clearing vote feedback message');
            feedbackElement.textContent = '';
        }, 2000);
    } catch (error) {
        console.error(`Vote failed for review ${reviewId}:`, error);
        feedbackElement.textContent = `Error: ${error.message}`;
        setTimeout(() => {
            console.log('Clearing error message');
            feedbackElement.textContent = '';
        }, 3000);
    } finally {
        console.log('Re-enabling vote buttons');
        voteButtons.forEach(btn => btn.disabled = false);
    }
}

// --- Helper for login popup ---
function showLoginPopup() {
    // Remove any existing popup
    let existing = document.getElementById('review-login-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'review-login-popup';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.background = '#fff';
    popup.style.border = '1px solid #ccc';
    popup.style.borderRadius = '8px';
    popup.style.boxShadow = '0 2px 16px rgba(0,0,0,0.15)';
    popup.style.padding = '24px 32px';
    popup.style.zIndex = '9999';
    popup.style.textAlign = 'center';
    popup.innerHTML = `
        <div style="margin-bottom: 16px; font-size: 1.1em;">Чтобы проголосовать за отзыв, войдите в аккаунт</div>
        <button id="review-login-popup-btn" class="btn btn-primary" style="margin-right: 10px;">Войти</button>
        <button id="review-login-popup-close" class="btn btn-secondary">Закрыть</button>
    `;
    document.body.appendChild(popup);

    document.getElementById('review-login-popup-btn').onclick = () => {
        window.location.href = '/login.html';
    };
    document.getElementById('review-login-popup-close').onclick = () => {
        popup.remove();
    };

    // Optional: close popup on outside click
    setTimeout(() => {
        function outsideClick(e) {
            if (!popup.contains(e.target)) {
                popup.remove();
                document.removeEventListener('mousedown', outsideClick);
            }
        }
        document.addEventListener('mousedown', outsideClick);
    }, 0);
}



/**
 * Handles the submission of the review form.
 * Reads the single rating value.
 * @param {Event} event - The form submission event.
 * @param {number} exchangeId - The ID of the exchange being reviewed.
 */
export const handleReviewSubmit = async (event, exchangeId) => {
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