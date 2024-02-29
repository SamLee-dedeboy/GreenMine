<script lang="ts">
  import * as d3 from "d3";
  import { onMount, tick } from "svelte";
  import { varbox } from "./Varbox";
  import Legend from "./Legend.svelte";
  import { createEventDispatcher } from "svelte";
  import VariableTypeBlock from "./components/VariableTypeBlock.svelte";
  import ScatterSummary from "./components/ScatterSummary.svelte";
  import type { tVariableType, tVariable } from "./types";
    // import { scattersummary } from "./components/ScatterSummary";
  export let drivers: tVariableType;
  export let pressures: tVariableType;
  export let states: tVariableType;
  export let impacts: tVariableType;
  export let responses: tVariableType;


  export let interview_data: any = {};

  let summary_interviews: any = [];
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
  onMount(() => {
    document.querySelector(".variable-type-view")?.addEventListener("click", (e) => {
      if(e.defaultPrevented) return;  
      selectedVar = undefined;
      summary_interviews = [];
      dispatch("var-selected", undefined);

    });
  });
  $: width = container?.clientWidth;
  $: height = container?.clientHeight;
  $: if (width && height) varbox.init(svgId, width, height, paddings, handlers);
  $: update_vars(drivers, pressures, states, impacts, responses);
  // $: update_summary(interview_data);
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

  // async function update_summary(summary_interviews) {
  //   await tick();
  //   if (summary_interviews) varbox.update_summary(summary_interviews);
  //   else varbox.clear_summary();
  // }

  function handleVarSelected(e) {
    e.preventDefault();
    const variable: tVariable = e.detail
    // console.log({ variable });
    selectedVar = variable;

    dispatch("var-selected", selectedVar.mentions);
    const chunks = variable.mentions
    let temp :any= [];
    // console.log({interview_data})
    chunks.forEach(selected => {
        interview_data.forEach(data => {
          data.data.forEach(all_chunks => {
            if (all_chunks.id === selected.chunk_id) {
                const topic = all_chunks.topic;
                const emotion = all_chunks.emotion;
                
                
                const modifiedObject = {
                    ...selected,
                    topic,
                    emotion
                };

                temp.push(modifiedObject);
            }
          });
        });
        
    });
    summary_interviews = temp;
    // console.log({ summary_inte/rviews });

  }
</script>

<div bind:this={container} class="container w-full h-full relative">
  <div
    class="tooltip absolute w-fit h-fit pl-0.5 pr-1 py-1 rounded bg-white border border-black opacity-0 pointer-events-none text-xs"
  ></div>
  <!-- <div
    class="summary_panel w-fit h-fit pr-1 py-1 rounded bg-white border border-black opacity-0"
  ></div> -->
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
          on:var-selected={handleVarSelected}
        />
      </div>
    {/each}
  </div>
  <!-- <div class="absolute top-20 right-20 w-[150px] h-[150px]">
    <Legend/>
  </div> -->
  <!-- <div id="drivers-container" class="absolute top-[10rem]">
    <VariableTypeBlock
      id="drivers"
      title="Drivers"
      data={drivers}
      {varColorScale}
    />
  </div> -->
  <div>
    <ScatterSummary
      id="statistics"
      {summary_interviews}
    />
  </div>
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
