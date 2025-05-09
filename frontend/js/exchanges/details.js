// Exchange Detail Page Logic
import { getExchangeDetails, listItemReviews, voteOnReview, submitItemReview } from '../api.js';
import { updateHeaderNav } from '../header.js'; // Import from new header module
import { isLoggedIn, handleLogout } from '../auth.js';

// --- Global variable to store fetched reviews ---
let currentReviews = [];
let reviewsTabLink; // Declare reviewsTabLink in module scope

// --- DOM Elements (Moved review elements here) ---
const reviewsList = document.getElementById('reviews-list');
const reviewsLoadingElement = document.getElementById('reviews-loading');
const reviewsErrorElement = document.getElementById('reviews-error');
const sortPositiveBtn = document.getElementById('sort-reviews-positive');
const sortNegativeBtn = document.getElementById('sort-reviews-negative');

/**
 * Renders a star rating display with clickable stars.
 * @param {string|number} ratingString - The rating value (e.g., "4.5" or 4.5).
 * @param {number} maxStars - The maximum number of stars to display (default 5).
 * @param {number|string} exchangeId - The exchange ID for submitting ratings (optional).
 * @returns {string} HTML string for the star rating, e.g., "★★★★☆ (4.5)".
 */
function renderStarRating(ratingString, maxStars = 5, exchangeId = null) {
    const rating = parseFloat(ratingString);
    if (isNaN(rating) || rating < 0) {
        return 'N/A'; // Return N/A if rating is not a valid number
    }

    let starsHtml = '';
    const simpleRoundedRating = Math.round(rating);
    
    // Only make stars clickable if exchangeId is provided
    const clickableClass = exchangeId ? 'clickable-star' : '';
    const dataAttr = exchangeId ? `data-exchange-id="${exchangeId}"` : '';
    
    for (let i = 1; i <= maxStars; i++) {
        if (i <= simpleRoundedRating) {
            starsHtml += `<span class="star ${clickableClass}" data-rating="${i}" ${dataAttr}>★</span>`; // Filled star
        } else {
            starsHtml += `<span class="star ${clickableClass}" data-rating="${i}" ${dataAttr}>☆</span>`; // Empty star
        }
    }

    return `<span style="font-weight: bold; color: gold;">${rating.toFixed(1)}</span> ${starsHtml} <span class="numerical-rating"></span>`;
}

/**
 * Handles click on a star to submit a rating.
 * @param {Event} event - The click event
 */
async function handleStarClick(event) {
    const starElement = event.target.closest('.clickable-star');
    if (!starElement) return;
    
    const rating = parseInt(starElement.dataset.rating, 10);
    const exchangeId = starElement.dataset.exchangeId;
    
    if (!rating || !exchangeId) return;
    
    // Create a feedback element if it doesn't exist yet
    let feedbackEl = document.querySelector('.rating-feedback');
    if (!feedbackEl) {
        feedbackEl = document.createElement('div');
        feedbackEl.className = 'rating-feedback';
        starElement.parentNode.parentNode.appendChild(feedbackEl);
    }
    
    feedbackEl.textContent = 'Submitting your rating...';
    
    try {
        // Submit the rating with null comment and "Guest" as guest_name
        await submitItemReview(exchangeId, {
            comment: null,
            rating: rating,
            guest_name: "Guest",
            moderation_status: "approved"
        });
        
        feedbackEl.textContent = 'Thank you for your rating!';
        feedbackEl.classList.add('success');
        
        // Optionally refresh the exchange details after a short delay
        setTimeout(async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const slug = urlParams.get('slug');
                const exchange = await getExchangeDetails(slug);
                
                // Update the displayed rating
                const ratingContainer = starElement.closest('.stat-item');
                if (ratingContainer) {
                    const valueDiv = ratingContainer.querySelector('.value');
                    if (valueDiv) {
                        valueDiv.innerHTML = renderStarRating(exchange.overall_average_rating, 5, exchange.id);
                    }
                    const labelDiv = ratingContainer.querySelector('.label');
                    if (labelDiv) {
                        labelDiv.textContent = `${exchange.total_rating_count} голосов`;
                    }
                }
                
                // Re-attach click handlers to the new stars
                attachStarClickHandlers();
                
                // Clear feedback message
                setTimeout(() => {
                    feedbackEl.textContent = '';
                    feedbackEl.classList.remove('success');
                }, 2000);
                
            } catch (error) {
                console.error('Failed to refresh exchange details:', error);
            }
        }, 1500);
        
    } catch (error) {
        console.error('Failed to submit rating:', error);
        feedbackEl.textContent = `Error: ${error.message}`;
        feedbackEl.classList.add('error');
        
        // Clear error message after a delay
        setTimeout(() => {
            feedbackEl.textContent = '';
            feedbackEl.classList.remove('error');
        }, 3000);
    }
}

/**
 * Attaches click handlers to all clickable stars on the page.
 */
function attachStarClickHandlers() {
    const stars = document.querySelectorAll('.clickable-star');
    stars.forEach(star => {
        // Remove existing listener to prevent duplicates
        star.removeEventListener('click', handleStarClick);
        // Add new listener
        star.addEventListener('click', handleStarClick);
    });
}

/**
 * Updates the text content of sorting buttons to include review counts.
 */
const updateSortButtonCounts = () => {
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

    sortPositiveBtn.textContent = `Positive (${positiveCount})`;
    sortNegativeBtn.textContent = `Negative (${negativeCount})`;
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Exchange detail page initializing...');
    // Update navigation based on login status
    console.log('Updating header navigation...');
    updateHeaderNav(); // This function is now imported from header.js

    // Add logout listener
    const logoutBtn = document.getElementById('nav-logout-btn');
    logoutBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        console.log("Logout button clicked on detail page");
        handleLogout();
    });

    // Get the exchange slug from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug'); // Tries to get 'slug' from URL query string
    console.log(`Retrieved slug from URL: ${slug}`);

    // Get DOM elements (Keep others here, remove moved ones)
    const loadingElement = document.getElementById('exchange-detail-loading');
    const errorElement = document.getElementById('exchange-detail-error');
    const detailContainer = document.getElementById('exchange-detail');
    const breadcrumbExchangeName = document.getElementById('exchange-name-breadcrumb');
    const reviewSection = document.getElementById('review-section');
    const overviewContent = document.getElementById('overview-content'); // Container for overview tab
    const newsTabLink = document.getElementById('tab-news');
    const guideTabLink = document.getElementById('tab-guide');
    reviewsTabLink = document.getElementById('tab-reviews'); // Assign to module-scoped variable
    const overviewTabLink = document.getElementById('tab-overview'); // Added overview tab link
    const addReviewLink = document.getElementById('add-review-link'); // Get the add review link
    const websiteTabLink = document.getElementById('tab-website'); // Get the new website tab link
    console.log('DOM elements retrieved');

    if (!slug) { // If 'slug' is not found in the URL
        console.error('No exchange slug found in URL');
        errorElement.textContent = 'No exchange slug provided.'; // This error is shown
        errorElement.classList.add('visible');
        loadingElement.classList.add('hidden');
        return; // Stops further execution
    }

    // Set tab links dynamically
    if (newsTabLink) {
        newsTabLink.href = `news.html?slug=${slug}`;
        console.log(`Set News tab link to: ${newsTabLink.href}`);
    }
    if (guideTabLink) {
        guideTabLink.href = `guide.html?slug=${slug}`;
        console.log(`Set Guide tab link to: ${guideTabLink.href}`);
    }

    if (reviewsTabLink) {
        reviewsTabLink.href = `reviews.html?slug=${slug}`;
        console.log(`Set Reviews tab link to: ${reviewsTabLink.href}`);
    }
    // Set the "Add Review" link dynamically
    if (addReviewLink) {
        addReviewLink.href = `./reviews.html?slug=${slug}#add-review-section`; // Point to reviews page, potentially anchor to form
        console.log(`Set Add Review link to: ${addReviewLink.href}`);
    }
    if (overviewTabLink) {
        overviewTabLink.classList.add('active'); // Mark current tab as active
    }

    try {
        // Fetch exchange details
        console.log(`Fetching exchange details for slug: ${slug}`);
        const exchange = await getExchangeDetails(slug);
        console.log("Exchange details received:", exchange);

        // Show/hide website tab link
        if (exchange.website_url) {
            if (websiteTabLink) {
                websiteTabLink.href = exchange.website_url;
                websiteTabLink.classList.remove('hidden');
            }
        }
        
        // Hide loading, show content
        console.log('Updating UI visibility...');
        loadingElement.classList.add('hidden');
        overviewContent.classList.remove('hidden'); // Show the overview container
        detailContainer.classList.remove('hidden'); // Show the detail section within overview
        
        // Update page title and breadcrumb
        console.log(`Updating page title to: ${exchange.name} - Crypta.Info`);
        document.title = `${exchange.name} - Crypta.Info`;
        breadcrumbExchangeName.textContent = exchange.name;

        // Build the HTML for the exchange details with improved layout
        console.log('Building exchange detail HTML...');
        // Helper to show first 5 and "+N more" for arrays
        function renderListWithMore(items, renderItem, label = 'items') {
            if (!items || items.length === 0) return '<p>No ' + label + ' information available.</p>';
            const firstFive = items.slice(0, 5);
            let html = '<ul>';
            html += firstFive.map(renderItem).join('');
            html += '</ul>';
            if (items.length > 5) {
            html += `<span class="more-items">+${items.length - 5} more</span>`;
            }
            return html;
        }

        detailContainer.innerHTML = `
            <div class="stats-overview">

            
            <div class="stat-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px;">
            <div class="header-with-logo" style="display: flex; align-items: center; margin-bottom: 0px;">
            <div class="logo" style="margin-right: 15px;">
            <img src="${exchange.logo_url || '../assets/images/logo-placeholder.png'}" alt="${exchange.name} Logo">
            </div>
            <h1 style="margin: 0;">${exchange.name}</h1>
            </div>

            <div class="stat-item">
            <div class="value">${renderStarRating(exchange.overall_average_rating, 5, exchange.id)}</div>
            <div class="label">${exchange.total_rating_count} голосов</div>
            </div>
            <div class="stat-item">
            <a href="/exchanges/reviews.html?slug=${exchange.slug}" style="text-decoration: none; color: inherit;">
            <div class="value">${exchange.total_review_count || '0'}</div>
            <div class="label">Total Reviews</div>
            </a>
            </div>
            <div class="stat-item">
            <div class="value">${exchange.trading_volume_24h ? '$' + parseFloat(exchange.trading_volume_24h).toLocaleString() : 'N/A'}B</div>
            <div class="label">24h Volume</div>
            </div>
            <div class="stat-item">
            <div class="value">${exchange.year_founded || 'N/A'}</div>
            <div class="label">Year Founded</div>
            </div>
            </div>
            </div>

            <p class="description">${exchange.overview || 'No overview available for this exchange.'}</p>
            
            <div class="details">
            <div class="detail-card">
            <h3>Общая информация</h3>
            <p><strong>Юрисдикция:</strong> ${exchange.registration_country?.name || 'N/A'}</p>
            <p style="display: flex; align-items: center; justify-content: space-between;">
            <strong>KYC/Верификация:</strong>
            <img src="${exchange.has_kyc ? '../assets/images/green-check.png' : '../assets/images/red-cross.png'}" alt="${exchange.has_kyc ? 'Yes' : 'No'}" width="25" height="25">
            </p>
            <p><strong>Сайт:</strong> <a href="${exchange.website_url}" target="_blank" rel="noopener noreferrer">${exchange.website_url}</a></p>
            </div>
            
            <div class="detail-card">
            <h3>Сервисы</h3>
            <p style="display: flex; align-items: center; justify-content: space-between;">
            <strong>Копитрейдинг:</strong>
            <img src="${exchange.has_copy_trading ? '../assets/images/green-check.png' : '../assets/images/red-cross.png'}" alt="${exchange.has_copy_trading ? 'Yes' : 'No'}" width="25" height="25">
            </p>
            <p style="display: flex; align-items: center; justify-content: space-between;">
            <strong>P2P Обмен:</strong>
            <img src="${exchange.has_p2p ? '../assets/images/green-check.png' : '../assets/images/red-cross.png'}" alt="${exchange.has_p2p ? 'Yes' : 'No'}" width="25" height="25">
            </p>
            <p style="display: flex; align-items: center; justify-content: space-between;">
            <strong>Стейкинг:</strong>
            <img src="${exchange.has_staking ? '../assets/images/green-check.png' : '../assets/images/red-cross.png'}" alt="${exchange.has_staking ? 'Yes' : 'No'}" width="25" height="25">
            </p>
            <p style="display: flex; align-items: center; justify-content: space-between;">
            <strong>Фьючерсы:</strong>
            <img src="${exchange.has_futures ? '../assets/images/green-check.png' : '../assets/images/red-cross.png'}" alt="${exchange.has_futures ? 'Yes' : 'No'}" width="25" height="25">
            </p>
            <p style="display: flex; align-items: center; justify-content: space-between;">
            <strong>Спотовая торговля:</strong>
            <img src="${exchange.has_spot_trading ? '../assets/images/green-check.png' : '../assets/images/red-cross.png'}" alt="${exchange.has_spot_trading ? 'Yes' : 'No'}" width="25" height="25">
            </p>
            <p style="display: flex; align-items: center; justify-content: space-between;">
            <strong>Демо трейдинг:</strong>
            <img src="${exchange.has_demo_trading ? '../assets/images/green-check.png' : '../assets/images/red-cross.png'}" alt="${exchange.has_demo_trading ? 'Yes' : 'No'}" width="25" height="25">
            </p>
            </div>

            <div class="detail-card">
            <h3>Комиссии, бонусы</h3>
            <table class="fees-table" style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
              <thead>
                <tr>
                  <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;"></th>
                  <th style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">Тейкер</th>
                  <th style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">Мейкер</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: left; padding: 8px; border-bottom: 1px solid #eee;"><strong>Спот</strong></td>
                  <td style="text-align: center; padding: 8px; border-bottom: 1px solid #eee;">${exchange.spot_taker_fee ? parseFloat(exchange.spot_taker_fee).toFixed(4) * 100 + '%' : 'N/A'}</td>
                  <td style="text-align: center; padding: 8px; border-bottom: 1px solid #eee;">${exchange.spot_maker_fee ? parseFloat(exchange.spot_maker_fee).toFixed(4) * 100 + '%' : 'N/A'}</td>
                </tr>
                <tr>
                  <td style="text-align: left; padding: 8px;"><strong>Фьючерсы</strong></td>
                  <td style="text-align: center; padding: 8px;">${exchange.futures_taker_fee ? parseFloat(exchange.futures_taker_fee).toFixed(4) * 100 + '%' : 'N/A'}</td>
                  <td style="text-align: center; padding: 8px;">${exchange.futures_maker_fee ? parseFloat(exchange.futures_maker_fee).toFixed(4) * 100 + '%' : 'N/A'}</td>
                </tr>
              </tbody>
            </table>
            <div class="bonus-button-container" style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
            <a href="${exchange.website_url}" target="_blank" rel="noopener noreferrer" class="bonus-button" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; font-size: 18px; border-radius: 4px; transition: background-color 0.3s;">Получить бонус</a>
            </div>
            </div>
            
            </div>
            <br>
            <p class="description">${exchange.description || 'No description available for this exchange.'}</p>
            
            
        `;
        console.log('Exchange detail HTML built and inserted into DOM');

        // Attach click handlers to the stars
        attachStarClickHandlers();

        // Show review section
        console.log('Showing review section...');
        reviewSection.classList.remove('hidden');

        // Load exchange reviews and set up sorting/voting
        console.log(`Loading reviews for exchange ID: ${exchange.id}`);
        await loadExchangeReviews(exchange.id);
        setupSortingButtons();
        setupReviewVoting(); // Renamed from setupVoteButtons and uses delegation

    } catch (error) {
        console.error("Error fetching exchange details:", error);
        loadingElement.classList.add('hidden');
        errorElement.textContent = error.message || 'Failed to load exchange details. Please try again later.';
        errorElement.classList.add('visible');
    }
});

/**
 * Calculates the average rating for a review.
 * @param {object} review - The review object.
 * @returns {number} The average rating, or 0 if no ratings.
 */
const calculateAverageRating = (review) => {
    if (!review.ratings || review.ratings.length === 0) {
        return 0;
    }
    const sum = review.ratings.reduce((acc, r) => acc + r.rating_value, 0);
    return sum / review.ratings.length;
};

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
            const averageRating = review.rating

            const authorName = review.user ? review.user.nickname : (review.guest_name ? `${review.guest_name} (Guest)` : 'Anonymous');
            
            reviewElement.innerHTML = `
                <div class="review-header">
                    <span class="review-author">${authorName}</span>
                    <span class="review-date">${new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                <div class="review-rating">Rating: ${averageRating > 0 ? averageRating.toFixed(1) + ' ★' : 'N/A'}</div>
                <div class="review-content">
                    <p>${review.comment}</p>
                </div>
                <div class="review-footer">
                    <button class="vote-btn useful transparent-btn" data-review-id="${review.id}" data-vote="true">👍 (${review.useful_votes_count})</button>
                    <button class="vote-btn not-useful transparent-btn" data-review-id="${review.id}" data-vote="false">👎 (${review.not_useful_votes_count})</button>
                    <span class="vote-feedback" data-review-id="${review.id}"></span>
                </div>
            `;
            reviewsList.appendChild(reviewElement);
        });
    } else {
        reviewsList.innerHTML = '<p>No reviews match the criteria or none available.</p>';
    }
};

async function loadExchangeReviews(exchangeId) {
    console.log(`Loading reviews for exchange ID: ${exchangeId}`);
    const paginationElement = document.getElementById('reviews-pagination');

    if (reviewsTabLink) {
        reviewsTabLink.textContent = 'Reviews (...)'; // Indicate loading
    }

    if (!reviewsList || !reviewsLoadingElement || !reviewsErrorElement) {
        console.error('Required DOM elements for reviews not found');
        return;
    }

    reviewsLoadingElement.classList.remove('hidden');
    reviewsErrorElement.classList.remove('visible');
    reviewsList.innerHTML = '';
    if (paginationElement) paginationElement.innerHTML = '';
    currentReviews = []; // Reset reviews before fetch
    updateSortButtonCounts(); // Update counts to 0 initially

    try {
        console.log('Calling API to list exchange reviews...');
        const response = await listItemReviews(exchangeId, { limit: 100, sort_by: 'created_at', direction: 'desc' });
        console.log('Reviews response received:', response);

        reviewsLoadingElement.classList.add('hidden');

        if (!response || !response.items) {
            console.error('Invalid response structure:', response);
            throw new Error("Invalid response structure for reviews.");
        }

        // Filter out reviews with null comments
        currentReviews = response.items.filter(review => review.comment !== null);
        console.log(`Filtered ${response.items.length - currentReviews.length} reviews with null comments`);
        
        updateSortButtonCounts(); // Update counts after fetching

        if (reviewsTabLink) {
            reviewsTabLink.textContent = `Reviews (${currentReviews.length})`;
        }

        if (currentReviews.length === 0) {
            console.log('No reviews found for this exchange');
            reviewsList.innerHTML = '<p>No reviews found for this exchange yet.</p>';
        } else {
            console.log(`Rendering ${currentReviews.length} reviews initially (sorted by date)...`);
            renderReviewsList(currentReviews);
        }

    } catch (error) {
        console.error("Error loading exchange reviews:", error);
        reviewsLoadingElement.classList.add('hidden');
        reviewsErrorElement.textContent = error.message || 'Failed to load reviews.';
        reviewsErrorElement.classList.add('visible');
        currentReviews = [];
        updateSortButtonCounts(); // Update counts on error (to 0)
        if (reviewsTabLink) {
            reviewsTabLink.textContent = 'Reviews (0)';
        }
    }
}

/**
 * Handles clicks within the reviews list, specifically for vote buttons.
 * Uses event delegation.
 * @param {Event} event - The click event object.
 */
async function handleReviewVoteClick(event) {
    const button = event.target.closest('.vote-btn'); // Find the closest vote button
    if (!button) return; // Exit if the click wasn't on a vote button or its child

    const reviewId = button.dataset.reviewId;
    const isUseful = button.dataset.vote === 'true';
    console.log(`Vote button clicked (delegated) for review ${reviewId}, isUseful: ${isUseful}`);

    if (!isLoggedIn()) {
        console.log('User not logged in, showing alert');
        alert('Please log in to vote on reviews.');
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

/**
 * Sets up the event listener for review voting using event delegation.
 */
function setupReviewVoting() {
    if (!reviewsList) return;
    console.log('Setting up review voting listener on reviewsList container');
    // Remove previous listeners if any (though ideally called once)
    reviewsList.removeEventListener('click', handleReviewVoteClick);
    // Add single listener to the container
    reviewsList.addEventListener('click', handleReviewVoteClick);
}

/**
 * Sets up event listeners for sorting buttons.
 */
function setupSortingButtons() {
    console.log('Setting up sorting button event handlers');
    if (sortPositiveBtn) {
        sortPositiveBtn.addEventListener('click', () => {
            console.log('Sort Positive clicked');
            const sortedReviews = [...currentReviews].sort((a, b) => {
                return calculateAverageRating(b) - calculateAverageRating(a);
            });
            renderReviewsList(sortedReviews);
        });
    } else {
        console.warn('Sort Positive button not found');
    }

    if (sortNegativeBtn) {
        sortNegativeBtn.addEventListener('click', () => {
            console.log('Sort Negative clicked');
            const sortedReviews = [...currentReviews].sort((a, b) => {
                return calculateAverageRating(a) - calculateAverageRating(b);
            });
            renderReviewsList(sortedReviews);
        });
    } else {
        console.warn('Sort Negative button not found');
    }
}