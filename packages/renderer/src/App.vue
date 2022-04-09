<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

interface State {
    directoryPathSet: Set<string>,
}

const state: State = reactive({
    directoryPathSet: new Set(),
});

const directoryPaths = computed(() => {
    return [...state.directoryPathSet];
});

async function getDirectory() {
    const directoryPath = await window.electron.getDirectory();
    console.log('directoryPath', directoryPath);
    if (directoryPath) {
        state.directoryPathSet.add(directoryPath);
    }
}
</script>

<template>
    <button type="button" @click="getDirectory">Add Directory</button>
    <br />
    <ul>
        <li v-for="path in directoryPaths">{{ path }}</li>
    </ul>
</template>

<style>
/* @import "./assets/base.css"; */
</style>
