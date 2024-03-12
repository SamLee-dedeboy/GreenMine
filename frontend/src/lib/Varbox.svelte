<script lang="ts">
  import * as d3 from "d3";
  import { onMount, tick } from "svelte";
  import { varbox } from "./Varbox";
  import Legend from "./Legend.svelte";
  import { createEventDispatcher } from "svelte";
  import VariableTypeBlock from "./components/VariableTypeBlock.svelte";
  import ScatterSummary from "./components/ScatterSummary.svelte";
  import type { tVariableType, tVariable } from "./types";
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
  $: selectedVarName = selectedVar?.variable_name;
  const paddings = {
    left: 300,
    right: 300,
    top: 300,
    bottom: 300,
  };
  const links = [
    // {source: {var_type: "drivers", variable_name: "旅遊業"}, target: {var_type: "pressures", variable_name: "氣候變化和全球變暖"}},
    // {source: {var_type: "drivers", variable_name: "人口"}, target: {var_type: "pressures", variable_name: "污染"}},
    // {source: {var_type: "drivers", variable_name: "交通運輸"}, target: {var_type: "pressures", variable_name: "污染物"}},
    // {source: {var_type: "drivers", variable_name: "交通運輸"}, target: {var_type: "pressures", variable_name: "氣候變化和全球變暖"}},
    {source: {var_type: "drivers", variable_name: "城市化"}, target: {var_type: "pressures", variable_name: "土地利用和土地覆蓋變化"}},
    // {source: {var_type: "drivers", variable_name: "農業"}, target: {var_type: "pressures", variable_name: "海洋酸化"}},
    // {source: {var_type: "drivers", variable_name: "旅遊業"}, target: {var_type: "pressures", variable_name: "破壞性捕魚行為"}},
    {source: {var_type: "drivers", variable_name: "城市化"}, target: {var_type: "pressures", variable_name: "極端天氣"}},
    {source: {var_type: "drivers", variable_name: "基礎設施發展"}, target: {var_type: "pressures", variable_name: "富營養化"}},
    {source: {var_type: "drivers", variable_name: "基礎設施發展"}, target: {var_type: "pressures", variable_name: "过度捕捞"}},
    {source: {var_type: "drivers", variable_name: "經濟"}, target: {var_type: "pressures", variable_name: "污染物"}},
    {source: {var_type: "drivers", variable_name: "沿海發展"}, target: {var_type: "pressures", variable_name: "極端天氣"}},
    {source: {var_type: "drivers", variable_name: "經濟"}, target: {var_type: "pressures", variable_name: "破壞性捕魚行為"}},
    {source: {var_type: "drivers", variable_name: "沿海發展"}, target: {var_type: "pressures", variable_name: "过度捕捞"}},
    // {source: {var_type: "drivers", variable_name: "能源"}, target: {var_type: "pressures", variable_name: "物理破壞性活動"}},
    // {source: {var_type: "drivers", variable_name: "能源"}, target: {var_type: "pressures", variable_name: "極端天氣"}},
    // {source: {var_type: "drivers", variable_name: "住房"}, target: {var_type: "pressures", variable_name: "富營養化"}},
    // {source: {var_type: "drivers", variable_name: "健康"}, target: {var_type: "pressures", variable_name: "資源消耗"}},
    // {source: {var_type: "drivers", variable_name: "健康"}, target: {var_type: "pressures", variable_name: "物理破壞性活動"}},
    // {source: {var_type: "drivers", variable_name: "工業化"}, target: {var_type: "pressures", variable_name: "污染"}},

];
  onMount(() => {
    document.querySelector(".variable-type-view")?.addEventListener("click", (e) => {
      if(e.defaultPrevented) return;  
      selectedVar = undefined;
      summary_interviews = [];
      dispatch("var-selected", undefined); // for App.svelte to de-hightlight the chunks
    });

    varbox.calculatePositions(links,drivers, pressures, states, impacts, responses);
  });
  $: width = container?.clientWidth;
  $: height = container?.clientHeight;
  // $: if (width && height) varbox.init(svgId, width, height, paddings, handlers);
  // $: update_vars(drivers, pressures, states, impacts, responses);
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

  // async function update_vars(drivers, pressures, states, impacts, responses) {
  //   await tick();
  //   if (drivers && pressures && states && impacts && responses)
  //   varbox.update_vars(drivers, pressures, states, impacts, responses);
  // }

  function handleVarSelected(e) {
    e.preventDefault();
    const variable: tVariable = e.detail
    // console.log({ variable });
    selectedVar = variable;

    dispatch("var-selected", selectedVar.mentions); // for App.svelte to hightlight the chunks
  
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
  <div class="variable-type-view h-full">
    {#each containers as container}
      <div id={container.container_id} class="absolute">
        <VariableTypeBlock
          id={container.id}
          title={container.title}
          data={container.data}
          {varColorScale}
          selectedVariable={selectedVarName}
          on:var-selected={handleVarSelected}
        />
      </div>
    {/each}
    <div id="edge-container" class="w-full h-full absolute top-0 left-0 -z-0">
      <svg id="line-container" class="w-full h-full"></svg>
    </div>
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
  <ScatterSummary
    id="statistics"
    {summary_interviews}
  />
</div>

<style>
  :global(.hex-hover) {
    stroke: black !important;
    stroke-width: 3 !important;
  }

  :global(.show-tooltip) {
    opacity: 1;
  }

  .variable-type-view div:nth-child(1) {
    top: 10%;
    left: 20%;
  }
  .variable-type-view div:nth-child(2) {
    top: 10%;
    right: 20%;
  }

  /* states */
  .variable-type-view div:nth-child(3) {
    top: 35%;
    right: 5%;
  }

  /* impacts */
  .variable-type-view div:nth-child(4) {
    bottom: 30%;
    left: 50%;
    transform: translateX(-50%);
  }

  /* responses */
  .variable-type-view div:nth-child(5) {
    top: 35%;
    left: 5%;
  }

  /* .line-container {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    z-index: -1; 
  } */
/* 
  #edge-container {
    z-index: -1;
  } */

  :global(.line-hover){
    /* stroke: black; */
    /* stroke-width: 3; */
    opacity:0.8;
  }
</style>
