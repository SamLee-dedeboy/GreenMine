<script lang="ts">
  import type { tVarTypeData } from "lib/types";
  import { slide } from "svelte/transition";
  export let data: tVarTypeData;
  let show = true;
</script>

<div class="flex flex-col px-1">
  <div
    tabindex="0"
    role="button"
    class="entry-trigger"
    on:click={() => (show = !show)}
    on:keyup={() => {}}
  >
    Var Type Definitions
  </div>
  {#if show}
    <div transition:slide class="var-type-definition-content divide-y text-sm">
      {#each Object.entries(data) as [var_type, definition], index}
        <div class="flex divide-x">
          <div class="w-[5rem] shrink-0 pr-2 capitalize italic text-gray-600">
            {var_type}
          </div>
          <div class="grow pl-2 text-left italic text-gray-500" contenteditable>
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
