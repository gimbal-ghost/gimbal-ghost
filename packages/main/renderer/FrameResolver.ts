import path from 'path';
import {
    FramePaths, StickManifestInfo, StickPositions, TransmitterModes,
} from './types';
import { clamp, scale, nearest } from './utils';

export interface FrameResolverOptions {
    stickManifestPath: string,
    transmitterMode?: TransmitterModes,
    fps?: number,
}

export class FrameResolver {
    private stickManifestFile: path.ParsedPath;

    private stickInfo: StickManifestInfo;

    private stickFramesDirectory: string;

    private transmitterMode: TransmitterModes;

    fps: number;

    microSecPerFrame: number;

    constructor({
        stickManifestPath,
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
        this.transmitterMode = transmitterMode;
        this.fps = fps;
        const secPerFrame = 1 / fps;
        this.microSecPerFrame = Math.floor(secPerFrame * 1000000);
    }

    generateFrameFileNames(stickPositions: StickPositions): FramePaths {
        const frameStickPositions = {
            roll: FrameResolver.getFramePosition(
                stickPositions.roll,
                -500,
                500,
                this.stickInfo.frames.x.min,
                this.stickInfo.frames.x.max,
                this.stickInfo.frames.x.increment,
            ),
            pitch: FrameResolver.getFramePosition(
                stickPositions.pitch,
                -500,
                500,
                this.stickInfo.frames.y.min,
                this.stickInfo.frames.y.max,
                this.stickInfo.frames.y.increment,
            ),
            yaw: FrameResolver.getFramePosition(
                stickPositions.yaw,
                -500,
                500,
                this.stickInfo.frames.x.min,
                this.stickInfo.frames.x.max,
                this.stickInfo.frames.x.increment,
            ),
            throttle: FrameResolver.getFramePosition(
                stickPositions.throttle,
                1000,
                2000,
                this.stickInfo.frames.y.min,
                this.stickInfo.frames.y.max,
                this.stickInfo.frames.y.increment,
            ),
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
    static getFramePosition(
        value: number,
        initialMin: number,
        initialMax: number,
        finalMin: number,
        finalMax: number,
        increment: number,
    ): number {
        const clampedValue = clamp(value, initialMin, initialMax);
        const scaledValue = scale(clampedValue, initialMin, initialMax, finalMin, finalMax);
        const nearestFrameValue = nearest(scaledValue, finalMin, finalMax, increment);
        return nearestFrameValue;
    }
}
