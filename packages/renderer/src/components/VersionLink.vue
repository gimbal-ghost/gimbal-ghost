<script setup lang="ts">
import { useRootStore } from '../store';

const store = useRootStore();
</script>

<template>
    <a
        href=""
        class="text-xs font-thin hover:underline hover:text-slate-400"
        @click.prevent="store.openChangelog"
    >
        v{{ store.version }}
    </a>
</template>

<script></script>
