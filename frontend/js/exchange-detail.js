// Exchange Detail Page Logic
import { getExchangeDetails, submitExchangeReview } from './api.js';
import { updateHeaderNav, displayErrorMessage } from './ui.js';
import { isLoggedIn } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Update navigation based on login status
    updateHeaderNav();
    
    // Get the exchange slug from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

    // Get DOM elements
    const loadingElement = document.getElementById('exchange-detail-loading');
    const errorElement = document.getElementById('exchange-detail-error');
    const detailContainer = document.getElementById('exchange-detail');
    const breadcrumbExchangeName = document.getElementById('exchange-name-breadcrumb');
    const reviewSection = document.getElementById('review-section');
    const addReviewSection = document.getElementById('add-review-section');

    if (!slug) {
        errorElement.textContent = 'No exchange slug provided.';
        errorElement.classList.add('visible');
        loadingElement.classList.add('hidden');
        return;
    }

    try {
        // Fetch exchange details
        const exchange = await getExchangeDetails(slug);
        console.log("Exchange details:", exchange); // Debugging
        
        // Hide loading, show content
        loadingElement.classList.add('hidden');
        detailContainer.classList.remove('hidden');
        
        // Update page title and breadcrumb
        document.title = `${exchange.name} - Crypta.Info`;
        breadcrumbExchangeName.textContent = exchange.name;

        // Build the HTML for the exchange details with improved layout
        detailContainer.innerHTML = `
            <div class="logo">
                <img src="${exchange.logo_url || 'assets/images/logo-placeholder.png'}" alt="${exchange.name} Logo">
            </div>
            <h1>${exchange.name}</h1>
            
            <p class="description">${exchange.description || 'No description available for this exchange.'}</p>
            
            <div class="stats-overview">
                <div class="stat-item">
                    <div class="value">${exchange.overall_average_rating ? parseFloat(exchange.overall_average_rating).toFixed(1) + ' ★' : 'N/A'}</div>
                    <div class="label">Overall Rating</div>
                </div>
                <div class="stat-item">
                    <div class="value">${exchange.total_review_count || '0'}</div>
                    <div class="label">Total Reviews</div>
                </div>
                <div class="stat-item">
                    <div class="value">${exchange.trading_volume_24h ? '$' + parseFloat(exchange.trading_volume_24h).toLocaleString() : 'N/A'}</div>
                    <div class="label">24h Volume</div>
                </div>
                <div class="stat-item">
                    <div class="value">${exchange.year_founded || 'N/A'}</div>
                    <div class="label">Year Founded</div>
                </div>
            </div>
            
            <div class="details">
                <div class="detail-card">
                    <h3>Basic Information</h3>
                    <p><strong>Registration Country:</strong> ${exchange.registration_country?.name || 'N/A'}</p>
                    <p><strong>Website:</strong> <a href="${exchange.url}" target="_blank" rel="noopener noreferrer">${exchange.url}</a></p>
                    <p><strong>KYC Type:</strong> ${exchange.kyc_type || 'N/A'}</p>
                    <p>
                        <strong>P2P Available:</strong>
                        ${exchange.has_p2p ? '<span class="available">Yes</span>' : '<span class="unavailable">No</span>'}
                    </p>
                </div>
                
                <div class="detail-card">
                    <h3>Fee Structure</h3>
                    <p><strong>Maker Fee:</strong> ${exchange.maker_fee ? parseFloat(exchange.maker_fee).toFixed(4) * 100 + '%' : 'N/A'}</p>
                    <p><strong>Taker Fee:</strong> ${exchange.taker_fee ? parseFloat(exchange.taker_fee).toFixed(4) * 100 + '%' : 'N/A'}</p>
                    <p><strong>Withdrawal Fee:</strong> ${exchange.withdrawal_fee ? exchange.withdrawal_fee : 'Varies by cryptocurrency'}</p>
                    <p><strong>Deposit Methods:</strong> ${exchange.deposit_methods || 'Information not available'}</p>
                </div>
                
                ${exchange.license_details && exchange.license_details.length > 0 ? `
                    <div class="detail-card">
                        <h3>Regulatory Information</h3>
                        <ul>
                            ${exchange.license_details.map(license => `
                                <li><strong>${license.country.name}:</strong> ${license.license_number}</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <div class="detail-card">
                    <h3>Supported Fiats</h3>
                    ${exchange.supported_fiats && exchange.supported_fiats.length > 0 ? `
                        <ul>
                            ${exchange.supported_fiats.map(fiat => `
                                <li>${fiat.name} (${fiat.code})</li>
                            `).join('')}
                        </ul>
                    ` : '<p>No supported fiats information available.</p>'}
                </div>
                
                <div class="detail-card">
                    <h3>Supported Languages</h3>
                    ${exchange.supported_languages && exchange.supported_languages.length > 0 ? `
                        <ul>
                            ${exchange.supported_languages.map(lang => `
                                <li>${lang.name}</li>
                            `).join('')}
                        </ul>
                    ` : '<p>No supported languages information available.</p>'}
                </div>
            </div>
        `;

        // Show review section
        reviewSection.classList.remove('hidden');
        
        // Show "Add Review" section only for logged-in users
        if (isLoggedIn()) {
            addReviewSection.classList.remove('hidden');
            // Set up review form submission
            setupReviewForm(exchange.id);
        }
        
        // Load exchange reviews (this would be implemented when the backend supports it)
        // loadExchangeReviews(exchange.id);

    } catch (error) {
        console.error("Error fetching exchange details:", error);
        loadingElement.classList.add('hidden');
        errorElement.textContent = error.message || 'Failed to load exchange details. Please try again later.';
        errorElement.classList.add('visible');
    }
});

function setupReviewForm(exchangeId) {
    const reviewForm = document.getElementById('review-form');
    const errorElement = document.getElementById('review-submit-error');
    const successElement = document.getElementById('review-submit-success');
    
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Clear previous messages
            errorElement.textContent = '';
            errorElement.classList.remove('visible');
            successElement.textContent = '';
            successElement.classList.remove('visible');
            
            // Get form data
            const rating = document.querySelector('input[name="rating"]:checked')?.value;
            const reviewText = document.getElementById('review-text').value;
            
            if (!rating) {
                displayErrorMessage('review-submit-error', 'Please select a rating.');
                return;
            }
            
            if (!reviewText.trim()) {
                displayErrorMessage('review-submit-error', 'Please enter your review.');
                return;
            }
            
            try {
                await submitExchangeReview(exchangeId, { rating, text: reviewText });
                successElement.textContent = 'Your review has been submitted and is pending moderation.';
                successElement.classList.add('visible');
                reviewForm.reset();
            } catch (error) {
                displayErrorMessage('review-submit-error', error.message);
            }
        });
    }
}

// This function would be implemented when the backend supports it
function loadExchangeReviews(exchangeId) { 
    const reviewsList = document.getElementById('reviews-list');
    const loadingElement = document.getElementById('reviews-loading');
    const errorElement = document.getElementById('reviews-error');
    
    // Show loading message
    loadingElement.classList.remove('hidden');
    
    // In a real implementation, you would fetch reviews from the API
    // For now, just display a placeholder message
    setTimeout(() => {
        loadingElement.classList.add('hidden');
        reviewsList.innerHTML = '<p>Review functionality will be available soon.</p>';
    }, 1000);
}