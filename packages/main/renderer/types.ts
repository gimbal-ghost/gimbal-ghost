/* eslint-disable no-unused-vars */
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

export interface DemuxFilePair {
    leftDemuxFilePath: string,
    rightDemuxFilePath: string,
}

// See: https://github.com/typescript-eslint/typescript-eslint/issues/325
// eslint-disable-next-line no-shadow
export enum TransmitterModes {
    Mode1 = 1,
    Mode2,
    Mode3,
    Mode4,
}

// See: https://github.com/typescript-eslint/typescript-eslint/issues/325
// eslint-disable-next-line no-shadow
export enum AllowedLogExtensions {
    BBL = 'bbl',
    BFL = 'bfl',
}

// See: https://github.com/typescript-eslint/typescript-eslint/issues/325
// eslint-disable-next-line no-shadow
export enum BlackboxSources {
  BetaOrEmuFlight = 'betaOrEmuflight',
  Rotorflight = 'rotorflight',
}
