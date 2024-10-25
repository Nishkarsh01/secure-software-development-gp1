import db from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // Attach an event listener to the form's submission event
    const form = document.querySelector('form');
    form.addEventListener('submit', async (event) => {
        // Prevent the form from submitting the traditional way
        event.preventDefault();

        // Get the user input from the form
        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Use the user input to attempt login
        try {
            const { data, error } = await db.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                console.error('Error logging in:', error.message);
            } else {
                console.log('Logged in user:', data.user);
                console.log('Session', data.session);
                window.location.href = 'feed.html'
            }
        } catch (error) {
            console.error('Unexpected error:', error.message);
            // Handle or display the error
        }
    });
});