// Exchange Detail Page Logic
import { getExchangeDetails, listItemReviews, fetchExchangeNews, fetchExchangeGuides } from '../api.js'; // Added fetchExchangeNews
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

/**
 * Formats the trading volume.
 * @param {number|null|undefined} volume - The trading volume.
 * @returns {string} - The formatted volume string.
 */
function formatVolume(volume) {
    if (volume === null || volume === undefined || isNaN(parseFloat(volume))) {
        return 'N/A';
    }

    const numVolume = parseFloat(volume);

    if (numVolume >= 1000000000) {
        return `$${Math.round(numVolume / 1000000000)} млрд`;
    } else if (numVolume >= 1000000) {
        return `$${Math.round(numVolume / 1000000)} млн`;
    } else {
        return `$${numVolume.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
}


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

    // Set tab links dynamically for Guide and Reviews (News tab is handled later)
    if (guideTabLink) {
        guideTabLink.href = `guide.html?slug=${slug}`;
        console.log(`Set Инструкции tab link to: ${guideTabLink.href}`);
    }
    // Removed newsTabLink setup from here, will be conditional later

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

        // Conditionally show/hide and configure News tab
        if (newsTabLink) {
            try {
                console.log(`Fetching news for exchange ID: ${exchange.id} to determine tab visibility`);
                const newsResponse = await fetchExchangeNews(exchange.id, { limit: 1 }); // Fetch one to check
                if (newsResponse && newsResponse.items && newsResponse.items.length > 0) {
                    newsTabLink.href = `news.html?slug=${slug}`; // Set href
                    newsTabLink.classList.remove('hidden'); // Make sure it's visible
                    console.log(`News found for ${exchange.name}. News tab configured and visible.`);
                } else {
                    newsTabLink.classList.add('hidden'); // Hide if no news
                    console.log(`No news for ${exchange.name}. News tab hidden.`);
                }
            } catch (newsError) {
                console.error(`Error fetching news for ${exchange.name}, hiding news tab:`, newsError);
                newsTabLink.classList.add('hidden'); // Hide on error
            }
        } else {
            console.warn('News tab link element (tab-news) not found.');
        }

        // Conditionally show/hide and configure Guide tab
        if (guideTabLink) {
            try {
                console.log(`Setting Guide tab link to: guide.html?slug=${slug}`);
                const guidesResponse = await fetchExchangeGuides(exchange.id, { limit: 1 }); // Fetch one to check
                if (guidesResponse && guidesResponse.items && guidesResponse.items.length > 0) {
                    guideTabLink.href = `guide.html?slug=${slug}`; // Set href
                    guideTabLink.classList.remove('hidden'); // Make sure it's visible
                    console.log(`Guides found for ${exchange.name}. Guides tab configured and visible.`);
                } else {
                    guideTabLink.classList.add('hidden'); // Hide if no guides
                    console.log(`No guides for ${exchange.name}. Guides tab hidden.`);
                }
            } catch (guidesError) {
                console.error(`Error fetching guides for ${exchange.name}, hiding guides tab:`, guidesError);
                guideTabLink.classList.add('hidden'); // Hide on error
            }
        } else {
            console.warn('Guide tab link element (tab-guide) not found.');
        }

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

        // Determine if the "Сервисы" card should be shown
        const showServicesCard = exchange.has_copy_trading ||
                                 exchange.has_p2p ||
                                 exchange.has_staking ||
                                 exchange.has_futures ||
                                 exchange.has_spot_trading ||
                                 exchange.has_demo_trading;

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
            <div class="value">${formatVolume(exchange.trading_volume_24h)}</div>
            <div class="label">Объем (24ч)</div>
            </div>
            <div class="stat-item">
            <div class="value">${exchange.year_founded || 'N/A'}</div>
            <div class="label">Год Основания</div>
            </div>
            <div class="stat-item">
            <div class="value">${exchange.registration_country?.name || 'N/A'}</div>
            <div class="label">Страна</div>
            </div>
            </div>
            </div>

            ${exchange.overview ? `<p class="Описание">${exchange.overview}</p>` : ''}
            
            <div class="details">
            
            ${showServicesCard ? `
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
            ` : ''}

            ${ (exchange.spot_taker_fee || exchange.spot_maker_fee || exchange.futures_taker_fee || exchange.futures_maker_fee) ? `
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
            ` : '' }
            
            </div>
            <br>
            ${exchange.Описание ? `<p class="Описание">${exchange.Описание}</p>` : ''}
            
            
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
        await loadReviews(exchange.id); // This function already calls setupSortingButtons(currentReviews) and setupReviewVoting()

    } catch (error) {
        console.error("Error fetching exchange details:", error);
        loadingElement.classList.add('hidden');
        errorElement.textContent = error.message || 'Failed to load exchange details. Please try again later.';
        errorElement.classList.add('visible');
    }
});

async function loadReviews(exchangeId) {
    console.log(`Loading reviews for exchange ID: ${exchangeId}`);
    const paginationElement = document.getElementById('reviews-pagination');
    const reviewSortControls = document.querySelector('.review-sort-controls');
    const sortButtonsContainer = reviewSortControls ? reviewSortControls.querySelector('div:first-child') : null;
    const addReviewLinkElement = document.getElementById('add-review-link');

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
            console.log('No reviews found for this exchange. Hiding sort buttons and centering add review button.');
            if (sortButtonsContainer) {
                sortButtonsContainer.style.display = 'none';
            }
            if (reviewSortControls) {
                reviewSortControls.style.justifyContent = 'center';
            }
            if (addReviewLinkElement) {
                addReviewLinkElement.style.marginLeft = '0'; // Remove auto margin for centering
            }
            reviewsList.innerHTML = '<p> </p>'; // Updated message
        } else {
            console.log(`Rendering ${currentReviews.length} reviews initially (sorted by date)...`);
            if (sortButtonsContainer) {
                sortButtonsContainer.style.display = ''; // Reset to default display
            }
            if (reviewSortControls) {
                reviewSortControls.style.justifyContent = ''; // Reset to default (flex-start or as per CSS)
            }
            if (addReviewLinkElement) {
                addReviewLinkElement.style.marginLeft = 'auto'; // Restore auto margin
            }
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