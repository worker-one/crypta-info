
/**
 * Renders a star rating display with clickable stars.
 * @param {string|number} ratingString - The rating value (e.g., "4.5" or 4.5).
 * @param {number} maxStars - The maximum number of stars to display (default 5).
 * @param {boolean} interactive - Whether the stars should be interactive (for hover/click).
 * @returns {string} HTML string for the star rating, e.g., "★★★★☆ (4.5)".
 */
export function renderStarRating(ratingString, maxStars = 5, interactive = false) { // Changed exchangeId to interactive
    const rating = parseFloat(ratingString);
    if (isNaN(rating) || rating < 0) {
        return 'N/A'; // Return N/A if rating is not a valid number
    }

    let starsHtml = '';
    const simpleRoundedRating = Math.round(rating);
    
    const clickableClass = interactive ? 'clickable-star' : ''; // Use interactive flag
    
    // Create a container for stars to make hover effect targeting easier
    starsHtml = `<span class="stars-container" ${interactive ? 'data-interactive="true"' : ''}>`; // Use interactive flag
    
    for (let i = 1; i <= maxStars; i++) {
        // data-rating is always added for hover/click logic
        if (i <= simpleRoundedRating) {
            starsHtml += `<span class="star ${clickableClass}" data-rating="${i}">★</span>`; // Filled star
        } else {
            starsHtml += `<span class="star ${clickableClass}" data-rating="${i}">☆</span>`; // Empty star
        }
    }
    
    starsHtml += `</span>`;

    return `<span style="font-weight: bold; color: #007bff;">${rating.toFixed(1)}</span> ${starsHtml} <span class="numerical-rating"></span>`;
}



/**
 * Handles click on a star. Redirects to the review page with the selected rating.
 * @param {Event} event - The click event
 */
export function handleStarClick(event) { // Made non-async, removed direct submission
    const starElement = event.target.closest('.clickable-star');
    if (!starElement) return;
    
    const rating = parseInt(starElement.dataset.rating, 10);
    
    if (!rating || rating < 1 || rating > 5) {
        console.warn("Invalid rating clicked or star not properly configured:", rating);
        return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    const id = urlParams.get('id');


    if (!slug && !id) {
        console.error("Slug nor ID not found in current URL. Cannot redirect to reviews page with rating.");
        // Optionally, display an error message to the user or disable star clicking if slug is missing.
        return;
    }

    // get the item type from the URL or context: http://176.124.219.116:8080/exchanges/details.html?slug=exchange-slug
    // exchanges or books
    let itemType;
    if (window.location.pathname.includes('exchanges')) {
        itemType = 'exchanges';
    }
    else if (window.location.pathname.includes('books')) {
        itemType = 'books';
    }
    else {
        console.error("Unknown item type. Cannot redirect to reviews page with rating.");
        return;
    }

    let redirectUrl = null;
    if (slug) {
        // Construct the redirect URL, including a hash to scroll to the review form
        redirectUrl = `/${itemType}/reviews.html?slug=${slug}&rating=${rating}#add-review-section`;
    } else if (id) {
        // Construct the redirect URL, including a hash to scroll to the review form
        redirectUrl = `/${itemType}/reviews.html?id=${id}&rating=${rating}#add-review-section`;
    } else {
        console.error("Neither slug nor ID found in current URL. Cannot redirect to reviews page with rating.");
        return;
    }
    
    console.log(`Redirecting to: ${redirectUrl}`);
    window.location.href = redirectUrl;
}

/**
 * Handles hover on a star to preview rating.
 * @param {Event} event - The mouseover/focus event
 */
export function handleStarHover(event) {
    const starElement = event.target.closest('.clickable-star');
    if (!starElement) return;
    
    const starsContainer = starElement.closest('.stars-container');
    if (!starsContainer || starsContainer.getAttribute('data-interactive') !== 'true') return;
    
    const hoverRating = parseInt(starElement.dataset.rating, 10);
    const stars = starsContainer.querySelectorAll('.star');
    
    // Fill stars up to the hovered position
    stars.forEach((star, index) => {
        // +1 because index is 0-based but our ratings start at 1
        if (index + 1 <= hoverRating) {
            star.textContent = '★'; // Fill star
            star.classList.add('hovered');
        } else {
            star.textContent = '☆'; // Empty star
            star.classList.remove('hovered');
        }
    });
}

/**
 * Handles mouse leaving the star rating area to reset preview.
 * @param {Event} event - The mouseleave/blur event
 */
export function handleStarLeave(event) {
    const starsContainer = event.target.closest('.stars-container');
    if (!starsContainer || starsContainer.getAttribute('data-interactive') !== 'true') return;
    
    const stars = starsContainer.querySelectorAll('.star');
    
    // Reset to original state based on data attributes
    stars.forEach(star => {
        const ratingValue = parseInt(star.dataset.rating, 10);
        const exchangeId = star.dataset.exchangeId;
        
        // Get the parent stat-item to find the current actual rating
        const statItem = starsContainer.closest('.stat-item');
        let currentRating = 0;
        
        if (statItem) {
            const ratingText = statItem.querySelector('.value span').textContent;
            currentRating = Math.round(parseFloat(ratingText));
        }
        
        // Reset star appearance
        if (ratingValue <= currentRating) {
            star.textContent = '★'; // Filled star
        } else {
            star.textContent = '☆'; // Empty star
        }
        star.classList.remove('hovered');
    });
}

/**
 * Attaches all event handlers to clickable stars on the page.
 */
export function attachStarClickHandlers() {
    const stars = document.querySelectorAll('.clickable-star');
    stars.forEach(star => {
        // Remove existing listeners to prevent duplicates
        star.removeEventListener('click', handleStarClick);
        star.removeEventListener('mouseover', handleStarHover);
        star.removeEventListener('focus', handleStarHover);
        
        // Add click listener
        star.addEventListener('click', handleStarClick);
        
        // Add hover/focus listeners for rating preview
        star.addEventListener('mouseover', handleStarHover);
        star.addEventListener('focus', handleStarHover);
    });
    
    // Add mouseleave/blur handlers to star containers for resetting preview
    const starContainers = document.querySelectorAll('.stars-container[data-interactive="true"]');
    starContainers.forEach(container => {
        container.removeEventListener('mouseleave', handleStarLeave);
        container.addEventListener('mouseleave', handleStarLeave);
        
        // For accessibility: reset when focus leaves the container
        container.querySelectorAll('.star').forEach(star => {
            star.removeEventListener('blur', handleStarLeave);
            star.addEventListener('blur', (event) => {
                // Only reset if focus is moving outside the container
                if (!container.contains(event.relatedTarget)) {
                    handleStarLeave({ target: container });
                }
            });
        });
    });
}