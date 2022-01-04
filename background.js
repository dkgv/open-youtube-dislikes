const apiURL = 'https://gustavvy.com';

// eslint-disable-next-line no-undef
getBrowserHandle().runtime.onMessage.addListener(function(request, _sender, sendResponse) {
    switch (request.message) {
        case 'video':
            sendRequest('/video/' + request.videoID, 'POST', request.payload, sendResponse); 
            return true;

        case 'like_video':
            sendRequest('/video/' + request.videoID + '/like', 'POST', request.action, sendResponse);
            return true;

        case 'dislike_video':
            sendRequest('/video/' + request.videoID + '/dislike', 'POST', request.action, sendResponse);
            return true;
    }

    return true;
});

function sendRequest(endpoint, method, payload, callback) {
    console.debug('Sending ' + method + ' request to ' + apiURL + endpoint + ' with payload: ' + JSON.stringify(payload));
    return fetch(`${apiURL}${endpoint}`, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-User-ID': getUserID()
        },
        body: JSON.stringify(payload)
    })
        .then(response => response.json())
        .then(response => callback(response))
        .catch();
}