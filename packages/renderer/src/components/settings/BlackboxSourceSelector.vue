<script setup lang="ts">
import { TransmitterModes, BlackboxSources } from '../../../../main/renderer/types';

interface Props {
    modelValue: BlackboxSources
}

interface Emits {
    (e: 'update:modelValue', value: BlackboxSources): void
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

</script>

<template>
    <div class="flex items-center justify-center">
        <div
            class="inline-flex shadow-md hover:shadow-lg focus:shadow-lg"
            role="group"
        >
            <button
                type="button"
                class="
                    rounded-l-full
                    inline-block px-3
                    hover:brightness-75
                    font-medium
                "
                :class="{
                    'bg-blue-600': props.modelValue === BlackboxSources.BetaOrEmuFlight,
                    'bg-slate-100': props.modelValue !== BlackboxSources.BetaOrEmuFlight,
                    'text-slate-300': props.modelValue === BlackboxSources.BetaOrEmuFlight,
                    'text-slate-800': props.modelValue !== BlackboxSources.BetaOrEmuFlight,
                }"
                @click="emit('update:modelValue', BlackboxSources.BetaOrEmuFlight)"
            >
                Betaflight/EmuFlight
            </button>

            <button
                type="button"
                class="
                    rounded-r-full
                    inline-block px-3
                    hover:brightness-75
                    font-medium
                "
                :class="{
                    'bg-blue-600': props.modelValue === BlackboxSources.Rotorflight,
                    'bg-slate-100': props.modelValue !== BlackboxSources.Rotorflight,
                    'text-slate-300': props.modelValue === BlackboxSources.Rotorflight,
                    'text-slate-800': props.modelValue !== BlackboxSources.Rotorflight,
                }"
                @click="emit('update:modelValue', BlackboxSources.Rotorflight)"
            >
                Rotorflight
            </button>
        </div>
    </div>
</template>

<style></style>
