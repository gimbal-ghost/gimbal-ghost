<script setup lang="ts">
import StyledButton from '../components/StyledButton.vue';
import VersionLink from '../components/VersionLink.vue';
import { useRootStore } from '../store';
import BlackboxFileList from '../components/BlackboxFileList.vue';
import MessageText from '../components/MessageText.vue';

const store = useRootStore();

function dragenter() {
    store.dragPresent = true;
}

function dragleave() {
    store.dragPresent = false;
}

function drop(event: DragEvent) {
    store.dragPresent = false;

    const files = event.dataTransfer?.files;
    if (files) {
        for (let index = 0; index < files.length; index += 1) {
            const file = files?.item(index);
            // Ensure that only bbl files are allowed
            if (file && file.path && file.path.endsWith('.bbl')) {
                store.addBlackboxFile(file.path);
            }
        }
    }
}
</script>

<template>
    <div class="flex flex-col items-center p-4 h-screen gap-4">
        <BlackboxFileList
            class="border-dashed border-2"
            :class="{'border-neutral-100': store.dragPresent, 'border-transparent': !store.dragPresent}"
            draggable
            :blackbox-files="store.blackboxFiles"
            @dragenter.prevent="dragenter"
            @dragover.prevent=""
            @dragleave="dragleave"
            @drop="drop"
        />

        <div class="flex item-center gap-4">
            <StyledButton
                label="Select Blackbox Files"
                :disabled="store.isRendering"
                @click="store.getBlackboxFilePaths"
            />

            <StyledButton
                label="Settings"
                :disabled="store.isRendering"
                @click="store.showSettings = true"
            />
        </div>

        <StyledButton
            label="Render"
            color="green-600"
            :disabled="!store.hasBlackboxFiles || store.isRendering"
            @click="store.renderLogs"
        />

        <MessageText />

        <VersionLink />
    </div>
</template>

<style>
</style>
