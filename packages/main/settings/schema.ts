import { Schema } from 'electron-store';
import { TransmitterModes } from '../renderer/types';

export interface GimbalRenderSettings {
    mode: TransmitterModes,
    outputFps: number,
}

export interface AppSettings {
    firstLoad: boolean,
    windowPosition: {
        x: number,
        y: number
    },
    gimbalRenderSettings: GimbalRenderSettings
}

export const schema: Schema<AppSettings> = {
    firstLoad: {
        type: 'boolean',
        default: true,
    },
    windowPosition: {
        type: 'object',
        default: {},
        properties: {
            x: { type: 'integer', default: 0 },
            y: { type: 'integer', default: 0 },
        },
    },
    gimbalRenderSettings: {
        type: 'object',
        default: {},
        properties: {
            mode: { type: 'integer', default: TransmitterModes.Mode2 },
            outputFps: { type: 'integer', default: 30 },
        },
    },
};
