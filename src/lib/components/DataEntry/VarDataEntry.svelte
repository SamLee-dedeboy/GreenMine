<script lang="ts">
  import type { tVarData } from "lib/types";
  import { onMount } from "svelte";
  import { slide } from "svelte/transition";
  export let data: tVarData;
  let show = true;
  let shown_var_type: string = "driver";
  function handleAddVar() {
    data[shown_var_type] = [
      {
        var_name: "New Variable",
        definition: "New Definition",
        factor_type: "Factor Type",
      },
      ...data[shown_var_type],
    ];
  }
</script>

<div class="flex flex-col gap-y-0.5 px-1">
  <div class="entry-trigger font-serif">Variable Definitions</div>
  {#if show}
    <div
      class="var-type-definition-content flex gap-x-1 gap-y-1 divide-y px-2 text-sm"
    >
      <div
        class="flex w-[6rem] flex-col items-end gap-y-0.5 divide-y border-r border-gray-300"
      >
        {#each Object.keys(data) as var_type, index}
          <div
            role="button"
            tabindex="0"
            class="flex w-[5.5rem] items-center px-0.5 capitalize transition-all hover:bg-gray-300"
            class:active={shown_var_type === var_type}
            on:click={() =>
              (shown_var_type = shown_var_type === var_type ? "" : var_type)}
            on:keyup={() => {}}
          >
            {var_type + "s"}
          </div>
        {/each}
      </div>
      {#if shown_var_type !== ""}
        <div
          transition:slide
          class="flex max-h-[20rem] flex-col divide-y overflow-y-auto pr-3"
        >
          <div class="flex divide-x">
            <div
              role="button"
              tabindex="0"
              class="flex w-full py-0.5 capitalize italic text-gray-600 hover:bg-gray-300"
              on:click={() => handleAddVar()}
              on:keyup={() => {}}
            >
              <div class="flex w-[5rem] items-center justify-center">
                <img src="add.svg" alt="add" class="h-4 w-4" />
              </div>
            </div>
          </div>
          {#each data[shown_var_type] as { var_name, definition, factor_type }, index}
            <div class="flex divide-x">
              <div
                class="relative flex w-[5rem] shrink-0 items-center justify-center capitalize italic text-gray-600"
                contenteditable
                on:blur={(e) => {
                  data[shown_var_type][index].var_name =
                    e.target.innerText.trim();
                }}
              >
                {var_name}
                <!-- <span class="absolute left-0 top-0 text-xs text-gray-500"
                  >{factor_type}</span
                > -->
              </div>
              <div
                class="grow pl-2 text-left italic text-gray-500"
                contenteditable
                on:blur={(e) => {
                  data[shown_var_type][index].definition =
                    e.target.innerText.trim();
                }}
              >
                {definition}
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
    @apply rounded-sm bg-gray-200 text-gray-700 outline-double outline-1 outline-gray-600;
  }
  .active {
    @apply pointer-events-none w-[6rem] bg-green-300 font-semibold;
  }
</style>
