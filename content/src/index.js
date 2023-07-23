import './button'
import './projector'
import {recorderEventCenter} from './record'

recorderEventCenter.subscribe('onSave', (_, body) => {
    // send to popup.js
    chrome.runtime.sendMessage({ type: 'onSaveRecorder', body });
})