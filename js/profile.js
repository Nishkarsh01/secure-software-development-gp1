import db from './supabaseClient.js';

/**
 * Formats times for audio player
 * @param {*} time
 * @returns
 */
function formatTime(time) {
	const minutes = Math.floor(time / 60);
	const seconds = Math.floor(time % 60);
	return `${minutes.toString()}:${seconds.toString().padStart(2, '0')}`;
}
/**
 * Retrieves the location of the given user's profile picture
 * @param {*} userId
 * @returns The url of the profile pic
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
 * Retrieves the song information based on the user id
 * @param {*} userId
 * @returns A data object containing the response from the database
 */
async function fetchSongs(userId) {
	let { data, error } = await db.from('song').select('*').eq('user_id', userId);
	return data;
}

async function fetchSong(id) {
	let { data, error } = await db.from('song').select('*').eq('id', id).single();
	return data;
}

async function fetchCollections(userId) {
	console.log('Fetching collections for user id: ', userId);
	var { data, error } = await db
		.from('collection')
		.select('*')
		.eq('user_id', userId);

	return data;
}

/**
 * Copies and creates audio player modules
 * @param {*} songs
 */
async function populateSongs(songs) {
	const container = document.querySelector('.audio-player-container');
	const mainElement = document.getElementsByClassName('all-audio-container')[0];
	mainElement.innerHTML = '';
	console.log(songs);
	for (const song of songs) {
		console.log(song);
		// clone the template container
		let newSong = container.cloneNode(true);
		// Get parts of the song container
		let audioPlayer = newSong.querySelector('.audio-player');
		let artistDisplay = newSong.querySelector('.audio-artist-display');
		let coverImage = newSong.querySelector('.audio-cover-image');
		let audioTitle = newSong.querySelector('.audio-title');
		let audioProfilePic = newSong.querySelector('.audio-profile-pic');
		let playButton = newSong.querySelector('.playButton');
		let pauseButton = newSong.querySelector('.pauseButton');
		let seekSlider = newSong.querySelector('.seekSlider');
		let currentTimeDisplay = newSong.querySelector('.currentTime');
		let totalDurationDisplay = newSong.querySelector('.totalDuration');

		artistDisplay.innerHTML = await getDisplayName(song.user_id);
		audioTitle.innerHTML = song.title;
		coverImage.src = await getCoverImageUrl(song.cover_image_url);
		audioProfilePic.src = await getProfilePicUrl(song.user_id);

		let isAudioLoaded = false;
		playButton.addEventListener('click', async () => {
			if (!isAudioLoaded) {
				audioPlayer.src = await getAudioUrl(song.url);
				audioPlayer.load();
				isAudioLoaded = true;
			}
			let allAudioEmenets = document.querySelectorAll('audio');

			allAudioEmenets.forEach((a) => {
				a.pause();
				a
					.closest('.audio-player-container')
					.querySelector('.pauseButton').style.display = 'none';
				a
					.closest('.audio-player-container')
					.querySelector('.playButton').style.display = '';
			});

			audioPlayer.play();
			playButton.style.display = 'none';
			pauseButton.style.display = '';
		});

		pauseButton.addEventListener('click', () => {
			audioPlayer.pause();
			pauseButton.style.display = 'none';
			playButton.style.display = '';
		});

		audioPlayer.addEventListener('timeupdate', () => {
			const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
			seekSlider.value = progress;
			currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
		});

		audioPlayer.addEventListener('loadedmetadata', () => {
			totalDurationDisplay.textContent = formatTime(audioPlayer.duration);
		});

		seekSlider.addEventListener('input', () => {
			audioPlayer.currentTime = (seekSlider.value / 100) * audioPlayer.duration;
		});

		mainElement.appendChild(newSong);
	}
}
/**
 * Pauses all other audio elements in the DOM that are not the given
 * audio element
 * @param {*} current The audio player not to pause
 */
function pauseOtherAudio(current) {
	const audioElements = document.querySelectorAll('audio');

	audioElements.forEach(audio => {
		if (audio !== current) {
			audio.pause();
		}
	})
}
/**
 * Creates an audio element that will play a song with the given song id.
 * Audio elements are set to not load audio until play is clicked.
 * @param {*} songId 
 * @returns An audio element for the given song id
 */
async function createAudioElement(songId) {
	var audio = document.createElement('audio');

	audio.src = await getAudioUrl(songId);

	audio.controls = true;
	audio.preload = 'none';
	audio.addEventListener('play', () => {
		pauseOtherAudio(audio)
	})

	return audio;
}
/**
 * Populates the collections element with appropriate data
 * @param {*} collections 
 */
async function populateCollections(collections) {
	const container = document.querySelector('.collections-container');
	const mainElement = document.querySelector('.all-collections-container');
	mainElement.innerHTML = '';

	for (const collection of collections) {
		let newCollection = container.cloneNode(true);
		newCollection.style.opacity = '0';

		let collectionItemsData = await db
			.from('collection_item')
			.select('*')
			.eq('collection_id', collection.id);
		console.log('Collection ID', collection.id);
		console.log('Collection Title', collection.title)
		console.log('Collection Items Data', collectionItemsData);

		let collectionTitle = newCollection.querySelector('.collection-title');
		let collectionAuthor = newCollection.querySelector('.collection-author');
		let collectionDescription = newCollection.querySelector('.collection-description');

		collectionTitle.innerHTML = collection.title;
		collectionAuthor.innerHTML = 'Curated by ';
		collectionAuthor.innerHTML += await getDisplayName(collection.user_id);
		collectionDescription.innerHTML = '<em>' + collection.description + '</em>';


		// Populating the collections list
		let collectionItemsList = newCollection.querySelector('.collection-items-list'); 
		let collectionItemContainer = newCollection.querySelector('.collection-item')
		console.log('Why is this undefined: ', collectionItemContainer);
		collectionItemsList.innerHTML = '';

		for (const collectionItem of collectionItemsData.data) {
			console.log('Collection Item: ', collectionItem);
			let itemToAdd = collectionItemContainer.cloneNode(true);
			
			let itemTitle = itemToAdd.querySelector('.collection-item-title');
			let itemImg = itemToAdd.querySelector('.collection-item-img');
			let itemUserName = itemToAdd.querySelector('.collection-item-user-name');
			let itemUserPicture = itemToAdd.querySelector('.collection-item-user-img');		
			let itemData;

			if (collectionItem.item_type === 'song') {
				itemData = await fetchSong(collectionItem.item_id);

				itemTitle.innerHTML = itemData.title;
				itemImg.src = await getCoverImageUrl(itemData.cover_image_url);
				itemUserName.innerHTML = await getDisplayName(itemData.user_id);
				itemUserPicture.src = await getProfilePicUrl(itemData.user_id);
				let audioElement = await createAudioElement(collectionItem.item_id);
				audioElement.src = await getAudioUrl(itemData.url)
				itemToAdd.appendChild(audioElement);
			}

			collectionItemsList.appendChild(itemToAdd);
		}

		mainElement.appendChild(newCollection);

		setTimeout(() => {
			newCollection.style.opacity = '1';
		}, 20);
	}
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

	return data.publicUrl;
}
/**
 * Gets the full public audio url based on the short one for the audio
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
 * On DOM content load. Considered the main activities of the page
 */
document.addEventListener('DOMContentLoaded', async () => {
	const sessionData = await db.auth.getSession();

	if (sessionData.data.session === null) {
		window.location.href = 'login.html';
	}
	const userData = await sessionData.data.session.user;
	const currentUserId = userData.id;

	console.log('Adding event listeners to profile buttons');
	const profilePostsButton = document.getElementById('profilePostsButton');
	const profileSongsButton = document.getElementById('profileSongsButton');
	const profileAlbumsButton = document.getElementById('profileAlbumsButton');
	const profilePlaylistsButton = document.getElementById(
		'profilePlaylistsButton'
	);
	const profileCollectionsButton = document.getElementById(
		'profileCollectionsButton'
	);

	const profileButtons = [
		profilePostsButton,
		profileSongsButton,
		profileAlbumsButton,
		profilePlaylistsButton,
		profileCollectionsButton,
	];

	const allPostsContainer = document.getElementsByClassName(
		'all-posts-container'
	)[0];
	const allAudioContainer = document.getElementsByClassName(
		'all-audio-container'
	)[0];
	const allAlbumsContainer = document.getElementsByClassName(
		'all-albums-container'
	)[0];
	const allPlaylistsContainer = document.getElementsByClassName(
		'all-playlists-container'
	)[0];
	const allCollectionsContainer = document.getElementsByClassName(
		'all-collections-container'
	)[0];

	const profileContainers = [
		allPostsContainer,
		allAudioContainer,
		allAlbumsContainer,
		allPlaylistsContainer,
		allCollectionsContainer,
	];

	allAudioContainer.style.display = 'none';

	// POSTS button click
	profilePostsButton.addEventListener('click', async () => {
		console.log('Clicked POSTS');
		for (let btn of profileButtons) {
			btn.classList.remove('profile-button-active');
		}
		for (let container of profileContainers) {
			container.style.display = 'none';
		}
		allPostsContainer.style.display = 'block';
		profilePostsButton.classList.add('profile-button-active');
	});

	var songsLoaded = false;
	// SONGS button click
	profileSongsButton.addEventListener('click', async () => {
		console.log('Clicked SONGS');
		for (let btn of profileButtons) {
			btn.classList.remove('profile-button-active');
		}
		for (let container of profileContainers) {
			console.log(container);
			container.style.display = 'none';
		}

		if (!songsLoaded) {
			songsLoaded = true;
			let songData = await fetchSongs(userData.id);
			console.log(songData);
			await populateSongs(songData);
		}

		allAudioContainer.style.display = 'block';
		profileSongsButton.classList.add('profile-button-active');
	});
	// ALBUMS button click
	profileAlbumsButton.addEventListener('click', async () => {
		console.log('Clicked ALBUMS');
		for (let btn of profileButtons) {
			btn.classList.remove('profile-button-active');
		}

		for (let container of profileContainers) {
			container.style.display = 'none';
		}
		allAlbumsContainer.syle.display = 'block';
		profileAlbumsButton.classList.add('profile-button-active');
	});
	// PLYLISTS button click
	profilePlaylistsButton.addEventListener('click', async () => {
		console.log('Clicked PLAYLISTS');
		for (let btn of profileButtons) {
			btn.classList.remove('profile-button-active');
		}

		for (let container of profileContainers) {
			container.style.display = 'none';
		}

		allPlaylistsContainer.style.display = 'block';
		profilePlaylistsButton.classList.add('profile-button-active');
	});
	// COLLECTIONS button click
	var collectionsLoaded = false;
	profileCollectionsButton.addEventListener('click', async () => {
		console.log('Clicked COLLECTIONS');
		for (let btn of profileButtons) {
			btn.classList.remove('profile-button-active');
		}
		profileCollectionsButton.classList.add('profile-button-active');
		for (let container of profileContainers) {
			container.style.display = 'none';
		}

		if (!collectionsLoaded) {
			collectionsLoaded = true;
			let collectionsData = await fetchCollections(userData.id);
			await populateCollections(collectionsData);
		}

		allCollectionsContainer.style.display = 'block';
		profileCollectionsButton.classList.add('profile-button-active');
	});
});
