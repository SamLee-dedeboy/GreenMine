<script lang="ts">
  import type { tVarResult } from "lib/types";
  import { onMount } from "svelte";
  import { varTypeColorScale } from "lib/store";

  export let data: tVarResult[];
  export let title: string = "baseline";
  onMount(() => {
    console.log({ data });
  });
</script>

<div
  class="flex h-full min-w-[30rem] flex-col bg-white outline outline-1 outline-black"
>
  <div>
    {title}
  </div>
  <div class="flex h-1 grow flex-col divide-y divide-black overflow-y-auto">
    {#each data as datum}
      {@const isNone = Object.keys(datum.identify_vars_result).length === 0}
      <div class="flex" class:isNone>
        <div class="id w-[4rem] shrink-0 border-r border-gray-500 px-1">
          {datum.id}
        </div>
        {#if isNone}
          <div class="ml-2 text-sm italic text-gray-500">None</div>
        {:else}
          <div
            class="result ml-1 flex flex-col gap-y-1 divide-y divide-gray-300"
          >
            {#each Object.keys(datum.identify_vars_result) as var_type}
              <div class="flex items-center capitalize">
                <div
                  class="h-fit rounded-sm px-0.5 text-sm italic opacity-70 outline-double outline-1 outline-gray-300"
                  style={`background-color: ${$varTypeColorScale(var_type)}`}
                >
                  {var_type}
                </div>
                <div class="flex flex-wrap justify-center py-1">
                  {#each datum.identify_vars_result[var_type] as var_data}
                    <div class="flex px-1 text-xs">
                      {var_data.var}
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style lang="postcss">
  div {
    /* @apply outline outline-1 outline-black; */
  }
</style>
