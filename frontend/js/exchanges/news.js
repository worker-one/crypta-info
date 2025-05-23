import { listNews, getNewsItem } from '../api.js'; // Import getNewsItem
import { renderNewsCard, renderNewsDetail, displayErrorMessage, clearErrorMessage, loadHTML } from '../renderUtils.js'; // Import renderNewsDetail
import { handleLogout, checkAndCacheUserProfile } from '../auth.js'; // Import handleLogout and checkAndCacheUserProfile

// --- DOM Elements ---
const newsListContainer = document.getElementById('news-list');
const newsDetailContainer = document.getElementById('news-detail-content'); // Container for single news item
const loadingIndicator = document.getElementById('news-loading');
const errorContainer = document.getElementById('news-error'); // General error display
const exchangeNameHeading = document.getElementById('exchange-name-heading');
const exchangeLinkBreadcrumb = document.getElementById('exchange-link-breadcrumb');
const newsBreadcrumbSpan = document.getElementById('news-breadcrumb-span'); // The static "Новости биржи" span
const newsDetailBreadcrumb = document.getElementById('news-detail-breadcrumb'); // Span for news item title

// --- Helper Functions ---
const showElement = (el) => el?.classList.remove('hidden');
const hideElement = (el) => el?.classList.add('hidden');

/**
 * Updates the href attributes of the navigation tabs.
 * @param {string} slug - The exchange slug.
 */
function updateTabLinks(slug) {
    const overviewTabLink = document.getElementById('tab-overview');
    const newsTabLink = document.getElementById('tab-news');
    const guideTabLink = document.getElementById('tab-guide');
    const reviewsTabLink = document.getElementById('tab-reviews');

    if (overviewTabLink) overviewTabLink.href = `details.html?slug=${slug}`;
    // if (newsTabLink) newsTabLink.href = `news.html?slug=${slug}`; // Current page
    if (guideTabLink) guideTabLink.href = `guide.html?slug=${slug}`;
    if (reviewsTabLink) reviewsTabLink.href = `reviews.html?slug=${slug}`;
    if (newsTabLink) newsTabLink.classList.add('active'); // Mark current tab as active
}

/**
 * Updates breadcrumbs and heading for the news list view.
 * @param {string} exchangeName - The name of the exchange.
 * @param {string} exchangeSlug - The slug of the exchange.
 */
function updateListUI(exchangeName, exchangeSlug) {
    if (exchangeNameHeading) exchangeNameHeading.textContent = `Новости биржи ${exchangeName}`;
    if (exchangeLinkBreadcrumb) {
        exchangeLinkBreadcrumb.textContent = exchangeName;
        exchangeLinkBreadcrumb.href = `details.html?slug=${exchangeSlug}`;
    }
    if (newsBreadcrumbSpan) showElement(newsBreadcrumbSpan);
    if (newsDetailBreadcrumb) hideElement(newsDetailBreadcrumb); // Hide detail part
}

/**
 * Updates breadcrumbs and heading for the single news item view.
 * @param {string} exchangeName - The name of the exchange.
 * @param {string} exchangeSlug - The slug of the exchange.
 * @param {string} newsTitle - The title of the news item.
 */
function updateDetailUI(exchangeName, exchangeSlug, newsTitle) {
    if (exchangeNameHeading) exchangeNameHeading.textContent = newsTitle; // Show news title as main heading
    if (exchangeLinkBreadcrumb) {
        exchangeLinkBreadcrumb.textContent = exchangeName;
        exchangeLinkBreadcrumb.href = `details.html?slug=${exchangeSlug}`;
    }
    if (newsBreadcrumbSpan) {
        // Make the "Новости биржи" part a link back to the list
        newsBreadcrumbSpan.innerHTML = `<a href="news.html?slug=${exchangeSlug}">Новости биржи</a>`;
        showElement(newsBreadcrumbSpan);
    }
    if (newsDetailBreadcrumb) {
        newsDetailBreadcrumb.textContent = `/ ${newsTitle}`; // Show news title in breadcrumb
        showElement(newsDetailBreadcrumb);
    }
}


/**
 * Loads and displays the list of news items for a given exchange slug.
 * @param {string} slug - The exchange slug.
 */
const loadNewsList = async (slug) => {
    if (!newsListContainer || !loadingIndicator || !errorContainer) return;

    hideElement(newsDetailContainer); // Ensure detail view is hidden
    showElement(newsListContainer);
    clearErrorMessage('news-error');

    // Update tab links as soon as slug is confirmed valid for this page type
    updateTabLinks(slug);

    try {
        showElement(loadingIndicator);
        newsListContainer.innerHTML = ''; // Clear previous items
        newsListContainer.appendChild(loadingIndicator); // Re-add loading indicator

        // Fetch news - currently fetches ALL news as API doesn't filter by exchange
        // TODO: Update API call if/when filtering by exchange is available
        const newsData = await listNews({ limit: 20 }); // Fetch latest 20 news items

        hideElement(loadingIndicator);
        newsListContainer.innerHTML = ''; // Clear loading indicator

        // TODO: Fetch exchange name here if needed for the title/breadcrumb update
        const exchangeName = exchangeLinkBreadcrumb?.textContent || 'Exchange'; // Use current breadcrumb text as fallback
        updateListUI(exchangeName, slug); // Update UI for list view

        if (newsData && newsData.items && newsData.items.length > 0) {
            newsData.items.forEach(newsItem => {
                const newsCard = renderNewsCard(newsItem, slug);
                newsListContainer.appendChild(newsCard);
            });
        } else {
            const noNewsMessage = document.createElement('p');
            noNewsMessage.textContent = 'Нет новостей для этой биржи';
            noNewsMessage.style.textAlign = 'center';
            noNewsMessage.style.padding = '2rem';
            noNewsMessage.style.gridColumn = '1 / -1';
            newsListContainer.appendChild(noNewsMessage);
        }

    } catch (error) {
        console.error('Failed to load news list:', error);
        hideElement(loadingIndicator);
        newsListContainer.innerHTML = '';
        displayErrorMessage('news-error', `Failed to load news. ${error.message}`);
    }
};

/**
 * Loads and displays a single news item by its ID.
 * @param {string|number} newsId - The ID of the news item.
 * @param {string} slug - The exchange slug (for context and breadcrumbs).
 */
const loadSingleNewsItem = async (newsId, slug) => {
    if (!newsDetailContainer || !loadingIndicator || !errorContainer) return;

    hideElement(newsListContainer); // Ensure list view is hidden
    showElement(newsDetailContainer);
    clearErrorMessage('news-error');

    // Update tab links as soon as slug is confirmed valid for this page type
    updateTabLinks(slug);

    try {
        showElement(loadingIndicator); // Show loading indicator (can be the same one)
        newsDetailContainer.innerHTML = ''; // Clear previous detail content
        newsDetailContainer.appendChild(loadingIndicator);

        const newsItem = await getNewsItem(newsId);

        hideElement(loadingIndicator);
        newsDetailContainer.innerHTML = ''; // Clear loading indicator

        // TODO: Fetch exchange name here if needed for the title/breadcrumb update
        const exchangeName = exchangeLinkBreadcrumb?.textContent || 'Exchange'; // Use current breadcrumb text as fallback
        updateDetailUI(exchangeName, slug, newsItem.title); // Update UI for detail view

        const newsDetailElement = renderNewsDetail(newsItem);
        newsDetailContainer.appendChild(newsDetailElement);

    } catch (error) {
        console.error(`Failed to load news item ${newsId}:`, error);
        hideElement(loadingIndicator);
        newsDetailContainer.innerHTML = '';
        displayErrorMessage('news-error', `Failed to load news item. ${error.message}`);
        // Optionally, update title/breadcrumb to show error state
        updateDetailUI(exchangeLinkBreadcrumb?.textContent || 'Exchange', slug, 'Error Loading Новости биржи');
    }
};


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {

    loadHTML('../components/header.html', 'header-placeholder'); // Load header HTML
    loadHTML('../components/footer.html', 'footer-placeholder'); // Load footer HTML

    // Check login status and update header nav
    checkAndCacheUserProfile();

    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    const newsId = urlParams.get('news_id'); // Check for news_id

    // Add logout listener
    const logoutBtn = document.getElementById('nav-logout-btn');
    logoutBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        console.log("Logout button clicked on news page");
        handleLogout();
    });

    if (!slug) {
        hideElement(loadingIndicator);
        displayErrorMessage('news-error', 'Cannot load page: Exchange identifier (slug) is missing.');
        if (exchangeNameHeading) exchangeNameHeading.textContent = 'Error: Exchange Slug Missing';
        // Disable tabs or show error state
        return;
    }

    // Decide whether to load the list or a single item
    if (newsId) {
        console.log(`Loading single news item: ${newsId} for slug: ${slug}`);
        loadSingleNewsItem(newsId, slug);
    } else {
        console.log(`Loading news list for slug: ${slug}`);
        loadNewsList(slug);
    }
});
