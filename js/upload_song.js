import db from './supabaseClient.js';

console.log('UPLOAD SONG');
// console.log(db);
// console.log(db.auth);

/**
 * Uploads the given image file to cover image storage
 * @param {*} file
 * @returns
 */
async function uploadImageToDatabase(file) {
	console.log('IMAGE FILE OBJECT: ', file);
	const { data, error } = await db.storage
		.from('cover_images')
		.upload(file.name, file);
	if (error) {
		console.log('IMAGE UPLOAD ERROR');
		console.log(error);
		return;
	} else {
		console.log('File uploaded', data);
	}
}

/**
 * Uploads given audio file to songs storage
 * @param {*} file
 * @returns
 */
async function uploadAudioToDatabase(file) {
	console.log('AUDIO FILE OBJECT', file);
	const { data, error } = await db.storage
		.from('songs')
		.upload(file.name, file);
	if (error) {
		console.log('AUDIO UPLOAD ERROR');
		console.log(error);
		return;
	} else {
		console.log('Audio file uploaded', data);
	}
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
		return 'AnonUser';
	}
}

/**
 * Retrieves the public url of the profile pic of the given user from storage
 * @param {*} userId
 * @returns
 */
async function getProfilePicUrl(userId) {
	console.log('getProfilePicUrl()');
	let userObj = await db
		.from('user')
		.select('profile_picture')
		.eq('id', userId)
		.single();
	return userObj.data['profile_picture'];
}

/**
 * Generates a unique filename for the given file
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

document.addEventListener('DOMContentLoaded', async function () {
	const form = document.querySelector('form');

	const sessionData = await db.auth.getSession();
	const userData = await sessionData.data.session.user;
	const displayName = await getDisplayName(userData.id);

	document.getElementById('userDisplay').innerHTML = displayName;

	// Submit button handler
	form.addEventListener('submit', async function (e) {
		e.preventDefault();

		// Collect form data
		const formData = new FormData(form);
		const formEntries = Object.fromEntries(formData);

		// Get the image file
		const imageInput = document.getElementById('image');
		const image = imageInput.files[0];

		// Get the audio file
		const audioInput = document.getElementById('audio');
		const audio = audioInput.files[0];

		// Grab user id
		let user_id = userData.id;

		// Renaming image with UUID
		let imageToUpload;
		if (image) {
			imageToUpload = new File([image], getNewFilename(image), {
				type: image.type,
			});
			await uploadImageToDatabase(imageToUpload);
		} else {
			console.log('NO IMAGE TO UPLOAD');
		}

		// Renaming audio with UUID
		let audioToUpload;
		if (audio) {
			audioToUpload = new File([audio], getNewFilename(audio), {
				type: audio.type,
			});
			await uploadAudioToDatabase(audioToUpload);
		} else {
			console.error('NO SONG TO UPLOAD');
		}

		// console.log('SONG ID', song_id);

		let imageFileName;
		let audioFileName;

		if (imageToUpload) {
			imageFileName = imageToUpload.name;
		} else {
			imageFileName = '';
		}

		if (audioToUpload) {
			audioFileName = audioToUpload.name;
		} else {
			audioFileName = '';
		}
		console.log('AUDIO FILE NAME', audioFileName);
		// Insert data into Supabase
		const { data, error } = await db.from('song').insert([
			{
				user_id: user_id,
				title: formEntries.title,
				description: formEntries['description'],
				cover_image_url: imageFileName,
				url: audioFileName,
				is_public: true,
				is_single: false,
				is_demo: false,
			},
		]);

		console.log('USER ID: ' + user_id);

		if (error) {
			console.error(error);
			alert('There was an error uploading the audio:\n' + error);
		} else {
			console.log('Form submitted successfully');
			// Handle success, such as redirecting or updating UI
			window.location.href = 'feed.html';
		}
	});
});
