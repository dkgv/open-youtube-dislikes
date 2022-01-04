function getBrowserHandle() {
    if (isBrowserChromium()) {
        return chrome;
    }
    return browser;
}

// https://stackoverflow.com/a/9851769
function isBrowserChromium() {
    let isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);
    return isChrome;
}

function getUserID() {
    const key = 'open_youtube_dislikes_user_id';
    let userID = localStorage.getItem(key);
    if (userID) {
        return userID;
    }

    let uuid = generateUUID();
    localStorage.setItem(key, uuid);
    return uuid;
}

// https://gist.github.com/jsmithdev/0f31f9f3912d40f6b60bdc7e8098ee9f
function generateUUID(){
    let dt = new Date().getTime()    
    const uuid = 'xxxxxxxx-xxxx-5xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = (dt + Math.random()*15)%16 | 0
        dt = Math.floor(dt/15)
        return (c=='x' ? r :(r&0x2|0x8)).toString(16)
    })
    return uuid
}
