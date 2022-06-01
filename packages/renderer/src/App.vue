<script setup lang="ts">
import { computed, reactive } from 'vue';
import Electron from 'electron';
import { Event, EventNames } from '../../main/event-bus/types';
import { BlackboxFlightEvent } from '../../main/renderer/BlackboxFlight';
import { ApplicationState } from './types';
import BlackboxList from './components/BlackboxFileList.vue';

const params = new URLSearchParams(document.location.search);
const version = params.get('version');

const state: ApplicationState = reactive({
    blackboxFiles: [],
    message: '',
    version,
    isRendering: false,
    dragPresent: false,
});

const logPaths = computed(() => state.blackboxFiles.map(blackboxFile => blackboxFile.logPath));

const hasBlackboxFiles = computed(() => state.blackboxFiles.length !== 0);

function addBlackboxFile(logPath: string) {
    // Make sure we don't put the same file in twice
    if (!state.blackboxFiles.find(blackboxFile => blackboxFile.logPath === logPath)) {
        state.blackboxFiles.push({
            logPath,
            flightEvents: new Map(),
        });
    }
}

async function getBlackboxFilePaths() {
    state.message = null;
    const blackboxPaths: string[] | null = await window.electron.getBlackboxFilePaths();
    if (blackboxPaths) {
        blackboxPaths.forEach(addBlackboxFile);
    }
    state.message = '';
}

function removeFile(path: string) {
    state.blackboxFiles = state.blackboxFiles.filter(blackboxFile => blackboxFile.logPath !== path);
    state.message = '';
}

async function renderLogs() {
    state.isRendering = true;
    state.message = 'Rendering...';
    const renderSuccessful = await window.electron.render({ blackboxLogPaths: logPaths.value });
    if (renderSuccessful) {
        state.message = 'Render Complete';
    }
    else {
        state.message = 'Render Error';
    }
    state.isRendering = false;
}

function openDirectory(logPath: string) {
    window.electron.openDirectory(logPath);
}

function openChangelog() {
    window.electron.openChangelog();
}

function dragenter() {
    state.dragPresent = true;
}

function dragleave() {
    state.dragPresent = false;
}

function drop(event: DragEvent) {
    state.dragPresent = false;

    const files = event.dataTransfer?.files;
    if (files) {
        for (let index = 0; index < files.length; index += 1) {
            const file = files?.item(index);
            // Ensure that only bbl files are allowed
            if (file && file.path && file.path.endsWith('.bbl')) {
                addBlackboxFile(file.path);
            }
        }
    }
}

window.electron.onEvent((ipcRendererEvent: Electron.IpcRendererEvent, event: Event) => {
    switch (event.name) {
        case EventNames.BlackboxFlightUpdate: {
            const flightEvent = event as BlackboxFlightEvent;
            const updatedBlackboxFile = state.blackboxFiles.find(blackboxFile => blackboxFile.logPath === flightEvent.logPath);
            updatedBlackboxFile?.flightEvents.set(flightEvent.flightNumber, flightEvent);
            break;
        }

        default:
            break;
    }
});

</script>

<template>
    <div class="flex flex-col items-center p-4 h-screen gap-4 text-neutral-100 bg-neutral-800">
        <BlackboxList
            class="border-dashed border-2"
            :class="{'border-neutral-100': state.dragPresent, 'border-transparent': !state.dragPresent}"
            draggable
            :blackbox-files="state.blackboxFiles"
            @remove-file="removeFile"
            @open-directory="openDirectory"
            @dragenter.prevent="dragenter"
            @dragover.prevent=""
            @dragleave="dragleave"
            @drop="drop"
        />

        <button
            class="font-medium
            bg-neutral-100
            text-neutral-800
            active:bg-neutral-800
            active:text-neutral-100
            outline-neutral-100
            rounded-full
            hover:outline
            outline-offset-4
            p-2
            disabled:cursor-not-allowed
            disabled:opacity-50
            "
            type="button"
            :disabled="state.isRendering"
            @click="getBlackboxFilePaths"
        >
            Select Blackbox Files
        </button>

        <button
            class="font-medium
            bg-green-600
            text-neutral-800
            active:bg-neutral-800
            active:text-neutral-100
            outline-green-600
            rounded-full
            hover:outline
            outline-offset-4
            p-2
            disabled:cursor-not-allowed
            disabled:opacity-50
            "
            type="button"
            :disabled="!hasBlackboxFiles || state.isRendering"
            @click="renderLogs"
        >
            Render
        </button>

        <div
            class="h-6"
            :class="{ 'animate-pulse': state.isRendering }"
        >
            {{ state.message }}
        </div>

        <a
            href=""
            class="text-xs font-thin underline hover:text-neutral-400"
            @click.prevent="openChangelog"
        >
            v{{ state.version }}
        </a>
    </div>
</template>

<style>
</style>
