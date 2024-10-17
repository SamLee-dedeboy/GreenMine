<script lang="ts">
  import { fade } from "svelte/transition";
  import type { tIdentifyVarTypes, tVarTypeResult } from "lib/types";
  import { varTypeColorScale } from "lib/store";
  import { compare_var_types, sort_by_id } from "lib/utils";
  import { createEventDispatcher, onMount } from "svelte";
  import VersionsMenu from "./VersionsMenu.svelte";
  import UncertaintyGraph from "lib/components/UncertaintyGraph.svelte";
  import DataLoading from "lib/components/DataLoading.svelte";
  export let data: tIdentifyVarTypes[];
  export let title: string;
  export let versions: string[] = [];
  export let data_loading: boolean;
  export let uncertainty_graph_loading: boolean;
  export let estimated_time = 0;
  export let current_version: string;
  let show_uncertainty_graph = false;
  $: has_uncertainty = data.some((datum) => datum.uncertainty);
  const dispatch = createEventDispatcher();
  $: handleVersionChanged(current_version);

  function varTypeConfidenceShadow(confidence: number | undefined) {
    if (!confidence) return `unset`;
    if (confidence > 0.5) return "; color: rgb(31 41 55)";
    return `1px 1px 1px 1px black`;
  }

  function sort_by_uncertainty(data: tIdentifyVarTypes[]) {
    if (data.length === 0) return data;
    if (!has_uncertainty) {
      return sort_by_id(data);
    }
    const sorted = data.sort(
      (a, b) =>
        b.uncertainty.identify_var_types - a.uncertainty.identify_var_types,
    );
    console.log({ sorted });
    return sorted;
  }

  function generate_explanation_html(var_type: string, explanation: string) {
    return `<span style="background-color: ${$varTypeColorScale(var_type)}; text-transform: capitalize; padding-left: 0.125rem; padding-right: 0.125rem;">${var_type}</span>:${explanation}`;
  }

  function handleVersionChanged(current_version) {
    dispatch("version_changed", current_version);
    show_uncertainty_graph = false;
  }
  onMount(() => {
    console.log({ data });
  });
</script>

<div
  class="relative z-50 flex
     min-w-[30rem]
            flex-1 flex-col
            bg-gray-100 px-1 shadow-lg"
  transition:fade={{
    duration: 100,
  }}
>
  {#if versions.length > 0}
    <VersionsMenu {versions} bind:current_version />
  {:else}
    <h2 class="text-center font-serif text-lg font-medium text-black">
      {title}
    </h2>
  {/if}
  <div class="flex h-1 grow flex-col">
    <div
      class="flex min-h-[1.5rem] divide-x font-serif"
      style={`border-bottom: ${show_uncertainty_graph ? "unset" : "1px solid black"}`}
    >
      {#if !show_uncertainty_graph}
        <div class="w-[4rem] shrink-0">Snippet</div>
        <div class="flex pl-2">Indicators</div>
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
        class="flex h-1 grow flex-col divide-y divide-black overflow-y-scroll"
      >
        {#each sort_by_uncertainty(data) as datum, i}
          {#if datum.identify_var_types_result}
            {@const isNone = datum.identify_var_types_result.length === 0}
            <div class="flex items-center divide-x bg-gray-200" class:isNone>
              <div class="w-[4rem] shrink-0 text-[0.9rem]">{datum.id}</div>
              <div
                class="flex grow items-center gap-x-1 py-0.5 pl-1 pr-3 capitalize"
              >
                {#if isNone}
                  <div class="text-sm">None</div>
                {:else}
                  <div class="flex w-full flex-col">
                    {#if datum.uncertainty?.identify_var_types}
                      <div class="ml-auto text-xs italic text-gray-600">
                        Overall Uncertainty: {datum.uncertainty.identify_var_types.toFixed(
                          2,
                        )}
                      </div>
                    {/if}
                    <div class="flex gap-x-2">
                      {#each datum.identify_var_types_result
                        // .filter((item) => item.evidence && item.evidence.length > 0)
                        .sort( (a, b) => compare_var_types(a.var_type, b.var_type), ) as var_type_wrapper, i}
                        <div class="flex flex-col">
                          <div
                            role="button"
                            tabindex="0"
                            class="flex rounded-sm px-1 text-sm italic opacity-70 outline-double outline-0 outline-gray-300 hover:outline-gray-600"
                            style={`background-color: ${$varTypeColorScale(var_type_wrapper.var_type)}; box-shadow: ${varTypeConfidenceShadow(var_type_wrapper.confidence)}`}
                            on:click={() => {
                              if (
                                var_type_wrapper.evidence &&
                                var_type_wrapper.evidence.length > 0
                              ) {
                                dispatch("navigate_evidence", {
                                  // result: datum.identify_var_types_result,
                                  chunk_id: datum.id,
                                  evidence: var_type_wrapper.evidence,
                                  explanation: generate_explanation_html(
                                    var_type_wrapper.var_type,
                                    var_type_wrapper.explanation,
                                  ),
                                });
                              } else {
                                alert("No evidence. Add manually.");
                              }
                            }}
                            on:keyup={() => {}}
                          >
                            <span title="check evidence"
                              >{var_type_wrapper.var_type}</span
                            >
                          </div>
                          {#if var_type_wrapper.confidence}
                            <div class="mt-0.5 text-xs italic text-gray-600">
                              {var_type_wrapper.confidence}
                            </div>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {:else}
      <div
        class="flex h-1 grow flex-col rounded-md p-2 shadow-md outline outline-1 outline-gray-300"
      >
        {#if !uncertainty_graph_loading && has_uncertainty}
          <UncertaintyGraph version={current_version} key="identify_var_types"
          ></UncertaintyGraph>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style lang="postcss">
  .isNone {
    @apply bg-white text-gray-500;
  }
  button {
    cursor: pointer;
    padding: 0 4px;
  }
  .editable-area {
    text-align: left;
  }
  .enabled {
    @apply pointer-events-auto opacity-100;
  }
  .active {
    @apply bg-green-200;
  }
</style>
