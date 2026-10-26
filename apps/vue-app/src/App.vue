<script setup lang="ts">
import { PixelshiftStudio } from "pixelshift-vue";
import { ref } from "vue";

const processedCount = ref(0);

function onComplete(results: unknown[]) {
  processedCount.value += results.length;
}
</script>

<template>
  <main class="app-shell">
    <header class="app-heading">
      <h1>Vue integration</h1>
      <p>Processed in the current session: {{ processedCount }}</p>
    </header>
    <PixelshiftStudio @process-complete="onComplete" />
  </main>
</template>
