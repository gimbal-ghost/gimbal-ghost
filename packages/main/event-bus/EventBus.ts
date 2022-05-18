import EventEmitter from 'events';
import { EventNames, Event } from './types';

class EveryEventEmitter extends EventEmitter {
    emit(eventName: EventNames, payload: object): boolean {
        // Allow listening for all events
        // Modify the payload to include the event name
        super.emit(EventNames.Every, { name: eventName, ...payload } as Event);
        return super.emit(eventName, { name: eventName, ...payload } as Event);
    }
}

export const EventBus = new EveryEventEmitter();
