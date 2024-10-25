import db from './supabaseClient.js';

/**
 * Inserts a new record into the public user table after an auth user is created
 * @param {*} id
 */
async function createNewUser(id) {
	var { data, error } = await db.from('user').insert({ id: id });
}

/**
 * Retrieves the display name of the given user from the database
 * @param {*} userId
 * @returns
 */
async function getDisplayName(userId) {
	try {
		console.log('getDisplayName(' + userId + ')');
		let displayNameObj = await db
			.from('user')
			.select('display_name')
			.eq('id', userId)
			.single();
		return displayNameObj.data['display_name'];
	} catch (e) {
		return '';
	}
}

/**
 * Updates the display name of the given user
 * @param {*} userId
 * @param {*} displayName
 */
async function setDisplayName(userId, displayName) {
	console.log('Setting display name', displayName);
	try {
		let { data, error } = await db
			.from('user')
			.update({ display_name: displayName })
			.match({ id: userId });
	} catch (e) {
		console.error(e);
	}
}

/**
 * Updates the bio of the given user in the database
 * @param {*} userId
 * @param {*} bio
 */
async function setBio(userId, bio) {
	console.log('Setting bio', bio);
	try {
		let { data, error } = await db
			.from('user')
			.update({ bio: bio })
			.match({ id: userId });
	} catch (e) {
		console.error(e);
	}
}

/**
 * Generates a new unique filename
 * @param {*} file
 * @returns
 */
function getNewFilename(file) {
	try {
		let fileNameSplit = file.name.split('.');
		let extension = fileNameSplit[fileNameSplit.length - 1];
		let newFileName = crypto.randomUUID() + '.' + extension;
		return newFileName;
	} catch {
		return null;
	}
}

/**
 * Uploads the given profile image to the user's storage
 * @param {*} userId
 * @param {*} file
 * @returns
 */
async function uploadProfilePic(userId, file) {
	console.log('IMAGE FILE OBJECT: ', file);
	var { data, error } = await db.storage
		.from('profile_pics/' + userId)
		.upload(file.name, file);
	if (error) {
		console.log('IMAGE UPLOAD ERROR');
		console.log(error);
		return;
	} else {
		console.log('File uploaded', data);
	}

	var { data, error } = await db
		.from('user')
		.update({ profile_picture: file.name })
		.match({ id: userId });
}

/**
 * Retrieves the user's bio from the database
 * @param {*} userId
 * @returns
 */
async function getBio(userId) {
	try {
		console.log('Getting bio...');
		let { data, error } = await db
			.from('user')
			.select('bio')
			.eq('id', userId)
			.single();
		console.log(data);
		if (data.bio === null) {
			return '';
		}
		return data.bio;
	} catch (e) {
		return '';
	}
}

document.addEventListener('DOMContentLoaded', async () => {
	const form = document.querySelector('form');

	const sessionData = await db.auth.getSession();
	const userData = await sessionData.data.session.user;
	const displayName = await getDisplayName(userData.id);

	console.log('Session data', sessionData);

	if (sessionData.data.session === null) {
		window.location.href = 'login.html';
	}

	let currentBio = await getBio(userData.id);

	try {
		console.log('user id to create', userData.id);
		await createNewUser(userData.id);
	} catch (e) {
		console.error(e);
	}

	document.getElementById('displayName').value = displayName;
	document.getElementById('bio').value = currentBio;

	form.addEventListener('submit', async (e) => {
		e.preventDefault();

		// Collect form data
		const formData = new FormData(form);
		const formEntries = Object.fromEntries(formData);

		// Get the image file
		const imageInput = document.getElementById('image');
		const image = imageInput.files[0];

		let imageToUpload;
		if (image) {
			imageToUpload = new File([image], getNewFilename(image), {
				type: image.type,
			});
			await uploadProfilePic(userData.id, imageToUpload);
		} else {
			console.log('NO IMAGE TO UPLOAD');
		}

		console.log(formEntries);

		await setDisplayName(userData.id, formEntries.displayName);
		await setBio(userData.id, formEntries.bio);

		window.location.href = 'profile.html';
	});
});
