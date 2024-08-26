<script lang="ts">
  import type { tDPSIR } from "lib/types";
  import { createEventDispatcher } from "svelte";
  import KeywordSea from "lib/components/KeywordSea.svelte";
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

<div class="flex w-full cursor-auto flex-col overflow-hidden bg-white">
  <div class="flex">
    {#each var_type_options as var_type}
      <button
        class="m-1 border border-black bg-white p-1"
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
    {/if}
  </div>
</div>
