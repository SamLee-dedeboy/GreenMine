<script lang="ts">
  import type { tIdentifyLinks, tLink } from "lib/types";
  import { onMount } from "svelte";
  import { varTypeColorScale } from "lib/store";
  import { sort_by_id, setOpacity, sort_by_var_type } from "lib/utils";
  import LinkResultGraph from "./LinkResultGraph.svelte";

  export let data: tIdentifyLinks[];
  export let title: string = "baseline";
  let show_graph = Array(data.length).fill(false);
  $: max_degree = compute_max_degree(data);
  function compute_max_degree(data: tIdentifyLinks[]) {
    let chunk_max_degree = 0;
    data.forEach((chunk) => {
      let node_degree: Record<string, number> = {};
      const links = chunk.identify_links_result;
      links.forEach((link) => {
        if (node_degree[link.var1]) {
          node_degree[link.var1] += 1;
        } else {
          node_degree[link.var1] = 1;
        }
        if (node_degree[link.var2]) {
          node_degree[link.var2] += 1;
        } else {
          node_degree[link.var2] = 1;
        }
      });
      chunk_max_degree = Math.max(
        chunk_max_degree,
        Math.max(...Object.values(node_degree)),
      );
    });
    return chunk_max_degree;
  }
  onMount(() => {
    console.log("links:", { data });
  });
  function sort_by_uncertainty(data: tIdentifyLinks[]) {
    return data.sort(
      (a, b) => -(a.uncertainty.identify_links - b.uncertainty.identify_links),
    );
  }
</script>

<div
  class="flex h-full min-h-[35rem] min-w-[25rem] flex-col bg-gray-100 px-1 shadow-lg"
>
  <h2 class="text-lg font-medium capitalize text-black">{title}</h2>
  <div class="flex grow flex-col divide-y divide-black">
    <div class="flex divide-x">
      <div class="w-[4rem] shrink-0">ID</div>
      <div class="flex pl-2">Links</div>
    </div>
    <div
      class="flex h-1 grow flex-col divide-y divide-black overflow-y-auto pr-3"
    >
      {#each sort_by_uncertainty(data) as datum, index}
        {@const isNone = Object.keys(datum.identify_links_result).length === 0}
        <div class="relative flex" class:isNone>
          <div class="w-[4rem] shrink-0 text-[0.9rem]">
            {datum.id}
          </div>
          {#if isNone}
            <div class="border-l border-l-gray-300 pl-1 text-sm">None</div>
          {:else if show_graph[index]}
            <div class="w-full">
              <div class="flex bg-gray-200 py-0.5">
                <div
                  tabindex="0"
                  class="ml-1 w-fit rounded-sm bg-gray-100 px-1 text-center text-[0.7rem] italic text-gray-500 outline-double outline-1 outline-gray-300 hover:bg-gray-300 hover:shadow-md"
                  role="button"
                  on:click={() => (show_graph[index] = !show_graph[index])}
                  on:keyup={() => {}}
                >
                  list view
                </div>
                <div
                  class="ml-auto flex items-center pl-1 text-xs italic text-gray-600"
                >
                  Overall uncertainty: {datum.uncertainty.identify_links.toFixed(
                    2,
                  )}
                </div>
              </div>
              <LinkResultGraph
                svgId={`link-graph-${index}`}
                data={datum.identify_links_result}
                {max_degree}
              />
            </div>
          {:else}
            <div
              class="result flex w-full flex-col divide-y divide-dashed divide-gray-400 border-l border-l-gray-300"
            >
              <div class="flex bg-gray-200 py-0.5">
                <div
                  tabindex="0"
                  class="ml-1 w-fit rounded-sm bg-gray-100 px-1 text-center text-[0.7rem] italic text-gray-500 outline-double outline-1 outline-gray-300 hover:bg-gray-300 hover:shadow-md"
                  role="button"
                  on:click={() => (show_graph[index] = !show_graph[index])}
                  on:keyup={() => {}}
                >
                  graph view
                </div>
                <div
                  class="ml-auto flex items-center pl-1 text-xs italic text-gray-600"
                >
                  Overall uncertainty: {datum.uncertainty.identify_links.toFixed(
                    2,
                  )}
                </div>
              </div>
              {#each datum.identify_links_result as link}
                <div
                  class="flex cursor-pointer flex-col gap-y-1 bg-gray-100 py-1 pl-1 pr-3 hover:bg-gray-200"
                  title="check evidence"
                >
                  <div class="flex items-center">
                    <div
                      class="h-fit shrink-0 rounded-sm px-0.5 text-xs italic opacity-70 outline-double outline-1 outline-gray-300"
                      style={`background-color: ${$varTypeColorScale(link.indicator1)}`}
                    >
                      {link.var1}
                    </div>
                    <div class="w-6 text-sm font-light">---</div>
                    <div
                      class="h-fit shrink-0 rounded-sm px-0.5 text-xs italic opacity-70 outline-double outline-1 outline-gray-300"
                      style={`background-color: ${$varTypeColorScale(link.indicator2)}`}
                    >
                      {link.var2}
                    </div>
                  </div>
                  <div class="flex w-full text-sm">
                    <div class="flex flex-col">
                      {#each link.response.relationship as relationship}
                        <div
                          class="flex items-center gap-x-1 italic text-gray-500"
                        >
                          <div class="px-0.5 text-left capitalize">
                            {relationship.label}
                          </div>
                          <div class="mt-[0.125rem] text-xs">
                            {relationship.confidence}
                          </div>
                        </div>
                      {/each}
                    </div>
                    <!-- <div
                        role="button"
                        tabindex="0"
                        class="ml-auto flex h-fit items-center rounded-sm px-1 py-0.5 text-[0.7rem] normal-case italic leading-3 text-gray-600 outline-double outline-1 outline-gray-300 hover:bg-gray-300"
                        on:click={() => console.log(link.response.evidence)}
                        on:keyup={() => {}}
                      >
                        evidence
                      </div> -->
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style lang="postcss">
  div {
    /* @apply outline outline-1 outline-black; */
  }
  .isNone {
    @apply bg-white text-gray-400;
  }
  .isEmpty {
    @apply opacity-60;
  }
</style>
