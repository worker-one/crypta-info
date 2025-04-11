import { checkAndCacheUserProfile, getUserProfileData, isLoggedIn } from './auth.js';
import * as api from './api.js';

// DOM Elements Cache (Good practice to query elements once)
const adminAuthCheckDiv = document.getElementById('admin-auth-check');
const adminContentDiv = document.getElementById('admin-content');
const exchangesTableBody = document.getElementById('exchangesTableBody');
const exchangesPaginationDiv = document.getElementById('exchangesPagination');
const exchangesTableContainer = document.getElementById('exchangesTableContainer'); // For loading state

const showAddFormBtn = document.getElementById('showAddFormBtn');
const addExchangeFormDiv = document.getElementById('addExchangeForm');
const addExchangeForm = document.getElementById('exchangeForm');
const cancelAddBtn = document.getElementById('cancelAddBtn');
const addFormErrorMessage = document.getElementById('formErrorMessage');
const addFormSuccessMessage = document.getElementById('formSuccessMessage');

const editExchangeFormContainer = document.getElementById('editExchangeFormContainer'); // Container for the edit form section
const editExchangeForm = document.getElementById('exchangeEditForm');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editFormErrorMessage = document.getElementById('editFormErrorMessage');
const editFormSuccessMessage = document.getElementById('editFormSuccessMessage');
const editingExchangeNameSpan = document.getElementById('editingExchangeName');

// State
let currentExchangesPage = 0;
const EXCHANGES_PER_PAGE = 10; // Or get from config

// --- Initialization ---
document.addEventListener('DOMContentLoaded', initializeAdminPanel);

async function initializeAdminPanel() {
    try {
        await checkAndCacheUserProfile(); // From auth.js
        const userProfile = getUserProfileData(); // From auth.js

        if (!userProfile || !userProfile.is_admin) {
            showAdminPermissionError();
            return;
        }

        // User is admin, show content and load data
        adminAuthCheckDiv.style.display = 'none';
        // adminContentDiv.style.display = 'block';

        setupEventListeners();
        loadExchanges(); // Initial load
        loadAdminUsers(); // Example: Load other sections
        loadPendingReviews(); // Example: Load other sections

    } catch (error) {
        console.error("Initialization failed:", error);
        showAdminPermissionError("Failed to verify permissions. Please try logging in again.");
    }
}

function showAdminPermissionError(message = "You don't have permission to access the admin panel.") {
     // adminContentDiv.style.display = 'none'; // Hide main content
     adminAuthCheckDiv.style.display = 'block'; // Ensure auth check div is visible
     adminAuthCheckDiv.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
            <p><a href="login.html">Please log in with an admin account</a></p>
        </div>
    `;
}

function setupEventListeners() {
    showAddFormBtn.addEventListener('click', showAddForm);
    cancelAddBtn.addEventListener('click', hideAddForm);
    addExchangeForm.addEventListener('submit', handleAddExchangeSubmit);

    cancelEditBtn.addEventListener('click', hideEditForm);
    editExchangeForm.addEventListener('submit', handleEditExchangeSubmit);

    // Event delegation for table actions (Edit/Delete)
    exchangesTableBody.addEventListener('click', handleTableActions);

     // Event delegation for pagination links
    exchangesPaginationDiv.addEventListener('click', handlePaginationClick);
}

// --- Exchange Loading & Display ---

function showLoadingState(container, message = "Loading...") {
     container.innerHTML = `<div class="loading">${message}</div>`;
}

function hideLoadingState(container) {
    const loadingDiv = container.querySelector('.loading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

async function loadExchanges(page = 0) {
    currentExchangesPage = page; // Update state
    showLoadingState(exchangesTableContainer, 'Loading exchanges...');
    exchangesTableBody.innerHTML = ''; // Clear previous content immediately
    exchangesPaginationDiv.innerHTML = ''; // Clear pagination

    try {
        const params = {
            skip: page * EXCHANGES_PER_PAGE,
            limit: EXCHANGES_PER_PAGE,
        };

        // Use the adminListExchanges function (defined in api.js)
        const response = await api.adminListExchanges(params);
        hideLoadingState(exchangesTableContainer);

        if (!response || !response.items) {
             throw new Error("Invalid response received from API.");
        }

        displayExchangesTable(response.items);
        setupPagination(response.total, EXCHANGES_PER_PAGE, page);

    } catch (error) {
        console.error("Failed to load exchanges:", error);
        hideLoadingState(exchangesTableContainer);
        exchangesTableBody.innerHTML =
            `<tr><td colspan="5" class="error-message">Error loading exchanges: ${error.message || 'Unknown error'}</td></tr>`;
    }
}

function displayExchangesTable(exchanges) {
    exchangesTableBody.innerHTML = ''; // Clear just in case

    if (!exchanges || exchanges.length === 0) {
        exchangesTableBody.innerHTML = '<tr><td colspan="5">No exchanges found.</td></tr>';
        return;
    }

    exchanges.forEach(exchange => {
        const row = document.createElement('tr');
        // Add data-label attributes for responsive CSS
        row.innerHTML = `
            <td data-label="Name">${escapeHtml(exchange.name)}</td>
            <td data-label="Slug">${escapeHtml(exchange.slug)}</td>
            <td data-label="Country ID">${exchange.registration_country_id ?? exchange.headquarters_country_id ?? 'N/A'}</td>
            <td data-label="KYC Type">${escapeHtml(exchange.kyc_type?.toUpperCase()) ?? 'N/A'}</td>
            <td data-label="Actions" class="action-buttons">
                <button class="secondary edit-btn" data-slug="${escapeHtml(exchange.slug)}" data-id="${exchange.id}">Edit</button>
                <button class="danger delete-btn" data-slug="${escapeHtml(exchange.slug)}" data-id="${exchange.id}" data-name="${escapeHtml(exchange.name)}">Delete</button>
            </td>
        `;
        exchangesTableBody.appendChild(row);
    });
}


function setupPagination(totalItems, limit, currentPage) {
    const totalPages = Math.ceil(totalItems / limit);
    exchangesPaginationDiv.innerHTML = ''; // Clear previous pagination

    if (totalPages <= 1) {
        return; // No pagination needed for 0 or 1 page
    }

     const pageInfo = document.createElement('div');
     pageInfo.classList.add('page-info');
     pageInfo.textContent = `Showing ${currentPage * limit + 1}-${Math.min((currentPage + 1) * limit, totalItems)} of ${totalItems} exchanges`;


    const pageLinks = document.createElement('div');
    pageLinks.classList.add('page-links');


    // Previous Button
    if (currentPage > 0) {
        const prevLink = document.createElement('a');
        prevLink.href = "#";
        prevLink.textContent = '« Prev';
        prevLink.dataset.page = currentPage - 1;
        pageLinks.appendChild(prevLink);
    } else {
         const prevSpan = document.createElement('span');
         prevSpan.textContent = '« Prev';
         prevSpan.style.opacity = '0.5';
         prevSpan.style.cursor = 'default';
         pageLinks.appendChild(prevSpan);
    }


    // Page Number Links (simplified version)
     const maxPagesToShow = 5;
     let startPage = Math.max(0, currentPage - Math.floor(maxPagesToShow / 2));
     let endPage = Math.min(totalPages - 1, startPage + maxPagesToShow - 1);
     if (endPage - startPage + 1 < maxPagesToShow) {
         startPage = Math.max(0, endPage - maxPagesToShow + 1);
     }


     if (startPage > 0) {
        const firstLink = document.createElement('a');
        firstLink.href = "#";
        firstLink.textContent = '1';
        firstLink.dataset.page = 0;
        pageLinks.appendChild(firstLink);
        if (startPage > 1) pageLinks.appendChild(document.createTextNode('...'));
     }


    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            const strong = document.createElement('strong');
            strong.textContent = i + 1;
            pageLinks.appendChild(strong);
        } else {
            const link = document.createElement('a');
            link.href = "#";
            link.textContent = i + 1;
            link.dataset.page = i;
            pageLinks.appendChild(link);
        }
    }

     if (endPage < totalPages - 1) {
        if (endPage < totalPages - 2) pageLinks.appendChild(document.createTextNode('...'));
        const lastLink = document.createElement('a');
        lastLink.href = "#";
        lastLink.textContent = totalPages;
        lastLink.dataset.page = totalPages - 1;
        pageLinks.appendChild(lastLink);
     }

    // Next Button
    if (currentPage < totalPages - 1) {
        const nextLink = document.createElement('a');
        nextLink.href = "#";
        nextLink.textContent = 'Next »';
        nextLink.dataset.page = currentPage + 1;
        pageLinks.appendChild(nextLink);
    } else {
         const nextSpan = document.createElement('span');
         nextSpan.textContent = 'Next »';
         nextSpan.style.opacity = '0.5';
         nextSpan.style.cursor = 'default';
         pageLinks.appendChild(nextSpan);
    }

    exchangesPaginationDiv.appendChild(pageLinks);
    exchangesPaginationDiv.appendChild(pageInfo);
}

function handlePaginationClick(event) {
    if (event.target.tagName === 'A' && event.target.dataset.page !== undefined) {
        event.preventDefault();
        const page = parseInt(event.target.dataset.page, 10);
        loadExchanges(page);
    }
}


// --- Form Handling ---

function showAddForm() {
    hideEditForm(); // Ensure edit form is hidden
    addExchangeFormDiv.style.display = 'block';
    addExchangeForm.reset(); // Clear previous inputs
    clearMessages(addFormErrorMessage, addFormSuccessMessage);
    addExchangeForm.scrollIntoView({ behavior: 'smooth' });
}

function hideAddForm() {
    addExchangeFormDiv.style.display = 'none';
    clearMessages(addFormErrorMessage, addFormSuccessMessage);
}

function showEditForm() {
    hideAddForm(); // Ensure add form is hidden
    editExchangeFormContainer.style.display = 'block';
    editExchangeForm.scrollIntoView({ behavior: 'smooth' });
}

function hideEditForm() {
    editExchangeFormContainer.style.display = 'none';
    clearMessages(editFormErrorMessage, editFormSuccessMessage);
}

function clearMessages(errorElement, successElement) {
    if(errorElement) errorElement.textContent = '';
    if(successElement) successElement.textContent = '';
    // Remove error classes from inputs if any
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
}

function displayMessage(element, message, isError = true) {
    element.textContent = message;
    element.style.display = 'block'; // Ensure it's visible
    // Optional: Add/remove CSS classes for styling
    element.classList.toggle('error-message', isError);
    element.classList.toggle('success-message', !isError);
}

function handleFormErrors(error, errorElement, formElement) {
     console.error("API Error:", error);
     let message = `Error: ${error.message || 'An unknown error occurred.'}`;

     // Check for validation errors (assuming FastAPI structure)
     if (error.status === 422 && error.data && error.data.detail) {
         message = 'Validation Error: ';
         const errorDetails = error.data.detail.map(err => {
            const fieldName = err.loc[err.loc.length - 1]; // Get the field name
             // Highlight the input field (optional)
             const input = formElement.querySelector(`[name="${fieldName}"]`);
             if (input) input.classList.add('input-error'); // Add a CSS class for styling
             return `${fieldName}: ${err.msg}`;
         }).join('; ');
         message += errorDetails;
     } else if (error.data && error.data.detail) { // Handle other FastAPI error details
        message = `Error: ${error.data.detail}`;
     }

     displayMessage(errorElement, message, true);
}

async function handleAddExchangeSubmit(event) {
    event.preventDefault();
    clearMessages(addFormErrorMessage, addFormSuccessMessage);
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';

    try {
        const formData = new FormData(addExchangeForm);
        const exchangeData = {
            name: formData.get('name'),
            slug: formData.get('slug'),
            logo_url: formData.get('logo_url') || null, // Handle empty string
            website_url: formData.get('website_url'),
            year_founded: formData.get('year_founded') ? parseInt(formData.get('year_founded')) : null,
            registration_country_id: formData.get('registration_country_id') ? parseInt(formData.get('registration_country_id')) : null,
            headquarters_country_id: formData.get('headquarters_country_id') ? parseInt(formData.get('headquarters_country_id')) : null,
            fee_structure_summary: formData.get('fee_structure_summary') || null,
            kyc_type: formData.get('kyc_type'), // Should be 'mandatory', 'optional', or 'none'
            maker_fee_min: formData.get('maker_fee_min') ? formData.get('maker_fee_min') : null, // Keep as string/decimal
            taker_fee_min: formData.get('taker_fee_min') ? formData.get('taker_fee_min') : null, // Keep as string/decimal
            has_p2p: formData.get('has_p2p') === 'on',
            // API Schema specific fields - add/remove as needed
            available_in_country_ids: [], // Need UI to manage these
            language_ids: [], // Need UI to manage these
            supported_fiat_currency_ids: [], // Need UI to manage these
        };

        // Basic Frontend Validation (Example)
        if (!exchangeData.name || !exchangeData.slug || !exchangeData.website_url || !exchangeData.kyc_type) {
            throw new Error("Required fields are missing.");
        }

        await api.adminCreateExchange(exchangeData); // Use function from api.js

        displayMessage(addFormSuccessMessage, 'Exchange created successfully!', false);
        setTimeout(() => {
            hideAddForm();
            loadExchanges(currentExchangesPage); // Refresh current page
        }, 1500);

    } catch (error) {
        handleFormErrors(error, addFormErrorMessage, addExchangeForm);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Exchange';
    }
}

async function handleEditExchangeSubmit(event) {
     event.preventDefault();
     clearMessages(editFormErrorMessage, editFormSuccessMessage);
     const submitButton = event.target.querySelector('button[type="submit"]');
     submitButton.disabled = true;
     submitButton.textContent = 'Updating...';

     const exchangeId = document.getElementById('edit_exchange_id').value; // Get ID
     const originalSlug = document.getElementById('edit_exchange_slug').value; // Get original Slug for API call if needed

    try {
        const formData = new FormData(editExchangeForm);
        const exchangeData = {
            name: formData.get('name'),
            slug: formData.get('slug'), // May need validation if slug changes
            logo_url: formData.get('logo_url') || null,
            website_url: formData.get('website_url'),
            year_founded: formData.get('year_founded') ? parseInt(formData.get('year_founded')) : null,
            registration_country_id: formData.get('registration_country_id') ? parseInt(formData.get('registration_country_id')) : null,
            headquarters_country_id: formData.get('headquarters_country_id') ? parseInt(formData.get('headquarters_country_id')) : null,
            fee_structure_summary: formData.get('fee_structure_summary') || null,
            kyc_type: formData.get('kyc_type'),
            maker_fee_min: formData.get('maker_fee_min') ? formData.get('maker_fee_min') : null,
            taker_fee_min: formData.get('taker_fee_min') ? formData.get('taker_fee_min') : null,
            has_p2p: formData.get('has_p2p') === 'on',
             // Add other updatable fields based on the actual API endpoint for updates
        };

        if (!exchangeId) throw new Error("Exchange ID is missing.");

        // Replace with the actual update function from api.js
        await api.adminUpdateExchange(exchangeId, exchangeData);

        displayMessage(editFormSuccessMessage, 'Exchange updated successfully!', false);
        setTimeout(() => {
            hideEditForm();
            loadExchanges(currentExchangesPage); // Refresh current page
        }, 1500);

    } catch (error) {
        handleFormErrors(error, editFormErrorMessage, editExchangeForm);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Update Exchange';
    }
}


// --- Table Actions (Edit/Delete) ---

function handleTableActions(event) {
    const target = event.target;

    if (target.classList.contains('edit-btn')) {
        const slug = target.dataset.slug;
        const id = target.dataset.id;
        prepareEditForm(slug, id);
    } else if (target.classList.contains('delete-btn')) {
        const slug = target.dataset.slug;
        const id = target.dataset.id;
        const name = target.dataset.name || slug; // Use name if available
        confirmDeleteExchange(slug, id, name);
    }
}

async function prepareEditForm(slug, id) {
    hideAddForm(); // Hide add form first
    showLoadingState(editExchangeFormContainer, 'Loading exchange details...');
    editExchangeFormContainer.style.display = 'block'; // Show container early
    editExchangeForm.style.display = 'none'; // Hide form until data is loaded

    try {
        // Get the exchange details
        const exchange = await api.getExchangeDetails(slug); // Using the API function
        if (!exchange) throw new Error("Exchange not found.");

        // Populate the edit form
        document.getElementById('edit_exchange_id').value = exchange.id; // Use ID
        document.getElementById('edit_exchange_slug').value = exchange.slug;
        document.getElementById('edit_name').value = exchange.name;
        document.getElementById('edit_slug').value = exchange.slug; // Allow editing slug
        document.getElementById('edit_logo_url').value = exchange.logo_url || '';
        document.getElementById('edit_website_url').value = exchange.website_url || '';
        document.getElementById('edit_year_founded').value = exchange.year_founded || '';
        document.getElementById('edit_registration_country_id').value = exchange.registration_country_id || '';
        document.getElementById('edit_headquarters_country_id').value = exchange.headquarters_country_id || '';
        document.getElementById('edit_fee_structure_summary').value = exchange.fee_structure_summary || '';
        document.getElementById('edit_kyc_type').value = exchange.kyc_type || 'mandatory';
        document.getElementById('edit_maker_fee_min').value = exchange.maker_fee_min || '';
        document.getElementById('edit_taker_fee_min').value = exchange.taker_fee_min || '';
        document.getElementById('edit_has_p2p').checked = exchange.has_p2p || false;
        editingExchangeNameSpan.textContent = `(${exchange.name})`; // Show which exchange is being edited

        hideLoadingState(editExchangeFormContainer); // Hide loading indicator
        editExchangeForm.style.display = 'grid'; // Show the form (use 'grid' or 'block' as per CSS)
        showEditForm(); // Ensure scrolling and visibility

    } catch (error) {
        console.error("Failed to load exchange details for editing:", error);
        hideLoadingState(editExchangeFormContainer); // Hide loading even on error
        displayMessage(editFormErrorMessage, `Error loading details: ${error.message}`, true);
    }
}

function confirmDeleteExchange(slug, id, name) {
    // Use a more robust confirmation dialog if possible (e.g., a modal)
    if (confirm(`Are you sure you want to delete the exchange "${name}" (Slug: ${slug})? This action cannot be undone.`)) {
        deleteExchangeAndRefresh(slug, id);
    }
}

async function deleteExchangeAndRefresh(slug, id) {
     const deleteButton = exchangesTableBody.querySelector(`.delete-btn[data-id="${id}"]`);
     if(deleteButton) {
        deleteButton.disabled = true;
        deleteButton.textContent = 'Deleting...';
     }
    try {
        // Delete the exchange using the API function
        await api.adminDeleteExchange(id);

        // Use a temporary success message system if needed (e.g., a toast notification)
        alert(`Exchange "${slug}" deleted successfully!`); // Simple alert for now
        loadExchanges(currentExchangesPage); // Refresh the list

    } catch (error) {
        console.error("Failed to delete exchange:", error);
        alert(`Error deleting exchange: ${error.message || 'Unknown error'}`);
         if(deleteButton) { // Re-enable button on error
             deleteButton.disabled = false;
             deleteButton.textContent = 'Delete';
         }
    }
}

// --- Other Admin Sections (Placeholders) ---

async function loadAdminUsers() {
    const container = document.getElementById('userList');
    if (!container) return; // Skip if container doesn't exist
    
    showLoadingState(container, 'Loading users...');
    try {
        const users = await api.adminListUsers();
        // Render users...
        container.innerHTML = `<p>Found ${users.length} users. (Display logic not implemented)</p>`;
        // TODO: Implement user table rendering and actions (e.g., block)
    } catch (error) {
        console.error("Failed to load users:", error);
        container.innerHTML = `<p class="error-message">Error loading users: ${error.message}</p>`;
    }
}

async function loadPendingReviews() {
    const container = document.getElementById('pendingReviewsList');
    if (!container) return; // Skip if container doesn't exist
    
    showLoadingState(container, 'Loading pending reviews...');
    try {
        const reviewsResponse = await api.adminListPendingReviews({ limit: 5 });
        // Render pending reviews...
        container.innerHTML = `<p>Found ${reviewsResponse.total} pending reviews. (Display logic not implemented)</p>`;
        // TODO: Implement review list rendering and moderation actions (Approve/Reject)
    } catch (error) {
        console.error("Failed to load pending reviews:", error);
        container.innerHTML = `<p class="error-message">Error loading reviews: ${error.message}</p>`;
    }
}


// --- Utility Functions ---
function escapeHtml(unsafe) {
    if (unsafe === null || typeof unsafe === 'undefined') return '';
    return unsafe
         .toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#39;");
}