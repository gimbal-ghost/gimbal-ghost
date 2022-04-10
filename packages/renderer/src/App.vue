<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

interface State {
    directoryPathSet: Set<string>,
    message: null | string,
}

const state: State = reactive({
    directoryPathSet: new Set(),
    message: null,
});

const directoryPaths = computed(() => {
    return [...state.directoryPathSet];
});

async function getDirectory() {
    state.message = null;
    const directoryPath = await window.electron.getDirectory();
    if (directoryPath) {
        state.directoryPathSet.add(directoryPath);
    }
}

async function renderLogs() {
    state.message = 'Rendering...';
    const renderSuccessful = await window.electron.render({ blackBoxDirectories: directoryPaths.value });
    if (renderSuccessful) {
        state.message = 'Render Complete';
    }
    else {
        state.message = 'Render Error';
    }
}
</script>

<template>
    <button type="button" @click="getDirectory">Add Directory</button>
    <br />
    <ul>
        <li v-for="path in directoryPaths">{{ path }}</li>
    </ul>
    <button type="button" @click="renderLogs">Render</button>
    <p v-if="state.message">{{ state.message }}</p>
</template>

<style>/* @import "./assets/base.css"; */</style>
