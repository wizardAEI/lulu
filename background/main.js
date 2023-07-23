(function (factory) {
    typeof define === 'function' && define.amd ? define(factory) :
    factory();
})((function () { 'use strict';

    let eventsList = [];

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'onSaveRecorder') {
            eventsList.push({
                time: new Date().getTime(),
                events: JSON.parse(request.body).events
            });
            if(eventsList.length > 10){
                eventsList.shift();
            }
        }
    });


    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'getEventsList') {
            sendResponse(eventsList);
        }
    });

}));
