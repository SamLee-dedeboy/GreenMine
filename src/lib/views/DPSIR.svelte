<script lang="ts">
  import { onMount, tick } from "svelte";
  import * as d3 from "d3";
  import { DPSIR } from "lib/renderers/DetailDPSIR";
  import {OverviewDPSIR} from "lib/renderers/OverviewDPSIR";
  import Curation from "lib/components/Curation.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  import type {
    tDPSIR,
    tVariableType,
    tVariable,
    tLink,
    tVisLink,
  } from "../types";
  import { varTypeColorScale } from "lib/store";
  export let data: tDPSIR | undefined;
  export let links: tVisLink[] | undefined;
  const svgId = "model-svg";

  let curation: any;
  const utilities = ["add", "remove", "edit"];

  let container;
  let selectedVar: tVariable | undefined = undefined;
  let selectedType = {source:"", target:""};
  let showLinks = true;
  let enable = false;
  let currentRenderer = "OverviewDPSIR";
  // let trigger_times = 0;
  $: update_vars(data, links, showLinks,selectedType);
  async function update_vars(
    vars: tDPSIR | undefined,
    links: tVisLink[] | undefined,
    showLinks: boolean,
    selectedType:{source:string, target:string}
  ) {
    if (!vars || !links) return;
    if(currentRenderer == "OverviewDPSIR"){
      OverviewDPSIR.update_vars(vars, links, $varTypeColorScale);
    }
    else{
      DPSIR.update_vars(vars, links, $varTypeColorScale, selectedType);
    }
  }

  onMount(async () => {
    await tick();
    // const handlers = {
    //   // ["VarOrLinkSelected"]: handleVarOrLinkSelected,
    //   ["EnableLinks"]: enableLinks,
    // };
    initializeRenderer(currentRenderer,selectedType);
    
  });
  function toggleLinks() {
    if(enable){
      showLinks = !showLinks;
      if(currentRenderer == "DPSIR"){
          DPSIR.toggleLinks(showLinks);
      }
    }
    else{
      alert("Please wait until links is complete")
    }
    
  }
  function handleVarOrLinkSelected(e) {
    console.log(e)
    // e.preventDefault();
    const variable: tVariable = e;
    selectedVar = variable;
    // console.log({ selectedVar });
    dispatch("var-selected", selectedVar); // for App.svelte to hightlight the chunks
  }
  function handleVarTypeLinkSelected(e){
    console.log(e)
    if(e!==null){
      currentRenderer = "DPSIR";
      initializeRenderer(currentRenderer,{source:e.source, target:e.target} )
    }
    
  }
  function enableLinks(e){
    enable = e;
  }

  function switchRenderer() {
    currentRenderer = currentRenderer === "OverviewDPSIR" ? "DPSIR" : "OverviewDPSIR";
    initializeRenderer(currentRenderer,selectedType);
  }

  function initializeRenderer(renderer,selectedType) {
    d3.select(`#${svgId}`).selectAll('*').remove();
    
    if (renderer === "DPSIR") {
      DPSIR.init(svgId, utilities, { ["EnableLinks"]: enableLinks });
      DPSIR.on("VarOrLinkSelected", handleVarOrLinkSelected);
      d3.select("body").selectAll(".tooltip-content").remove();
    } else {
      OverviewDPSIR.init(svgId);
      OverviewDPSIR.on("VarTypeLinkSelected", handleVarTypeLinkSelected);
    }

    update_vars(data, links, showLinks, selectedType);

    // Remove tooltip if it exists
    
  }



</script>

<div bind:this={container} class="container h-full w-full">
  <!-- <div class="absolute right-0 top-1">
    <Curation bind:this={curation} {metadata} />
  </div> -->
  <!-- <button
      class="absolute top-20 right-20 bg-gray-200 p-1 rounded-sm"
      on:click={() => {
        toggleLinks();
      }}
      >{showLinks ? 'Hide Other Links' : 'Show Other Links'}</button
    > -->
  <button
    class="absolute top-4 right-4 bg-gray-400 text-white p-2 rounded-md hover:bg-gray-500 transition-colors"
    on:click={switchRenderer}
  >
    Switch to {currentRenderer === "OverviewDPSIR" ? "DPSIR" : "Overview"}
  </button>
  <svg id={svgId} class="varbox-svg h-full w-full">
    <defs></defs>
  </svg>
</div>

<style lang="postcss">
  .container {
    max-width: 100%; /* make DPSIR full width*/
  }
  .varbox-svg {
    & .link-highlight {
      opacity: 0.6;
      /* filter: drop-shadow(2px 3px 2px rgba(0, 0, 0, 0.3)); */
    }
    & .link-not-highlight {
      opacity: 0.05;
    }
    & .not-show-link-not-highlight {
      opacity: 0;
    }
    & .line-hover {
      stroke: black;
      /* stroke-width: 3; */
      opacity: 1;
    }
    & .box-hover {
      stroke: black;
      stroke-width: 3;
    }
    & .box-highlight {
      opacity: 1;
      /* stroke: black; */
      /* stroke-width: 3; */
    }
    & .box-not-highlight {
      opacity: 0.5;
    }
    & .box-label-highlight {
      opacity: 1;
    }
    & .box-label-not-highlight {
      opacity: 0.5;
    }
    & .bbox-label-hover {
      opacity: 0.2;
    }
  }
</style>
