import { Schema } from 'electron-store';

export interface ISettings {
    firstLoad: boolean,
    windowPosition: {
        x: number,
        y: number
    }
}

export const schema: Schema<ISettings> = {
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
};
