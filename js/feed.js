import db from './supabaseClient.js';

console.log('FEED');

/**
 * Retrieves the currently logged in user's id
 * @returns
 */
async function getCurrentUserId() {
	const sessionData = await db.auth.getSession();
	console.log('Session data', sessionData);
	if (sessionData.data.session === null) {
		window.location.href = 'login.html';
	}
	const userData = await sessionData.data.session.user;
	const currentUserId = userData.id;
	return currentUserId;
}

/**
 * Queries for 0-20 of the most recent posts
 * @returns A range of posts
 */
async function fetchPosts(first, last) {
	if (first === null) {
		first = 0;
	}
	if (last === null || last === first) {
		last = first + 5;
	}
	let { data: posts, error } = await db
		.from('post')
		.select('*')
		.order('created_at', { ascending: false })
		.range(first, last);
	if (error) {
		console.error('Error fetching posts:', error.message);
	} else {
		return posts;
	}
}
/**
 * Retrieves all posts from the user
 * @param {*} userId
 * @returns
 */
async function fetchPostsFromUser(userId, firstPost, lastPost) {
	let { data: posts, error } = await db
		.from('post')
		.select('*')
		.eq('user_id', userId)
		.order('created_at', { ascending: false })
		.range(firstPost, lastPost);
	if (error) {
		console.error('Error fetching posts:', error.message);
	} else {
		return posts;
	}
}

/**
 * Retrieves the public url for the given user's profile picture
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
		console.error(e);
		return 'img/profile-placeholder.jpg';
	}
}

/**
 * Gets the public url for a post image from the database
 * @param {string} fileName
 * @returns The url to the requested post image
 */
async function getPostImageUrl(fileName) {
	if (!fileName) {
		return null;
	}
	console.log('getPostImageUrl(' + fileName + ')');
	const { data, error } = await db.storage
		.from('post_images')
		.getPublicUrl(fileName);
	if (error) {
		console.error('Error generating URL for image:', error);
		return null;
	}
	console.log('IMAGE URL FROM DB: ', data.publicUrl);

	return data.publicUrl;
}

/**
 * Formats a Date obj and returns the string
 * @param {Date} date
 * @returns
 */
function formatDate(date) {
	const months = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December',
	];
	const days = [
		'Sunday',
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday',
	];
	let amPm;
	let hours;
	let rawHours = date.getHours();
	if (rawHours == 0) {
		hours = 12;
	} else {
		hours = rawHours % 12;
	}

	if (rawHours < 12) {
		amPm = 'am';
	} else {
		amPm = 'pm';
	}

	let time = `${hours}:${`${date.getMinutes()}`.padStart(2, '0')}`;
	return `${days[date.getDay()]}, ${
		months[date.getMonth()]
	} ${date.getDate()}, ${date.getFullYear()} at ${time} ${amPm}`;
}

/**
 * Creates a completed post to be appended to the feed
 * @param {*} data
 * @param {*} container
 * @returns
 */
async function createPost(data, container, userId) {
	// Getting elements
	let postHeader = container
		.getElementsByClassName('post-header')[0]
		.getElementsByClassName('post-info-container')[0];
	let postTitle = postHeader.getElementsByClassName('post-title')[0];
	let postUser = postHeader.getElementsByClassName('username')[0];
	let postTime = postHeader.getElementsByClassName('post-time')[0];

	let profilePic = container
		.getElementsByClassName('profile-pic-container')[0]
		.getElementsByClassName('profile-picture')[0];

	let postBody = container.getElementsByClassName('post-body')[0];

	let postImage = container
		.getElementsByClassName('img-container')[0]
		.getElementsByClassName('post-img')[0];
	console.log("POST's IMAGE URL", data.image_url);
	let postImageUrl = await getPostImageUrl(data.image_url);
	if (postImageUrl) {
		postImage.src = postImageUrl;
	} else {
		postImage.remove();
	}
	console.log('POST IMAGE SRC: ', postImage.src);

	let dateObj = new Date(data.created_at);
	let date = formatDate(dateObj);

	// Populating elements
	profilePic.src = await getProfilePicUrl(data.user_id);
	postTitle.innerHTML = data.title;
	postUser.innerHTML = await getDisplayName(data.user_id); // TODO: anchor tag, link user profile when it's made
	postTime.innerHTML = 'Posted ' + date;
	postBody.innerHTML = '<p>' + data.text_content + '</p>';
	// console.log('Complete post', container);
	return container;
}

/**
 * Retrieves the given user id's display name
 * @param {*} userId
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
		console.error(e);
		return 'AnonUser';
	}
}

/**
 * Get the full public audio file url from storage
 * @param {*} url
 * @returns
 */
async function getAudioUrl(url) {
	console.log('AUDIO FILENAME', url);
	var { data, error } = await db.storage.from('songs').getPublicUrl(url);

	if (url === null) {
		return 'null';
	}
	return data.publicUrl;
}

/**
 * Pauses all other audio elements in the DOM that are not the given
 * audio element
 * @param {*} current The audio player not to pause
 */
function pauseOtherAudio(current) {
	const audioElements = document.querySelectorAll('audio');

	audioElements.forEach((audio) => {
		if (audio !== current) {
			audio.pause();
		}
	});
}

/**
 * Creates an audio element that will play a song with the given song id.
 * Audio elements are set to not load audio until play is clicked.
 * @param {*} songId
 * @returns An audio element for the given song id
 */
async function createAudioElement(url) {
	var audio = document.createElement('audio');

	audio.src = await getAudioUrl(url);

	audio.controls = true;
	audio.preload = 'none';
	audio.addEventListener('play', () => {
		pauseOtherAudio(audio);
	});

	return audio;
}
/**
 * Gets the full public cover image url
 * @param {*} coverUrl
 * @returns
 */
async function getCoverImageUrl(coverUrl) {
	if (coverUrl === '' || coverUrl === null) {
		return 'img/cover-image-placeholder.png';
	}
	let { data, error } = await db.storage
		.from('cover_images')
		.getPublicUrl(coverUrl);

	if (error) {
		return 'img/cover-image-placeholder.png';
	}

	return data.publicUrl;
}

/**
 * Counts how many collections a song is present in
 * @param {*} songId
 * @returns
 */
async function getCollectionCount(songId) {
	let { data, error } = await db
		.from('collection_item')
		.select('item_id')
		.eq('item_id', songId);

	if (!data) {
		return 0;
	}
	return data.length;
}

/**
 * This will add the given item to the given collection as the given
 * item type
 * @param {*} itemType
 * @param {*} itemId
 */
async function addToCollection(collectionId, itemType, itemId) {
	console.log(
		'ADDING TO COLLECTION',
		itemType + ' ' + itemId + ' ' + collectionId
	);
	let { data, error } = await db.from('collection_item').insert({
		collection_id: collectionId,
		item_type: itemType,
		item_id: itemId,
	});

	if (error) {
		alert(
			'There was an error adding the ' +
				itemType +
				' to your collection:\n' +
				error.message
		);
	} else {
		window.location.href = 'feed.html';
	}
}

function createOverlay() {
	console.log('creating overlay...');
	const overlay = document.createElement('dive');
	overlay.id = 'overlay';
	overlay.style.position = 'fixed';
	overlay.style.top = '0';
	overlay.style.left = '0';
	overlay.style.width = '100%';
	overlay.style.height = '100%';
	overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
	overlay.style.display = 'none';
	overlay.style.justifyContent = 'center';
	overlay.style.alignItems = 'center';
	overlay.style.display = 'flex';
	console.log('About to return overlay', overlay);
	return overlay;
}

/**
 * Creates the container HTML element that holds options for
 * when an overlay is displayed
 * @param {*} itemType
 * @param {*} itemId
 * @param {*} whereToAdd
 * @returns
 */
async function createDropdownContainer(itemType, itemId, whereToAdd) {
	const container = document.createElement('div');
	let bgColor;
	if (whereToAdd === 'COLLECTION') {
		bgColor = '#F49404';
	}
	if (whereToAdd === 'PLAYLIST') {
		bgColor = '#205864';
	}

	let closeButton = document.createElement('a');
	closeButton.innerHTML = 'CLOSE';
	closeButton.style.color = 'white';
	closeButton.addEventListener('click', () => {
		document.body.removeChild(document.querySelector('#overlay'));
	});

	container.appendChild(closeButton);

	console.log('creating dropdown', itemId + ' ' + itemType);
	var itemTitle;
	var itemImageUrl;
	if (itemType === 'song') {
		console.log('getting song info');
		let { data, error } = await db
			.from('song')
			.select('title, cover_image_url')
			.eq('id', itemId)
			.single();
		console.log(itemType + ' to add.', data);
		itemTitle = data.title;
		itemImageUrl = await getCoverImageUrl(data.cover_image_url);
		console.log('ITEM IMAGE URL', itemImageUrl);
	}

	let containerMessage = document.createElement('h1');
	containerMessage.innerHTML =
		'Add ' + itemTitle + ' to a ' + whereToAdd + '...';

	let containerImage = document.createElement('img');
	containerImage.src = itemImageUrl;
	containerImage.style.height = '20vh';
	containerImage.style.margin = '0.5em auto';
	containerImage.style.borderRadius = '0.5em';

	container.style.maxWidth = '90%';
	container.style.background = bgColor;
	container.style.padding = '20px';
	container.style.borderRadius = '5px';
	container.appendChild(containerImage);
	container.appendChild(containerMessage);

	return container;
}

/**
 * Creates a dropdown HTML element populated with given options and values
 * @param {*} options
 * @param {*} values
 * @returns
 */
async function createDropdown(options, values) {
	const dropdown = document.createElement('select');
	dropdown.id = 'collectionsDropdown';
	for (let i = 0; i < options.length; i++) {
		const opt = document.createElement('option');
		opt.value = values[i];
		opt.textContent = options[i];
		dropdown.appendChild(opt);
	}
	return dropdown;
}

/**
 * Displays an overlay that allows the user to choose which
 * collection the given item will be added to.
 * @param {*} itemType
 * @param {*} itemId
 */
async function showAddToCollectionOverlay(event, userId, itemType, itemId) {
	console.log('CLICKED ADD TO COLLECTION');
	let collectionId;
	let success;

	console.log('USER ID', userId);
	// let itemId = event.target.id;

	let overlay = await createOverlay();
	console.log('overlay created', overlay);
	let dropdownContainer = await createDropdownContainer(
		itemType,
		itemId,
		'COLLECTION'
	);
	console.log('dropdownContainer created', dropdownContainer);
	let { data, error } = await db
		.from('collection')
		.select('id, title')
		.eq('user_id', userId);

	let options = [];
	let values = [];

	for (const d of data) {
		options.push(d.title);
		values.push(d.id);
	}
	console.log('GETTING DROPDOWN OPTIONS -> ', data);

	let dropdown = await createDropdown(options, values);

	let addButton = document.createElement('a');
	addButton.classList.add(['btn', 'btn-primary']);
	addButton.innerHTML = 'ADD';
	addButton.addEventListener('click', async (event) => {
		let collectionId = values[dropdown.selectedIndex];
		await addToCollection(collectionId, itemType, itemId);
	});

	console.log('dropdown created:', dropdown);
	dropdownContainer.appendChild(dropdown);
	dropdownContainer.appendChild(addButton);
	overlay.appendChild(dropdownContainer);
	document.body.appendChild(overlay);
	console.log('Overlay created', overlay);
}

/**
 * Generates the next track number for a song added to a playlist
 * @param {*} playlistId
 * @returns
 */
async function getTrackNumber(playlistId) {
	console.log;
	try {
		let { data, error } = await db
			.from('playlist_song')
			.select('track_number')
			.eq('playlist_id', playlistId);

		console.log('getTrackNumberData', data);

		return data.length + 1;
	} catch (e) {
		console.error(e);
		return 1;
	}
}

/**
 * Inserts a song into a playlist on the database
 * @param {*} playlistId
 * @param {*} songId
 */
async function addToPlaylist(playlistId, songId) {
	console.log('ADDING TO PLAYLIST', songId + ' ' + playlistId);
	let { data, error } = await db.from('playlist_song').insert({
		playlist_id: playlistId,
		song_id: songId,
		track_number: await getTrackNumber(playlistId),
	});

	if (error) {
		alert(
			'There was an error adding the song to your playlist:\n' + error.message
		);
	} else {
		window.location.href = 'feed.html';
	}
}

/**
 * Displays an overlay in the DOM when an Add to Playlist button is clicked.
 * The user can select which playlist to add the chosen song to
 * @param {*} event
 * @param {*} userId
 * @param {*} itemType
 * @param {*} itemId
 */
async function showAddToPlaylistOverlay(event, userId, itemType, itemId) {
	console.log('CLICKED ADD TO PLAYLIST');
	let playlistId;
	let success;

	console.log('USER ID', userId);
	// let itemId = event.target.id;

	let overlay = await createOverlay();
	console.log('overlay created', overlay);
	let dropdownContainer = await createDropdownContainer(
		itemType,
		itemId,
		'PLAYLIST'
	);
	console.log('dropdownContainer created', dropdownContainer);
	let { data, error } = await db
		.from('playlist')
		.select('id, title')
		.eq('user_id', userId);

	let options = [];
	let values = [];

	for (const d of data) {
		options.push(d.title);
		values.push(d.id);
	}

	console.log('GETTING DROPDOWN OPTIONS -> ', data);

	let dropdown = await createDropdown(options, values);

	let addButton = document.createElement('a');
	addButton.classList.add(['btn', 'btn-primary']);
	addButton.innerHTML = 'ADD';
	addButton.addEventListener('click', async (event) => {
		let playlistId = values[dropdown.selectedIndex];
		await addToPlaylist(playlistId, itemId);
	});

	console.log('dropdown created:', dropdown);
	dropdownContainer.appendChild(dropdown);
	dropdownContainer.appendChild(addButton);
	overlay.appendChild(dropdownContainer);
	document.body.appendChild(overlay);
	console.log('Overlay created', overlay);
}

/**
 * Creates HTML elements when a song needs to be rendered
 * @param {*} container
 * @param {*} songId
 */
async function populateSong(container, songId) {
	let { data, error } = await db
		.from('song')
		.select('*')
		.eq('id', songId)
		.single();

	let postBody = container.querySelector('.post-body');

	let audioElement = await createAudioElement(data.url);
	let audioImage = document.createElement('img');
	let audioTitle = document.createElement('h2');
	let audioCreator = document.createElement('h3');
	let collectionCount = document.createElement('p');
	collectionCount.style.marginTop = '0.5em';

	let addToCollectionButton = document.createElement('a');
	addToCollectionButton.innerHTML = 'Add to a Collection +';
	addToCollectionButton.style.cursor = 'pointer';
	addToCollectionButton.addEventListener('click', async (event) => {
		showAddToCollectionOverlay(event, await getCurrentUserId(), 'song', songId);
	});

	let addToPlaylistButton = document.createElement('a');
	addToPlaylistButton.innerHTML = 'Add to a Playlist +';
	addToPlaylistButton.style.cursor = 'pointer';
	addToPlaylistButton.addEventListener('click', async (event) => {
		showAddToPlaylistOverlay(event, await getCurrentUserId(), 'song', songId);
	});

	let fetchedCollectionCount = await getCollectionCount(songId);
	let endString = ' collection';
	if (fetchedCollectionCount !== 1) {
		endString += 's.';
	} else {
		endString += '.';
	}
	collectionCount.innerHTML =
		'<em>' +
		' - This song appears in ' +
		fetchedCollectionCount +
		endString +
		'</em>';
	collectionCount.style.fontWeight = 'lighter';
	collectionCount.style.fontSize = '0.9em';

	audioTitle.innerHTML = data.title;
	audioCreator.innerHTML =
		'<em>by ' + (await getDisplayName(data.user_id)) + '</em>';
	audioCreator.style.fontWeight = 'lighter';
	audioCreator.style.fontSize = '0.8em';
	audioImage.src = await getCoverImageUrl(data.cover_image_url);
	audioImage.style.width = '100%';
	postBody.appendChild(audioTitle);
	postBody.appendChild(audioCreator);
	postBody.appendChild(audioImage);
	postBody.appendChild(audioElement);
	postBody.appendChild(addToCollectionButton);
	postBody.appendChild(addToPlaylistButton);
	postBody.appendChild(collectionCount);
}

/**
 * Fetches a single song from the database
 * @param {*} id
 * @returns
 */
async function fetchSong(id) {
	let { data, error } = await db.from('song').select('*').eq('id', id).single();
	return data;
}

/**
 * Fetches all the items present in a collection from the database
 * @param {*} collectionId
 * @returns
 */
async function fetchCollectionItems(collectionId) {
	let { data, error } = await db
		.from('collection_item')
		.select('*')
		.eq('collection_id', collectionId);
	return data;
}

/**
 * Fetches songs connected to a playlist from the database
 * @param {*} playlistId
 * @returns
 */
async function fetchPlaylistSongs(playlistId) {
	console.log('Fetching songs for playlist', playlistId);
	let { data, error } = await db
		.from('playlist_song')
		.select('*')
		.eq('playlist_id', playlistId)
		.order('track_number');
	return data;
}

/**
 * Creates HTML elements when a Playlist needs to be rendered
 * @param {*} container
 * @param {*} playlistId
 */
async function populatePlaylist(container, playlistId) {
	let { data, error } = await db
		.from('playlist')
		.select('*')
		.eq('id', playlistId)
		.single();

	let postBody = container.querySelector('.post-body');

	let playlistTitle = document.createElement('h2');
	playlistTitle.classList.add('playlist-title');
	playlistTitle.innerHTML = data.title;

	let playlistDescription = document.createElement('p');
	playlistDescription.classList.add('playlist-description');
	playlistDescription.innerHTML = data.description;

	let playlistContainer = document.createElement('div');
	playlistContainer.classList.add('container');
	playlistContainer.classList.add('playlist-container');

	playlistContainer.style.backgroundColor = '#333';
	playlistContainer.style.padding = '0.5em';
	playlistContainer.style.borderRadius = '0.5em';
	playlistContainer.style.maxHeight = '600px';
	playlistContainer.style.overflow = 'scroll';

	postBody.appendChild(playlistTitle);
	postBody.appendChild(playlistDescription);

	let playlistSongs = await fetchPlaylistSongs(playlistId);

	for (const song of playlistSongs) {
		console.log('SONG IN PLAYLIST', song);
		let playlistSongsContainer = document.createElement('div');
		playlistSongsContainer.classList.add('row');
		playlistSongsContainer.style.backgroundColor = '#205864';
		playlistSongsContainer.style.padding = '0.5em';
		playlistSongsContainer.style.margin = '0.5em';
		playlistSongsContainer.style.borderRadius = '0.5em';

		let songData = await fetchSong(song.song_id);
		if (error) {
			break;
		}
		let songInfoRow = document.createElement('div');
		songInfoRow.classList.add('row');
		let songInfoContainer = document.createElement('div');
		songInfoContainer.classList.add('col-10');
		let songPlayerRow = document.createElement('div');
		songPlayerRow.classList.add('row');
		let songTitle = document.createElement('h3');
		let songAuthor = document.createElement('p');
		let songImageContainer = document.createElement('div');
		songImageContainer.classList.add('col');
		let songImage = document.createElement('img');
		let songPlayer = await createAudioElement(songData.url);

		let addToCollectionButton = document.createElement('img');
		addToCollectionButton.classList.add('col');
		addToCollectionButton.src = 'img/collection-icon.png';
		addToCollectionButton.style.height = '2em';
		addToCollectionButton.style.cursor = 'pointer';
		addToCollectionButton.id = songData.id;
		addToCollectionButton.addEventListener('click', async (event) => {
			showAddToCollectionOverlay(
				event,
				await getCurrentUserId(),
				'song',
				song.song_id
			);
		});

		addToCollectionButton.addEventListener('mouseover', () => {
			addToCollectionButton.style.filter = 'invert(1)';
		});
		addToCollectionButton.addEventListener('mouseout', () => {
			addToCollectionButton.style.filter = 'invert(0)';
		});

		let addToPlaylistButton = document.createElement('img');
		addToPlaylistButton.classList.add('col');
		addToPlaylistButton.src = 'img/playlist-icon.png';
		addToPlaylistButton.style.height = '2em';
		addToPlaylistButton.style.cursor = 'pointer';
		addToPlaylistButton.id = songData.id;
		addToPlaylistButton.addEventListener('click', async (event) => {
			showAddToPlaylistOverlay(
				event,
				await getCurrentUserId(),
				'song',
				song.song_id
			);
		});

		addToPlaylistButton.addEventListener('mouseover', () => {
			addToPlaylistButton.style.filter = 'invert(1)';
		});
		addToPlaylistButton.addEventListener('mouseout', () => {
			addToPlaylistButton.style.filter = 'invert(0)';
		});

		songTitle.innerHTML = songData.title;
		songTitle.style.fontWeight = 'lighter';
		songTitle.style.fontSize = '1em';

		songAuthor.innerHTML =
			'<em>by ' + (await getDisplayName(songData.user_id)) + '</em>';
		songAuthor.style.fontSize = '0.8em';

		songImage.src = await getCoverImageUrl(songData.cover_image_url);
		songImage.classList.add();
		songImage.style.height = '50px';
		songImage.style.width = '50px';
		songImage.style.borderRadius = '0.5em';

		songImage.style.borderRadius = '0.5em';

		songImageContainer.appendChild(songImage);

		songInfoRow.appendChild(songImageContainer);

		songInfoContainer.appendChild(songTitle);
		songInfoContainer.appendChild(songAuthor);
		songInfoContainer.appendChild(addToCollectionButton);
		songInfoContainer.appendChild(addToPlaylistButton);

		songInfoRow.appendChild(songInfoContainer);

		songPlayerRow.appendChild(songPlayer);
		songPlayerRow.style.marginTop = '0.5em';

		playlistSongsContainer.appendChild(songInfoRow);
		playlistSongsContainer.appendChild(songPlayerRow);

		playlistContainer.appendChild(playlistSongsContainer);
	}

	let addPlaylistToCollectionButton = document.createElement('a');
	addPlaylistToCollectionButton.innerHTML =
		'Add <em>' + data.title + '</em> to a Collection +';
	addPlaylistToCollectionButton.style.cursor = 'pointer';
	addPlaylistToCollectionButton.addEventListener('click', async (event) => {
		showAddToCollectionOverlay(
			event,
			await getCurrentUserId(),
			'playlist',
			data.id
		);
	});

	postBody.appendChild(playlistContainer);
	postBody.appendChild(addPlaylistToCollectionButton);
}

/**
 * Fetches a playlist from the database
 * @param {*} playlistId
 * @returns
 */
async function fetchPlaylist(playlistId) {
	let { data, error } = await db
		.from('playlist')
		.select('*')
		.eq('id', playlistId)
		.single();

	return data;
}

/**
 * Creates the HTML elements to display when a Collection needs to be shown
 * @param {*} container
 * @param {*} collectionId
 */
async function populateCollection(container, collectionId) {
	let { data, error } = await db
		.from('collection')
		.select('*')
		.eq('id', collectionId)
		.single();

	console.log('COLLECTION DATA: ', data);

	let postBody = container.querySelector('.post-body');

	let collectionTitle = document.createElement('h2');
	collectionTitle.classList.add('collection-title');
	collectionTitle.innerHTML = data.title;
	let collectionDescription = document.createElement('p');
	collectionDescription.classList.add('collection-description');
	collectionDescription.innerHTML = data.description;
	let collectionContainer = document.createElement('div');
	collectionContainer.classList.add('container');
	collectionContainer.classList.add('collection-container');
	collectionContainer.style.maxHeight = '600px';
	collectionContainer.style.overflow = 'scroll';

	collectionContainer.style.backgroundColor = '#333';
	collectionContainer.style.padding = '0.5em';
	collectionContainer.style.borderRadius = '0.5em';

	postBody.appendChild(collectionTitle);
	postBody.appendChild(collectionDescription);

	let collectionItems = await fetchCollectionItems(collectionId);
	console.log('COLLECTION ITEMS: ', collectionItems);

	for (const collectionItem of collectionItems) {
		let collectionItemContainer = document.createElement('div');
		collectionItemContainer.classList.add('row');
		collectionItemContainer.style.backgroundColor = '#205864';
		collectionItemContainer.style.padding = '0.5em';
		collectionItemContainer.style.margin = '0.5em';
		collectionItemContainer.style.borderRadius = '0.5em';

		switch (collectionItem.item_type) {
			case 'song':
				let songData = await fetchSong(collectionItem.item_id);
				if (error) {
					break;
				}
				let songInfoRow = document.createElement('div');
				songInfoRow.classList.add('row');
				let songInfoContainer = document.createElement('div');
				songInfoContainer.classList.add('col-10');
				let songPlayerRow = document.createElement('div');
				songPlayerRow.classList.add('row');
				let songTitle = document.createElement('h3');
				let songAuthor = document.createElement('p');
				let songImageContainer = document.createElement('div');
				songImageContainer.classList.add('col');
				let songImage = document.createElement('img');
				let songPlayer = await createAudioElement(songData.url);

				let addToCollectionButton = document.createElement('img');
				addToCollectionButton.classList.add('col');
				addToCollectionButton.src = 'img/collection-icon.png';
				addToCollectionButton.style.height = '2em';
				addToCollectionButton.style.cursor = 'pointer';
				addToCollectionButton.id = songData.id;
				addToCollectionButton.addEventListener('click', async (event) => {
					showAddToCollectionOverlay(
						event,
						await getCurrentUserId(),
						collectionItem.item_type,
						collectionItem.item_id
					);
				});

				addToCollectionButton.addEventListener('mouseover', () => {
					addToCollectionButton.style.filter = 'invert(1)';
				});
				addToCollectionButton.addEventListener('mouseout', () => {
					addToCollectionButton.style.filter = 'invert(0)';
				});

				let addToPlaylistButton = document.createElement('img');
				addToPlaylistButton.classList.add('col');
				addToPlaylistButton.src = 'img/playlist-icon.png';
				addToPlaylistButton.style.height = '2em';
				addToPlaylistButton.style.cursor = 'pointer';
				addToPlaylistButton.id = songData.id;
				addToPlaylistButton.addEventListener('click', async (event) => {
					showAddToPlaylistOverlay(
						event,
						await getCurrentUserId(),
						collectionItem.item_type,
						collectionItem.item_id
					);
				});

				addToPlaylistButton.addEventListener('mouseover', () => {
					addToPlaylistButton.style.filter = 'invert(1)';
				});
				addToPlaylistButton.addEventListener('mouseout', () => {
					addToPlaylistButton.style.filter = 'invert(0)';
				});

				songTitle.innerHTML = songData.title;
				songTitle.style.fontWeight = 'lighter';
				songTitle.style.fontSize = '1em';

				songAuthor.innerHTML =
					'<em>by ' + (await getDisplayName(songData.user_id)) + '</em>';
				songAuthor.style.fontSize = '0.8em';

				songImage.src = await getCoverImageUrl(songData.cover_image_url);
				songImage.classList.add();
				songImage.style.height = '50px';
				songImage.style.width = '50px';
				songImage.style.borderRadius = '0.5em';

				songImage.style.borderRadius = '0.5em';

				songImageContainer.appendChild(songImage);

				songInfoRow.appendChild(songImageContainer);

				songInfoContainer.appendChild(songTitle);
				songInfoContainer.appendChild(songAuthor);
				songInfoContainer.appendChild(addToCollectionButton);
				songInfoContainer.appendChild(addToPlaylistButton);

				songInfoRow.appendChild(songInfoContainer);

				songPlayerRow.appendChild(songPlayer);
				songPlayerRow.style.marginTop = '0.5em';

				collectionItemContainer.appendChild(songInfoRow);
				collectionItemContainer.appendChild(songPlayerRow);

				break;

			case 'playlist':
				let playlistData = await fetchPlaylist(collectionItem.item_id);
				let playlistSongs = await fetchPlaylistSongs(playlistData.id);
				let playlistInfoRow = document.createElement('div');
				playlistInfoRow.classList.add('row');

				let playlistAddToCollectionRow = document.createElement('div');
				playlistAddToCollectionRow.classList.add('row');

				let playlistTitle = document.createElement('p');
				playlistTitle.innerHTML = playlistData.title;
				playlistTitle.style.fontSize = '1em';
				playlistTitle.classList.add('col-10');
				playlistTitle.style.fontWeight = 'lighter';

				let playlistAuthor = document.createElement('p');
				playlistAuthor.innerHTML =
					'<em>A playlist by ' +
					(await getDisplayName(playlistData.user_id)) +
					'</em>';
				playlistAuthor.style.color = '#F49404';

				let playlistImageContainer = document.createElement('div');
				playlistImageContainer.classList.add('col');
				let playlistImage = document.createElement('img');
				playlistImage.src = 'img/playlist-icon.png';
				playlistImage.style.height = '3em';
				playlistImage.style.filter = 'invert(1)';

				let playlistSongsContainer = document.createElement('div');
				playlistSongsContainer.classList.add('row');

				for (const song of playlistSongs) {
					let playlistSongContainer = document.createElement('div');
					playlistSongContainer.classList.add('row');

					let trackNumber = song.track_number;

					let playlistSong = await fetchSong(song.song_id);

					let songPlayer = await createAudioElement(playlistSong.url);

					let playlistSongDetails = document.createElement('p');
					playlistSongDetails.innerHTML =
						trackNumber +
						'. ' +
						playlistSong.title +
						', <em>by ' +
						(await getDisplayName(playlistSong.user_id)) +
						'</em>';

					playlistSongContainer.appendChild(playlistSongDetails);

					playlistSongsContainer.appendChild(playlistSongContainer);
					playlistSongsContainer.appendChild(songPlayer);
				}

				let addPlaylistToCollectionContainer = document.createElement('div');
				addPlaylistToCollectionContainer.classList.add('col');
				let addPlaylistToCollectionButton = document.createElement('img');
				addPlaylistToCollectionButton.classList.add('col');
				addPlaylistToCollectionButton.src = 'img/collection-icon.png';
				addPlaylistToCollectionButton.style.height = '2em';
				addPlaylistToCollectionButton.style.cursor = 'pointer';
				addPlaylistToCollectionButton.id = playlistData.id;
				addPlaylistToCollectionButton.addEventListener(
					'click',
					async (event) => {
						showAddToCollectionOverlay(
							event,
							await getCurrentUserId(),
							'playlist',
							playlistData.id
						);
					}
				);

				addPlaylistToCollectionButton.addEventListener('mouseover', () => {
					addPlaylistToCollectionButton.style.filter = 'invert(1)';
				});
				addPlaylistToCollectionButton.addEventListener('mouseout', () => {
					addPlaylistToCollectionButton.style.filter = 'invert(0)';
				});

				addPlaylistToCollectionContainer.appendChild(
					addPlaylistToCollectionButton
				);
				playlistAddToCollectionRow.appendChild(
					addPlaylistToCollectionContainer
				);

				playlistImageContainer.appendChild(playlistImage);

				playlistInfoRow.appendChild(playlistImageContainer);
				playlistInfoRow.appendChild(playlistTitle);
				playlistInfoRow.appendChild(playlistAuthor);

				collectionItemContainer.appendChild(playlistInfoRow);
				collectionItemContainer.appendChild(playlistSongsContainer);
				collectionItemContainer.appendChild(playlistAddToCollectionRow);
				break;
		}

		collectionContainer.appendChild(collectionItemContainer);
	}
	postBody.appendChild(collectionContainer);
}

/**
 * Main activities
 */
document.addEventListener('DOMContentLoaded', async () => {
	const sessionData = await db.auth.getSession();
	console.log('Session data', sessionData);
	if (sessionData.data.session === null) {
		window.location.href = 'login.html';
	}
	const userData = await sessionData.data.session.user;
	const currentUserId = userData.id;
	const displayName = await getDisplayName(userData.id);

	const userColumns = await db.from('user').select('*').eq('id', userData.id);

	if (userColumns === null) {
		window.location.href = 'user_details.html';
	}

	// Populate user name display in nav
	document.getElementById('userDisplay').innerHTML = displayName;

	// Initialize the Main Element
	const mainElement = document.getElementsByClassName('all-posts-container')[0];

	const tempPostContainer =
		document.getElementsByClassName('post-container')[0];

	mainElement.innerHTML = '';

	var servingFor = document.location.pathname.split('/').pop();

	console.log('DOCUMENT LOCATION', document.location.pathname.split('/').pop());

	let firstPost = 0;
	let lastPost = 50;

	let posts;
	console.log('USER DATA', userData);
	console.log('USER COLUMNS', userColumns);
	if (servingFor === 'feed.html') {
		posts = await fetchPosts(firstPost, lastPost);
	}

	if (servingFor === 'profile.html') {
		posts = await fetchPostsFromUser(currentUserId, firstPost, lastPost);
		document.getElementById('profileDisplayName').innerHTML = displayName;
		document.getElementsByClassName('summary-profile-picture')[0].src =
			await getProfilePicUrl(userData.id);
		document.getElementsByClassName('bio')[0].innerHTML =
			userColumns.data[0].bio;

		setTimeout(() => {
			document.getElementsByClassName('profile-header')[0].style.opacity = '1';
		}, 20);
	}

	if (posts && posts.length > 0) {
		for (const post of posts) {
			// console.log('Post', post);
			let newPost = await createPost(post, tempPostContainer.cloneNode(true));
			mainElement.appendChild(newPost);
			newPost.style.opacity = '0';
			newPost.style.transition = 'opacity 1s ease-in-out';

			switch (post.item_type) {
				case 'song':
					console.log('POST SONG ID:', post.item_id);
					if (post.item_id !== null) {
						await populateSong(newPost, post.item_id);
					}
					newPost.style.backgroundColor = '#205864';
					break;
				case 'collection':
					console.log('POST COLLECTION ID: ', post.item_id);
					if (post.item_id !== null) {
						await populateCollection(newPost, post.item_id);
					}
					newPost.style.backgroundColor = '#F49404';
					newPost.querySelectorAll('a').forEach((a) => {
						a.style.color = '#205864';
						a.addEventListener('mouseover', () => {
							a.style.color = '#FFFFFF';
						});
						a.addEventListener('mouseout', () => {
							a.style.color = '#205864';
						});
					});
					let collectionImage = document.createElement('img');
					collectionImage.src = 'img/collection-icon.png';
					collectionImage.style.height = '1em';
					collectionImage.style.display = 'float';
					var postTitle = newPost.querySelector('.post-title');
					postTitle.appendChild(collectionImage);
					newPost.querySelector('.profile-picture').style.border =
						'2px solid #FFFFFF';
					newPost.querySelector('.num-comments').style.color = 'white';
					newPost.querySelector('.num-likes').style.color = 'white';
					break;
				case 'playlist':
					console.log('POST PLAYLIST ID:', post.item_id);
					if (post.item_id !== null) {
						await populatePlaylist(newPost, post.item_id);
					}
					let playlistImage = document.createElement('img');
					playlistImage.src = 'img/playlist-icon.png';
					playlistImage.style.height = '1em';
					playlistImage.style.display = 'float';
					playlistImage.style.filter = 'invert(1)';
					var postTitle = newPost.querySelector('.post-title');
					postTitle.appendChild(playlistImage);
					break;
			}

			setTimeout(() => {
				newPost.style.opacity = '1';
			}, 20);
		}
	}
}); // End Main Activities
