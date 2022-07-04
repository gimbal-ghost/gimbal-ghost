<script setup lang="ts">
import { useRootStore } from '../store';

const store = useRootStore();
</script>

<template>
    <div
        class="h-6"
        :class="{ 'animate-pulse': store.isRendering }"
    >
        {{ store.message }}
    </div>
</template>

<script></script>
