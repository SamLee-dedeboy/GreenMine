<script lang="ts">
  import type { tVarData } from "lib/types";
  import { onMount } from "svelte";
  import { slide } from "svelte/transition";
  export let data: tVarData;
  let show = true;
  let shown_var: string = "driver";
</script>

<div class="flex flex-col gap-y-0.5 px-1">
  <div
    tabindex="0"
    role="button"
    class="entry-trigger"
    on:click={() => (show = !show)}
    on:keyup={() => {}}
  >
    Var Definitions
  </div>
  {#if show}
    <div
      class="var-type-definition-content flex gap-x-1 gap-y-1 divide-y px-2 text-sm"
    >
      <div
        class="flex w-[6rem] flex-col items-end gap-y-0.5 divide-y border-r border-gray-300"
      >
        {#each Object.entries(data) as [var_type, vars], index}
          <div
            role="button"
            tabindex="0"
            class="r flex w-[5.5rem] items-center px-0.5 capitalize transition-all"
            class:active={shown_var === var_type}
            on:click={() =>
              (shown_var = shown_var === var_type ? "" : var_type)}
            on:keyup={() => {}}
          >
            {var_type + "s"}
          </div>
        {/each}
      </div>
      {#if shown_var !== ""}
        <div
          transition:slide
          class="flex max-h-[20rem] flex-col divide-y overflow-y-auto pr-3"
        >
          <div class="flex divide-x">
            <div
              class="flex w-[5rem] shrink-0 items-center justify-center pr-2 capitalize italic text-gray-600"
            >
              Add
            </div>
            <div
              class="grow pl-2 text-left italic text-gray-500"
              contenteditable
            ></div>
          </div>
          {#each Object.entries(data[shown_var]) as [var_name, var_definition]}
            <div class="flex divide-x">
              <div
                class="flex w-[5rem] shrink-0 items-center justify-center pr-2 capitalize italic text-gray-600"
              >
                {var_name}
              </div>
              <div
                class="grow pl-2 text-left italic text-gray-500"
                contenteditable
              >
                {var_definition.definition} - {var_definition.factor_type}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style lang="postcss">
  .entry-trigger {
    @apply rounded-sm bg-gray-200 text-gray-700 outline-double outline-1 outline-gray-600 hover:bg-gray-300;
  }
  .active {
    @apply w-[6rem] bg-gray-300 font-bold;
  }
</style>
