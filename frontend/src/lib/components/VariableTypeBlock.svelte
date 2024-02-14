<script lang="ts">
  import { onMount } from "svelte";
  import type { tVariableType } from "../types";
  import { createEventDispatcher } from "svelte";
  const dispatchEvent = createEventDispatcher();
  export let id: string;
  export let title: string;
  export let data: tVariableType;
  export let varColorScale: any;
  onMount(() => {
    console.log("VariableTypeBlock mounted", data);
  });

  function getMentionLength(data, variable_name) {
    return data.variable_mentions[variable_name].mentions.length;
  }
</script>

<div
  class="variable-type-conatiner flex flex-col items-center justify-center gap-y-1 w-[20rem] bg-white"
>
  <div class="variable-type-title text-lg italic font-bold font-serif">
    {title}
  </div>
  <div
    class="variable-type-content flex gap-1 flex-wrap items-center justify-center border border-gray-300 rounded p-2 text-sm shadow-md"
  >
    {#each Object.keys(data.variable_mentions) as variable_name, index}
      <div
        role="button"
        tabindex={index}
        class="variable-type-item outline outline-1 outline-gray-300 rounded p-1 shadow-md hover:outline-black hover:outline-2"
        style="background-color: {varColorScale(
          getMentionLength(data, variable_name)
        )}"
        on:click={() =>
          dispatchEvent("var-selected", data.variable_mentions[variable_name])}
        on:keyup={() => {}}
      >
        {variable_name}
      </div>
    {/each}
  </div>
</div>
