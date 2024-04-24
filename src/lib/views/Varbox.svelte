<script lang="ts">
  import { onMount, tick } from "svelte";
  import { DPSIR } from "lib/renderers/DPSIR";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  import type {
    tDPSIR,
    tVariableType,
    tVariable,
    tLink,
    tVisLink,
  } from "../types";
  export let data: tDPSIR;
  export let links: tVisLink[];
  const svgId = "model-svg";

  const handlers = {
    VarOrLinkSelected: handleVarOrLinkSelected,
  };
  let container;
  let selectedVar: tVariable | undefined = undefined;

  onMount(async () => {
    await tick();
    DPSIR.init(svgId, handlers);
    update_vars(data, links);
  });

  async function update_vars(vars: tDPSIR, links: tVisLink[]) {
    await tick();
    console.log(vars, links);
    DPSIR.update_vars(vars, links);
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
  <svg id={svgId} class="varbox-svg w-full h-full">
    <defs></defs>
  </svg>
</div>

<style lang="postcss">
  .varbox-svg {
    & .link-highlight {
      opacity: 0.6;
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
  }
</style>
