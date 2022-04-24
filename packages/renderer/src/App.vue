<script setup lang="ts">
import { computed, reactive } from 'vue';

const params = new URLSearchParams(document.location.search);
const version = params.get('version');

interface State {
    blackboxPaths: Set<string>,
    message: string | null,
    version: string | null,
}

const state: State = reactive({
    blackboxPaths: new Set(),
    message: null,
    version,
});

const paths = computed(() => {
    return [...state.blackboxPaths];
});

async function getBlackboxFilePaths() {
    state.message = null;
    const blackboxPaths: string[] | null = await window.electron.getBlackboxFilePaths();
    if (blackboxPaths) {
        blackboxPaths.forEach(path => state.blackboxPaths.add(path));
    }
}

async function renderLogs() {
    state.message = 'Rendering...';
    const renderSuccessful = await window.electron.render({ blackboxPaths: paths.value });
    if (renderSuccessful) {
        state.message = 'Render Complete';
    }
    else {
        state.message = 'Render Error';
    }
}
</script>

<template>
    <button type="button" @click="getBlackboxFilePaths">Add Blackbox Files</button>
    <br />
    <ul>
        <li v-for="path in paths">{{ path }}</li>
    </ul>
    <button type="button" @click="renderLogs">Render</button>
    <p v-if="state.message">{{ state.message }}</p>
    <p>v{{ state.version }}</p>
</template>

<style>
/* @import "./assets/base.css"; */
</style>
