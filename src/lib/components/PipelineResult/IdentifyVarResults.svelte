<script lang="ts">
  import type { tIdentifyVars, tVarResult } from "lib/types";
  import { onMount, createEventDispatcher } from "svelte";
  import { varTypeColorScale } from "lib/store";
  import { sort_by_id, setOpacity, sort_by_var_type } from "lib/utils";

  const dispatch = createEventDispatcher();
  export let data: tIdentifyVars[];
  export let title: string = "baseline";
  onMount(() => {
    console.log({ data });
  });
  function sort_by_uncertainty(data: tIdentifyVars[]) {
    return data.sort(
      (a, b) => -(a.uncertainty.identify_vars - b.uncertainty.identify_vars),
    );
  }

  function generate_explanation_html(
    var_type: string,
    var_name: string,
    explanation: string,
  ) {
    return `<span style="background-color: ${$varTypeColorScale(var_type)}; text-transform: capitalize; padding-left: 0.125rem; padding-right: 0.125rem;">${var_name}</span>:${explanation}`;
  }
</script>

<div
  class="flex h-full min-w-[25rem] flex-1 flex-col bg-gray-100 px-1 shadow-lg"
>
  <h2 class="text-lg font-medium capitalize text-black">{title}</h2>
  <div class="flex grow flex-col divide-y divide-black">
    <div class="flex divide-x">
      <div class="w-[4rem] shrink-0">Snippet</div>
      <div class="flex pl-2">Variables</div>
    </div>
    <div
      class="flex h-1 grow flex-col divide-y divide-black overflow-y-auto pr-3"
    >
      {#each sort_by_uncertainty(data) as datum}
        {@const isNone = Object.keys(datum.identify_vars_result).length === 0}
        <div class="flex divide-x" class:isNone>
          <div class="w-[4rem] shrink-0 text-[0.9rem]">
            {datum.id}
          </div>
          {#if isNone}
            <div class="pl-1 text-sm">None</div>
          {:else}
            <div class="result flex w-full flex-col divide-gray-300">
              <div
                class=" flex w-full items-center justify-end bg-gray-200 pl-1 text-xs italic text-gray-600"
              >
                Overall Uncertainty: {datum.uncertainty.identify_vars.toFixed(
                  2,
                )}
              </div>
              {#each sort_by_var_type(Object.keys(datum.identify_vars_result)) as var_type}
                {@const isEmpty =
                  datum.identify_vars_result[var_type].length === 0}
                <div
                  class="flex items-center bg-gray-100 pl-1 pr-3 capitalize"
                  class:isEmpty
                >
                  <div
                    class="var-type-tag h-fit w-[4.5rem] shrink-0 rounded-sm px-0.5 text-sm italic text-gray-600 outline-double outline-0 outline-gray-300"
                    style={`background-color: ${setOpacity($varTypeColorScale(var_type), 0.7)}`}
                  >
                    {var_type}
                  </div>
                  {#if !isEmpty}
                    <div
                      class="flex w-full flex-wrap gap-x-1 gap-y-1 px-0.5 py-1"
                    >
                      {#each datum.identify_vars_result[var_type] as var_data}
                        <div
                          role="button"
                          tabindex="0"
                          class={`flex rounded-sm px-1 text-xs opacity-100 shadow-sm outline-double outline-1 outline-gray-500 hover:bg-stone-400`}
                          title="check evidence"
                          on:click={() => {
                            if (
                              var_data.evidence &&
                              var_data.evidence.length > 0
                            ) {
                              dispatch("navigate_evidence", {
                                chunk_id: datum.id,
                                evidence: var_data.evidence,
                                explanation: generate_explanation_html(
                                  var_type,
                                  var_data.var,
                                  var_data.explanation,
                                ),
                              });
                            }
                          }}
                          on:keyup={() => {}}
                        >
                          {var_data.var}
                        </div>
                      {/each}
                    </div>
                    <!-- <div
                      role="button"
                      tabindex="0"
                      class="ml-auto flex h-fit items-center rounded-sm px-1 py-0.5 text-[0.7rem] normal-case italic leading-3 text-gray-600 outline-double outline-1 outline-gray-700 hover:bg-gray-400"
                    >
                      evidence
                    </div> -->
                  {:else}
                    <div class="ml-2 text-xs italic text-gray-500 no-underline">
                      No Variable Identified
                    </div>
                  {/if}
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
    & .var-type-tag {
      @apply line-through;
    }
  }
</style>
