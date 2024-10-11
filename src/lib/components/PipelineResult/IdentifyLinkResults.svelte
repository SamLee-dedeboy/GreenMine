<script lang="ts">
  import type { tIdentifyLinks, tLink, tVarData } from "lib/types";
  import { onMount, createEventDispatcher } from "svelte";
  import { varTypeColorScale } from "lib/store";
  import { sort_by_id, setOpacity, sort_by_var_type } from "lib/utils";
  import LinkResultGraph from "./LinkResultGraph.svelte";
  import VersionsMenu from "./VersionsMenu.svelte";
  import UncertaintyGraph from "../UncertaintyGraph.svelte";

  const dispatch = createEventDispatcher();
  export let data: tIdentifyLinks[];
  export let title: string;
  export let versions: string[] = [];
  export let data_loading: boolean;
  export let uncertainty_graph_loading: boolean;
  export let current_version: string;
  export let variable_definitions: tVarData;
  let show_graph = Array(data.length).fill(false);
  let show_uncertainty_graph = false;
  $: has_uncertainty = data.some((datum) => datum.uncertainty.identify_links);
  $: max_degree = compute_max_degree(data);
  $: dispatch("version_changed", current_version);

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
    console.log("sort_by_uncertainty", data);
    if (data.length === 0) return data;
    if (!data[0].uncertainty) {
      return sort_by_id(data);
    }
    console.log("sorting_by_uncertainty", data);
    return data.sort(
      (a, b) => -(a.uncertainty.identify_links - b.uncertainty.identify_links),
    );
  }
  function generate_explanation_html(
    indicator1: string,
    indicator2: string,
    var1: string,
    var2: string,
    relationship: { label: string; confidence: number | undefined }[],
    explanation: string,
  ) {
    return (
      `
    <span style="background-color: ${$varTypeColorScale(indicator1)}; text-transform: capitalize; padding-left: 0.125rem; padding-right: 0.125rem;">${var1}</span>
    -
    <span style="background-color: ${$varTypeColorScale(indicator2)}; text-transform: capitalize; padding-left: 0.125rem; padding-right: 0.125rem;">${var2}</span>
    <br>` +
      (Array.isArray(relationship)
        ? `<span style="color: gray; text-transform: capitalize">${relationship.map((r) => `${r.label}(${(1 - r.confidence!).toFixed(2)})`).join("/")}</span>`
        : `<span style="color: gray; text-transform: capitalize">${relationship}</span>`) +
      `<br> - ${explanation}`
    );
  }
</script>

<div
  class="flex h-full min-w-[25rem] flex-1 flex-col bg-gray-100 px-1 shadow-lg"
>
  {#if versions.length > 0}
    <VersionsMenu {versions} bind:current_version />
  {:else}
    <h2 class="text-center font-serif text-lg font-medium text-black">
      {title}
    </h2>
  {/if}
  <div class="flex grow flex-col divide-y divide-black">
    <div class="flex divide-x font-serif">
      {#if !show_uncertainty_graph}
        <div class="w-[4rem] shrink-0">ID</div>
        <div class="flex pl-2">Links</div>
      {/if}
      <div
        tabindex="0"
        role="button"
        class:enabled={has_uncertainty && !uncertainty_graph_loading}
        class:active={show_uncertainty_graph}
        on:click={() => (show_uncertainty_graph = !show_uncertainty_graph)}
        on:keyup={() => {}}
        class="pointer-events-none relative ml-auto flex items-center rounded px-1 py-0.5 text-xs italic opacity-50 hover:bg-green-200"
      >
        {#if uncertainty_graph_loading}
          <img src="loader.svg" alt="loading" class="h-4 w-4 animate-spin" />
        {:else}
          <img src="chart.svg" alt="chart" class="h-4 w-4" />
        {/if}
        Uncertainty Chart
      </div>
    </div>
    {#if data_loading}
      <div class="flex h-full items-center justify-center">Data Loading...</div>
    {:else if !show_uncertainty_graph}
      <div
        class="flex h-1 grow flex-col divide-y divide-black overflow-y-auto pr-3"
      >
        {#each sort_by_uncertainty(data) as datum, index}
          {@const isNone =
            Object.keys(datum.identify_links_result).length === 0}
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
                  {#if datum.uncertainty?.identify_links}
                    <div
                      class="ml-auto flex items-center pl-1 text-xs italic text-gray-600"
                    >
                      Overall uncertainty: {datum.uncertainty.identify_links.toFixed(
                        2,
                      )}
                    </div>
                  {/if}
                </div>
                <LinkResultGraph
                  svgId={`link-graph-${index}`}
                  data={datum.identify_links_result}
                  {max_degree}
                  on:link-clicked={(e) => {
                    const link = e.detail;
                    if (
                      link.response.evidence &&
                      link.response.evidence.length > 0
                    ) {
                      dispatch("navigate_evidence", {
                        chunk_id: datum.id,
                        evidence: link.response.evidence,
                        explanation: generate_explanation_html(
                          link.indicator1,
                          link.indicator2,
                          link.var1,
                          link.var2,
                          link.response.relationship,
                          link.response.explanation,
                        ),
                      });
                    }
                  }}
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
                  {#if datum.uncertainty?.identify_links}
                    <div
                      class="ml-auto flex items-center pl-1 text-xs italic text-gray-600"
                    >
                      Overall uncertainty: {datum.uncertainty.identify_links.toFixed(
                        2,
                      )}
                    </div>
                  {/if}
                </div>
                {#each datum.identify_links_result as link}
                  <div
                    role="button"
                    tabindex="0"
                    class="flex cursor-pointer flex-col gap-y-1 bg-gray-100 py-1 pl-1 pr-3 hover:bg-gray-200"
                    title="check evidence"
                    on:click={() => {
                      if (
                        link.response.evidence &&
                        link.response.evidence.length > 0
                      ) {
                        dispatch("navigate_evidence", {
                          chunk_id: datum.id,
                          evidence: link.response.evidence,
                          explanation: generate_explanation_html(
                            link.indicator1,
                            link.indicator2,
                            link.var1,
                            link.var2,
                            link.response.relationship,
                            link.response.explanation,
                          ),
                        });
                      }
                    }}
                    on:keyup={() => {}}
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
                        {#if Array.isArray(link.response.relationship)}
                          {#each link.response.relationship as relationship}
                            <div
                              class="flex items-center gap-x-1 italic text-gray-500"
                            >
                              <div class="px-0.5 text-left capitalize">
                                {relationship.label}
                              </div>
                              <div class="mt-[0.125rem] text-xs">
                                {(1 - relationship.confidence).toFixed(2)}
                              </div>
                            </div>
                          {/each}
                        {:else}
                          <div
                            class="px-0.5 text-left text-xs capitalize italic text-gray-500"
                          >
                            {link.response.relationship}
                          </div>
                        {/if}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <UncertaintyGraph
        version={current_version}
        key="identify_links"
        variables={variable_definitions}
      ></UncertaintyGraph>
    {/if}
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
  .enabled {
    @apply pointer-events-auto opacity-100;
  }
  .active {
    @apply bg-green-200;
  }
</style>
