// Table/Card View Toggle Logic

/**
 * Initialize table view toggle functionality
 * Sets up event listener on the toggle button to switch between table and card view
 * Also sets initial state based on screen size
 */
export function initTableViewToggle() {
    // const toggleBtn = document.getElementById('toggle-view-btn'); // Button might be hidden by default now
    // Find the relevant table and card containers based on the current page context
    // This might need adjustment if IDs are not consistent or if used on multiple pages
    const tableView = document.querySelector('.data-table:not(.hidden)') || document.getElementById('exchange-table') || document.getElementById('book-table');
    const cardView = document.querySelector('.card-list:not(.hidden)') || document.getElementById('exchange-card-container') || document.getElementById('book-card-container');


    // Check if essential elements exist
    if (!tableView || !cardView) {
        console.warn('Table/Card view elements not found for toggle initialization.');
        return;
    }

    // Helper functions to manage view state
    function toggleToCardView() {
        tableView.classList.add('hidden');
        cardView.classList.remove('hidden');
        console.log("Switched to Card View (responsive)");
    }

    function toggleToTableView() {
        tableView.classList.remove('hidden');
        cardView.classList.add('hidden');
        console.log("Switched to Table View (responsive)");
    }

    // Set initial state based on screen size
    const checkInitialView = () => {
        const isSmallScreen = window.innerWidth <= 767; // Breakpoint from CSS
        if (isSmallScreen) {
            toggleToCardView();
        } else {
            // Default to table view on larger screens
            toggleToTableView();
        }
    };

    // Add resize listener to handle responsive switching
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const isSmallScreen = window.innerWidth <= 767;
            // Check current state before toggling
            const isCurrentlyTable = !tableView.classList.contains('hidden');
            const isCurrentlyCard = !cardView.classList.contains('hidden');

            if (isSmallScreen && isCurrentlyTable) {
                toggleToCardView();
            } else if (!isSmallScreen && isCurrentlyCard) {
                toggleToTableView();
            }
            // No action needed if the view already matches the screen size
        }, 250);
    });

    // Set the initial view when the function runs
    checkInitialView();
}
