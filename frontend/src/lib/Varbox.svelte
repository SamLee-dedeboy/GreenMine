<script lang="ts">
  import * as d3 from "d3";
  import { onMount, tick } from "svelte";
  import { varbox } from "./Varbox";
  import Legend from "./Legend.svelte";
  import { createEventDispatcher } from "svelte";
  import VariableTypeBlock from "./components/VariableTypeBlock.svelte";
  import ScatterSummary from "./components/ScatterSummary.svelte";
  import links from "../../../data/result/all_connections.json";
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
    LinkSelected: handleLinkSelected,
  };
  let container;
  let selectedVar: tVariable | undefined = undefined;
  let selectedVarLink: string | undefined = undefined;
  $: selectedVarName = selectedVar?.variable_name;
  const paddings = {
    left: 300,
    right: 300,
    top: 300,
    bottom: 300,
  };
  // console.log(links);
  function transformData(data) {
    const linksMap = new Map();

    data.forEach(item => {
      const source = { var_type: item.indicator1.toLowerCase(), variable_name: item.var1 };
      const target = { var_type: item.indicator2.toLowerCase(), variable_name: item.var2 };
      const key = JSON.stringify({ source, target });

      if (linksMap.has(key)) {
        // Check if the chunk_id is already in the mentions for this key
        const mapEntry = linksMap.get(key);
        const chunkIdExists = mapEntry.mentions.some(mention => mention.chunk_id === item.chunk_id);

        if (!chunkIdExists) {
          // If the chunk_id is not already included, add it to the mentions
          mapEntry.mentions.push({ chunk_id: item.chunk_id });
        }

      } else {
        // If the key doesn't exist, initialize it with the current chunk_id in mentions
        linksMap.set(key, { source, target, mentions: [{ chunk_id: item.chunk_id }] });
      }
    });

    // Convert the map values to an array and adjust structure to include frequency
    const result = Array.from(linksMap.values()).map(entry => ({
      ...entry,
      frequency: entry.mentions.length,
      mentions: entry.mentions
    }));

    return result;
  }


  const new_links = transformData(links);
  // console.log({new_links})
  //need to be modified for summary view
  onMount(() => {
    document.querySelector(".variable-type-view")?.addEventListener("click", (e) => {
      if(e.defaultPrevented) return;  
      selectedVar = undefined;
      summary_interviews = [];
      dispatch("var-selected", undefined); // for App.svelte to de-hightlight the chunks
    });
    update_vars(drivers, pressures, states, impacts, responses,new_links, selectedVarName);

    
  });
  $: width = container?.clientWidth;
  $: height = container?.clientHeight;
  $: if (width && height) varbox.init(svgId, width, height, paddings, handlers);
  // $: varColorScale = varbox.updateColorScales(
  //   drivers,
  //   pressures,
  //   states,
  //   impacts,
  //   responses
  // );
  // $: containers = [drivers, pressures, states, impacts, responses].map(
  //   (var_type) => {
  //     return {
  //       container_id: var_type.variable_type.toLocaleLowerCase() + "-container",
  //       id: var_type.variable_type.toLocaleLowerCase(),
  //       title: var_type.variable_type,
  //       data: var_type,
  //     };
  //   }
  // );
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

  async function update_vars(drivers, pressures, states, impacts, responses,new_links, selected_var_name) {
    await tick();
    if (drivers && pressures && states && impacts && responses && new_links)  
    varbox.update_vars(drivers, pressures, states, impacts, responses,new_links, selected_var_name);
  }

  function handleLinkSelected(e) {
    // e.preventDefault();
    const link: string = e;
    // console.log({ link });
    selectedVarLink = link;
    dispatch("link-selected", selectedVarLink);
  }

  function handleVarSelected(e) {
    // e.preventDefault();
    const variable: tVariable = e
    // console.log({ variable });
    selectedVar = variable;

    dispatch("var-selected", selectedVar); // for App.svelte to hightlight the chunks
    // console.log({selectedVar})
    // update_vars(drivers, pressures, states, impacts, responses,new_links, selectedVar?.variable_name); do not put this over here


    if (variable) {
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
  }



</script>

<div bind:this={container} class="container w-full h-full relative">
  <!-- <div
    class="tooltip absolute w-fit h-fit pl-0.5 pr-1 py-1 rounded bg-white border border-black opacity-0 pointer-events-none text-xs"
  ></div> -->
  <!-- <div class="variable-type-view h-full"> -->
    <svg id={svgId} class="varbox-svg w-full h-full">
      <g class="driver_region"></g>
      <g class="pressure_region"></g>
      <g class="state_region"></g>
      <g class="impact_region"></g>
      <g class="response_region"></g>
    </svg>
    <!-- {#each containers as container}
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
    {/each} -->
    <!-- <div id="edge-container" class="w-full h-full absolute top-0 left-0 -z-50">
      <svg id="line-container" class="w-full h-full">
        <defs>
          <linearGradient id='grad'>
            <stop stop-color='#ffffcc'/>
            <stop offset="25%" stop-color='#c2e699'/>
            <stop offset="55%" stop-color=' #78c679'/>
            <stop offset='100%' stop-color='#006837'/>
          </linearGradient>
        </defs>
      </svg>
    </div> -->
  <!-- </div> -->
  <!-- <div class="absolute top-20 right-20 w-[150px] h-[150px]">
    <Legend/>
  </div> -->
  <!-- <ScatterSummary
    id="statistics"
    {summary_interviews}
  /> -->
</div>

<style lang="postcss">
  /* :global(.box-hover) {

  } */

  :global(.show-tooltip) {
    opacity: 1;
  }
  .varbox-svg {
    & .link-highlight {
      opacity: 1;
    }
    & .link-not-highlight {
      opacity: 0.1;
    }
    & .line-hover {
    /* stroke: black; */
    /* stroke-width: 3; */
    opacity:1;
  }
  & .box-hover {
    stroke: black ;
    stroke-width: 3;
  }
  & .box-highlight {
    opacity: 1;
    stroke: black;
    stroke-width: 3;
  }
  & .box-not-highlight{
    opacity: 0.5;
  }
  & .box-label-highlight {
    opacity: 1;
  }
  & .box-label-not-highlight {
    opacity: 0.5;
  }
}
  /* .variable-type-view div:nth-child(1) {
    top: 7%;
    left: 17%;
  }
  .variable-type-view div:nth-child(2) {
    top: 5%;
    right: 20%;
  }

  /* states */
  /* .variable-type-view div:nth-child(3) {
    top: 45%;
    right: 5%;
  } */

  /* impacts */
  /* .variable-type-view div:nth-child(4) {
    bottom: 25%;
    left: 50%;
    transform: translateX(-50%);
  } */

  /* responses */
  /* .variable-type-view div:nth-child(5) {
    top: 40%;
    left: 5%;
  }  */


</style>
