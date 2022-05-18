<script setup lang="ts">
import { computed, reactive } from 'vue';
import Electron from 'electron'
import { Event, EventNames } from '../../main/event-bus/types';

const params = new URLSearchParams(document.location.search);
const version = params.get('version');

interface State {
    blackboxFiles: Array<BlackboxInfo>,
    message: string | null,
    version: string | null,
    isRendering: boolean,
}

interface BlackboxInfo {
    path: string,
}

const state: State = reactive({
    blackboxFiles: [],
    message: '',
    version,
    isRendering: false,
});

const paths = computed(() => {
    return state.blackboxFiles.map(blackboxFile => blackboxFile.path);
});

const hasBlackboxFiles = computed(() => {
    return state.blackboxFiles.length !== 0;
});

async function getBlackboxFilePaths() {
    state.message = null;
    const blackboxPaths: string[] | null = await window.electron.getBlackboxFilePaths();
    if (blackboxPaths) {
        blackboxPaths.forEach(path => state.blackboxFiles.push({
            path,
        }));
    }
    state.message = '';
}

function removeFile(path: string) {
    state.blackboxFiles = state.blackboxFiles.filter(blackboxFile => blackboxFile.path !== path);
    state.message = '';
}

async function renderLogs() {
    state.isRendering = true;
    state.message = 'Rendering...';
    const renderSuccessful = await window.electron.render({ blackboxLogPaths: paths.value });
    if (renderSuccessful) {
        state.message = 'Render Complete';
    }
    else {
        state.message = 'Render Error';
    }
    state.isRendering = false;
}

window.electron.onEvent((ipcRendererEvent: Electron.IpcRendererEvent, event: Event) => {
    switch (event.name) {
        case EventNames.Every:
            console.log('event', event);
            break;

        default:
            break;
    }
});

</script>

<template>
    <div class="flex flex-col items-center p-4 h-screen gap-4 text-neutral-100 bg-neutral-800 font-medium">
        <div class="grow w-full backdrop-brightness-50 flex-col">
            <div class="px-2 py-1 flex" v-if="paths.length" v-for="path in paths" :key="path">
                <div class="grow">
                    {{ path }}
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 hover:text-red-600 outline-neutral-100"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" @click="removeFile(path)"
                    @keydown.enter="removeFile(path)" @keydown.space="removeFile(path)" role="button" tabindex="0">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </div>
            <div class="px-2 py-1" v-else>
                No files
            </div>
        </div>

        <button
            class="font-medium bg-neutral-100 text-neutral-800 active:bg-neutral-800 active:text-neutral-100 rounded-full hover:outline outline-neutral-100 outline-offset-4 p-2 disabled:cursor-not-allowed disabled:opacity-50"
            type="button" @click="getBlackboxFilePaths" :disabled="state.isRendering">
            Add Blackbox Files
        </button>

        <button
            class="font-medium bg-neutral-100 text-neutral-800 active:bg-neutral-800 active:text-neutral-100 rounded-full hover:outline outline-neutral-100 outline-offset-4 p-2 disabled:cursor-not-allowed disabled:opacity-50"
            type="button" @click="renderLogs" :disabled="!hasBlackboxFiles || state.isRendering">
            Render
        </button>

        <div class="h-6" :class="{ 'animate-pulse': state.isRendering }">{{ state.message }}</div>

        <p class="text-xs font-thin">v{{ state.version }}</p>
    </div>
</template>

<style>
</style>
