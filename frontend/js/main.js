// Main Application Logic for Login/Register Pages
import { handleLogin, handleRegister } from './auth.js';
import { displayErrorMessage } from './ui.js'; // Import only necessary UI functions

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed - main.js");

    const pathname = window.location.pathname;

    // == Login Page Logic ==
    if (pathname.endsWith('/login.html')) { // Use endsWith for flexibility
        console.log("On login page");
        const loginForm = document.getElementById('login-form');
        const submitButton = document.getElementById('login-submit-btn');

        loginForm?.addEventListener('submit', async (event) => {
            event.preventDefault(); // Stop browser's default form submission
            console.log("Login form submitted");

            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const errorElementId = 'login-error-message'; // Target div for errors

            if (emailInput && passwordInput && submitButton) {
                const email = emailInput.value;
                const password = passwordInput.value;

                // Visual feedback: Disable button
                submitButton.disabled = true;
                submitButton.textContent = 'Logging in...';

                // Call the core login handler
                await handleLogin(email, password, errorElementId);

                // Re-enable button ONLY if login failed and we are still on the page
                const currentButton = document.getElementById('login-submit-btn');
                if (currentButton) { // Check if element still exists (might have navigated away)
                    currentButton.disabled = false;
                    currentButton.textContent = 'Login';
                }
            } else {
                console.error("Login form elements not found!");
                // Display a generic error if elements are missing
                displayErrorMessage(errorElementId, "Form elements missing. Cannot log in.");
            }
        });
    }

    // == Register Page Logic ==
    if (pathname.endsWith('/register.html')) { // Use endsWith for flexibility
        console.log("On register page");
        const registerForm = document.getElementById('register-form');
        const submitButton = document.getElementById('register-submit-btn');
        const passwordInput = document.getElementById('password');
        const passwordConfirmInput = document.getElementById('password-confirm');
        const passwordMatchError = document.getElementById('password-match-error');

        // Basic client-side password match validation
        const validatePasswordMatch = () => {
            if (!passwordInput || !passwordConfirmInput || !passwordMatchError) return true; // Elements not found, skip validation

            if (passwordInput.value !== passwordConfirmInput.value && passwordConfirmInput.value.length > 0) {
                passwordMatchError.textContent = 'Passwords do not match.';
                passwordMatchError.classList.add('visible');
                return false;
            } else {
                passwordMatchError.textContent = '';
                passwordMatchError.classList.remove('visible');
                return true;
            }
        };

        passwordInput?.addEventListener('input', validatePasswordMatch);
        passwordConfirmInput?.addEventListener('input', validatePasswordMatch);

        registerForm?.addEventListener('submit', async (event) => {
            event.preventDefault();
            console.log("Register form submitted");

            // Perform final password match check before submitting
            if (!validatePasswordMatch()) {
                passwordConfirmInput?.focus(); // Focus the confirmation field if it exists
                return; // Stop submission if passwords don't match
            }

            const emailInput = document.getElementById('email');
            const nicknameInput = document.getElementById('nickname');
            // Password inputs already defined above
            const errorElementId = 'register-error-message';
            const successElementId = 'register-success-message';

            if (emailInput && nicknameInput && passwordInput && submitButton) {
                const email = emailInput.value;
                const nickname = nicknameInput.value;
                const password = passwordInput.value; // Use the first password field's value

                // Disable button during registration attempt
                submitButton.disabled = true;
                submitButton.textContent = 'Registering...';

                const success = await handleRegister(email, nickname, password, errorElementId, successElementId);

                // Re-enable button if registration failed (stayed on page)
                // Check if button still exists
                const currentButton = document.getElementById('register-submit-btn');
                if (currentButton) {
                    currentButton.disabled = false;
                    currentButton.textContent = 'Register';
                }

                if (success) {
                    // Optionally clear the form on success
                    registerForm.reset();
                    // Clear password match error just in case
                    if (passwordMatchError) {
                        passwordMatchError.textContent = '';
                        passwordMatchError.classList.remove('visible');
                    }
                }

            } else {
                console.error("Register form elements not found!");
                displayErrorMessage(errorElementId, "An unexpected error occurred setting up the form.");
            }
        });
    }
});
