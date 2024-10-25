import db from './supabaseClient.js';

console.log('CREATE POST');
// console.log(db);
// console.log(db.auth);

/**
 * Uploads the given image file to post_image storage
 * @param {*} file
 * @returns
 */
async function uploadImageToDatabase(file) {
	console.log('FILE OBJECT: ', file);
	const { data, error } = await db.storage
		.from('post_images')
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
 * Retrieve the display name of the user if one exists, else AnonUser
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
 * Retrive the profile pic of the user if one exists, else return
 * the url to the placeholder
 * @param {*} userId
 * @returns
 */
async function getProfilePicUrl(userId) {
	try {
		console.log('getProfilePicUrl()');
		let userObj = await db
			.from('user')
			.select('profile_picture')
			.eq('id', userId)
			.single();
		return userObj.data['profile_picture'];
	} catch (e) {
		return 'img/profile-placeholder.jpg';
	}
}
/**
 * Creates a new random file name for the given file
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
 * Get the necessary values to populate a dropdown list for selecting
 * specific items to attach to a post of item type
 * @param {*} itemType
 * @param {*} userId
 * @returns
 */
async function getItemOptions(itemType, userId) {
	try {
		let { data, error } = await db
			.from(itemType)
			.select('id, title')
			.eq('user_id', userId);
		return data;
	} catch (e) {
		return null;
	}
}
/**
 * Checks if a given string is a valid UUID or not
 * @param {*} uuid
 * @returns true if valid, else false
 */
function isValidUUID(uuid) {
	const regexExp =
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return regexExp.test(uuid);
}

document.addEventListener('DOMContentLoaded', async function () {
	const form = document.querySelector('form');

	const sessionData = await db.auth.getSession();
	const userData = await sessionData.data.session.user;
	const displayName = await getDisplayName(userData.id);

	document.getElementById('userDisplay').innerHTML = displayName;

	let itemTypeSelection = document.getElementById('item-type');
	let itemSelection = document.getElementById('item');
	let itemSelectionContainer = document.querySelector('.item-selection');

	itemTypeSelection.addEventListener('change', async () => {
		var itemType = itemTypeSelection.value;
		itemSelection.innerHTML = '';

		console.log('ITEM TYPE SELECTED', itemType);

		if (itemType === 'post') {
			itemSelectionContainer.style.display = 'none';
		} else {
			var itemSelectionLabel = itemSelectionContainer.querySelector('label');
			switch (itemType) {
				case 'song':
					itemSelectionLabel.innerHTML = 'Choose from your Songs';
					break;
				case 'album':
					itemSelectionLabel.innerHTML = 'Choose from your Albums';
					break;
				case 'playlist':
					itemSelectionLabel.innerHTML = 'Choose from your Playlists';
					break;
				case 'collection':
					itemSelectionLabel.innerHTML = 'Choose from your Collections';
					break;
				default:
					itemSelectionLabel.innerHTML = 'Choose from your Items';
					break;
			}

			let options = await getItemOptions(itemType, userData.id);
			console.log('OPTIONS RETRIEVED', options);

			if (options.length === 0) {
				itemSelection.add(
					new Option('There are no ' + itemType + 's to retrieve')
				);
				itemSelection.disabled = true;
			} else {
				itemSelection.disabled = false;
				itemSelection.add(new Option('Choose...', '', true, true));

				for (let i = 0; i < options.length; i++) {
					itemSelection.add(
						new Option(options[i].title, options[i].id, false, false)
					);
				}
			}

			itemSelectionContainer.style.display = 'block';
		}
	});

	// Submit button handler
	form.addEventListener('submit', async function (e) {
		e.preventDefault();

		// Collect form data
		const formData = new FormData(form);
		const formEntries = Object.fromEntries(formData);

		console.log('FORM DATA', formData);

		// Get the image file
		const fileInput = document.getElementById('image');
		const file = fileInput.files[0];

		let user_id = userData.id;

		let item;

		if (isValidUUID(itemSelection.value)) {
			item = itemSelection.value;
		}

		let fileToUpload;
		if (file) {
			fileToUpload = new File([file], getNewFilename(file), {
				type: file.type,
			});
			await uploadImageToDatabase(fileToUpload);
		}
		let post_id = crypto.randomUUID();
		console.log('POST ID', post_id);
		// Insert data into Supabase

		let fileName;

		if (fileToUpload) {
			fileName = fileToUpload.name;
		} else {
			fileName = '';
		}

		const { data, error } = await db.from('post').insert([
			{
				id: post_id,
				user_id: user_id,
				title: formEntries.title,
				text_content: formEntries['post body'],
				item_type: formEntries['item-type'],
				item_id: item,
				image_url: fileName,
			},
		]);

		console.log('USER ID: ' + user_id);
		console.log('ITEM ID: ' + item);

		if (error) {
			console.error(error);
		} else {
			console.log('Form submitted successfully');
			window.location.href = 'feed.html';
		}
	});
});
