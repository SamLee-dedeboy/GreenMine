<script lang="ts">
  import * as d3 from "d3";
  import { tick } from "svelte";
  import { varbox } from "./Varbox";
  import { createEventDispatcher } from "svelte";
  import VariableTypeBlock from "./components/VariableTypeBlock.svelte";
  import type { tVariableType, tVariable } from "./types";
  export let drivers: tVariableType;
  export let pressures: tVariableType;
  export let states: tVariableType;
  export let impacts: tVariableType;
  export let responses: tVariableType;
  const svgId = "model-svg";
  const dispatch = createEventDispatcher();
  const handlers = {
    VarSelected: handleVarSelected,
  };
  let container;
  let selectedVar: tVariable | undefined = undefined;
  const paddings = {
    left: 300,
    right: 300,
    top: 300,
    bottom: 300,
  };

  $: width = container?.clientWidth;
  $: height = container?.clientHeight;
  $: if (width && height) varbox.init(svgId, width, height, paddings, handlers);
  $: update_vars(drivers, pressures, states, impacts, responses);
  $: varColorScale = varbox.updateColorScales(
    drivers,
    pressures,
    states,
    impacts,
    responses
  );
  $: containers = [drivers, pressures, states, impacts, responses].map(
    (var_type) => {
      return {
        container_id: var_type.variable_type.toLocaleLowerCase() + "-container",
        id: var_type.variable_type.toLocaleLowerCase(),
        title: var_type.variable_type,
        data: var_type,
      };
    }
  );
  // $: updateContainerPosition(containers);
  // $:((_) => {
  //     varbox.hight_hex(selectedVar);
  // })(selectedVar);

  // function updateContainerPosition(containers) {
  //   console.log("updateContainerPosition", containers);
  //   if (!container) return;
  //   containers.forEach((container) => {
  //     const containerEl = document.getElementById(container.container_id);
  //     console.log(containerEl);
  //     if (containerEl) {
  //       containerEl.style.left = `${width - containerEl.clientWidth}px`;
  //     }
  //   });
  // }

  async function update_vars(drivers, pressures, states, impacts, responses) {
    await tick();
    if (drivers && pressures && states && impacts && responses)
      varbox.update_vars(drivers, pressures, states, impacts, responses);
  }

  function handleVarSelected(variable: tVariable) {
    console.log({ variable });
    selectedVar = variable;
    dispatch("var-selected", selectedVar.mentions);
  }
</script>

<div bind:this={container} class="w-full h-full relative">
  <div
    class="tooltip absolute w-fit h-fit pl-0.5 pr-1 py-1 rounded bg-white border border-black opacity-0 pointer-events-none text-xs"
  ></div>
  <div
    class="summary_panel w-fit h-fit pr-1 py-1 rounded bg-white border border-black opacity-0"
  ></div>
  <!-- <svg id={svgId} class="w-full h-full">
        <g class="driver_region"></g>
        <g class="pressure_region"></g>
        <g class="state_region"></g>
        <g class="impact_region"></g>
        <g class="response_region"></g>
    </svg> -->
  <div class="variable-type-view">
    {#each containers as container}
      <div id={container.container_id} class="absolute">
        <VariableTypeBlock
          id={container.id}
          title={container.title}
          data={container.data}
          {varColorScale}
          on:var-selected={(e) => handleVarSelected(e.detail)}
        />
      </div>
    {/each}
  </div>
  <!-- <div id="drivers-container" class="absolute top-[10rem]">
    <VariableTypeBlock
      id="drivers"
      title="Drivers"
      data={drivers}
      {varColorScale}
    />
  </div> -->
  <svg
    id={`statistics-${svgId}`}
    class="absolute left-0 right-0 top-0 bottom-0"
  >
  </svg>
</div>

<style>
  :global(.hex-hover) {
    stroke: black !important;
    stroke-width: 3 !important;
    /* transition: all 0.05s ease-in-out; */
  }

  :global(.show-tooltip) {
    opacity: 1;
  }

  :global(.hex-highlight) {
    opacity: 1;
    stroke: black !important;
    stroke-width: 3 !important;
  }
  :global(.hex-not-highlight) {
    opacity: 0.5;
  }
  :global(.hex-label-highlight) {
    opacity: 1;
  }
  :global(.hex-label-not-highlight) {
    opacity: 0.5;
  }

  .variable-type-view div:nth-child(1) {
    top: 0;
    left: 20%;
  }
  .variable-type-view div:nth-child(2) {
    top: 0;
    right: 20%;
  }
  .variable-type-view div:nth-child(3) {
    top: 20%;
    left: 5%;
  }
  .variable-type-view div:nth-child(4) {
    top: 20%;
    right: 5%;
  }
  .variable-type-view div:nth-child(5) {
    bottom: 50%;
    left: 50%;
    transform: translateX(-50%);
  }
</style>
