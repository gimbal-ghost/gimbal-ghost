<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
    label: { type: String, required: true },
    color: { type: String, default: 'neutral-100' },
});

const colorClasses = computed(() => [`bg-${props.color}`, `outline-${props.color}`]);

</script>

<template>
    <button
        class="font-medium
            text-neutral-800
            active:bg-neutral-800
            active:text-neutral-100
            rounded-full
            hover:outline
            outline-offset-4
            p-2
            disabled:cursor-not-allowed
            disabled:opacity-50
        "
        :class="colorClasses"
        type="button"
        v-bind="$attrs"
    >
        {{ props.label }}
    </button>
</template>

<style></style>
