let hasLikedVideo = false;
let hasDislikedVideo = false;
let videoResponse = null;

window.addEventListener('yt-navigate-finish', async () => {
    await initialize();
}, true);

async function initialize() {
    let timer;

    async function awaiter() {
        if (window.location.href.indexOf('watch') == -1) {
            return;
        }

        if (isVideoLoading() || !getLikeButton()?.offsetParent || !getDislikeButton()?.offsetParent) {
            return;
        }

        await injectDislikes();

        hookLikeButton();
        hookDislikeButton();

        clearInterval(timer);
    }

    timer = setInterval(async () => await awaiter(), 200);
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
    let dislikeButtonText = document.querySelector(dislikeButtonTextPath);
    if (!dislikeButtonText) {
        return;
    }

    if (videoResponse.formattedDislikes) {
        dislikeButtonText.innerText = videoResponse.formattedDislikes;
    }

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

    let containerWidth = 140;
    let rateBarElement = document.getElementById('rate-bar');
    if (!rateBarElement) {
        const rateBarHTML = `
        <div style='height: 2px; margin-left: 6px; width: ${containerWidth}px; background: var(--yt-spec-icon-disabled);'>
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

    let likeButton = getLikeButton();
    if (!likeButton) {
        return;
    }

    likeButton.addEventListener('click', function() {
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

    let dislikeButton = getDislikeButton();
    if (!dislikeButton) {
        return;
    }

    dislikeButton.addEventListener('click', function(e) {
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

function getDislikeButton() {
    const dislikeButtonPath = 'ytd-toggle-button-renderer.style-scope:nth-child(2)';
    return document.querySelector(dislikeButtonPath);
}

function getLikeButton() {
    const likeButtonPath = 'ytd-toggle-button-renderer.style-scope:nth-child(1)';
    return document.querySelector(likeButtonPath);
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

    let payload = {
        'id': videoID,
        'idHash': hashedVideoID,
        'views': viewCount,
        'likes': likeCount,
        'comments': commentCount,
        'subscribers': subscriberCount,
        'publishedAt': publishedAt
    };
    return payload;
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

    let subscriberCountString = subscriberCount.getAttribute('aria-label');
    if (!subscriberCountString) {
        return -1;
    }
    
    subscriberCountString = subscriberCountString.toLowerCase()
    let trimmedSubscriberString = '';
    for (let i = 0; i < subscriberCountString.length; i++) {
        let isNumber = subscriberCountString[i] >= '0' && subscriberCountString[i] <= '9';
        let isSeparator = subscriberCountString[i] == ',' || subscriberCountString[i] == '.';
        if (!isNumber && !isSeparator) {
            break;
        }
        trimmedSubscriberString += subscriberCountString[i];
    }

    let modifier = 1;
    if (subscriberCountString.indexOf('k') > -1) {
        modifier = 1000;
    }

    if (subscriberCountString.indexOf('m') > -1) {
        modifier = 1000000;
    }

    let count = Number(trimmedSubscriberString.replace(',', '.'));
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

    // Get full date description, e.g. "Started streaming on May 15, 2020"
    let fullDateString = publishedDate.innerText.toLowerCase();

    // Extract relevant parts of the date string
    const monthRegex = /(jan|feb|mar|apr|may|jun|jul|aug|sep|o(k|c)t|nov|dec)/i;
    const dayRegex = /\d{1,2}/;
    const yearRegex = /\d{4}/;
    const englishRegex = new RegExp(`${monthRegex.source} ${dayRegex.source}, ${yearRegex.source}$`);
    const globalRegex = new RegExp(`${dayRegex.source}. ${monthRegex.source}. ${yearRegex.source}$`);
    const regex = new RegExp(`${englishRegex.source}|${globalRegex.source}`);
    let match = fullDateString.match(regex);
    if (match) {
        match = match[0].replace(/(,|\.)/g, '');
    }

    // Parse to date object and convert to millis
    let date = new Date(match);
    return date.getTime();
}

function extractLikeCount() {
    const likeCountPath = 'ytd-toggle-button-renderer.style-scope:nth-child(1) > a:nth-child(1) > yt-formatted-string:nth-child(2)';
    let likeCount = document.querySelector(likeCountPath);
    if (!likeCount) {
        return -1;
    }

    let likeCountString = likeCount.getAttribute('aria-label');
    return Number(likeCountString.replace(/[^0-9]/g, ''));
}

function extractViewCount() {
    const viewCountPath = '.view-count';
    let viewCount = document.querySelector(viewCountPath);
    if (!viewCount) {
        return -1;
    }

    let viewCountString = viewCount.innerText;
    return Number(viewCountString.replace(/[^0-9]/g, ''));
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
