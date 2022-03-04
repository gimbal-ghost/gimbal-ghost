import path from "path";
import { FramePaths, LogEntry, StickManifestInfo, StickPositions, TransmitterModes } from "./types";

export interface FrameResolverOptions {
    stickManifestPath: string,
    transmitterMode?: TransmitterModes,
    fps?: number,
}

export class FrameResolver {
    stickManifestFile: path.ParsedPath;
    stickInfo: StickManifestInfo;
    stickFramesDirectory: string;
    transmitterMode: TransmitterModes;
    fps: number;
    microSecPerFrame: number;

    constructor({ stickManifestPath: stickManifestPath, transmitterMode = TransmitterModes.Mode2, fps = 30 } = {} as FrameResolverOptions) {
        this.stickManifestFile = path.parse(stickManifestPath);

        if (this.stickManifestFile.ext !== '.json') {
            throw Error(`Stick manifest file must end in .json. Filename passed: ${this.stickManifestFile.base}`);
        }

        this.stickInfo = require(stickManifestPath);
        this.stickFramesDirectory = path.resolve(this.stickManifestFile.dir, this.stickInfo.frames.location);
        this.transmitterMode = transmitterMode;
        this.fps = fps;
        const secPerFrame = 1 / fps;
        this.microSecPerFrame = Math.floor(secPerFrame * 1000000);
    }

    generateFrameFileNames(stickPositions: StickPositions): FramePaths {
        const frameStickPositions = {
            roll: this.getFramePosition(stickPositions.roll, -500, 500, this.stickInfo.frames.x.min, this.stickInfo.frames.x.max, this.stickInfo.frames.x.increment),
            pitch: this.getFramePosition(stickPositions.pitch, -500, 500, this.stickInfo.frames.y.min, this.stickInfo.frames.y.max, this.stickInfo.frames.y.increment),
            yaw: this.getFramePosition(stickPositions.yaw, -500, 500, this.stickInfo.frames.x.min, this.stickInfo.frames.x.max, this.stickInfo.frames.x.increment),
            throttle: this.getFramePosition(stickPositions.yaw, 1000, 2000, this.stickInfo.frames.y.min, this.stickInfo.frames.y.max, this.stickInfo.frames.y.increment),
        } as StickPositions

        switch (this.transmitterMode) {
            case TransmitterModes.Mode1:
                return {
                    leftFramePath: path.resolve(this.stickFramesDirectory, this.stickInfo.frames.fileNameFormat.replace('<x>', frameStickPositions.yaw.toString()).replace('<y>', frameStickPositions.pitch.toString())),
                    rightFramePath: path.resolve(this.stickFramesDirectory, this.stickInfo.frames.fileNameFormat.replace('<x>', frameStickPositions.roll.toString()).replace('<y>', frameStickPositions.throttle.toString())),
                } as FramePaths
            case TransmitterModes.Mode2:
                return {
                    leftFramePath: path.resolve(this.stickFramesDirectory, this.stickInfo.frames.fileNameFormat.replace('<x>', frameStickPositions.yaw.toString()).replace('<y>', frameStickPositions.throttle.toString())),
                    rightFramePath: path.resolve(this.stickFramesDirectory, this.stickInfo.frames.fileNameFormat.replace('<x>', frameStickPositions.roll.toString()).replace('<y>', frameStickPositions.pitch.toString())),
                } as FramePaths
            case TransmitterModes.Mode3:
                return {
                    leftFramePath: path.resolve(this.stickFramesDirectory, this.stickInfo.frames.fileNameFormat.replace('<x>', frameStickPositions.roll.toString()).replace('<y>', frameStickPositions.pitch.toString())),
                    rightFramePath: path.resolve(this.stickFramesDirectory, this.stickInfo.frames.fileNameFormat.replace('<x>', frameStickPositions.yaw.toString()).replace('<y>', frameStickPositions.throttle.toString())),
                } as FramePaths
            default:
                return {
                    leftFramePath: path.resolve(this.stickFramesDirectory, this.stickInfo.frames.fileNameFormat.replace('<x>', frameStickPositions.roll.toString()).replace('<y>', frameStickPositions.throttle.toString())),
                    rightFramePath: path.resolve(this.stickFramesDirectory, this.stickInfo.frames.fileNameFormat.replace('<x>', frameStickPositions.yaw.toString()).replace('<y>', frameStickPositions.pitch.toString())),
                } as FramePaths
        }
    }

    // Convert the log stick position to a frame position that is within the allowable frames
    getFramePosition(value: number, initialMin: number, initialMax: number, finalMin: number, finalMax: number, increment: number): number {
        const clampedValue = this.clamp(value, initialMin, initialMax);
        const scaledValue = this.scale(clampedValue, initialMin, initialMax, finalMin, finalMax);
        const nearestFrameValue = this.nearest(scaledValue, finalMin, finalMax, increment);
        return nearestFrameValue;
    }

    // Convert a number from one scale to another scale
    scale(initialValue: number, initialMin: number, initialMax: number, finalMin: number, finalMax: number): number {
        const initialRange = initialMax - initialMin;
        const finalRange = finalMax - finalMin;
        const fractionOfInitial = (initialValue - initialMin) / initialRange;
        const finalValue = (fractionOfInitial * finalRange) + finalMin;
        return finalValue;
    }

    // Force a number to within a range
    clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(min, value), max);
    }

    // Find the nearest value in a range of numbers
    nearest(value: number, rangeMin: number, rangeMax: number, increment: number): number {
        let nearestValue: number = 0;
        for (let currentRangeValue = rangeMin; currentRangeValue <= rangeMax; currentRangeValue += increment) {
            const nextRangeValue = (currentRangeValue + increment);
            if (currentRangeValue <= value && value <= nextRangeValue) {
                const differenceFromCurrent = value - currentRangeValue;
                const differenceFromNext = nextRangeValue - value;

                if (differenceFromCurrent <= differenceFromNext) {
                    nearestValue = currentRangeValue;
                    break;
                }
                else {
                    nearestValue = nextRangeValue
                    break;
                }
            }
        }
        return nearestValue;
    }
}