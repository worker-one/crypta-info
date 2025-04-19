// filepath: /home/verner/crypta-info/frontend/js/static-page.js
import { fetchStaticPage } from './api.js';
import { checkAndCacheUserProfile } from './auth.js'; // To update header nav
import { displayErrorMessage, clearErrorMessage } from './ui.js'; // Assuming ui.js has these

// Helper to show/hide elements using the 'hidden' class
const showElement = (element) => element?.classList.remove('hidden');
const hideElement = (element) => element?.classList.add('hidden');

/**
 * Fetches and displays the static page content.
 */
async function loadStaticPage() {
    const titleElement = document.getElementById('page-title');
    const bodyElement = document.getElementById('page-body');
    const errorElement = document.getElementById('page-error');

    // 1. Get the slug from the URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

    if (!slug) {
        titleElement.textContent = 'Error';
        displayErrorMessage('page-error', 'No page specified. Please provide a slug in the URL (e.g., ?slug=about).');
        showElement(errorElement);
        hideElement(bodyElement); // Hide the loading message
        return;
    }

    // 2. Clear previous errors and show loading state (optional)
    clearErrorMessage('page-error');
    hideElement(errorElement);
    titleElement.textContent = 'Loading...';
    bodyElement.innerHTML = '<p>Please wait...</p>';

    // 3. Fetch page content from the API
    try {
        const pageData = await fetchStaticPage(slug);

        // 4. Display the content
        titleElement.textContent = pageData.title;
        // IMPORTANT: Sanitize HTML content if it comes from untrusted sources (e.g., user input via admin panel)
        // For now, assuming content is safe or sanitized server-side.
        // If content might contain scripts, use DOMPurify or similar library before setting innerHTML.
        bodyElement.innerHTML = pageData.content; // Render HTML content
        document.title = `${pageData.title} - CryptaInfo`; // Update browser tab title

    } catch (error) {
        // 5. Handle errors (e.g., page not found)
        console.error(`Error fetching static page '${slug}':`, error);
        titleElement.textContent = 'Page Not Found';
        document.title = 'Page Not Found - CryptaInfo';
        displayErrorMessage('page-error', `Could not load the page '${slug}'. It might not exist or there was a server error.`);
        showElement(errorElement);
        hideElement(bodyElement); // Hide the loading message
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Update header navigation based on login status
    await checkAndCacheUserProfile();
    // Load the static page content
    await loadStaticPage();
});