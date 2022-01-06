let hasLikedVideo = false;
let hasDislikedVideo = false;
let videoResponse = null;
let initializing = false;

window.addEventListener('yt-navigate-finish', async () => await initialize(), true);
let initializer = setInterval(async () => await initialize(), 1000);

async function initialize() {
    if (initializing) {
        console.debug('Already initializing');
        return;
    }

    initializing = true;

    let timeout = 0;
    if (isVideoLoading()) {
        timeout = 500;
    }

    setTimeout(async () => {
        console.log('Initializing open-youtube-dislikes...');
        
        await injectDislikes();
        hookLikeButton();
        hookDislikeButton();

        initializing = false;
        clearInterval(initializer);
    }, timeout);
}

async function injectDislikes() {
    console.log('Injecting dislikes');

    let payload = await buildVideoPayload();
    let videoID = extractVideoID();
    // eslint-disable-next-line no-undef
    getBrowserHandle().runtime.sendMessage({
        'message': 'video',
        'payload': payload,
        'videoID': videoID,
    }, response => {
        videoResponse = response;
        hasLikedVideo = response.hasLikedVideo;
        hasDislikedVideo = response.hasDislikedVideo;
        refreshDislikeCount();
    });
}

function refreshDislikeCount() {
    if (!videoResponse) {
        console.error('No video response available to refresh dislike count');
        return;
    }

    const dislikeButtonTextPath = 'ytd-toggle-button-renderer.style-scope:nth-child(2) > a:nth-child(1) > yt-formatted-string:nth-child(2)';
    let dislikeButton = document.querySelector(dislikeButtonTextPath);
    if (!dislikeButton) {
        return;
    }

    dislikeButton.innerText = videoResponse.formattedDislikes;

    let container = document.getElementById('menu-container');
    if (!container) {
        return;
    }

    let width = 0.5;
    let likes = extractLikeCount();
    let dislikes = videoResponse.dislikes;
    if (likes + dislikes > 0) {
        width = likes / (likes + dislikes);
    }
    width *= 100;

    let rateBarElement = document.getElementById('rate-bar');
    if (!rateBarElement) {
        const rateBarHTML = `
        <div style='height: 2px; margin-left: 7px; width: 140px; background: var(--yt-spec-icon-disabled);'>
            <div id='rate-bar' style='width: ${width}%; height: 100%; border-radius: 2px; background: var(--yt-spec-text-primary);'></div>
        </div>
        `;
        container.insertAdjacentHTML('beforeend', rateBarHTML);
    } else {
        rateBarElement.style.width = width + '%';
    }
}

function hookLikeButton() {
    console.log('Hooking like button');

    const likeButtonPath = 'ytd-toggle-button-renderer.style-scope:nth-child(1)';
    hookButton(likeButtonPath, function(e) {
        e.preventDefault();

        let videoID = extractVideoID();
        let action = determineVoteAction(hasLikedVideo);
        // eslint-disable-next-line no-undef
        getBrowserHandle().runtime.sendMessage({
            'message': 'like_video',
            'action': action,
            'videoID': videoID
        });
        
        hasLikedVideo = !hasLikedVideo;
    });
}

function hookDislikeButton() {
    console.log('Hooking dislike button');

    const dislikeButtonPath = 'ytd-toggle-button-renderer.style-scope:nth-child(2)';
    hookButton(dislikeButtonPath, function(e) {
        e.preventDefault();

        let videoID = extractVideoID();
        let action = determineVoteAction(hasDislikedVideo);
        // eslint-disable-next-line no-undef
        getBrowserHandle().runtime.sendMessage({
            'message': 'dislike_video',
            'action': action,
            'videoID': videoID
        });

        hasDislikedVideo = !hasDislikedVideo;

        if (videoResponse.formattedDislikes.indexOf('K') > -1 ||videoResponse.formattedDislikes.indexOf('M') > -1) {
            return;
        }

        if (hasDislikedVideo) {
            videoResponse.dislikes++;
        } else {
            videoResponse.dislikes--;
        }

        videoResponse.formattedDislikes = '' + videoResponse.dislikes;
        refreshDislikeCount();
    });
}

function determineVoteAction(bool) {
    return bool ? 'remove' : 'add';
}

function hookButton(buttonPath, callback) {
    let button = document.querySelector(buttonPath);
    if (!button) {
        return;
    }

    button.addEventListener('click', callback);
}

function isVideoLoading() {
    let videoID = extractVideoID();
    const videoPath = 'ytd-watch-flexy[video-id="' + videoID + '"]';
    return document.querySelector(videoPath) == null;
}

async function buildVideoPayload() {
    let videoID = extractVideoID();
    let hashedVideoID = await hashVideoID(videoID);
    let viewCount = extractViewCount();
    let likeCount = extractLikeCount();
    let commentCount = extractCommentCount();
    let subscriberCount = extractSubscriberCount();
    let publishedAt = extractPublishedAt();

    return {
        'id': videoID,
        'idHash': hashedVideoID,
        'views': viewCount,
        'likes': likeCount,
        'comments': commentCount,
        'subscribers': subscriberCount,
        'publishedAt': publishedAt
    };
}

async function hashVideoID(videoID) {
    const array = new TextEncoder().encode(videoID);
    let digest = await window.crypto.subtle.digest('SHA-256', array);
    return Array.from(new Uint8Array(digest), x => ('00' + x.toString(16)).slice(-2)).join('');
}

function extractSubscriberCount() {
    const subscriberCountPath = '#owner-sub-count';
    let subscriberCount = document.querySelector(subscriberCountPath);
    if (!subscriberCount) {
        return -1;
    }

    let subscriberCountString = subscriberCount.getAttribute('aria-label').toLowerCase();

    let modifier = 1;
    if (subscriberCountString.indexOf('k') > -1) {
        modifier = 1000;
    }

    if (subscriberCountString.indexOf('million') > -1) {
        modifier = 1000000;
    }

    let count = Number(subscriberCountString.replace(/[milonksubcre]/g, ''));
    return count * modifier;
}

function extractCommentCount() {
    const commentCountPath = '.count-text > span:nth-child(1)';
    let commentCount = document.querySelector(commentCountPath);
    if (!commentCount) {
        return -1;
    }

    return Number(commentCount.innerText.replace(/,/g, ''));
}

function extractPublishedAt() {
    const publishedDatePath = 'yt-formatted-string.ytd-video-primary-info-renderer:nth-child(2)';
    let publishedDate = document.querySelector(publishedDatePath);
    if (!publishedDate) {
        return null;
    }

    // Get full date, e.g. "Started streaming on May 15, 2020"
    let fullDateString = publishedDate.innerText;

    // Only keep last 12 chars, e.g. "May 15, 2020"
    let dateString = fullDateString.substring(fullDateString.length - 12, fullDateString.length);

    // Parse date format "Dec 10, 2020" and convert to millis
    let date = new Date(dateString);
    return date.getTime();
}

function extractLikeCount() {
    const likeCountPath = 'ytd-toggle-button-renderer.style-scope:nth-child(1) > a:nth-child(1) > yt-formatted-string:nth-child(2)';
    let likeCount = document.querySelector(likeCountPath);
    if (!likeCount) {
        return -1;
    }

    let likeCountString = likeCount.getAttribute('aria-label');
    let likesIndex = likeCountString.indexOf(' likes');
    if (likesIndex > -1) {
        likeCountString = likeCountString.substring(0, likesIndex);
    }

    return Number(likeCountString.replace(/,/g, ''));
}

function extractViewCount() {
    const viewCountPath = '.view-count';
    let viewCount = document.querySelector(viewCountPath);
    if (!viewCount) {
        return -1;
    }

    let viewCountString = viewCount.innerText;
    let viewsIndex = viewCountString.indexOf(' views');
    if (viewsIndex > -1) {
        viewCountString = viewCountString.substring(0, viewsIndex);
    }

    // Video is a live stream
    if (viewCountString.indexOf('watching') >= 0) {
        return -1;
    }

    return Number(viewCountString.replace(/,/g, ''));
}

function extractVideoID() {
    let url = window.location.href;
    if (url.indexOf('?v=') === -1) {
        return null;
    }

    let videoID = url.split('?v=')[1];
    if (videoID.indexOf('&') > -1) {
        videoID = videoID.split('&')[0];
    }

    return videoID;
}
