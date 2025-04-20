// Exchange Detail Page Logic
import { getExchangeDetails, submitExchangeReview, getRatingCategories, listExchangeReviews, voteOnReview } from './api.js';
import { updateHeaderNav, displayErrorMessage } from './ui.js';
import { getAccessToken, isLoggedIn, handleLogout } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Exchange detail page initializing...');
    // Update navigation based on login status
    console.log('Updating header navigation...');
    updateHeaderNav();
    
    // Get the exchange slug from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug'); // Tries to get 'slug' from URL query string
    console.log(`Retrieved slug from URL: ${slug}`);

    // Get DOM elements
    const loadingElement = document.getElementById('exchange-detail-loading');
    const errorElement = document.getElementById('exchange-detail-error');
    const detailContainer = document.getElementById('exchange-detail');
    const breadcrumbExchangeName = document.getElementById('exchange-name-breadcrumb');
    const reviewSection = document.getElementById('review-section');
    const addReviewSection = document.getElementById('add-review-section');
    const overviewContent = document.getElementById('overview-content'); // Container for overview tab
    const newsTabLink = document.getElementById('tab-news');
    const guideTabLink = document.getElementById('tab-guide');
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

    try {
        // Fetch exchange details
        console.log(`Fetching exchange details for slug: ${slug}`);
        const exchange = await getExchangeDetails(slug);
        console.log("Exchange details received:", exchange);
        
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
        detailContainer.innerHTML = `
            <div class="logo">
                <img src="${exchange.logo_url || '../assets/images/logo-placeholder.png'}" alt="${exchange.name} Logo">
            </div>
            <h1>${exchange.name}</h1>
            
            <p class="description">${exchange.description || 'No description available for this exchange.'}</p>
            
            <div class="stats-overview">
                <div class="stat-item">
                    <div class="value">${exchange.overall_average_rating ? parseFloat(exchange.overall_average_rating).toFixed(1) + ' ★' : 'N/A'}</div>
                    <div class="label">Overall Rating</div>
                </div>
                <div class="stat-item">
                    <div class="value">${exchange.total_review_count || '0'}</div>
                    <div class="label">Total Reviews</div>
                </div>
                <div class="stat-item">
                    <div class="value">${exchange.trading_volume_24h ? '$' + parseFloat(exchange.trading_volume_24h).toLocaleString() : 'N/A'}</div>
                    <div class="label">24h Volume</div>
                </div>
                <div class="stat-item">
                    <div class="value">${exchange.year_founded || 'N/A'}</div>
                    <div class="label">Year Founded</div>
                </div>
            </div>
            
            <div class="details">
                <div class="detail-card">
                    <h3>Basic Information</h3>
                    <p><strong>Registration Country:</strong> ${exchange.registration_country?.name || 'N/A'}</p>
                    <p><strong>Website:</strong> <a href="${exchange.website_url}" target="_blank" rel="noopener noreferrer">${exchange.website_url}</a></p>
                    <p><strong>KYC Type:</strong> ${exchange.kyc_type || 'N/A'}</p>
                    <p>
                        <strong>P2P Available:</strong>
                        ${exchange.has_p2p ? '<span class="available">Yes</span>' : '<span class="unavailable">No</span>'}
                    </p>
                </div>
                
                <div class="detail-card">
                    <h3>Fee Structure</h3>
                    <p><strong>Maker Fee:</strong> ${exchange.maker_fee ? parseFloat(exchange.maker_fee).toFixed(4) * 100 + '%' : 'N/A'}</p>
                    <p><strong>Taker Fee:</strong> ${exchange.taker_fee ? parseFloat(exchange.taker_fee).toFixed(4) * 100 + '%' : 'N/A'}</p>
                    <p><strong>Withdrawal Fee:</strong> ${exchange.withdrawal_fee ? exchange.withdrawal_fee : 'Varies by cryptocurrency'}</p>
                    <p><strong>Deposit Methods:</strong> ${exchange.deposit_methods || 'Information not available'}</p>
                </div>
                
                ${exchange.license_details && exchange.license_details.length > 0 ? `
                    <div class="detail-card">
                        <h3>Regulatory Information</h3>
                        <ul>
                            ${exchange.license_details.map(license => `
                                <li><strong>${license.country.name}:</strong> ${license.license_number}</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <div class="detail-card">
                    <h3>Supported Fiats</h3>
                    ${exchange.supported_fiat_currencies && exchange.supported_fiat_currencies.length > 0 ? `
                        <ul>
                            ${exchange.supported_fiat_currencies.map(fiat => `
                                <li>${fiat.code_iso_4217}</li>
                            `).join('')}
                        </ul>
                    ` : '<p>No supported fiats information available.</p>'}
                </div>
                
            </div>
        `;
        console.log('Exchange detail HTML built and inserted into DOM');

        // Show review section
        console.log('Showing review section...');
        reviewSection.classList.remove('hidden');
        
        // Show "Add Review" section only for logged-in users
        const userLoggedIn = isLoggedIn();
        console.log(`User login status: ${userLoggedIn ? 'Logged in' : 'Not logged in'}`);
        if (userLoggedIn) {
            console.log('Showing add review section for logged-in user');
            addReviewSection.classList.remove('hidden');
            // Set up review form submission - RENDER the form dynamically now
            console.log(`Rendering review form for exchange ID: ${exchange.id}`);
            await renderReviewForm(exchange.id);
        }
        
        // Load exchange reviews
        console.log(`Loading reviews for exchange ID: ${exchange.id}`);
        loadExchangeReviews(exchange.id);

    } catch (error) {
        console.error("Error fetching exchange details:", error);
        loadingElement.classList.add('hidden');
        errorElement.textContent = error.message || 'Failed to load exchange details. Please try again later.';
        errorElement.classList.add('visible');
    }
});

async function renderReviewForm(exchangeId) {
    console.log(`Starting to render review form for exchange ID: ${exchangeId}`);
    const reviewForm = document.getElementById('review-form');
    const ratingsContainer = document.getElementById('review-ratings-container');
    const errorElement = document.getElementById('review-submit-error');
    const successElement = document.getElementById('review-submit-success');

    if (!reviewForm || !ratingsContainer) {
        console.error('Required DOM elements for review form not found');
        return;
    }

    try {
        console.log('Fetching rating categories...');
        const categories = await getRatingCategories();
        console.log('Rating categories received:', categories);
        
        // Create a grid container for the rating categories
        const gridContainer = document.createElement('div');
        gridContainer.classList.add('rating-categories-grid');
        
        // Add CSS for the grid directly to the container
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
        gridContainer.style.gap = '15px';
        
        console.log(`Building rating inputs for ${categories.length} categories`);
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
            console.log(`Added category ${category.name} (ID: ${category.id}) to form`);
        });
        
        // Clear and add the grid to the ratings container
        ratingsContainer.innerHTML = '';
        ratingsContainer.appendChild(gridContainer);
    } catch (error) {
        console.error("Failed to load rating categories for form:", error);
        ratingsContainer.innerHTML = '<p class="error-message">Could not load rating categories.</p>';
    }

    console.log('Setting up review form submission handler');
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log("Review form submitted");

        errorElement.textContent = '';
        errorElement.classList.remove('visible');
        successElement.textContent = '';
        successElement.classList.remove('visible');

        const commentText = document.getElementById('review-text').value;
        console.log(`Review comment length: ${commentText.length} characters`);
        
        const ratings = [];
        const ratingGroups = ratingsContainer.querySelectorAll('.rating-category-group .star-rating');
        console.log(`Found ${ratingGroups.length} rating categories to process`);

        let allRatingsSelected = true;
        ratingGroups.forEach(group => {
            const categoryId = group.dataset.categoryId;
            console.log(`Processing category ID: ${categoryId}`);
            const selectedRatingInput = group.querySelector('input[type="radio"]:checked');
            if (selectedRatingInput) {
                const ratingValue = parseInt(selectedRatingInput.value, 10);
                console.log(`Category ${categoryId}: Selected rating ${ratingValue}`);
                ratings.push({
                    category_id: parseInt(categoryId, 10),
                    rating_value: ratingValue
                });
            } else {
                console.warn(`Category ${categoryId}: No rating selected`);
                allRatingsSelected = false;
            }
        });

        if (!allRatingsSelected) {
            console.error("Validation failed: Not all ratings selected");
            displayErrorMessage('review-submit-error', 'Please select a rating for all categories.');
            return;
        }

        if (!commentText.trim()) {
            console.error("Validation failed: Empty comment");
            displayErrorMessage('review-submit-error', 'Please enter your review comment.');
            return;
        }

        const reviewData = {
            comment: commentText,
            ratings: ratings
        };
        console.log("Submitting review data:", reviewData);

        try {
            console.log(`Submitting review for exchange ID: ${exchangeId}`);
            await submitExchangeReview(exchangeId, reviewData);
            console.log("Review submitted successfully");
            successElement.textContent = 'Your review has been submitted and is pending moderation.';
            successElement.classList.add('visible');
            reviewForm.reset();
            console.log('Form reset after successful submission');
        } catch (error) {
            console.error("Review submission failed:", error);
            displayErrorMessage('review-submit-error', error.message || 'Failed to submit review.');
        }
    });
    console.log('Review form setup complete');
}


async function loadExchangeReviews(exchangeId, params = { skip: 0, limit: 10 }) {
    console.log(`Loading reviews for exchange ID: ${exchangeId} with params:`, params);
    const reviewsList = document.getElementById('reviews-list');
    const loadingElement = document.getElementById('reviews-loading');
    const errorElement = document.getElementById('reviews-error');
    const paginationElement = document.getElementById('reviews-pagination');

    if (!reviewsList || !loadingElement || !errorElement) {
        console.error('Required DOM elements for reviews not found');
        return;
    }

    loadingElement.classList.remove('hidden');
    errorElement.classList.remove('visible');
    reviewsList.innerHTML = '';
    if (paginationElement) paginationElement.innerHTML = '';

    try {
        console.log('Calling API to list exchange reviews...');
        const response = await listExchangeReviews(exchangeId, params);
        console.log('Reviews response received:', response);

        loadingElement.classList.add('hidden');

        if (!response || !response.items) {
            console.error('Invalid response structure:', response);
            throw new Error("Invalid response structure for reviews.");
        }

        if (response.items.length === 0) {
            console.log('No reviews found for this exchange');
            reviewsList.innerHTML = '<p>No reviews found for this exchange yet.</p>';
            return;
        }

        console.log(`Rendering ${response.items.length} reviews...`);
        response.items.forEach(review => {
            console.log(`Processing review ID: ${review.id} by ${review.user.nickname}`);
            const reviewElement = document.createElement('div');
            reviewElement.classList.add('review-item');
            const averageRating = review.ratings.length > 0
                ? (review.ratings.reduce((sum, r) => sum + r.rating_value, 0) / review.ratings.length).toFixed(1)
                : 'N/A';
            console.log(`Average rating for review ${review.id}: ${averageRating}`);

            reviewElement.innerHTML = `
                <div class="review-header">
                    <span class="review-author">${review.user.nickname}</span>
                    <span class="review-date">${new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                <div class="review-rating">Overall Rating: ${averageRating} ★</div>
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
            console.log(`Review ${review.id} added to DOM`);
        });

        console.log('Setting up vote buttons...');
        setupVoteButtons();

    } catch (error) {
        console.error("Error loading exchange reviews:", error);
        loadingElement.classList.add('hidden');
        errorElement.textContent = error.message || 'Failed to load reviews.';
        errorElement.classList.add('visible');
    }
}

function setupVoteButtons() {
    console.log('Setting up vote button event handlers');
    const voteButtons = document.querySelectorAll('.vote-btn');
    console.log(`Found ${voteButtons.length} vote buttons`);
    
    voteButtons.forEach(button => {
        button.addEventListener('click', async (event) => {
            const reviewId = event.target.dataset.reviewId;
            const isUseful = event.target.dataset.vote === 'true';
            console.log(`Vote button clicked for review ${reviewId}, isUseful: ${isUseful}`);
            
            if (!isLoggedIn()) {
                console.log('User not logged in, showing alert');
                alert('Please log in to vote on reviews.');
                return;
            }
            
            const feedbackElement = document.querySelector(`.vote-feedback[data-review-id="${reviewId}"]`);
            console.log('Disabling vote buttons during processing...');
            event.target.closest('.review-footer').querySelectorAll('.vote-btn').forEach(btn => btn.disabled = true);
            feedbackElement.textContent = 'Voting...';

            try {
                console.log(`Submitting vote for review ${reviewId}`);
                const updatedReview = await voteOnReview(reviewId, isUseful);
                console.log('Vote successful, updated review:', updatedReview);
                
                const usefulBtn = document.querySelector(`.vote-btn.useful[data-review-id="${reviewId}"]`);
                const notUsefulBtn = document.querySelector(`.vote-btn.not-useful[data-review-id="${reviewId}"]`);
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
                event.target.closest('.review-footer').querySelectorAll('.vote-btn').forEach(btn => btn.disabled = false);
            }
        });
    });
    console.log('Vote button setup complete');
}