import db from './supabaseClient.js';

/**
 * Formats the time keeper of an audio element
 * @param {*} time 
 * @returns 
 */
function formatTime(time) {
	const minutes = Math.floor(time / 60);
	const seconds = Math.floor(time % 60);
	return `${minutes.toString()}:${seconds.toString().padStart(2, '0')}`;
}
/**
 * Gets the users profile picture by user_id
 * @param {string} userId
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
 * Gets the user's display name based on user_id
 * @param {string} userId
 * @returns
 */
async function getDisplayName(userId) {
	// console.log('getDisplayName(' + userId + ')');
	let displayNameObj = await db
		.from('user')
		.select('display_name')
		.eq('id', userId)
		.single();
	return displayNameObj.data['display_name'];
}

/**
 * Retrieves the public url for a song's cover image based on the short cover_image_url
 * @param {*} coverUrl
 * @returns
 */
async function getCoverImageUrl(coverUrl) {
	let { data, error } = await db.storage
		.from('cover_images')
		.getPublicUrl(coverUrl);
	return data.publicUrl;
}

/**
 * Retrieves the public url of an audio file
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

document.addEventListener('DOMContentLoaded', async () => {
	const sessionData = await db.auth.getSession();

	if (sessionData.data.session === null) {
		window.location.href = 'login.html';
	}
	const userData = await sessionData.data.session.user;
	const currentUserId = userData.id;
	// const displayName = await getDisplayName(userData.id);

	const userColumns = await db.from('user').select('*').eq('id', userData.id);

	const container = document.querySelector('.audio-player-container');

	let { data, error } = await db.from('song').select('*');

	const songs = data;

	const mainElement = document.querySelector('main');
	mainElement.innerHTML = '';
	console.log(songs);
	for (const song of songs) {
		console.log(song);
		let newSong = container.cloneNode(true);

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

		playButton.addEventListener('click', () => {
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

		audioPlayer.src = await getAudioUrl(song.url);

		seekSlider.addEventListener('input', () => {
			audioPlayer.currentTime = (seekSlider.value / 100) * audioPlayer.duration;
		});

		mainElement.appendChild(newSong);
	}
});
