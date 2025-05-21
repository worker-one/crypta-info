import { getBookDetails } from '../api.js';
import { updateHeaderNav } from '../header.js';
import { handleLogout } from '../auth.js';
import { displayErrorMessage, clearErrorMessage } from '../renderUtils.js';

const showElement = (el) => el?.classList.remove('hidden');
const hideElement = (el) => el?.classList.add('hidden');

/**
 * Updates the UI elements on the page with book data.
 * @param {object} book - The book data object.
 */
function updatePageUI(book) {
    const bookNameHeading = document.getElementById('book-name-heading');
    const bookLinkBreadcrumb = document.getElementById('book-link-breadcrumb');
    
    document.title = `Где купить ${book.name} - Crypta.Info`;

    if (bookNameHeading) {
        bookNameHeading.textContent = `Где купить книгу "${book.name}"`;
    }
    if (bookLinkBreadcrumb) {
        bookLinkBreadcrumb.textContent = book.name;
        bookLinkBreadcrumb.href = `details.html?id=${book.id}`;
    }

    // Tab links are set by inline script in buy.html, but ensure active states are correct if needed.
    // For buy.html, 'tab-buy' should have 'active' class from HTML.
}

/**
 * Renders the purchase links for the book.
 * @param {Array<object>} purchaseLinks - Array of purchase link objects.
 * @param {string} bookName - The name of the book.
 */
function renderPurchaseLinks(purchaseLinks, bookName) {
    const linksList = document.getElementById('buy-links-list');
    const noLinksMessage = document.getElementById('no-buy-links');
    const loadingIndicator = document.getElementById('buy-content-loading');
    const errorContainer = document.getElementById('buy-content-error');

    hideElement(loadingIndicator);
    clearErrorMessage(errorContainer); // Assuming errorContainer is the ID for displayErrorMessage

    if (!linksList || !noLinksMessage) {
        console.error('Purchase links container or message element not found.');
        displayErrorMessage('buy-content-error', 'Could not display purchase links section.');
        showElement(errorContainer);
        return;
    }

    linksList.innerHTML = ''; // Clear existing links

    if (purchaseLinks && purchaseLinks.length > 0) {
        purchaseLinks.forEach(link => {
            const listItem = document.createElement('li');
            const anchor = document.createElement('a');
            anchor.href = link.url;
            anchor.textContent = link.store || 'Link'; // Use store name or 'Link' as fallback
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
            listItem.appendChild(anchor);
            if (link.price) {
                const priceSpan = document.createElement('span');
                priceSpan.textContent = ` - ${link.price}`; // Assuming price format
                listItem.appendChild(priceSpan);
            }
            linksList.appendChild(listItem);
        });
        hideElement(noLinksMessage);
        showElement(linksList);
    } else {
        noLinksMessage.textContent = `Информация о местах покупки книги "${bookName}" отсутствует.`;
        showElement(noLinksMessage);
        hideElement(linksList);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Book 'Where to Buy' page DOMContentLoaded.");

    updateHeaderNav();

    const logoutBtn = document.getElementById('nav-logout-btn');
    logoutBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        handleLogout();
    });

    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');

    const pageLoadingIndicator = document.getElementById('page-loading');
    const pageErrorContainer = document.getElementById('page-error');
    const buySectionContainer = document.getElementById('buy-section');
    const buyContentLoading = document.getElementById('buy-content-loading');

    if (!bookId) {
        displayErrorMessage('page-error', 'Cannot load page: Book ID is missing.');
        showElement(pageErrorContainer);
        hideElement(pageLoadingIndicator);
        hideElement(buySectionContainer);
        const bookNameHeading = document.getElementById('book-name-heading');
        if (bookNameHeading) bookNameHeading.textContent = 'Ошибка: ID книги отсутствует';
        return;
    }

    showElement(pageLoadingIndicator);
    hideElement(pageErrorContainer);
    showElement(buyContentLoading);

    try {
        const book = await getBookDetails(bookId);
        hideElement(pageLoadingIndicator);

        if (!book || !book.id) {
            throw new Error(`Book with ID "${bookId}" not found.`);
        }

        updatePageUI(book);
        renderPurchaseLinks(book.purchase_links, book.name); // Assuming purchase_links is part of book object

        showElement(buySectionContainer);

    } catch (error) {
        console.error('Failed to initialize book buy page:', error);
        hideElement(pageLoadingIndicator);
        hideElement(buyContentLoading);
        displayErrorMessage('page-error', `Error loading book data: ${error.message}`);
        showElement(pageErrorContainer);
        hideElement(buySectionContainer);
        const bookNameHeading = document.getElementById('book-name-heading');
        if (bookNameHeading) bookNameHeading.textContent = 'Ошибка загрузки информации о книге';
    }
});
