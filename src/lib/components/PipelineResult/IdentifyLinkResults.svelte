<script lang="ts">
  import type { tIdentifyLinks, tLink, tVarData } from "lib/types";
  import { onMount, createEventDispatcher } from "svelte";
  import { varTypeColorScale } from "lib/store";
  import { sort_by_id, setOpacity, sort_by_var_type } from "lib/utils";
  import LinkResultGraph from "./LinkResultGraph.svelte";
  import VersionsMenu from "./VersionsMenu.svelte";
  import UncertaintyGraph from "../UncertaintyGraph.svelte";
  import DataLoading from "lib/components/DataLoading.svelte";
  import LinkResult from "./LinkResult.svelte";

  const dispatch = createEventDispatcher();
  export let data: tIdentifyLinks[];
  export let title: string;
  export let versions: string[] = [];
  export let data_loading: boolean;
  export let uncertainty_graph_loading: boolean;
  export let current_version: string;
  export let variable_definitions: tVarData;
  export let estimated_time = 0;
  let searched_snippet = "";
  let show_graph = Array(data.length).fill(false);
  let show_uncertainty_graph = false;
  $: has_uncertainty = data.some((datum) => datum.uncertainty.identify_links !== undefined);
  $: max_degree = compute_max_degree(data);
  $: handleVersionChanged(current_version);

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
  function handleVersionChanged(current_version) {
    dispatch("version_changed", current_version);
    show_uncertainty_graph = false;
  }
  onMount(() => {
    console.log("links:", { data }, has_uncertainty, uncertainty_graph_loading, data.some((datum) => datum.uncertainty.identify_links !== undefined));
  });
  function sort_by_uncertainty(data: tIdentifyLinks[]) {
    console.log("sorting...", has_uncertainty);
    if (data.length === 0) return data;
    if (!has_uncertainty) {
      data = sort_by_id(data);
    }
    data = data.sort(
      (a, b) => -(a.uncertainty.identify_links - b.uncertainty.identify_links),
    );
    console.log("sorted data: ", data);
    data.forEach((datum, index) => {
      datum.index = index;
    });
    return data;
  }
</script>

<div class="flex h-full w-[30rem] flex-1 flex-col bg-gray-100 px-1 shadow-lg">
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
        <div class="column-snippet relative w-[4rem] shrink-0">
          <span>
            {searched_snippet === "" ? "Snippet" : searched_snippet}
          </span>
          <div class="search absolute bottom-0 left-0 right-0 top-0 hidden">
            <img class="h-4 w-4" src="search.svg" alt="search" />
            <div
              class="search-bar grow text-xs"
              contenteditable
              on:input={(e) => {
                searched_snippet = e.target.innerText.trim();
              }}
            ></div>
          </div>
        </div>
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
      <div class="flex h-full items-center justify-center">
        <DataLoading {estimated_time} />
      </div>
    {:else if !show_uncertainty_graph}
      <div
        class="flex h-1 grow flex-col divide-y divide-black overflow-y-auto pr-3"
      >
        {#each sort_by_uncertainty(data).filter( (d) => new RegExp(`^${searched_snippet}`).test(d.id), ) as datum, index}
          {@const isNone =
            Object.keys(datum.identify_links_result).length === 0}
          <LinkResult
            {datum}
            {index}
            {isNone}
            {max_degree}
            on:navigate_evidence={(e) =>
              dispatch("navigate_evidence", e.detail)}
          />
        {/each}
      </div>
    {:else}
      <div
        class="flex h-1 grow flex-col rounded-md p-2 shadow-md outline outline-1 outline-gray-300"
      >
        {#if !uncertainty_graph_loading && has_uncertainty}
          <UncertaintyGraph
            version={current_version}
            key="identify_links"
            variables={variable_definitions}
            {max_degree}
          ></UncertaintyGraph>
        {/if}
      </div>
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
  .column-snippet:hover,
  .column-snippet:focus-within {
    & span {
      display: none;
    }

    & .search {
      @apply flex items-center;
    }
  }
</style>
