<script lang="ts">
  import { fade, slide } from "svelte/transition";
  import { createEventDispatcher, onMount } from "svelte";
  const dispatch = createEventDispatcher();
  export let title: string = "Prompt Viewer";
  export let measure_uncertainty: boolean = false;
</script>

<div
  class="relative z-50 flex flex-col px-1"
  transition:fade={{
    duration: 100,
  }}
>
  <h2 class="text-lg font-medium text-black">{title}</h2>
  <div class="flex flex-col gap-y-1">
    <div class="flex">
      <div
        role="button"
        tabindex="0"
        class="flex-1 rounded-sm bg-green-200 outline outline-1 outline-gray-300 hover:bg-green-300"
        on:click={() => dispatch("run")}
        on:keyup={() => {}}
      >
        Run
      </div>
      <div
        role="button"
        tabindex="0"
        class="ml-4 flex w-fit items-center gap-x-1 rounded-sm bg-gray-200 px-1 text-xs italic outline outline-1 outline-gray-300 hover:outline-2"
        on:click={() => dispatch("toggle-measure-uncertainty")}
        on:keyup={() => {}}
      >
        <div
          class="h-4 w-4 rounded-full bg-gray-200 outline-double outline-1 outline-gray-500"
          class:active={measure_uncertainty}
        ></div>
        Measure Uncertainty
      </div>
    </div>
  </div>
</div>

<style lang="postcss">
  .active {
    @apply bg-green-300;
    transition: all 0.5s;
  }
</style>
