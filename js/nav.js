import db from './supabaseClient.js';

/**
 * Retrieves the display name of the given user_id
 * @param {string} userId 
 * @returns 
 */
async function getDisplayName(userId) {
	// console.log('getDisplayName(' + userId + ')');
	try {
		let displayNameObj = await db
			.from('user')
			.select('display_name')
			.eq('id', userId)
			.single();
		return displayNameObj.data['display_name'];
	} catch (e) {
		return 'AnonUser';
	}
}

/**
 * Retrieves the public url of the given user's profile picture
 * @param {*} userId 
 * @returns 
 */
async function getProfilePicUrl(userId) {
	try {
		var { data, error } = await db
			.from('user')
			.select('profile_picture')
			.eq('id', userId);
		let fileName = data[0]['profile_picture'];
		console.log(fileName);
		var { data, error } = await db.storage
			.from('profile_pics/' + userId)
			.getPublicUrl(fileName);

		if (fileName === null) {
			return 'img/profile-placeholder.jpg';
		}
		return data.publicUrl;
	} catch (e) {

		return 'img/profile-placeholder.jpg';
	}
}

document.addEventListener('DOMContentLoaded', async () => {
    const signOutButton = document.getElementById('signOut');
    const sessionData = await db.auth.getSession();
    const userData = await sessionData.data.session.user;

	const displayName = await getDisplayName(userData.id);

	// Populate user name display in nav
	let userDisplay = document.getElementById('userDisplay')
	userDisplay.innerHTML = displayName;
	userDisplay.href = 'profile.html'
    document.getElementById('navProfilePic').src = await getProfilePicUrl(userData.id);

    signOutButton.addEventListener('click', async () => {
        const { error } = await db.auth.signOut();

        if (error) {
            console.error('Error signing out:', error.message);
            // TODO: display an error message to the user
        } else {
            console.log('User signed out');
            window.location.href = 'login.html'; // Redirect to login page or home page
        }
    });
});