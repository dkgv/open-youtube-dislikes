console.log("open-yt-dislikes.js! " + new Date());

const dislikeButtonPath = 'ytd-toggle-button-renderer.style-scope:nth-child(2) > a:nth-child(1)';
let hasDislikedVideo = false;

window.onload = function() {
    registerVideo();
    hookDislikeButton();
    injectDislikes();
};

function registerVideo() {
    let payload = buildVideoPayload();
    let videoID = payload['id'];
    sendRequest('/video/' + videoID, 'POST', payload, function(response) {
        if (response.status != 200) {
            return;
        }

        hasDislikedVideo = response.json().has_disliked;
    });
}

function injectDislikes() {
    let payload = buildVideoPayload();
    let videoID = payload['id'];
    sendRequest('/video/' + videoID + '/dislikes', 'GET', payload, function(response) {
        if (response.status != 200) {
            return;
        }

        let dislikeButton = document.querySelector(dislikeButtonPath);
        if (!dislikeButton) {
            return;
        }

        dislikeButton.innerText = response.json().dislikes;
    });
}

function hookDislikeButton() {
    let dislikeButton = document.querySelector(dislikeButtonPath);
    if (!dislikeButton) {
        console.log("No dislike button found");
    }

    dislikeButton.addEventListener('click', function(e) {
        e.preventDefault();

        let videoID = extractVideoID();
        let endpoint = '/video/' + videoID;
        if (hasDislikedVideo) {
            endpoint += '/undislike';
        } else {
            endpoint += '/dislike';
        }

        hasDislikedVideo = !hasDislikedVideo;
        sendRequest(endpoint, 'POST', {}, function(response) {});
    });
}

async function sendRequest(endpoint, method, body, callback) {
    let url = getAPIUrl(endpoint);
    const response = await fetch(url, {
        method: method,
        body: body,
        headers: {
            'X-User-ID': getUserID()
        }
    });
    callback(response);
}

function getUserID() {
    const key = 'open_yt_dislikes_user_id';
    let userID = localStorage.getItem(key);
    if (userID) {
        return userID;
    }

    let uuid = generateUUID();
    localStorage.setItem(key, uuid);
    return uuid;
}

// https://gist.github.com/jsmithdev/1f31f9f3912d40f6b60bdc7e8098ee9f
function generateUUID(){
    let dt = new Date().getTime()    
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = (dt + Math.random()*16)%16 | 0
        dt = Math.floor(dt/16)
        return (c=='x' ? r :(r&0x3|0x8)).toString(16)
    })
    return uuid
}

function getAPIUrl(endpoint) {
    return 'https://gustavvy.com/api/v1' + endpoint;
}

function buildVideoPayload() {
    let videoID = extractVideoID();
    let hashedVideoID = hashVideoID(videoID);
    let viewCount = extractViewCount();
    let likeCount = extractLikeCount();
    let commentCount = extractCommentCount();
    let subscriberCount = extractSubscriberCount();
    let publishedAt = extractPublishedAt();

    return {
        'id': videoID,
        'id_hash': hashedVideoID,
        'views': viewCount,
        'likes': likeCount,
        'comments': commentCount,
        'subscribers': subscriberCount,
        'published_at': publishedAt
    };
}

function hashVideoID(videoID) {
    const array = new TextEncoder().encode(videoID);
    return window.crypto.subtle.digest('SHA-256', array);
}

function extractSubscriberCount() {
    const subscriberCountPath = '#owner-sub-count';
    let subscriberCount = document.querySelector(subscriberCountPath);
    if (!subscriberCount) {
        return -1;
    }

    let subscriberCountString = subscriberCount.getAttribute('aria-label');
    let subscribersIndex = subscriberCountString.indexOf(' subscribers');
    if (subscribersIndex > -1) {
        subscriberCountString = subscriberCountString.substring(0, subscribersIndex);
    }

    let modifier = 1;
    if (subscriberCountString.indexOf('K') > -1) {
        modifier = 1000;
    }

    if (subscriberCountString.indexOf('M') > -1) {
        modifier = 1000000;
    }

    let count = Number(subscriberCountString.replace(/[MK]/g, ''));
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

    // Parse date format "Dec 10, 2020"
    let dateString = publishedDate.innerText;
    let date = new Date(dateString);

    // Convert date to millis
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
