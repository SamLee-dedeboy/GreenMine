<script lang="ts">
  import { onMount, tick } from "svelte";
  import { varbox } from "lib/Varbox";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  import type { tVariableType, tVariable, tLink, tTranscript, tNewLink } from "./types";
  export let drivers: tVariableType;
  export let pressures: tVariableType;
  export let states: tVariableType;
  export let impacts: tVariableType;
  export let responses: tVariableType;
  export let links: tLink[];
  export let interview_data: tTranscript[];
  const new_links:tNewLink[] = transformData(links);
  const svgId = "model-svg";

  const handlers = {
    VarOrLinkSelected: handleVarOrLinkSelected,
  };
  let container;
  let selectedVar: tVariable | undefined = undefined;
  // $: selectedVarName = selectedVar?.variable_name;
  const paddings = {
    left: 300,
    right: 300,
    top: 300,
    bottom: 300,
  };
  $: width = container?.clientWidth;
  $: height = container?.clientHeight;
  $: if (width && height) varbox.init(svgId, width, height, paddings, handlers);

  onMount(() => {
    // document
      // .querySelector(".variable-type-view")
      // ?.addEventListener("click", (e) => {
      //   if (e.defaultPrevented) return;
      //   selectedVar = undefined;
      //   dispatch("var-selected", undefined); // for App.svelte to de-hightlight the chunks
      // });
    update_vars(
      drivers,
      pressures,
      states,
      impacts,
      responses,
      new_links,
      // selectedVarName
    );
  });

  async function update_vars(
    drivers: tVariableType,
    pressures: tVariableType,
    states: tVariableType,
    impacts: tVariableType,
    responses: tVariableType,
    new_links: tNewLink[],
    // selected_var_name: string | undefined
  ) {
    await tick();
    if (drivers && pressures && states && impacts && responses && new_links)
      varbox.update_vars(
        drivers,
        pressures,
        states,
        impacts,
        responses,
        new_links,
        // selected_var_name
      );
  }

  function transformData(data: tLink[]) {
    // console.log({ data });
    const linksMap = new Map();
    data.forEach((item) => {
      const source = {
        var_type: item.indicator1.toLowerCase(),
        variable_name: item.var1,
      };
      const target = {
        var_type: item.indicator2.toLowerCase(),
        variable_name: item.var2,
      };
      const key = JSON.stringify({ source, target });
      if (linksMap.has(key)) {
        // Check if the chunk_id is already in the mentions for this key
        const mapEntry = linksMap.get(key);
        const chunkIdExists = mapEntry.mentions.some(
          (mention) => mention.chunk_id === item.chunk_id
        );
        if (!chunkIdExists) {
          // If the chunk_id is not already included, add it to the mentions
          mapEntry.mentions.push({ chunk_id: item.chunk_id });
        }
      } else {
        // If the key doesn't exist, initialize it with the current chunk_id in mentions
        linksMap.set(key, {
          source,
          target,
          mentions: [{ chunk_id: item.chunk_id }],
        });
      }
    });
    // Convert the map values to an array and adjust structure to include frequency
    const result = Array.from(linksMap.values()).map((entry) => ({
      ...entry,
      frequency: entry.mentions.length,
      mentions: entry.mentions,
    }));
    return result;
  }

  function handleVarOrLinkSelected(e) {
    // e.preventDefault();
    const variable: tVariable = e;
    // console.log({ variable });
    selectedVar = variable;
    dispatch("var-selected", selectedVar); // for App.svelte to hightlight the chunks

    if (variable) {
      const chunks = variable.mentions;
      let temp: any = [];
      // console.log({interview_data})
      chunks.forEach((selected) => {
        interview_data.forEach((data) => {
          data.data.forEach((all_chunks) => {
            if (all_chunks.id === selected.chunk_id) {
              const topic = all_chunks.topic;
              const emotion = all_chunks.emotion;

              const modifiedObject = {
                ...selected,
                topic,
                emotion,
              };

              temp.push(modifiedObject);
            }
          });
        });
      });
    }
  }
</script>

<div bind:this={container} class="container w-full h-full relative">
  <svg id={svgId} class="varbox-svg w-full h-full">
    <g class="link_group"></g>
    <g class="driver_region"></g>
    <g class="pressure_region"></g>
    <g class="state_region"></g>
    <g class="impact_region"></g>
    <g class="response_region"></g>
    <defs></defs>
  </svg>
</div>

<style lang="postcss">
  :global(.show-tooltip) {
    opacity: 1;
  }
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
