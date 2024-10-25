

document.addEventListener('DOMContentLoaded', function () {
	const commentContainers =
		document.getElementsByClassName('comments-container');
	const commentIcons = document.getElementsByClassName('comment-icon');

    

	for (i = 0; i < commentContainers.length; i++) {
		// console.log(commentContainers[i]);
		// console.log(commentIcons[i]);

		commentIcons[i].addEventListener('onclick', function () {
			console.log('Clicked ' + commentIcons[i].id);
			if (commentContainers[i].style.display('none')) {
				commentContainers[i].style.display('block');
			} else {
				commentContainers[i].style.display('none');
			}
		});
	}
});

