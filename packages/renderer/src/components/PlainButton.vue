<script setup lang="ts">
const props = defineProps({
    label: { type: String, required: true },
});

</script>

<template>
    <button
        class="
            text-sm
            font-medium
            bg-gradient-to-b
            from-slate-100
            to-slate-400
            outline-slate-300
            text-slate-800
            active:brightness-75
            rounded-full
            hover:outline
            outline-offset-4
            p-2
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
