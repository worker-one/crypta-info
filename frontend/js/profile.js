import { isLoggedIn, getUserProfileData, checkAndCacheUserProfile, handleLogout } from './auth.js';
// Import the new API function
import { listMyReviews } from './api.js';
// Assuming ui.js has displayErrorMessage/clearErrorMessage that handle the 'hidden' class
import { displayErrorMessage, clearErrorMessage } from './ui.js';

// Helper to show/hide elements using the 'hidden' class
const showElement = (element) => element?.classList.remove('hidden');
const hideElement = (element) => element?.classList.add('hidden');

/**
 * Displays the user's reviews on the profile page.
 * @param {Array} reviews - Array of review objects.
 */
function displayUserReviews(reviews) {
    const reviewsListDiv = document.getElementById('reviews-list');
    const reviewsErrorDiv = document.getElementById('reviews-error');
    const reviewsLoadingDiv = document.getElementById('reviews-loading');
    const reviewsSection = document.getElementById('profile-reviews-section');

    hideElement(reviewsLoadingDiv);
    clearErrorMessage('reviews-error'); // Clear previous errors

    if (!reviews || reviews.length === 0) {
        reviewsListDiv.innerHTML = '<p>You haven\'t submitted any reviews yet.</p>';
        showElement(reviewsSection); // Show the section even if empty
        return;
    }

    reviewsListDiv.innerHTML = ''; // Clear previous content

    reviews.forEach(review => {
        const reviewElement = document.createElement('div');
        // Use card and margin bottom for spacing
        reviewElement.classList.add('card', 'mb-3');

        // Format date for better readability
        const reviewDate = new Date(review.created_at).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        // Use Bootstrap card structure
        reviewElement.innerHTML = `
            <div class="card-body">
                <h5 class="card-title">Review for: ${review.exchange?.name || 'Unknown Exchange'}</h5>
                <h6 class="card-subtitle mb-2 text-muted">Submitted: ${reviewDate}</h6>
                <p class="card-text comment-preview">${review.comment.substring(0, 150)}${review.comment.length > 150 ? '...' : ''}</p>
                <p class="card-text mb-1"><strong>Status:</strong> <span class="status-${review.moderation_status}">${review.moderation_status}</span></p>
                <p class="card-text"><strong>Usefulness:</strong> ${review.useful_votes_count} useful, ${review.not_useful_votes_count} not useful</p>
                <!-- Optional: Add link to view full review or edit/delete actions -->
                <!-- Example: <a href="/review/${review.id}" class="card-link">View Full Review</a> -->
            </div>
        `;
        reviewsListDiv.appendChild(reviewElement);
    });
    showElement(reviewsSection); // Show the section with reviews
}

/**
 * Fetches and displays the user's reviews.
 */
async function loadUserReviews() {
    const reviewsLoadingDiv = document.getElementById('reviews-loading');
    const reviewsErrorDiv = document.getElementById('reviews-error');
    const reviewsSection = document.getElementById('profile-reviews-section');

    showElement(reviewsSection); // Show the section container
    showElement(reviewsLoadingDiv);
    hideElement(reviewsErrorDiv);
    clearErrorMessage('reviews-error');

    try {
        // Fetch reviews (adjust pagination/filters as needed)
        const reviewsResponse = await listMyReviews({ limit: 20 }); // Fetch latest 20 reviews
        displayUserReviews(reviewsResponse.items);
    } catch (error) {
        console.error("Error fetching user reviews:", error);
        hideElement(reviewsLoadingDiv);
        displayErrorMessage('reviews-error', `Failed to load your reviews: ${error.message}`);
        showElement(reviewsErrorDiv); // Ensure error div is visible
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Get references to elements
    const profileContentWrapper = document.getElementById('profile-content-wrapper');
    const profileLoading = document.getElementById('profile-loading');
    const profileError = document.getElementById('profile-error'); // Error display element ID
    // const logoutButton = document.getElementById('logout-button');

    // Show loading indicator
    hideElement(profileContentWrapper);
    hideElement(profileError); // Ensure error is hidden initially
    showElement(profileLoading);
    clearErrorMessage('profile-error'); // Clear any previous text content

    // 1. Check login status. If not logged in, redirect.
    if (!isLoggedIn()) {
        console.log("User not logged in. Redirecting to login.");
        window.location.href = '/login.html'; // Adjust path if needed
        return; // Stop further execution
    }

    // 2. Ensure profile data is cached (fetches if necessary) and update header
    try {
        await checkAndCacheUserProfile(); // This also updates header nav
    } catch (error) {
        console.error("Error during profile check/cache:", error);
        // Handle critical failure if needed
    }

    // 3. Retrieve profile data from local storage
    const userProfile = getUserProfileData();

    // Hide loading indicator
    hideElement(profileLoading);

    // 4. Display profile data or error
    if (userProfile) {
        console.log("Displaying profile:", userProfile);
        document.getElementById('profile-email').textContent = userProfile.email || 'N/A';
        document.getElementById('profile-nickname').textContent = userProfile.nickname || 'N/A';
        document.getElementById('profile-id').textContent = userProfile.id || 'N/A';
        document.getElementById('profile-role').textContent = userProfile.role || 'user'; // Assuming role exists

        showElement(profileContentWrapper); // Show the profile details section
        hideElement(profileError);

        // 5. Load user's reviews *after* profile is confirmed loaded
        await loadUserReviews();

    } else {
        console.error("Failed to load profile data for display after check.");
        displayErrorMessage('profile-error', 'Could not load your profile information. Please try logging out and back in.');
        hideElement(profileContentWrapper);
    }


});