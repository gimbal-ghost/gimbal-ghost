import path from "path";
import { BlackBoxLog } from "./BlackBoxLog";

export interface RendererOptions {
    blackBoxLog: BlackBoxLog,
    leftStickManifestPath: string,
    rightStickManifestPath: string,
    ffmpegPath: string,
    fps?: number,
}

export class Renderer {
    blackBoxLog: BlackBoxLog;
    leftStickManifestFile: path.ParsedPath;
    rightStickManifetFile: path.ParsedPath;
    fps: number;
    microSecPerFrame: number;

    constructor({ blackBoxLog, leftStickManifestPath, rightStickManifestPath, ffmpegPath, fps = 30 } = {} as RendererOptions) {
        this.blackBoxLog = blackBoxLog;
        this.leftStickManifestFile = path.parse(leftStickManifestPath);
        this.rightStickManifetFile = path.parse(rightStickManifestPath);
        this.fps = fps;
        const secPerFrame = 1 / fps;
        this.microSecPerFrame = Math.floor(secPerFrame * 1000000);
    }
}