<script lang="ts">
  import type { tVarTypeData } from "lib/types";
  import { createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";
  export let data: tVarTypeData;
  const dispatch = createEventDispatcher();
  let show = true;
  function handleSaveDef(updatedData: tVarTypeData) {
    console.log(updatedData);
    dispatch("save", { type: "var_type_definitions", data: updatedData });
  }
</script>

<div class="relative flex flex-col gap-y-0.5 px-1">
  <div
    tabindex="0"
    role="button"
    on:click={(e) => {
      if (!e.defaultPrevented) show = !show;
    }}
    on:keyup={() => {}}
    class="entry-trigger relative font-serif"
  >
    Indicator Definitions
  </div>
  <div
    role="button"
    tabindex="0"
    class="absolute right-2 top-0.5 flex items-center justify-center rounded-sm normal-case italic leading-3 text-gray-600 outline-double outline-1 outline-gray-300 hover:bg-gray-400"
    on:mouseover={(e) => {
      e.preventDefault();
    }}
    on:focus={(e) => {
      e.preventDefault();
    }}
    on:click={(e) => {
      e.preventDefault();
      handleSaveDef(data);
    }}
    on:keyup={() => {}}
  >
    <img src="save.svg" alt="" class="h-5 w-5" />
  </div>
  {#if show}
    <div transition:slide class="var-type-definition-content divide-y text-sm">
      {#each Object.entries(data) as [var_type, definition], index}
        <div class="flex divide-x">
          <div class="w-[5rem] shrink-0 pr-2 capitalize italic text-gray-600">
            {var_type}
          </div>
          <div
            class="grow pl-2 text-left italic text-gray-500"
            contenteditable
            on:blur={(e) => (data[var_type] = e.target.innerText.trim())}
          >
            {definition}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="postcss">
  .entry-trigger {
    @apply rounded-sm bg-gray-200 text-gray-700 outline-double outline-1 outline-gray-600 hover:bg-gray-300;
  }
</style>
