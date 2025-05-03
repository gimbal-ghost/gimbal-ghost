<script setup lang="ts">
import PageFooter from '../components/PageFooter.vue';
import { useRootStore } from '../store';
import BlackboxFileList from '../components/BlackboxFileList.vue';
import MessageText from '../components/MessageText.vue';
import PlainButton from '../components/PlainButton.vue';
import PrimaryButton from '../components/PrimaryButton.vue';
import { AllowedLogExtensions } from '../../../main/renderer/types';

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
            // Ensure that only bbl/bfl/csv files are allowed
            const fileExt = file?.path.toLowerCase();
            if (file && file.path && (fileExt?.endsWith(AllowedLogExtensions.BBL) || fileExt?.endsWith(AllowedLogExtensions.BFL) || fileExt?.endsWith(AllowedLogExtensions.CSV))) {
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
            :class="{'border-slate-100': store.dragPresent, 'border-transparent': !store.dragPresent}"
            draggable
            :blackbox-files="store.blackboxFiles"
            @dragenter.prevent="dragenter"
            @dragover.prevent=""
            @dragleave="dragleave"
            @drop="drop"
        />

        <div class="flex item-center gap-4">
            <PlainButton
                label="Select Blackbox Files"
                :disabled="store.isRendering"
                @click="store.getBlackboxFilePaths"
            />

            <PlainButton
                label="Settings"
                :disabled="store.isRendering"
                @click="store.showSettings = true"
            />
        </div>

        <PrimaryButton
            label="Render"
            :disabled="!store.hasBlackboxFiles || store.isRendering"
            @click="store.renderLogs"
        />

        <MessageText />

        <PageFooter />
    </div>
</template>

<style>
</style>
