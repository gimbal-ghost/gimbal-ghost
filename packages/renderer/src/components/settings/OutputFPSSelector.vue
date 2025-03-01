<script setup lang="ts">

interface Props {
    modelValue: number
}

interface Emits {
    (e: 'update:modelValue', value: number): void
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const fpsOptions = [24, 25, 30, 60, 50, 100, 120];

function handleInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);

    if (Number.isNaN(value)) {
        return;
    }

    emit('update:modelValue', value);
}
</script>

<template>
    <select
        class="
            font-medium
            text-slate-800
            py-0
            rounded-full
        "
        :value="props.modelValue"
        @input="handleInput"
    >
        <option
            v-for="fps in fpsOptions"
            :key="fps"
            class="font-medium text-slate-800"
            :value="fps"
        >
            {{ fps }}
        </option>
    </select>
</template>
