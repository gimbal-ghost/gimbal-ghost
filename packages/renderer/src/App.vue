<script setup lang="ts">
import Electron from 'electron';
import { watch } from 'vue';
import { Event, EventNames } from '../../main/event-bus/types';
import { BlackboxFlightEvent } from '../../main/renderer/BlackboxFlight';
import { AppSettings } from '../../main/settings/schema';
import { useRootStore } from './store';
import MainPage from './pages/MainPage.vue';
import SettingsPage from './pages/SettingsPage.vue';

const store = useRootStore();

// Sync all changs to the render settings back to the main process
watch(store.settings.gimbalRenderSettings, (newRenderSettings, oldRenderSettings) => {
    window.electron.updateGimbalRenderSettings({ ...newRenderSettings });
});

window.electron.onSettingsLoaded((ipcRendererEvent: Electron.IpcRendererEvent, settings: AppSettings) => {
    store.settings = settings;
});

window.electron.onEvent((ipcRendererEvent: Electron.IpcRendererEvent, event: Event) => {
    switch (event.name) {
        case EventNames.BlackboxFlightUpdate: {
            const flightEvent = event as BlackboxFlightEvent;
            const updatedBlackboxFile = store.blackboxFiles.find(blackboxFile => blackboxFile.logPath === flightEvent.logPath);
            updatedBlackboxFile?.flightEvents.set(flightEvent.flightNumber, flightEvent);
            break;
        }

        default:
            break;
    }
});

</script>

<template>
    <div class="text-neutral-100 bg-neutral-800">
        <MainPage v-if="!store.showSettings" />
        <SettingsPage v-else />
    </div>
</template>

<style>
</style>
