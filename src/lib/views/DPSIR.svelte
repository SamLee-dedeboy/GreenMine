<script lang="ts">
  import { onMount, tick } from "svelte";
  import * as d3 from "d3";
  import { DPSIR } from "lib/renderers/DPSIR";
  import Curation from "lib/components/Curation.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  import type {
    tDPSIR,
    tVariableType,
    tVariable,
    tLink,
    tVisLink,
    tMetadata,
  } from "../types";
  import { varTypeColorScale } from "lib/store";
  export let data: tDPSIR;
  export let metadata: tMetadata;
  export let links: tVisLink[];
  const svgId = "model-svg";

  let curation: any;
  const utilities = ["add", "remove", "edit"];

  let container;
  let selectedVar: tVariable | undefined = undefined;

  onMount(async () => {
    await tick();
    const handlers = {
      ["VarOrLinkSelected"]: handleVarOrLinkSelected,
      ["add"]: curation.handleAddVar,
      ["remove"]: curation.handleRemoveVar,
      ["edit"]: curation.handleEditVar,
    };
    DPSIR.init(svgId, utilities, handlers);
    update_vars(data, links);
  });

  let trigger_times = 0;
  $: update_vars(data, links);
  async function update_vars(vars: tDPSIR, links: tVisLink[]) {
    trigger_times += 1;
    if (trigger_times <= 1) return;
    await tick();
    console.log(vars, links);
    $varTypeColorScale = d3
      .scaleOrdinal()
      .domain(Object.keys(vars))
      .range(d3.schemeSet2);
    DPSIR.update_vars(vars, links, $varTypeColorScale);
  }

  function handleVarOrLinkSelected(e) {
    // e.preventDefault();
    const variable: tVariable = e;
    selectedVar = variable;
    console.log({ selectedVar });
    dispatch("var-selected", selectedVar); // for App.svelte to hightlight the chunks
  }
</script>

<div bind:this={container} class="container w-full h-full relative">
  <div class="absolute right-0 top-1">
    <Curation bind:this={curation} {metadata} />
  </div>
  <svg id={svgId} class="varbox-svg w-full h-full">
    <defs></defs>
  </svg>
</div>

<style lang="postcss">
  .varbox-svg {
    & .link-highlight {
      opacity: 0.6;
      filter: drop-shadow(2px 3px 2px rgba(0, 0, 0, 0.3));
    }
    & .link-not-highlight {
      opacity: 0.05;
    }
    & .line-hover {
      /* stroke: black; */
      /* stroke-width: 3; */
      opacity: 1;
    }
    & .box-hover {
      stroke: black;
      stroke-width: 3;
    }
    & .box-highlight {
      opacity: 1;
      stroke: black;
      stroke-width: 3;
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
