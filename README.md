<h1>
    <sub>
        <img src="https://github.com/dkgv/open-youtube-dislikes/blob/master/icons/icon-48.png?raw=true" height="38" width="38">
    </sub>
    Open YouTube Dislikes
</h1>

Open YouTube Dislikes is a truly open source browser extension created to restore YouTube dislike functionality to all videos.

## Download

<a href="https://addons.mozilla.org/firefox/addon/open-youtube-dislikes/"><img src="https://i.imgur.com/ihUptG8.png" alt="Get Open YouTube Dislikes for Firefox" /></a>
<a href="https://chrome.google.com/webstore/detail/open-youtube-dislikes/ncdbokbicfmcagdonblpnggbgelbmcde"><img height="64" src="https://i.imgur.com/OK0mhGN.png" alt="Get Open YouTube Dislikes for Chrome" /></a>

## How?

The extension relies on three sources to provide dislike counts:

- The first source is a >1.2B video dataset made available by the archive.org team [YouTube Dislikes](https://archive.org/details/archiveteam_youtubedislikes) (❤️).
- The second source is the dataset crowdsourced by users of this extension. 
- The third source is a machine learning model trained on the above data. The model acts as a fallback in case a video is not already known.

## Backend

The extension is powered by a Go backend which can be found here [dkgv/open-youtube-dislikes-backend](https://github.com/dkgv/open-youtube-dislikes-backend).
