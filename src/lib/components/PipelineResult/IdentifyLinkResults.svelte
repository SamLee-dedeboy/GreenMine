<script lang="ts">
  import type { tIdentifyLinks, tLink } from "lib/types";
  import { onMount } from "svelte";
  import { varTypeColorScale } from "lib/store";
  import { sort_by_id, setOpacity, sort_by_var_type } from "lib/utils";

  export let data: tIdentifyLinks[];
  export let title: string = "baseline";
  onMount(() => {
    console.log("links:", { data });
  });
</script>

<div
  class="flex h-full min-h-[35rem] min-w-[25rem] flex-col bg-gray-100 px-1 shadow-lg"
>
  <h2 class="text-lg font-medium capitalize text-black">{title}</h2>
  <div class="flex grow flex-col divide-y divide-black">
    <div class="flex gap-x-2 divide-x">
      <div class="w-[3rem] shrink-0">ID</div>
      <div class="flex pl-2">Var Type</div>
    </div>
    <div class="flex h-1 grow flex-col divide-y divide-black overflow-y-auto">
      {#each sort_by_id(data) as datum}
        {@const isNone = Object.keys(datum.identify_links_result).length === 0}
        <div class="flex gap-x-2 divide-x" class:isNone>
          <div class="w-[3rem] shrink-0 text-[0.9rem]">
            {datum.id}
          </div>
          {#if isNone}
            <div class="pl-1 text-sm">None</div>
          {:else}
            <div
              class="result flex w-full flex-col divide-y divide-dashed divide-gray-400"
            >
              {#each datum.identify_links_result as link}
                <div class="flex flex-col gap-y-1 bg-gray-200 py-1 pl-1 pr-3">
                  <div class="flex items-center">
                    <div
                      class="h-fit shrink-0 rounded-sm px-0.5 text-xs italic opacity-70 outline-double outline-1 outline-gray-300"
                      style={`background-color: ${$varTypeColorScale(link.indicator1)}`}
                    >
                      {link.var1}
                    </div>
                    <div class="w-6 text-sm font-light">---</div>
                    <div
                      class="h-fit shrink-0 rounded-sm px-0.5 text-xs italic opacity-70 outline-double outline-1 outline-gray-300"
                      style={`background-color: ${$varTypeColorScale(link.indicator2)}`}
                    >
                      {link.var2}
                    </div>
                  </div>
                  <div class="flex w-full text-sm">
                    <div
                      class="px-0.5 text-left capitalize italic text-gray-500"
                    >
                      {link.response.relationship}
                    </div>
                    <div
                      role="button"
                      tabindex="0"
                      class="ml-auto flex h-fit items-center rounded-sm px-1 py-0.5 text-[0.7rem] normal-case italic leading-3 text-gray-600 outline-double outline-1 outline-gray-300 hover:bg-gray-300"
                      on:click={() => console.log(link.response.evidence)}
                      on:keyup={() => {}}
                    >
                      evidence
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style lang="postcss">
  div {
    /* @apply outline outline-1 outline-black; */
  }
  .isNone {
    @apply bg-white text-gray-400;
  }
  .isEmpty {
    @apply opacity-60;
  }
</style>
