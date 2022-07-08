<script setup lang="ts">

interface Props {
    modelValue: Number
}

interface Emits {
    (e: 'update:modelValue', value: Number): void
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
        text-neutral-800
        py-0
        rounded-full
        "
        :value="props.modelValue"
        @input="handleInput"
    >
        <option
            v-for="fps in fpsOptions"
            :key="fps"
            class="font-medium text-neutral-800"
            :value="fps"
        >
            {{ fps }}
        </option>
    </select>
</template>
