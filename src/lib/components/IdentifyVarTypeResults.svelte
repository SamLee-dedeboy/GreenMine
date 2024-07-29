<script lang="ts">
  import { fade } from "svelte/transition";
  import type { tIdentifyVarTypes } from "../types";
  import { varTypeColorScale } from "lib/store";
  export let data: tIdentifyVarTypes[];
  export let title: string = "Results";

  function sort_by_id(chunks: tIdentifyVarTypes[]) {
    console.log("sort", chunks);
    return chunks.sort((a, b) => {
      const pid_a = a.id.replace("N", "").split("_")[0];
      const pid_b = b.id.replace("N", "").split("_")[0];
      if (pid_a === pid_b) {
        return +a.id.split("_")[1] - +b.id.split("_")[1];
      } else {
        return +pid_a - +pid_b;
      }
    });
  }
</script>

<div
  class="relative z-50 flex
    max-h-[85vh] w-[90vw]
            max-w-[450px] flex-col
            bg-gray-100 px-1 shadow-lg"
  transition:fade={{
    duration: 100,
  }}
>
  <h2 class="text-lg font-medium capitalize text-black">{title}</h2>
  <div class="flex grow flex-col divide-y divide-black">
    <div class="flex gap-x-2 divide-x">
      <div class="w-[3rem] shrink-0">ID</div>
      <div class="flex pl-2">Var Type</div>
    </div>

    <div class="flex h-1 grow flex-col divide-y divide-black overflow-y-scroll">
      {#each sort_by_id(data) as datum, i}
        {#if datum.identify_var_types_result}
          {@const isNone = datum.identify_var_types_result.length === 0}
          <div class="flex items-center gap-x-2 divide-x">
            <div class="w-[3rem] shrink-0 text-[0.9rem]">{datum.id}</div>
            <div
              class="flex grow items-center gap-x-1 bg-gray-200 py-0.5 pl-1 pr-3 capitalize"
              class:dismissed={isNone}
            >
              {#if isNone}
                <div class="text-sm">None</div>
              {:else}
                {#each datum.identify_var_types_result as var_type_wrapper, i}
                  <div
                    class="rounded-sm px-0.5 text-sm italic opacity-70 outline-double outline-1 outline-gray-300"
                    style={`background-color: ${$varTypeColorScale(var_type_wrapper.var_type)}`}
                  >
                    {var_type_wrapper.var_type}
                  </div>
                {/each}
                <div
                  role="button"
                  tabindex="0"
                  class="ml-auto flex h-fit items-center rounded-sm px-1 py-0.5 text-[0.7rem] normal-case italic leading-3 text-gray-600 outline-double outline-1 outline-gray-300 hover:bg-gray-300"
                >
                  evidence
                </div>
              {/if}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  </div>
</div>

<style lang="postcss">
  .dismissed {
    @apply bg-white text-gray-500;
  }
</style>
