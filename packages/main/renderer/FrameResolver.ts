import path from 'path';
import {
    BlackboxSources,
    FramePaths, StickManifestInfo, StickPositions, TransmitterModes,
} from './types';
import { clamp, scale, nearest } from './utils';

export interface FrameResolverOptions {
    stickManifestPath: string,
    blackboxSource: BlackboxSources,
    transmitterMode?: TransmitterModes,
    fps?: number,
}

export class FrameResolver {
    private stickManifestFile: path.ParsedPath;

    private stickInfo: StickManifestInfo;

    private stickFramesDirectory: string;

    private transmitterMode: TransmitterModes;

    blackboxSource: BlackboxSources;

    fps: number;

    microSecPerFrame: number;

    constructor({
        stickManifestPath,
        blackboxSource,
        transmitterMode = TransmitterModes.Mode2,
        fps = 30,
    } = {} as FrameResolverOptions) {
        this.stickManifestFile = path.parse(stickManifestPath);

        if (this.stickManifestFile.ext !== '.json') {
            throw Error(`Stick manifest file must end in .json. Filename passed: ${this.stickManifestFile.base}`);
        }

        // eslint-disable-next-line import/no-dynamic-require, global-require
        this.stickInfo = require(stickManifestPath);
        this.stickFramesDirectory = path
            .resolve(this.stickManifestFile.dir, this.stickInfo.frames.location);
        this.blackboxSource = blackboxSource;
        this.transmitterMode = transmitterMode;
        this.fps = fps;
        const secPerFrame = 1 / fps;
        this.microSecPerFrame = Math.floor(secPerFrame * 1000000);
    }

    private getSourceInputRanges() {
        if (this.blackboxSource === BlackboxSources.Rotorflight) {
            return {
                roll: { min: -500, max: 500 },
                pitch: { min: -500, max: 500 },
                yaw: { min: -500, max: 500 },
                // Rotorflight rcCommand[3] blackbox output values are modified
                throttle: { min: -500, max: 500 },
            };
        }

        if (this.blackboxSource === BlackboxSources.EdgeTX) {
            return {
                roll: { min: -1024, max: 1024 },
                pitch: { min: -1024, max: 1024 },
                yaw: { min: -1024, max: 1024 },
                throttle: { min: -1024, max: 1024 },
            };
        }

        // Betaflight or EmuFlight
        return {
            roll: { min: -500, max: 500 },
            pitch: { min: -500, max: 500 },
            yaw: { min: -500, max: 500 },
            throttle: { min: 1000, max: 2000 },
        };
    }

    private getSourceInputValues(stickPositions: StickPositions) {
        if (this.blackboxSource === BlackboxSources.BetaOrEmuFlight) {
            return {
                ...stickPositions,
                // Yaw must be inverted from the raw data
                yaw: -stickPositions.yaw,
            };
        }

        return stickPositions;
    }

    generateFrameFileNames(stickPositions: StickPositions): FramePaths {
        const inputRanges = this.getSourceInputRanges();
        const inputValues = this.getSourceInputValues(stickPositions);

        const frameStickPositions = {
            roll: FrameResolver.getFramePosition({
                inputValue: inputValues.roll,
                inputMin: inputRanges.roll.min,
                inputMax: inputRanges.roll.max,
                outputMin: this.stickInfo.frames.x.min,
                outputMax: this.stickInfo.frames.x.max,
                increment: this.stickInfo.frames.x.increment,
            }),
            pitch: FrameResolver.getFramePosition({
                inputValue: inputValues.pitch,
                inputMin: inputRanges.pitch.min,
                inputMax: inputRanges.pitch.max,
                outputMin: this.stickInfo.frames.y.min,
                outputMax: this.stickInfo.frames.y.max,
                increment: this.stickInfo.frames.y.increment,
            }),
            yaw: FrameResolver.getFramePosition({
                inputValue: inputValues.yaw,
                inputMin: inputRanges.yaw.min,
                inputMax: inputRanges.yaw.max,
                outputMin: this.stickInfo.frames.x.min,
                outputMax: this.stickInfo.frames.x.max,
                increment: this.stickInfo.frames.x.increment,
            }),
            throttle: FrameResolver.getFramePosition({
                inputValue: inputValues.throttle,
                inputMin: inputRanges.throttle.min,
                inputMax: inputRanges.throttle.max,
                outputMin: this.stickInfo.frames.y.min,
                outputMax: this.stickInfo.frames.y.max,
                increment: this.stickInfo.frames.y.increment,
            }),
        } as StickPositions;

        switch (this.transmitterMode) {
            case TransmitterModes.Mode1: {
                return {
                    leftFramePath: path.resolve(
                        this.stickFramesDirectory,
                        this.stickInfo.frames.fileNameFormat.replace(
                            '<x>',
                            frameStickPositions.yaw.toString(),
                        ).replace(
                            '<y>',
                            frameStickPositions.pitch.toString(),
                        ),
                    ),
                    rightFramePath: path.resolve(
                        this.stickFramesDirectory,
                        this.stickInfo.frames.fileNameFormat.replace(
                            '<x>',
                            frameStickPositions.roll.toString(),
                        ).replace(
                            '<y>',
                            frameStickPositions.throttle.toString(),
                        ),
                    ),
                } as FramePaths;
            }
            case TransmitterModes.Mode2:
                return {
                    leftFramePath: path.resolve(
                        this.stickFramesDirectory,
                        this.stickInfo.frames.fileNameFormat.replace(
                            '<x>',
                            frameStickPositions.yaw.toString(),
                        ).replace(
                            '<y>',
                            frameStickPositions.throttle.toString(),
                        ),
                    ),
                    rightFramePath: path.resolve(
                        this.stickFramesDirectory,
                        this.stickInfo.frames.fileNameFormat.replace(
                            '<x>',
                            frameStickPositions.roll.toString(),
                        ).replace(
                            '<y>',
                            frameStickPositions.pitch.toString(),
                        ),
                    ),
                } as FramePaths;
            case TransmitterModes.Mode3:
                return {
                    leftFramePath: path.resolve(
                        this.stickFramesDirectory,
                        this.stickInfo.frames.fileNameFormat.replace(
                            '<x>',
                            frameStickPositions.roll.toString(),
                        ).replace(
                            '<y>',
                            frameStickPositions.pitch.toString(),
                        ),
                    ),
                    rightFramePath: path.resolve(
                        this.stickFramesDirectory,
                        this.stickInfo.frames.fileNameFormat.replace(
                            '<x>',
                            frameStickPositions.yaw.toString(),
                        ).replace(
                            '<y>',
                            frameStickPositions.throttle.toString(),
                        ),
                    ),
                } as FramePaths;
            default:
                return {
                    leftFramePath: path.resolve(
                        this.stickFramesDirectory,
                        this.stickInfo.frames.fileNameFormat.replace(
                            '<x>',
                            frameStickPositions.roll.toString(),
                        ).replace(
                            '<y>',
                            frameStickPositions.throttle.toString(),
                        ),
                    ),
                    rightFramePath: path.resolve(
                        this.stickFramesDirectory,
                        this.stickInfo.frames.fileNameFormat.replace(
                            '<x>',
                            frameStickPositions.yaw.toString(),
                        ).replace(
                            '<y>',
                            frameStickPositions.pitch.toString(),
                        ),
                    ),
                } as FramePaths;
        }
    }

    // Convert the log stick position to a frame position that is within the allowable frames
    static getFramePosition({
        inputValue, inputMin, inputMax, outputMin, outputMax, increment,
    }: {
        inputValue: number,
        inputMin: number,
        inputMax: number,
        outputMin: number,
        outputMax: number,
        increment: number,
    }): number {
        const clampedValue = clamp(inputValue, inputMin, inputMax);
        const scaledValue = scale(clampedValue, inputMin, inputMax, outputMin, outputMax);
        const nearestFrameValue = nearest(scaledValue, outputMin, outputMax, increment);
        return nearestFrameValue;
    }
}
