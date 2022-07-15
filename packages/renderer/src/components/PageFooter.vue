<script setup lang="ts">
import { useRootStore } from '../store';

const store = useRootStore();
</script>

<template>
    <span class="text-xs font-thin">
        <a
            href=""
            class="hover:underline hover:text-slate-400"
            @click.prevent="store.openChangelog"
        >
            v{{ store.version }}
        </a>
        &mdash;
        <a
            href=""
            class="hover:underline hover:text-slate-400"
            @click.prevent="store.openReadme('#-donate')"
        >
            Donate
        </a>
    </span>
</template>

<script></script>
