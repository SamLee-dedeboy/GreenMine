<script lang="ts">
  import { fade, slide } from "svelte/transition";
  import { createEventDispatcher, onMount } from "svelte";
  import type { tVersionInfo } from "lib/types";
  const dispatch = createEventDispatcher();
  export let title: string = "Prompt Viewer";
  export let measure_uncertainty: boolean = false;
  export let versionCount: tVersionInfo = {
    versions: [],
  };
  export let based_on_options: tVersionInfo;
  export let current_version: string;
  export let based_on: string;
</script>

<div
  class="relative z-50 flex flex-col px-1"
  transition:fade={{
    duration: 100,
  }}
>
  <h2 class="bg-yellow-100 font-serif text-xl font-medium text-black shadow-md">
    {title}
  </h2>
  <div class="flex flex-col py-1">
    <div class="flex font-mono">
      <div
        role="button"
        tabindex="0"
        class="flex flex-1 items-center justify-center gap-x-1 rounded-sm bg-green-200 px-1 outline outline-1 outline-gray-300 hover:bg-green-300"
        on:click={() => dispatch("run")}
        on:keyup={() => {}}
      >
        <img src="refresh.svg" alt="" class="h-4 w-4" />
        Execute Prompt
      </div>
      <div
        role="button"
        tabindex="0"
        class="ml-4 flex w-fit items-center gap-x-1 rounded-sm bg-gray-200 px-1 text-xs italic outline outline-1 outline-gray-300 hover:outline-2"
        on:click={() => {
          // dispatch("toggle-measure-uncertainty")
        }}
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
  {#if based_on_options.versions.length > 0}
    <div class="flex gap-x-2">
      <div class="w-[6rem] rounded px-2 font-serif">Based on:</div>
      <div class="flex gap-x-2">
        {#each based_on_options.versions as option}
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-600 opacity-80 outline outline-[1.5px] outline-gray-400 hover:bg-green-200 hover:opacity-100"
            class:selected={based_on === option}
            on:click={() => (based_on = option)}
          >
            {+option.slice(1) + 1}
          </button>
        {/each}
      </div>
    </div>
  {/if}
  <div class="flex items-center gap-x-2">
    <div class="w-[6rem] rounded px-2 font-serif">Versions:</div>
    <div class="flex justify-center divide-x pt-1">
      <div class="flex flex-wrap justify-center gap-2">
        {#each versionCount.versions as version}
          <button
            class="relative flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-600 opacity-80 outline outline-[1.5px] outline-gray-400 hover:bg-green-200 hover:opacity-100"
            class:selected={version === current_version}
            on:click={() => {
              if (version === current_version && version !== "v0") {
                dispatch("delete-version", version);
              } else {
                dispatch("select-version", version);
              }
            }}
          >
            {#if version === current_version && version !== "v0"}
              <div
                class="absolute bottom-0 left-0 right-0 top-0 hidden items-center justify-center rounded-full bg-red-200"
              >
                <img src="X.svg" alt="X" />
              </div>
            {/if}
            {+version.slice(1) + 1}
          </button>
        {/each}
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-gray-300"
          on:click={() => dispatch("add-version")}
          aria-label="Add new version"
        >
          <img src="add.svg" alt="+" />
        </button>
      </div>
    </div>
  </div>
</div>

<style lang="postcss">
  .active {
    @apply bg-green-300;
    transition: all 0.5s;
  }
  .selected {
    @apply bg-green-200 text-black opacity-100 shadow-md outline-2 outline-black;
  }
  .selected:hover > div {
    @apply flex;
  }
  .entry-trigger {
    @apply rounded-sm bg-gray-200 text-gray-700 outline-double outline-1 outline-gray-600 hover:bg-gray-300;
  }
</style>
