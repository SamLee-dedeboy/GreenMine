<script lang="ts">
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
</script>

<div class="flex flex-col divide-y rounded-md bg-gray-50 shadow-md">
  <div
    tabindex="0"
    role="button"
    class="controller-button"
    on:click={() => dispatch("toggle-keywordsea")}
    on:keyup={() => {}}
  >
    <img src="hex.svg" alt="tab" class="h-6 w-6" />
  </div>
  <div
    tabindex="0"
    role="button"
    class="controller-button"
    on:click={() => dispatch("toggle-viz")}
    on:keyup={() => {}}
  >
    <img src="book-copy.svg" alt="tab" class="h-6 w-6" />
  </div>
  <div
    tabindex="0"
    role="button"
    class="controller-button"
    on:click={() => dispatch("toggle-prompt")}
    on:keyup={() => {}}
  >
    <img src="bot.svg" alt="tab" class="h-6 w-6" />
  </div>
</div>

<style lang="postcss">
  .controller-button {
    @apply bg-gray-100 p-1  hover:bg-gray-300;
  }
</style>
