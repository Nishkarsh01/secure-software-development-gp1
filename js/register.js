import db from './supabaseClient.js';

/**
 * Retrieves the user id by user email
 * @param {*} email 
 * @returns 
 */
async function getUserIdByEmail(email) {
	const { data, error } = await db
		.from('users')
		.select('id')
		.eq('email', email)
		.single();

	if (error) return error;
	return data.id;
}

document.addEventListener('DOMContentLoaded', async function () {
	const form = document.querySelector('form');

	form.addEventListener('submit', async function (event) {
		event.preventDefault();

		const username = document.getElementById('username').value;
		const email = document.getElementById('email').value;
		const password = document.getElementById('password').value;
		const passwordConfirm = document.getElementById('password-confirm').value;

		if (password !== passwordConfirm) {
			alert('Passwords do not match.');
			return;
		}

		try {
			var { _, error } = await db.auth.signUp({
				email: email,
				password: password,
			});

			if (error) {
				throw error;
			} else {

				var { data, error } = await db.auth.signInWithPassword(
					{
						email: email,
						password: password
					}
				)

				console.log('LOGGED IN?', data)

				window.location.href = 'user_details.html';
			}
		} catch (error) {
			alert('Error creating user: ' + error.message);
		}
	});
});
