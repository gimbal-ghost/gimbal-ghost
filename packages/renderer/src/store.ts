import { defineStore } from 'pinia';
import { BlackboxFlightEvent } from '../../main/renderer/BlackboxFlight';
import { TransmitterModes } from '../../main/renderer/types';
import { AppSettings } from '../../main/settings/schema';

const params = new URLSearchParams(document.location.search);
const version = params.get('version');

export interface BlackboxInfo {
    logPath: string,
    flightEvents: Map<number, BlackboxFlightEvent>,
}

export interface ApplicationState {
    blackboxFiles: Array<BlackboxInfo>,
    message: string | null,
    version: string | null,
    isRendering: boolean,
    dragPresent: boolean,
    showSettings: boolean,
    settings: AppSettings,
}

export const useRootStore = defineStore('root', {
    state: (): ApplicationState => ({
        blackboxFiles: [],
        message: '',
        version,
        isRendering: false,
        dragPresent: false,
        showSettings: false,
        settings: {
            firstLoad: true,
            windowPosition: {
                x: 0,
                y: 0,
            },
            gimbalRenderSettings: {
                mode: TransmitterModes.Mode2,
                outputFps: 30,
            },
        },
    }),
    getters: {
        hasBlackboxFiles: state => state.blackboxFiles.length > 0,
        logPaths: state => state.blackboxFiles.map(blackboxFile => blackboxFile.logPath),
    },
    actions: {
        removeFile(path: String) {
            this.blackboxFiles = this.blackboxFiles.filter(blackboxFile => blackboxFile.logPath !== path);
        },
        async renderLogs() {
            this.isRendering = true;
            this.message = 'Rendering...';
            const renderSuccessful = await window.electron.render({ blackboxLogPaths: this.logPaths, gimbalRenderSettings: { ...this.settings.gimbalRenderSettings } });
            if (renderSuccessful) {
                this.message = 'Rendering complete. Click folder icon above to see results.';
            }
            else {
                this.message = 'Render Error';
            }
            this.isRendering = false;
        },
        openDirectory(logPath: String) {
            window.electron.openDirectory(logPath);
        },
        openChangelog() {
            window.electron.openChangelog();
        },
        async getBlackboxFilePaths() {
            this.message = null;
            const blackboxPaths: string[] | null = await window.electron.getBlackboxFilePaths();
            if (blackboxPaths) {
                blackboxPaths.forEach(this.addBlackboxFile);
            }
            this.message = '';
        },
        addBlackboxFile(logPath: string) {
            // Make sure we don't put the same file in twice
            if (!this.blackboxFiles.find(blackboxFile => blackboxFile.logPath === logPath)) {
                this.blackboxFiles.push({
                    logPath,
                    flightEvents: new Map(),
                });
            }
        },
    },
});
