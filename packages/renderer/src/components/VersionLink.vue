<script setup lang="ts">
import { useRootStore } from '../store';

const store = useRootStore();
</script>

<template>
    <a
        href=""
        class="text-xs font-thin underline hover:text-neutral-400"
        @click.prevent="store.openChangelog"
    >
        v{{ store.version }}
    </a>
</template>

<script></script>
