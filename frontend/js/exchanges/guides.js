import { getExchangeDetails, listGuides, getGuideItem } from '../api.js'; // Import getGuideItem
import { renderGuideCard, renderGuideDetail, displayErrorMessage, clearErrorMessage } from '../renderUtils.js'; // Import renderGuideDetail
import { updateHeaderNav } from '../header.js'; // Import updateHeaderNav
import { handleLogout } from '../auth.js'; // Import handleLogout

// --- DOM Elements ---
const guideListContainer = document.getElementById('guide-list');
const guideDetailContainer = document.getElementById('guide-detail-content'); // Container for single guide item
const loadingIndicator = document.getElementById('guide-loading');
const errorContainer = document.getElementById('guide-error');
const exchangeNameHeading = document.getElementById('exchange-name-heading');
const exchangeLinkBreadcrumb = document.getElementById('exchange-link-breadcrumb');
const guideBreadcrumbSpan = document.getElementById('guide-breadcrumb-span'); // The static "Инструкции" span
const guideDetailBreadcrumb = document.getElementById('guide-detail-breadcrumb'); // Span for guide item title

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
    if (newsTabLink) newsTabLink.href = `news.html?slug=${slug}`;
    // if (guideTabLink) guideTabLink.href = `guide.html?slug=${slug}`; // Current page
    if (reviewsTabLink) reviewsTabLink.href = `reviews.html?slug=${slug}`;
    if (guideTabLink) guideTabLink.classList.add('active'); // Mark current tab as active
}

/**
 * Updates breadcrumbs and heading for the guide list view.
 * @param {string} exchangeName - The name of the exchange.
 * @param {string} exchangeSlug - The slug of the exchange.
 */
function updateGuideListUI(exchangeName, exchangeSlug) {
    if (exchangeNameHeading) exchangeNameHeading.textContent = `${exchangeName} Инструкции`;
    if (exchangeLinkBreadcrumb) {
        exchangeLinkBreadcrumb.textContent = exchangeName;
        exchangeLinkBreadcrumb.href = `details.html?slug=${exchangeSlug}`;
    }
    // Ensure "Инструкции" part is not a link in list view
    if (guideBreadcrumbSpan) {
        guideBreadcrumbSpan.innerHTML = 'Инструкции'; // Reset to plain text
        showElement(guideBreadcrumbSpan);
    }
    if (guideDetailBreadcrumb) hideElement(guideDetailBreadcrumb); // Hide detail part
}

/**
 * Updates breadcrumbs and heading for the single guide item view.
 * @param {string} exchangeName - The name of the exchange.
 * @param {string} exchangeSlug - The slug of the exchange.
 * @param {string} guideTitle - The title of the guide item.
 */
function updateGuideDetailUI(exchangeName, exchangeSlug, guideTitle) {
    if (exchangeNameHeading) exchangeNameHeading.textContent = guideTitle; // Show guide title as main heading
    if (exchangeLinkBreadcrumb) {
        exchangeLinkBreadcrumb.textContent = exchangeName;
        exchangeLinkBreadcrumb.href = `details.html?slug=${exchangeSlug}`;
    }
    if (guideBreadcrumbSpan) {
        // Make the "Инструкции" part a link back to the list
        guideBreadcrumbSpan.innerHTML = `<a href="guide.html?slug=${exchangeSlug}">Инструкции</a>`;
        showElement(guideBreadcrumbSpan);
    }
    if (guideDetailBreadcrumb) {
        guideDetailBreadcrumb.textContent = `/ ${guideTitle}`; // Show guide title in breadcrumb
        showElement(guideDetailBreadcrumb);
    }
}

/**
 * Fetches exchange details to get the name and ID for UI updates and API calls.
 * @param {string} slug - The exchange slug.
 * @returns {Promise<object|null>} - The exchange details object { id, name } or null on error.
 */
async function fetchExchangeDetailsForGuide(slug) {
    try {
        const details = await getExchangeDetails(slug);
        return { id: details.id, name: details.name || 'Exchange' };
    } catch (error) {
        console.error("Failed to fetch exchange details:", error);
        return null; // Indicate error
    }
}

/**
 * Loads and displays the list of guide items for a given exchange slug.
 * @param {string} slug - The exchange slug.
 */
const loadGuideList = async (slug) => {
    if (!guideListContainer || !loadingIndicator || !errorContainer) return;

    hideElement(guideDetailContainer); // Ensure detail view is hidden
    showElement(guideListContainer);   // Ensure list view is shown
    clearErrorMessage('guide-error');
    showElement(loadingIndicator);
    guideListContainer.innerHTML = ''; // Clear previous items

    // Update tab links as soon as slug is confirmed valid for this page type
    updateTabLinks(slug);

    try {
        // Fetch exchange details first to get ID and Name
        const exchangeInfo = await fetchExchangeDetailsForGuide(slug);

        if (!exchangeInfo) {
            throw new Error("Could not fetch exchange details.");
        }

        updateGuideListUI(exchangeInfo.name, slug); // Update UI elements for list view

        // Fetch guide items using the exchange ID
        const guideData = await listGuides({
            exchange_id: exchangeInfo.id,
            limit: 20 // Fetch latest 20 guides for this exchange
        });

        hideElement(loadingIndicator);

        if (guideData && guideData.items && guideData.items.length > 0) {
            guideData.items.forEach(guideItem => {
                // Pass slug in case renderGuideCard needs it for links later
                const guideCard = renderGuideCard(guideItem, slug);
                guideListContainer.appendChild(guideCard);
            });
        } else {
            const noGuidesMessage = document.createElement('p');
            noGuidesMessage.textContent = 'No guides available for this exchange yet.';
            noGuidesMessage.style.textAlign = 'center';
            noGuidesMessage.style.padding = '2rem';
            noGuidesMessage.style.gridColumn = '1 / -1'; // Span across grid columns
            guideListContainer.appendChild(noGuidesMessage);
        }

    } catch (error) {
        console.error('Failed to load guide list:', error);
        hideElement(loadingIndicator);
        guideListContainer.innerHTML = ''; // Clear potential partial content
        displayErrorMessage('guide-error', `Failed to load guides. ${error.message}`);
        // Update title/breadcrumb to show error state if needed
        updateGuideListUI('Error Loading Guides', slug);
    }
};

/**
 * Loads and displays a single guide item by its ID.
 * @param {string|number} guideId - The ID of the guide item.
 * @param {string} slug - The exchange slug (for context and breadcrumbs).
 */
const loadSingleGuideItem = async (guideId, slug) => {
    if (!guideDetailContainer || !loadingIndicator || !errorContainer) return;

    hideElement(guideListContainer);   // Ensure list view is hidden
    showElement(guideDetailContainer); // Ensure detail view is shown
    clearErrorMessage('guide-error');

    // Update tab links as soon as slug is confirmed valid for this page type
    updateTabLinks(slug);

    try {
        showElement(loadingIndicator); // Show loading indicator
        guideDetailContainer.innerHTML = ''; // Clear previous detail content
        // Append loading indicator inside the detail container while loading
        guideDetailContainer.appendChild(loadingIndicator);

        // Fetch exchange details first to get Name for UI
        const exchangeInfo = await fetchExchangeDetailsForGuide(slug);
        if (!exchangeInfo) {
            throw new Error("Could not fetch exchange details for breadcrumbs.");
        }

        const guideItem = await getGuideItem(guideId); // Fetch the specific guide item

        hideElement(loadingIndicator); // Hide loading indicator
        guideDetailContainer.innerHTML = ''; // Clear loading indicator before adding content

        updateGuideDetailUI(exchangeInfo.name, slug, guideItem.title); // Update UI for detail view

        const guideDetailElement = renderGuideDetail(guideItem);
        guideDetailContainer.appendChild(guideDetailElement);

    } catch (error) {
        console.error(`Failed to load guide item ${guideId}:`, error);
        hideElement(loadingIndicator);
        guideDetailContainer.innerHTML = '';
        displayErrorMessage('guide-error', `Failed to load guide item. ${error.message}`);
        // Optionally, update title/breadcrumb to show error state
        const exchangeName = exchangeLinkBreadcrumb?.textContent || 'Exchange'; // Fallback
        updateGuideDetailUI(exchangeName, slug, 'Error Loading Инструкции');
    }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    updateHeaderNav(); // Update header login/logout state

    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    const guideId = urlParams.get('guide_id'); // Check for guide_id

    // Add logout listener
    const logoutBtn = document.getElementById('nav-logout-btn');
    logoutBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        console.log("Logout button clicked on guide page");
        handleLogout();
    });

    if (!slug) {
        hideElement(loadingIndicator);
        displayErrorMessage('guide-error', 'Cannot load page: Exchange identifier (slug) is missing.');
        if (exchangeNameHeading) exchangeNameHeading.textContent = 'Error: Exchange Slug Missing';
        // Disable tabs or show error state (already handled partly by inline script)
        return;
    }

    // Decide whether to load the list or a single item
    if (guideId) {
        console.log(`Loading single guide item: ${guideId} for slug: ${slug}`);
        loadSingleGuideItem(guideId, slug);
    } else {
        console.log(`Loading guide list for slug: ${slug}`);
        loadGuideList(slug);
    }
});
