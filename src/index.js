import moment from 'moment'

// get events from background
chrome.runtime.sendMessage({type: 'getEventsList'}, (list) => {
    const ListDom = document.getElementById('recordList')
    // remove the original list or data
    ListDom.innerHTML = ''
    list.forEach((item) => {
        const itemDom = document.createElement('div')
        itemDom.className = 'item'
        itemDom.innerHTML = `
                <span>${ moment(item.time).format('YYYY-MM-DD h:mm:ss')}的视频</span>
        `
        const itemButtonDom = document.createElement('button')
        itemButtonDom.className = 'btn-player'
        itemButtonDom.innerText = '播放'
        itemButtonDom.addEventListener('click', () => playRecorder(item.events))
        itemDom.appendChild(itemButtonDom)
        ListDom.appendChild(itemDom)   
    })
})

function playRecorder(events) {
    // send event to own content
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {type: 'onPlayRecorder', events});
    });
}