<script setup lang="ts">
import { ImageConverter, type ConversionResult } from "pixelshift-vue";
import { ref } from "vue";

const convertedCount = ref(0);

function onComplete(results: ConversionResult[]) {
  convertedCount.value = results.length;
}
</script>

<template>
  <main class="app-shell">
    <header class="app-heading">
      <h1>Vue integration</h1>
      <p>Converted in the current session: {{ convertedCount }}</p>
    </header>
    <ImageConverter multiple @conversion-complete="onComplete" />
  </main>
</template>
