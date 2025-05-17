const reviewsList = document.getElementById('reviews-list');
const sortPositiveBtn = document.getElementById('sort-reviews-positive');
const sortNegativeBtn = document.getElementById('sort-reviews-negative');

export const updateSortButtonCounts = (currentReviews) => {
    if (!sortPositiveBtn || !sortNegativeBtn) return;

    let positiveCount = 0;
    let negativeCount = 0;

    currentReviews.forEach(review => {
        if (review.rating >= 4) {
            positiveCount++;
        } else if (review.rating > 0) { // Count reviews with a rating < 4 but > 0 as negative
            negativeCount++;
        }
        // Reviews with avgRating 0 (or N/A) are not counted in either category
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
    if (sortPositiveBtn) {
        sortPositiveBtn.addEventListener('click', () => {
            console.log('Sort Хорошие clicked');
            const sortedReviews = [...currentReviews].filter(review => review.comment !== null).sort((a, b) => { // Filter out null comments before sorting
                return b.rating - a.rating;
            });
            renderReviewsList(sortedReviews);
        });
    } else {
        console.warn('Sort Хорошие button not found');
    }

    if (sortNegativeBtn) {
        sortNegativeBtn.addEventListener('click', () => {
            console.log('Sort Плохие clicked');
            const sortedReviews = [...currentReviews].filter(review => review.comment !== null).sort((a, b) => { // Filter out null comments before sorting
                return a.rating - b.rating;
            });
            renderReviewsList(sortedReviews);
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
        console.log('User not logged in, showing alert');
        alert('Please log in to vote on reviews.'); // This line shows the pop-up
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
