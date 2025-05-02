// Header Navigation Logic
import { isLoggedIn, getUserProfileData } from './auth.js'; // Need auth state

/**
 * Updates the main navigation based on login status.
 */
export function updateHeaderNav() {
    const loginBtn = document.getElementById('nav-login-btn');
    const registerBtn = document.getElementById('nav-register-btn');
    const profileLink = document.getElementById('nav-profile-link');
    const logoutBtn = document.getElementById('nav-logout-btn');
    const adminLink = document.getElementById('nav-admin-link'); // Add admin link reference
    const userProfile = getUserProfileData(); // Get profile data if available

    if (isLoggedIn()) {
        loginBtn?.classList.add('hidden');
        registerBtn?.classList.add('hidden');
        profileLink?.classList.remove('hidden');
        logoutBtn?.classList.remove('hidden');

        // Update profile link text if profile data is available
        if (profileLink && userProfile?.nickname) {
            profileLink.textContent = `Hi, ${userProfile.nickname}`;
        } else if (profileLink) {
             profileLink.textContent = 'My Profile'; // Fallback
        }

        // Show admin link if user has admin privileges
        if (adminLink && userProfile?.is_admin) {
            adminLink.classList.remove('hidden');
        } else if (adminLink) {
            adminLink.classList.add('hidden');
        }

    } else {
        loginBtn?.classList.remove('hidden');
        registerBtn?.classList.remove('hidden');
        profileLink?.classList.add('hidden');
        logoutBtn?.classList.add('hidden');
        adminLink?.classList.add('hidden'); // Always hide admin link when logged out
    }
}
