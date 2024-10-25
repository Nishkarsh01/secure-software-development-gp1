import db from './supabaseClient.js';

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
 * Retrieves the display name of the given user
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

document.addEventListener('DOMContentLoaded', async () => {

    const form = document.querySelector('form');

    const sessionData = await db.auth.getSession();
    const userData = await sessionData.data.session.user;
    const displayName = await getDisplayName(userData.id);

    let user_id = userData.id;


	form.addEventListener('submit', async (e) => {
		e.preventDefault();

		const formData = new FormData(form);
		const formEntries = Object.fromEntries(formData);
		let playlistTitle = formEntries.playlistTitle;
		let playlistDescription = formEntries.playlistDescription;

		console.log(formEntries);

		const imageInput = document.getElementById('image');
		const image = imageInput.files[0];

		let imageToUpload;
		if (image) {
			imageToUpload = new File([image], getNewFilename(image), {
				type: image.type,
			});
			await uploadImageToDatabase(imageToUpload);
		} else {
			console.log('NO IMAGE TO UPLOAD');
		}

		let imageFileName;

		if (imageToUpload) {
			imageFileName = imageToUpload.name;
		} else {
			imageFileName = '';
		}

		const { data, error } = await db.from('playlist').insert([
			{
				user_id: user_id,
				title: playlistTitle,
				description: playlistDescription,
				cover_image_url: imageFileName,
				is_public: true,
			},
		]);

		if (error) {
			console.error(error);
			alert('There was an error creating your collection:\n' + error);
		} else {
			window.location.href = 'feed.html';
		}
	});
});
