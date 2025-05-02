// filepath: /home/verner/crypta-info/frontend/js/static-page.js
import { fetchStaticPage } from './api.js';
import { checkAndCacheUserProfile } from './auth.js'; // To update header nav
import { displayErrorMessage, clearErrorMessage } from './renderUtils.js'; // Assuming ui.js has these

// Helper to show/hide elements using the 'hidden' class
const showElement = (element) => element?.classList.remove('hidden');
const hideElement = (element) => element?.classList.add('hidden');

/**
 * Fetches and displays the static page content based on the HTML filename.
 */
async function loadStaticPage() {
    const titleElement = document.getElementById('page-title');
    const bodyElement = document.getElementById('page-body');
    const errorElement = document.getElementById('page-error');

    // 1. Get the slug from the current HTML filename
    const path = window.location.pathname; // e.g., "/privacy" or "/about"
    const filename = path.substring(path.lastIndexOf('/') + 1); // e.g., "privacy"
    const slug = filename.replace('.html', ''); // e.g., "privacy"

    // Basic check if a slug was derived
    if (!slug || slug === 'static-page') { // Avoid running on the generic page if it exists
        titleElement.textContent = 'Error';
        displayErrorMessage('page-error', 'Could not determine the page content to load.');
        showElement(errorElement);
        hideElement(bodyElement);
        return;
    }

    // 2. Clear previous errors and show loading state (optional)
    clearErrorMessage('page-error');
    hideElement(errorElement);
    titleElement.textContent = 'Loading...';
    bodyElement.innerHTML = '<p>Please wait...</p>';

    // 3. Fetch page content from the API using the derived slug
    try {
        const pageData = await fetchStaticPage(slug);

        // 4. Display the content
        titleElement.textContent = pageData.title;
        // IMPORTANT: Sanitize HTML content if it comes from untrusted sources
        bodyElement.innerHTML = pageData.content; // Render HTML content
        document.title = `${pageData.title} - CryptaInfo`; // Update browser tab title

    } catch (error) {
        // 5. Handle errors
        console.error(`Error fetching static page content for '${slug}':`, error);
        titleElement.textContent = 'Page Not Found';
        document.title = 'Page Not Found - CryptaInfo';
        displayErrorMessage('page-error', `Could not load the content for '${slug}'. It might not exist or there was a server error.`);
        showElement(errorElement);
        hideElement(bodyElement);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Update header navigation based on login status
    await checkAndCacheUserProfile();
    // Load the static page content
    await loadStaticPage();
});