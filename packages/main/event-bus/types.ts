export enum EventNames {
    Every = '*',
    BlackboxFlightUpdate = 'blackboxFlightUpdate',
}

export interface Event {
    name: EventNames,
}
