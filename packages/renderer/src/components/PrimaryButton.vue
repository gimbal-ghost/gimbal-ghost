<script setup lang="ts">
const props = defineProps({
    label: { type: String, required: true },
});

</script>

<template>
    <button
        class="
            font-bold
            bg-gradient-to-b
            from-blue-500
            to-blue-800
            outline-blue-600
            text-slate-300
            active:brightness-75
            rounded-full
            hover:outline
            outline-offset-4
            p-3
            disabled:cursor-not-allowed
            disabled:opacity-50
        "
        type="button"
        v-bind="$attrs"
    >
        {{ props.label }}
    </button>
</template>

<style></style>
