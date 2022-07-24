<script setup lang="ts">
import OutputFPSSelector from '../components/settings/OutputFPSSelector.vue';
import ModeSelector from '../components/settings/ModeSelector.vue';
import PlainButton from '../components/PlainButton.vue';
import { useRootStore } from '../store';

const store = useRootStore();
</script>

<template>
    <div class="flex flex-col items-center p-4 h-screen gap-4">
        <div
            class="
            flex
            flex-col
            items-center
            w-full
            grow
            overflow-y-scroll
            scrollbar-thin
            pr-1
            scrollbar-thumb-slate-100
            scrollbar-track-slate-700
            "
        >
            <p>Transmitter Mode</p>
            <ModeSelector
                v-model="store.settings.gimbalRenderSettings.mode"
                class="mb-3"
                @update:model-value="store.updateSettingsInMainProcess"
            />
            <p>Output FPS</p>
            <OutputFPSSelector
                v-model="store.settings.gimbalRenderSettings.outputFps"
                class="mb-3"
                @update:model-value="store.updateSettingsInMainProcess"
            />
        </div>
        <PlainButton
            label="Back"
            @click="store.showSettings = false"
        />
    </div>
</template>

<style></style>
