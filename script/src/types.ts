export interface StickAxisInfo {
    min: number,
    max: number,
    increment: number,
}

export interface StickManifestInfo {
    name: string,
    frames: {
        location: string,
        fileNameFormat: string,
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

export interface LogEntry extends StickPositions {
    time: number,
}

export interface FramePaths {
    leftFramePath: string,
    rightFramePath: string,
}

export enum TransmitterModes {
    Mode1 = 1,
    Mode2,
    Mode3,
    Mode4,
}