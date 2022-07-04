<script setup lang="ts">
import ModeSelector from '../components/settings/ModeSelector.vue';
import StyledButton from '../components/StyledButton.vue';
import { useRootStore } from '../store';

const store = useRootStore();
</script>

<template>
    <div class="flex flex-col items-center p-4 h-screen gap-4">
        <div class="flex flex-col items-center w-full grow overflow-y-scroll scrollbar-thin pr-1 scrollbar-thumb-neutral-100 scrollbar-track-neutral-700">
            <ModeSelector v-model="store.settings.gimbalRenderSettings.mode" />
        </div>
        <StyledButton
            label="Back"
            @click="store.showSettings = false"
        />
    </div>
</template>

<style></style>
