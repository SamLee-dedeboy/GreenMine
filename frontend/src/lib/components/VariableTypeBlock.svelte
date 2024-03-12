<script lang="ts">
  import { onMount } from "svelte";
  import type { tVariableType } from "../types";
  import { createEventDispatcher } from "svelte";
  const dispatchEvent = createEventDispatcher();
  export let id: string;
  export let title: string;
  export let data: tVariableType;
  export let varColorScale: any;
  export let selectedVariable: string | undefined = undefined;
  onMount(() => {
    // console.log({selectedVariable})
  });
  $: radius = Math.sqrt(Object.values(data.variable_mentions).reduce((acc, curr) => acc + curr.mentions.length, 0));
  $: console.log({radius});
  export function dehighlight_var(){
    selectedVariable = undefined;
    // console.log({selectedVariable})
  }
  // $: console.log(selectedVariable, Object.keys(data.variable_mentions).map((variable_name) => variable_name === selectedVariable));
  // $:((_) => {
  //     console.log({selectedVariable})
  // })(selectedVariable);

  function getMentionLength(data, variable_name) {
    // console.log(data.variable_mentions[variable_name].mentions.length);
    return data.variable_mentions[variable_name].mentions.length;
  }
</script>

<div
  class="variable-type-conatiner flex flex-col items-center justify-center gap-y-1 bg-white"
  style={`width: ${radius*0.75}rem`}
>
  <div class="variable-type-title text-lg italic font-bold font-serif">
    {title}
  </div>
  <div
    class="variable-type-content flex gap-4 flex-wrap items-center justify-center border border-gray-300 rounded p-2 text-sm shadow-md"
  >
    {#each Object.keys(data.variable_mentions) as variable_name, index}
    <div
      role="button"
      tabindex={index}
      id = {variable_name}
      class={`variable-type-item outline outline-1 outline-gray-300 rounded p-1 shadow-md hover:outline-black hover:outline-2 ${selectedVariable === variable_name ? "variable-highlight" : ""}`}
      style="background-color: {varColorScale(
        getMentionLength(data, variable_name)
      )};"
      on:click={(e) => {
        e.preventDefault();
        selectedVariable = variable_name;
        // console.log({variable_name})
        dispatchEvent("var-selected", data.variable_mentions[variable_name]); //for varbox to pass selected chunks to scatter summary
      }}
      on:keyup={() => {}}
    >
    <span style="color: {getMentionLength(data,variable_name)>140?"#fffafa":"black"};opacity:1">{variable_name} </span>
    </div>
    {/each}
  </div>
</div>


<style>
    .variable-highlight {
    border-width: 4;
    outline-color: black;
    /* box-shadow: 0px 1px 3px black; */
  }
  :global(.variable-not-highlight) {
    opacity: 0.3;
  }
</style>
