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

let events = [];
let recorderStopFn =  null
export function recorderStart(){
    recorderStopFn = rrweb.record({
        emit(event) {
          // push event into the events array
          events.push(event);
          if(events.length > 100){
            events.shift();
          }
        },
        blockClass: /^lulu-*/g,
    });
}
export function recorderStop(){
    recorderStopFn && recorderStopFn()
    recorderStopFn = null
}

// this function will send events to the backend and reset the events array
export function save() {
  const body = JSON.stringify({ events });
  events = [];
  recorderEventCenter.publish('onSave', body);
}