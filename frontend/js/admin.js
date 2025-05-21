// Import necessary functions from api.js
import {
    getUserProfile,
    adminListExchanges, // Use admin version for the admin panel
    getExchangeDetails, // Use public version to get details for editing
    adminCreateExchange,
    adminUpdateExchange,
    adminDeleteExchange,
    adminListPendingReviews,
    adminModerateReview, // Use the correct function for moderation
    getItemDetails // Import getItemDetails
} from './api.js'; // Corrected imports
// Import the function responsible for checking login and updating the header
import { checkAndCacheUserProfile } from './auth.js';

document.addEventListener('DOMContentLoaded', async function() {
    // First, check login status and update the header navigation accordingly
    // This function from auth.js handles fetching/caching the profile and calling updateHeaderNav
    await checkAndCacheUserProfile();

    // Then, perform the admin-specific access check
    checkAdminAccess(); // This is called on page load
});

async function checkAdminAccess() {
    const adminAuthCheckElement = document.getElementById('admin-auth-check');
    const adminContentElement = document.getElementById('admin-content');

    // Hide main content initially
    if (adminContentElement) adminContentElement.style.display = 'none';
    if (adminAuthCheckElement) adminAuthCheckElement.innerHTML = '<p>Checking admin permissions...</p>';

    try {
        // Fetch the user's profile data using the function from api.js
        const userData = await getUserProfile(); // This requires a valid token

        if (userData && userData.is_admin) {
            // User is an admin
            console.log('Admin access verified.');
            if (adminAuthCheckElement) adminAuthCheckElement.style.display = 'none'; // Hide the check message
            if (adminContentElement) adminContentElement.style.display = 'block'; // Show the admin content
            // Proceed to load admin-specific data (like exchanges, reviews)
            loadExchangesTable();
            // Load pending reviews if the container exists
            if (document.getElementById('pendingReviewsList')) { // Adjusted ID based on HTML structure
                loadPendingReviews();
            }
            setupEventListeners(); // Setup listeners only after confirming admin access
        } else {
            // User is logged in but not an admin
            console.warn('User is not an admin. Redirecting.');
            if (adminAuthCheckElement) adminAuthCheckElement.innerHTML = '<p class="error-message">Access Denied: You do not have administrator privileges. Redirecting...</p>';
            // Redirect non-admins after a short delay
            setTimeout(() => { window.location.href = '/'; }, 2000);
        }
    } catch (error) {
        // Error fetching profile, likely means not logged in or token expired/invalid
        console.error('Authentication error or access check failed:', error);
        if (adminAuthCheckElement) adminAuthCheckElement.innerHTML = '<p class="error-message">Authentication Required. Redirecting to login...</p>';
        // Redirect to login if not authenticated or another error occurs
        setTimeout(() => { window.location.href = '/login.html'; }, 2000);
    }
}

async function loadExchangesTable() {
    try {
        const exchangesContainer = document.getElementById('exchangesTableBody');
        if (!exchangesContainer) return;

        exchangesContainer.innerHTML = '<tr><td colspan="6" class="text-center">Loading exchanges...</td></tr>';

        // Use adminListExchanges from api.js
        // Pass pagination parameters if needed, e.g., { limit: 50 }
        const response = await adminListExchanges({ limit: 50 }); // Example: load more initially
        const exchanges = response.items;

        if (exchanges && exchanges.length > 0) {
            exchangesContainer.innerHTML = '';
            exchanges.forEach(exchange => {
                const row = document.createElement('tr');
                // Assuming the delete/edit buttons should use ID if the API strictly requires it.
                // If the API can handle slugs for DELETE/PATCH admin routes, keep data-slug.
                // Let's assume slug is the identifier used in admin routes based on previous context.
                row.innerHTML = `
                    <td>${exchange.id}</td>
                    <td>
                        <img src="${exchange.logo_url || '/assets/images/logo-placeholder.png'}" alt="${exchange.name}" class="exchange-logo" width="30">
                        ${exchange.name}
                    </td>
                    <td>${exchange.slug}</td>
                    <td>${exchange.rating || 'N/A'}</td>
                    <td>${exchange.total_review_count}</td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-exchange" data-slug="${exchange.slug}">Edit</button>
                        <button class="btn btn-sm btn-danger delete-exchange" data-slug="${exchange.slug}">Delete</button>
                    </td>
                `;
                exchangesContainer.appendChild(row);
            });
            addExchangeButtonListeners();
        } else {
            exchangesContainer.innerHTML = '<tr><td colspan="6" class="text-center">No exchanges found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading exchanges:', error);
        const exchangesContainer = document.getElementById('exchanges-table-body');
        if(exchangesContainer) {
            exchangesContainer.innerHTML =
                '<tr><td colspan="6" class="text-center text-danger">Error loading exchanges</td></tr>';
        }
    }
}

function addExchangeButtonListeners() {
    document.querySelectorAll('.edit-exchange').forEach(button => {
        button.removeEventListener('click', handleEditClick); // Prevent duplicate listeners
        button.addEventListener('click', handleEditClick);
    });

    document.querySelectorAll('.delete-exchange').forEach(button => {
        button.removeEventListener('click', handleDeleteClick); // Prevent duplicate listeners
        button.addEventListener('click', handleDeleteClick);
    });
}

// Define handlers separately to easily remove listeners
function handleEditClick() {
    const slug = this.getAttribute('data-slug');
    editExchange(slug);
}

function handleDeleteClick() {
    const slug = this.getAttribute('data-slug');
    // Fetch the name or use slug for confirmation message
    const exchangeName = this.closest('tr')?.cells[1]?.textContent?.trim() || slug;
    if (confirm(`Are you sure you want to delete the exchange "${exchangeName}"?`)) {
        deleteExchange(slug);
    }
}

async function editExchange(slug) {
    try {
        // Use getExchangeDetails from api.js
        const exchange = await getExchangeDetails(slug);

        const editForm = document.getElementById('edit-exchange-form');
        const modalElement = document.getElementById('edit-exchange-modal'); // Get the modal element itself

        if (editForm && modalElement) {
            // Populate form fields
            editForm.querySelector('[name="id"]').value = exchange.id; // Store ID if needed for update, though API uses slug/id in URL
            editForm.querySelector('[name="name"]').value = exchange.name;
            editForm.querySelector('[name="slug"]').value = exchange.slug;
            editForm.querySelector('[name="website_url"]').value = exchange.website_url || '';
            editForm.querySelector('[name="logo_url"]').value = exchange.logo_url || '';
            editForm.querySelector('[name="Описание"]').value = exchange.Описание || '';
            // Add other fields as necessary

            // Show the modal using Bootstrap's JavaScript API if available, or fallback
            if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                 const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
                 modal.show();
            } else {
                modalElement.classList.add('show'); // Fallback basic show
                modalElement.style.display = 'block'; // Ensure visibility
            }
        } else {
             console.error("Edit form or modal not found");
             alert('Could not find the edit form.');
        }
    } catch (error) {
        console.error('Error fetching exchange details for edit:', error);
        alert('Could not load exchange details. Please try again.');
    }
}

async function deleteExchange(slug) {
    try {
        // Use adminDeleteExchange from api.js
        // Pass the slug as the identifier (assuming API handles slug for deletion)
        await adminDeleteExchange(slug);
        alert('Exchange deleted successfully!');
        loadExchangesTable(); // Refresh the table
    } catch (error) {
        console.error('Error deleting exchange:', error);
        alert(`Failed to delete exchange: ${error.message || 'Please try again.'}`);
    }
}

function setupEventListeners() {
    const createExchangeForm = document.getElementById('create-exchange-form');
    if (createExchangeForm) {
        createExchangeForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const exchangeData = Object.fromEntries(formData.entries());

            // Basic validation example (add more as needed)
            if (!exchangeData.name || !exchangeData.slug) {
                alert('Name and Slug are required.');
                return;
            }

            try {
                // Use adminCreateExchange from api.js
                await adminCreateExchange(exchangeData);
                alert('Exchange created successfully!');
                this.reset();
                loadExchangesTable(); // Refresh the table
                // Optionally close a modal if the form is in one
            } catch (error) {
                console.error('Error creating exchange:', error);
                alert(`Failed to create exchange: ${error.message || 'Please check the form and try again.'}`);
            }
        });
    }

    const editExchangeForm = document.getElementById('edit-exchange-form');
    if (editExchangeForm) {
        editExchangeForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const exchangeData = Object.fromEntries(formData.entries());
            const identifier = exchangeData.slug || exchangeData.id; // Use slug or ID based on what your API expects in the URL

            if (!identifier) {
                alert('Cannot update exchange without slug or ID.');
                return;
            }
             // Remove identifier from payload if it's only needed for the URL
            // delete exchangeData.id;
            // delete exchangeData.slug; // Keep slug if it's part of the updatable data

            try {
                // Use adminUpdateExchange from api.js
                await adminUpdateExchange(identifier, exchangeData);
                alert('Exchange updated successfully!');

                // Hide the modal using Bootstrap's API if available
                const modalElement = document.getElementById('edit-exchange-modal');
                 if (modalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) modal.hide();
                 } else if (modalElement) {
                    modalElement.classList.remove('show'); // Fallback basic hide
                    modalElement.style.display = 'none';
                 }

                loadExchangesTable(); // Refresh the table
            } catch (error) {
                console.error('Error updating exchange:', error);
                alert(`Failed to update exchange: ${error.message || 'Please check the form and try again.'}`);
            }
        });
    }

    // Setup listener for reviews tab if it exists
    const reviewsTab = document.querySelector('[data-bs-toggle="tab"][href="#pending-reviews"], #pending-reviews-tab'); // More robust selector
    if (reviewsTab) {
        reviewsTab.addEventListener('shown.bs.tab', loadPendingReviews); // Use Bootstrap event if applicable
        // If not using Bootstrap tabs, ensure loadPendingReviews is called appropriately
    }
}

async function loadPendingReviews() {
    const reviewsContainer = document.getElementById('pendingReviewsList'); // Use the correct ID from admin.html
    if (!reviewsContainer) {
        console.warn("Pending reviews container ('pendingReviewsList') not found.");
        return;
    }

    try {
        reviewsContainer.innerHTML = '<div class="text-center p-3">Loading pending reviews...</div>';

        // Use adminListPendingReviews from api.js
        const response = await adminListPendingReviews({ limit: 20 }); // Example pagination
        const reviews = response.items;

        if (reviews && reviews.length > 0) {
            reviewsContainer.innerHTML = ''; // Clear loading state

            // Use Promise.all to fetch item details concurrently
            const reviewPromises = reviews.map(async (review) => {
                let itemName = 'Unknown Item';
                try {
                    // Fetch item details using the item_id from the review
                    const itemDetails = await getItemDetails(review.item_id);
                    itemName = itemDetails?.name || `Item ID ${review.item_id}`; // Use item name or fallback
                } catch (itemError) {
                    console.error(`Error fetching details for item ${review.item_id}:`, itemError);
                    itemName = `Item ID ${review.item_id} (Error loading name)`;
                }

                const reviewElement = document.createElement('div');
                reviewElement.classList.add('card', 'mb-3', 'review-item');

                const reviewDate = new Date(review.created_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                });

                reviewElement.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">Review for: ${itemName} (#${review.id})</h5>
                        <h6 class="card-subtitle mb-2 text-muted">Submitted by: ${review.user?.nickname || 'Unknown User'} on ${reviewDate}</h6>
                        <p class="card-text comment-preview">${review.comment}</p>
                        <p class="card-text mb-1"><strong>Rating:</strong> <span class="review-rating">${review.rating || 'N/A'}</span>/5</p>
                        <p class="card-text"><strong>Current Status:</strong> <span class="status-${review.moderation_status}">${review.moderation_status}</span></p>
                    </div>
                    <div class="card-footer review-actions text-end">
                        <button class="btn btn-sm btn-success approve-review me-2" data-id="${review.id}">Approve</button>
                        <button class="btn btn-sm btn-danger reject-review" data-id="${review.id}">Reject</button>
                    </div>
                `;
                return reviewElement; // Return the created element
            });

            // Wait for all promises to resolve
            const reviewElements = await Promise.all(reviewPromises);
            // Append all elements to the container
            reviewElements.forEach(element => reviewsContainer.appendChild(element));

            addReviewButtonListeners(); // Add listeners after elements are in the DOM
        } else {
            reviewsContainer.innerHTML = '<div class="alert alert-info">No pending reviews found.</div>';
        }
    } catch (error) {
        console.error('Error loading pending reviews:', error);
        reviewsContainer.innerHTML =
            '<div class="alert alert-danger">Error loading pending reviews. Please try again later.</div>';
    }
}

function addReviewButtonListeners() {
    document.querySelectorAll('.approve-review').forEach(button => {
        button.removeEventListener('click', handleApproveClick); // Prevent duplicates
        button.addEventListener('click', handleApproveClick);
    });

    document.querySelectorAll('.reject-review').forEach(button => {
        button.removeEventListener('click', handleRejectClick); // Prevent duplicates
        button.addEventListener('click', handleRejectClick);
    });
}

// Define handlers separately
function handleApproveClick() {
    const reviewId = this.getAttribute('data-id');
    moderateReview(reviewId, 'approved');
}

function handleRejectClick() {
    const reviewId = this.getAttribute('data-id');
    // Optionally prompt for rejection reason/notes
    // const notes = prompt("Enter rejection notes (optional):");
    moderateReview(reviewId, 'rejected' /*, notes */);
}

async function moderateReview(reviewId, status, notes = null) {
    try {
        const payload = { moderation_status: status };
        if (notes) {
            payload.moderator_notes = notes;
        }
        // Use adminModerateReview from api.js
        await adminModerateReview(reviewId, payload);

        alert(`Review ${status} successfully!`);
        loadPendingReviews(); // Refresh the list
    } catch (error) {
        console.error(`Error setting review status to ${status}:`, error);
        alert(`Failed to ${status} review: ${error.message || 'Please try again.'}`);
    }
}

// --- Helper functions (if needed, e.g., for Bootstrap modals) ---
// Ensure Bootstrap's JS is loaded if you use its components/events like shown above.