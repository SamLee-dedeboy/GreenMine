<script lang="ts">
  import { fade } from "svelte/transition";
  import type { tIdentifyVarTypes, tVarTypeResult } from "lib/types";
  import { varTypeColorScale } from "lib/store";
  import { compare_var_types, sort_by_id } from "lib/utils";  
  import { createEventDispatcher, onMount } from "svelte";
  import VersionsMenu from "./VersionsMenu.svelte";
  export let data: tIdentifyVarTypes[];
  export let title: string;
  export let versions: string[] = [];
  export let data_loading: boolean;
  export let selectedTitle: string = title;
  const dispatch = createEventDispatcher();

  function varTypeConfidenceShadow(confidence: number | undefined) {
    if (!confidence) return `unset`;
    if (confidence > 0.5) return "; color: rgb(31 41 55)";
    return `1px 1px 1px 1px black`;
  }

  function handleTitleChange(e) {
    selectedTitle = e.detail;
    if (selectedTitle !== title) {
      dispatch("title_change", selectedTitle); // To Prompts.svelte
    }
  }
  function sort_by_uncertainty(data: tIdentifyVarTypes[]) {
    if (data.length === 0) return data;
    if (!data[0].uncertainty) {
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
</script>

{#key title}
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
      <VersionsMenu
        {versions}
        bind:selectedTitle
        on:title_change={handleTitleChange}
      />
    {:else}
      <h2 class="text-center text-lg font-medium capitalize text-black">
        {title}
      </h2>
    {/if}
    <div class="flex grow flex-col divide-y divide-black">
      <div class="flex divide-x">
        <div class="w-[4rem] shrink-0">Snippet</div>
        <div class="flex pl-2">Indicators</div>
      </div>
      {#if data_loading }
        <div class="flex h-full items-center justify-center">
          Data Loading...
        </div>
      {:else}
        <div
          class="flex h-1 grow flex-col divide-y divide-black overflow-y-scroll"
        >
          {#each sort_by_uncertainty(data) as datum, i}
            {#if datum.identify_var_types_result }
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
                              class="flex rounded-sm px-0.5 text-sm italic opacity-70 outline-double outline-0 outline-gray-300 hover:outline-gray-600"
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
                              <button
                                class="font-bold hover:text-white focus:outline-none"
                                on:click={(event) => {
                                  event.stopPropagation();
                                  dispatch("remove_var_type", {
                                    id: datum.id,
                                    variable: var_type_wrapper,
                                  });
                                }}
                                on:keyup={() => {}}
                              >
                              </button>
                            </div>
                            {#if var_type_wrapper.confidence}
                              <div class="mt-0.5 text-xs italic text-gray-600">
                                {(1 - var_type_wrapper.confidence).toFixed(2)}
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
      {/if}
    </div>
  </div>
{/key}

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
</style>
