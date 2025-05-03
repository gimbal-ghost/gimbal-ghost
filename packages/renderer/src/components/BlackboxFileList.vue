<script setup lang="ts">
import { useRootStore, BlackboxInfo } from '../store';

const store = useRootStore();

interface Props {
    blackboxFiles: Array<BlackboxInfo>
}

const props = defineProps<Props>();
</script>

<template>
    <div
        v-if="props.blackboxFiles.length"
        class="grow w-full bg-slate-900 flex-col overflow-y-scroll scrollbar-thin pr-1 scrollbar-thumb-slate-100 scrollbar-track-slate-700"
    >
        <div
            v-for="blackboxFile in props.blackboxFiles"
            :key="blackboxFile.logPath"
            class="px-2 py-1 flex-col"
        >
            <div class="flex">
                <div
                    class="grow font-medium line-clamp-1 text-left"
                >
                    {{ blackboxFile.logPath }}
                </div>

                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="flex-none h-6 w-6 hover:text-blue-600 outline-slate-100 outline-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    role="button"
                    tabindex="0"
                    @click="store.openDirectory(blackboxFile.logPath)"
                    @keydown.enter="store.openDirectory(blackboxFile.logPath)"
                    @keydown.space="store.openDirectory(blackboxFile.logPath)"
                >
                    <path d="M6.1,10L4,18V8H21A2,2 0 0,0 19,6H12L10,4H4A2,2 0 0,0 2,6V18A2,2 0 0,0 4,20H19C19.9,20 20.7,19.4 20.9,18.5L23.2,10H6.1M19,18H6L7.6,12H20.6L19,18Z" />
                </svg>

                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="flex-none ml-2 h-6 w-6 hover:text-blue-600 outline-slate-100"
                    fill="currentColor"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    role="button"
                    tabindex="0"
                    @click="store.removeFile(blackboxFile.logPath)"
                    @keydown.enter="store.removeFile(blackboxFile.logPath)"
                    @keydown.space="store.removeFile(blackboxFile.logPath)"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
            </div>

            <div
                v-for="[flightNumber, flightEvent] in blackboxFile.flightEvents"
                :key="flightNumber"
                class="flex font-normal"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="ml-1 h-5 w-5 outline-slate-100"
                    fill="currentColor"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    stroke-width="0"
                >
                    <path d="M20 16L14.5 21.5L13.08 20.09L16.17 17H10.5C6.91 17 4 14.09 4 10.5V4H6V10.5C6 13 8 15 10.5 15H16.17L13.09 11.91L14.5 10.5L20 16Z" />
                </svg>

                <div>
                    {{ flightEvent.outputFileName }}
                </div>

                <div class="grow flex items-center">
                    <div
                        class="w-full mx-2 h-3 bg-slate-700"
                        :class="{'animate-pulse': !['rendering', 'complete'].includes(flightEvent.status)}"
                    >
                        <div
                            class="bg-gradient-to-b from-blue-500 to-blue-800 h-3"
                            :style="{width: `${flightEvent.progress}%`}"
                        />
                    </div>
                </div>

                <div class="capitalize">
                    {{ flightEvent.status }}
                </div>
            </div>
        </div>
    </div>

    <div
        v-else
        class="grow w-full bg-slate-900 flex justify-center items-center"
    >
        <div class="flex-col justify-center items-center text-center">
            <div class="flex justify-center items-center my-3">
                <img
                    src="/gimbal-ghost.png"
                    alt="Gimbal Ghost"
                    class="h-20 text-center"
                >
            </div>

            <h1 class="text-4xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-b from-blue-500 to-blue-800">
                Gimbal Ghost
            </h1>

            <div class="font-normal">
                Drag or select blackbox files (.bbl/.bfl/.csv) to get started
            </div>
        </div>
    </div>
</template>

<style>
</style>
