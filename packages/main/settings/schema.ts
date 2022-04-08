import { Schema } from 'electron-store';

export interface ISettings {
    windowPosition: {
        x: number,
        y: number
    }
}

export const schema: Schema<ISettings> = {
    windowPosition: {
        type: 'object',
        default: {},
        properties: {
            x: { type: 'integer', default: 0 },
            y: { type: 'integer', default: 0 },
        },
    },
};
