// Exchange Detail Page Logic
import { getExchangeDetails, listItemReviews, voteOnReview, submitItemReview } from '../api.js';
import { updateHeaderNav } from '../header.js'; // Import from new header module
import { renderReviewsList, updateSortButtonCounts, setupSortingButtons, setupReviewVoting } from '../reviews.js';
import { isLoggedIn, handleLogout } from '../auth.js';

const BASE_API_URL = 'https://humble-garbanzo-q7pqgwwxr97rh4wgg-8300.app.github.dev/api/v1'

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
 * @param {boolean} interactive - Whether the stars should be interactive (for hover/click).
 * @returns {string} HTML string for the star rating, e.g., "★★★★☆ (4.5)".
 */
function renderStarRating(ratingString, maxStars = 5, interactive = false) { // Changed exchangeId to interactive
    const rating = parseFloat(ratingString);
    if (isNaN(rating) || rating < 0) {
        return 'N/A'; // Return N/A if rating is not a valid number
    }

    let starsHtml = '';
    const simpleRoundedRating = Math.round(rating);
    
    const clickableClass = interactive ? 'clickable-star' : ''; // Use interactive flag
    
    // Create a container for stars to make hover effect targeting easier
    starsHtml = `<span class="stars-container" ${interactive ? 'data-interactive="true"' : ''}>`; // Use interactive flag
    
    for (let i = 1; i <= maxStars; i++) {
        // data-rating is always added for hover/click logic
        if (i <= simpleRoundedRating) {
            starsHtml += `<span class="star ${clickableClass}" data-rating="${i}">★</span>`; // Filled star
        } else {
            starsHtml += `<span class="star ${clickableClass}" data-rating="${i}">☆</span>`; // Empty star
        }
    }
    
    starsHtml += `</span>`;

    return `<span style="font-weight: bold; color: #007bff;">${rating.toFixed(1)}</span> ${starsHtml} <span class="numerical-rating"></span>`;
}

/**
 * Handles click on a star. Redirects to the review page with the selected rating.
 * @param {Event} event - The click event
 */
function handleStarClick(event) { // Made non-async, removed direct submission
    const starElement = event.target.closest('.clickable-star');
    if (!starElement) return;
    
    const rating = parseInt(starElement.dataset.rating, 10);
    
    if (!rating || rating < 1 || rating > 5) {
        console.warn("Invalid rating clicked or star not properly configured:", rating);
        return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug'); 

    if (!slug) {
        console.error("Slug not found in current URL. Cannot redirect to reviews page with rating.");
        // Optionally, display an error message to the user or disable star clicking if slug is missing.
        return;
    }
    
    // Construct the redirect URL, including a hash to scroll to the review form
    const redirectUrl = `/exchanges/reviews.html?slug=${slug}&rating=${rating}#add-review-section`;
    
    console.log(`Redirecting to: ${redirectUrl}`);
    window.location.href = redirectUrl;
}

/**
 * Handles hover on a star to preview rating.
 * @param {Event} event - The mouseover/focus event
 */
function handleStarHover(event) {
    const starElement = event.target.closest('.clickable-star');
    if (!starElement) return;
    
    const starsContainer = starElement.closest('.stars-container');
    if (!starsContainer || starsContainer.getAttribute('data-interactive') !== 'true') return;
    
    const hoverRating = parseInt(starElement.dataset.rating, 10);
    const stars = starsContainer.querySelectorAll('.star');
    
    // Fill stars up to the hovered position
    stars.forEach((star, index) => {
        // +1 because index is 0-based but our ratings start at 1
        if (index + 1 <= hoverRating) {
            star.textContent = '★'; // Fill star
            star.classList.add('hovered');
        } else {
            star.textContent = '☆'; // Empty star
            star.classList.remove('hovered');
        }
    });
}

/**
 * Handles mouse leaving the star rating area to reset preview.
 * @param {Event} event - The mouseleave/blur event
 */
function handleStarLeave(event) {
    const starsContainer = event.target.closest('.stars-container');
    if (!starsContainer || starsContainer.getAttribute('data-interactive') !== 'true') return;
    
    const stars = starsContainer.querySelectorAll('.star');
    
    // Reset to original state based on data attributes
    stars.forEach(star => {
        const ratingValue = parseInt(star.dataset.rating, 10);
        const exchangeId = star.dataset.exchangeId;
        
        // Get the parent stat-item to find the current actual rating
        const statItem = starsContainer.closest('.stat-item');
        let currentRating = 0;
        
        if (statItem) {
            const ratingText = statItem.querySelector('.value span').textContent;
            currentRating = Math.round(parseFloat(ratingText));
        }
        
        // Reset star appearance
        if (ratingValue <= currentRating) {
            star.textContent = '★'; // Filled star
        } else {
            star.textContent = '☆'; // Empty star
        }
        star.classList.remove('hovered');
    });
}

/**
 * Attaches all event handlers to clickable stars on the page.
 */
function attachStarClickHandlers() {
    const stars = document.querySelectorAll('.clickable-star');
    stars.forEach(star => {
        // Remove existing listeners to prevent duplicates
        star.removeEventListener('click', handleStarClick);
        star.removeEventListener('mouseover', handleStarHover);
        star.removeEventListener('focus', handleStarHover);
        
        // Add click listener
        star.addEventListener('click', handleStarClick);
        
        // Add hover/focus listeners for rating preview
        star.addEventListener('mouseover', handleStarHover);
        star.addEventListener('focus', handleStarHover);
    });
    
    // Add mouseleave/blur handlers to star containers for resetting preview
    const starContainers = document.querySelectorAll('.stars-container[data-interactive="true"]');
    starContainers.forEach(container => {
        container.removeEventListener('mouseleave', handleStarLeave);
        container.addEventListener('mouseleave', handleStarLeave);
        
        // For accessibility: reset when focus leaves the container
        container.querySelectorAll('.star').forEach(star => {
            star.removeEventListener('blur', handleStarLeave);
            star.addEventListener('blur', (event) => {
                // Only reset if focus is moving outside the container
                if (!container.contains(event.relatedTarget)) {
                    handleStarLeave({ target: container });
                }
            });
        });
    });
}


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
        console.log(`Set Новости биржи tab link to: ${newsTabLink.href}`);
    }
    if (guideTabLink) {
        guideTabLink.href = `guide.html?slug=${slug}`;
        console.log(`Set Инструкции tab link to: ${guideTabLink.href}`);
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
                websiteTabLink.href = `${BASE_API_URL}/exchanges/go/${exchange.slug}`;
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
            <div class="value">${renderStarRating(exchange.overall_average_rating, 5, true)}</div>
            <div class="label">${exchange.total_rating_count} голосов</div>
            </div>
            <div class="stat-item">
            <a href="/exchanges/reviews.html?slug=${exchange.slug}" style="text-decoration: none; color: inherit;">
            <div class="value">${exchange.total_review_count || '0'}</div>
            <div class="label">Отзывы</div>
            </a>
            </div>
            <div class="stat-item">
            <div class="value">${exchange.trading_volume_24h ? '$' + parseFloat(exchange.trading_volume_24h).toLocaleString() : 'N/A'}B</div>
            <div class="label">Объем (24ч)</div>
            </div>
            <div class="stat-item">
            <div class="value">${exchange.year_founded || 'N/A'}</div>
            <div class="label">Год Основания</div>
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
            <p><strong>Сайт:</strong> <a href="${BASE_API_URL}/exchanges/go/${exchange.slug}" target="_blank" rel="noopener noreferrer">${exchange.website_url}</a></p>
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
            <a href="${BASE_API_URL}/exchanges/go/${exchange.slug}" target="_blank" rel="noopener noreferrer" class="bonus-button" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; font-size: 18px; border-radius: 4px; transition: background-color 0.3s;">Получить бонус</a>
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
        // Update review section heading with exchange name
        const reviewSectionHeading = reviewSection.querySelector('h2');
        if (reviewSectionHeading) {
            reviewSectionHeading.textContent = `Отзывы о бирже ${exchange.name}`;
        }

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

async function loadExchangeReviews(exchangeId) {
    console.log(`Loading reviews for exchange ID: ${exchangeId}`);
    const paginationElement = document.getElementById('reviews-pagination');

    if (reviewsTabLink) {
        reviewsTabLink.textContent = 'Отзывы (...)'; // Indicate loading
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
    updateSortButtonCounts(currentReviews); // Update counts to 0 initially

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
        
        updateSortButtonCounts(currentReviews); // Update counts after fetching

        if (reviewsTabLink) {
            reviewsTabLink.textContent = `Отзывы (${currentReviews.length})`;
        }

        if (currentReviews.length === 0) {
            console.log('No reviews found for this exchange');
            reviewsList.innerHTML = '<p>No reviews found for this exchange yet.</p>';
        } else {
            console.log(`Rendering ${currentReviews.length} reviews initially (sorted by date)...`);
            renderReviewsList(currentReviews);
        }

        // Setup sorting and voting after rendering
        setupSortingButtons(currentReviews);
        setupReviewVoting();

    } catch (error) {
        console.error("Error loading exchange reviews:", error);
        reviewsLoadingElement.classList.add('hidden');
        reviewsErrorElement.textContent = error.message || 'Failed to load reviews.';
        reviewsErrorElement.classList.add('visible');
        currentReviews = [];
        updateSortButtonCounts(currentReviews); // Update counts on error (to 0)
        if (reviewsTabLink) {
            reviewsTabLink.textContent = 'Отзывы (0)';
        }
    }
}
