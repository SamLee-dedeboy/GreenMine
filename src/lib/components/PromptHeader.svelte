<script lang="ts">
  import { fade, slide } from "svelte/transition";
  import { createEventDispatcher, onMount } from "svelte";
  import type { tVersionInfo } from "lib/types";
  const dispatch = createEventDispatcher();
  export let title: string = "Prompt Viewer";
  export let measure_uncertainty: boolean = false;
  export let versionCount: tVersionInfo={
    total_versions: 0,
    versions: [],
  }
  export let current_version: string;
  let show_versions = true;
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
        Run and Save
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
  <div class="flex flex-col py-1">
    <div
      tabindex="0"
      role="button"
      class="entry-trigger"
      on:click={() => (show_versions = !show_versions)}
      on:keyup={() => {}}
    >
      Version list (Total: {versionCount.total_versions}) 
    </div>
  </div>
  {#if show_versions}
  <div class="flex divide-x justify-center ">
    <div class="flex flex-wrap gap-2 justify-center">
      {#each versionCount.versions as version}
        <button 
          class="h-6 w-6 rounded-full bg-blue-500 opacity-80 text-white text-sm hover:bg-blue-600 hover:opacity-100 "
          class:selected={version === current_version}
          on:click={() => dispatch('select-version', version)}
        >
          {version}
        </button>
      {/each}
      <button 
          class="h-6 w-6 rounded-full bg-gray-400 text-white text-lg font-bold hover:bg-gray-500 flex items-center justify-center"
          on:click={() => dispatch('add-version')}
          aria-label="Add new version"
        >
          +
      </button>
    </div>
  </div>
  {/if}
</div>

<style lang="postcss">
  .active {
    @apply bg-green-300;
    transition: all 0.5s;
  }
  .selected {
    @apply bg-blue-700 opacity-100;
  }
  .entry-trigger {
    @apply rounded-sm bg-gray-200 text-gray-700 outline-double outline-1 outline-gray-600 hover:bg-gray-300;
  }
</style>

