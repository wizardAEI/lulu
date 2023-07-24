import rrwebPlayer from 'rrweb-player';
import button from './button';
const projector = document.createElement("div");
projector.className = 'lulu-projector'
document.body.appendChild(projector)

let player = null
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'onPlayRecorder') {
        projector.className = 'lulu-projector active'
        console.log(request.events)
        const contentDom = document.createElement("div");
        contentDom.className = 'lulu-projector-content'
        projector.appendChild(contentDom)
        player = null
        player =  new rrwebPlayer({
            target: contentDom,
            props: {
                events: request.events,
                width: 1200,
                height: 700,
            }
        })
        button.style.backgroundImage = `url(${chrome.runtime.getURL("assets/close_fill.svg")})`;
        button.showCloseButton = true
        player.play();
        // auto replay
        player.on('finish', () => {
            player.play();
        })
    }
})