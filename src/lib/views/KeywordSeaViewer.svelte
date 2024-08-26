<script lang="ts">
  import type { tDPSIR } from "lib/types";
  import { createEventDispatcher } from "svelte";
  import KeywordSea from "lib/components/KeywordSea.svelte";
  import { varTypeColorScale } from "lib/store";
  import { setOpacity } from "lib/utils";
  const dispatch = createEventDispatcher();

  let keywordsea_var_type: string | undefined = undefined;
  const var_type_options = [
    "driver",
    "pressure",
    "state",
    "impact",
    "response",
  ];
  export let data: tDPSIR;
</script>

<div class="relative flex w-full cursor-auto flex-col bg-white">
  <div class="mt-[-3rem] flex h-[3rem] w-fit shrink-0 items-end text-sm">
    {#each var_type_options as var_type}
      <button
        class="h-[2rem] rounded border p-1 capitalize outline-double outline-1 outline-gray-300"
        style={`background-color: ${setOpacity($varTypeColorScale(var_type), 0.7, "rgbHex")}`}
        class:active={keywordsea_var_type === var_type}
        on:click={() => {
          keywordsea_var_type = var_type;
        }}
      >
        {var_type}
      </button>
    {/each}
  </div>
  <div class="keywordsea-container flex grow bg-white">
    {#if keywordsea_var_type}
      <KeywordSea
        data={data[keywordsea_var_type].keyword_data}
        key={keywordsea_var_type}
      />
    {:else}
      <div
        class="flex w-full items-center justify-center text-[4rem] font-semibold italic text-gray-400"
      >
        Click Any Indicator Above
      </div>
    {/if}
  </div>
  <button
    aria-label="close"
    class="text-magnum-800 focus:shadow-magnum-400 absolute right-1 top-[-2.5rem] inline-flex h-5
              w-5 appearance-none items-center justify-center
              rounded-full hover:bg-zinc-300"
    style="cursor: pointer"
    on:click={() => dispatch("close")}
  >
    <img src="X.svg" alt="x" class="pointer-events-none h-4" />
  </button>
</div>

<style lang="postcss">
  .active {
    @apply pointer-events-none h-[3rem];
    transition: all 0.3s;
  }
</style>
