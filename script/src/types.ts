export interface StickAxisInfo {
    min: number,
    max: number,
    step: number,
}

export interface StickFrameInfo {
    name: string,
    frames: {
        location: string,
        x: StickAxisInfo,
        y: StickAxisInfo,
    }
}

export interface StickPositions {
    roll: number,
    pitch: number,
    yaw: number,
    throttle: number,
}

export interface Log extends StickPositions {
    time: number,
}

export interface FramePaths {
    left: string,
    right: string,
}

export enum TransmitterModes {
    Mode1 = 1,
    Mode2,
    Mode3,
    Mode4,
}