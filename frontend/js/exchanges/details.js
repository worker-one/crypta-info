// Exchange Detail Page Logic
import { getExchangeDetails, listItemReviews } from '../api.js';
import { updateHeaderNav } from '../header.js'; // Import from new header module
import { loadHTML } from '../renderUtils.js';
import { renderReviewsList, updateSortButtonCounts, setupSortingButtons, setupReviewVoting } from '../common/reviews.js';
import { handleLogout } from '../auth.js';
import { renderStarRating, attachStarClickHandlers } from '../common/details.js'; // Import the star rating function

const BASE_API_URL = 'http://176.124.219.116:8300/api/v1'

// --- Global variable to store fetched reviews ---
let currentReviews = [];
let reviewsTabLink; // Declare reviewsTabLink in module scope

// --- DOM Elements (Moved review elements here) ---
const reviewsList = document.getElementById('reviews-list');
const reviewsLoadingElement = document.getElementById('reviews-loading');
const reviewsErrorElement = document.getElementById('reviews-error');


document.addEventListener('DOMContentLoaded', async () => {
    console.log('Exchange detail page initializing...');

    loadHTML('../components/header.html', 'header-placeholder'); // Load header HTML
    loadHTML('../components/footer.html', 'footer-placeholder'); // Load footer HTML
    
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
            <div class="value">${exchange.trading_volume_24h ? '$' + parseFloat(exchange.trading_volume_24h).toLocaleString() : 'N/A'}</div>
            <div class="label">Объем (24ч)</div>
            </div>
            <div class="stat-item">
            <div class="value">${exchange.year_founded || 'N/A'}</div>
            <div class="label">Год Основания</div>
            </div>
            </div>
            </div>

            <p class="Описание">${exchange.overview || 'No overview available for this exchange.'}</p>
            
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
            <p class="Описание">${exchange.Описание || 'No Описание available for this exchange.'}</p>
            
            
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
        await loadExchangeReviews(exchange.id); // This function already calls setupSortingButtons(currentReviews) and setupReviewVoting()

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
        setupSortingButtons(currentReviews); // Correct call with currentReviews
        setupReviewVoting(); // Correct call

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