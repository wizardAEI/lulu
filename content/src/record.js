import * as rrweb from 'rrweb';

class RecorderEventCenter {
    constructor() {
        this.events = [];
    }
    getEvents() {
        return this.events;
    }
    subscribe(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }
    unSubscribe(event, listener) {
        if (!this.events[event]) {
            return;
        }
        this.events[event] = this.events[event].filter((l) => l !== listener);
    }
    publish(event, ...args) {
        let listeners = this.events[event];
        listeners.forEach((listener) => {
            listener(event, ...args);
        });
    }
}

export const recorderEventCenter = new RecorderEventCenter();

let browserEvents = [];
let recorderStopFn =  null
export function recorderStart(){
    recorderStopFn = rrweb.record({
        emit(event) {
          // push event into the events array
          browserEvents.push(event);
          if(browserEvents.length > 100){
            browserEvents.shift();
          }
        },
        blockClass: /^lulu-*/g,
    });
}
export function recorderStop(){
    if(recorderStopFn) {
        recorderStopFn()
    } 
    recorderStopFn = null
}

// this function will send events to the backend and reset the events array
export function save() {
  const body = JSON.stringify({ events: browserEvents });
  browserEvents = [];
  recorderEventCenter.publish('onSave', body);
}