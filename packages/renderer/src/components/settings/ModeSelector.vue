<script setup lang="ts">
import { TransmitterModes } from '../../../../main/renderer/types';

interface Props {
    modelValue: TransmitterModes
}

interface Emits {
    (e: 'update:modelValue', value: TransmitterModes): void
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
                    'bg-blue-600': props.modelValue === TransmitterModes.Mode1,
                    'bg-slate-100': props.modelValue !== TransmitterModes.Mode1,
                    'text-slate-300': props.modelValue === TransmitterModes.Mode1,
                    'text-slate-800': props.modelValue !== TransmitterModes.Mode1,
                }"
                @click="emit('update:modelValue', TransmitterModes.Mode1)"
            >
                Mode 1
            </button>

            <button
                type="button"
                class="
                    inline-block px-3
                    hover:brightness-75
                    font-medium
                "
                :class="{
                    'bg-blue-600': props.modelValue === TransmitterModes.Mode2,
                    'bg-slate-100': props.modelValue !== TransmitterModes.Mode2,
                    'text-slate-300': props.modelValue === TransmitterModes.Mode2,
                    'text-slate-800': props.modelValue !== TransmitterModes.Mode2,
                }"
                @click="emit('update:modelValue', TransmitterModes.Mode2)"
            >
                Mode 2
            </button>

            <button
                type="button"
                class="
                    inline-block px-3
                    hover:brightness-75
                    font-medium
                "
                :class="{
                    'bg-blue-600': props.modelValue === TransmitterModes.Mode3,
                    'bg-slate-100': props.modelValue !== TransmitterModes.Mode3,
                    'text-slate-300': props.modelValue === TransmitterModes.Mode3,
                    'text-slate-800': props.modelValue !== TransmitterModes.Mode3,
                }"
                @click="emit('update:modelValue', TransmitterModes.Mode3)"
            >
                Mode 3
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
                    'bg-blue-600': props.modelValue === TransmitterModes.Mode4,
                    'bg-slate-100': props.modelValue !== TransmitterModes.Mode4,
                    'text-slate-300': props.modelValue === TransmitterModes.Mode4,
                    'text-slate-800': props.modelValue !== TransmitterModes.Mode4,
                }"
                @click="emit('update:modelValue', TransmitterModes.Mode4)"
            >
                Mode 4
            </button>
        </div>
    </div>
</template>

<style></style>
