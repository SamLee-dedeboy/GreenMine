<script lang="ts">
  import { fade } from "svelte/transition";
  import type { tIdentifyVarTypes, tVarTypeResult } from "lib/types";
  import { varTypeColorScale } from "lib/store";
  import { compare_var_types, sort_by_id } from "lib/utils";
  export let data: tIdentifyVarTypes[];
  // export let title: string = "Results";
  export let title: string;
  export let titleOptions: string[] = [];
  export let buttonText: string = ""; // New prop for button text
  export let data_loading: boolean;
  import { createEventDispatcher, onMount } from "svelte";
  let selectedTitle: string = title;
  const dispatch = createEventDispatcher();
  const validTypes = ["driver", "pressure", "state", "impact", "response"];

  function varTypeConfidenceShadow(confidence: number | undefined) {
    if (!confidence) return `unset`;
    if (confidence > 0.5) return "; color: rgb(31 41 55)";
    return `1px 1px 1px 1px black`;
  }
  function handleInput(id: string, event: Event) {
    if (!(event.target instanceof HTMLElement)) return;
    const currentDatum = data.find((datum) => datum.id === id);
    const inputText = event.target.textContent?.trim().toLowerCase() || "";

    if (currentDatum && inputText) {
      const alreadyExists = currentDatum.identify_var_types_result.some(
        (item) => item.var_type === inputText,
      );
      if (!alreadyExists && validTypes.includes(inputText)) {
        // console.log({ inputText });
        dispatch("add_var_type", { id, var_type: inputText });
        event.target.textContent = ""; // Clear the input after dispatching
      } else if (alreadyExists) {
        alert("Var type already exists");
        event.target.textContent = "";
      }
    }
  }

  function handleKeydown(id: string, event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleInput(id, event);
    } else if (event.key === "Escape") {
      (event.target as HTMLElement).blur();
    }
  }

  function handleBlur(id: string, event: FocusEvent) {
    handleInput(id, event);
  }
  function handleFocus(event: FocusEvent) {
    const target = event.target as HTMLElement;
    if (target.textContent?.trim() === "Enter var type") {
      target.textContent = "";
    }
  }
  function handleTitleChange() {
    if (selectedTitle !== title) {
      dispatch("title_change", selectedTitle);
    }
  }

  $: selectedTitle, handleTitleChange();
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
    {#if titleOptions.length > 0}
      <select
        bind:value={selectedTitle}
        class="text-center text-lg font-medium capitalize text-black"
      >
        {#each titleOptions as option}
          <option class="capitalize" value={option}>{option}</option>
        {/each}
      </select>
    {:else}
      <h2 class="text-center text-lg font-medium capitalize text-black">
        {title}
      </h2>
    {/if}
    <div class="flex grow flex-col divide-y divide-black">
      <div class="flex divide-x">
        <div class="w-[4rem] shrink-0">Snippet</div>
        <div class="flex pl-2">Indicators</div>
        {#if buttonText!==""}
          <div
            role="button"
            tabindex="0"
            class="ml-auto flex items-center justify-center self-center rounded-sm bg-gray-200 px-2 py-1 text-[0.7rem] normal-case italic leading-3 text-gray-600 text-gray-700 outline-double outline-1 outline-gray-600 transition-colors duration-200 hover:bg-gray-300"
            on:click={() => dispatch("base_or_new_button_click")}
            on:keyup={() => {}}
          >
            {buttonText}
          </div>
        {/if}
      </div>
      {#if data_loading}
        <div class="flex h-full items-center justify-center">
          Data Loading...
        </div>
      {:else}
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
                    <!-- <label for="varType" class="text-sm mr-2">Enter var type...</label> -->
                    <!-- <div
                      class="editable-area min-w-[50px] rounded-sm px-1 text-sm italic outline-dashed outline-1 outline-gray-300"
                      style="flex: 1;"
                      contenteditable="true"
                      role="textbox"
                      tabindex="0"
                      aria-label="Enter var type"
                      on:input={(event) => handleInput(datum.id, event)}
                      on:keydown={(event) => handleKeydown(datum.id, event)}
                      on:blur={(event) => handleBlur(datum.id, event)}
                    ></div> -->
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
                        <!-- {#if datum.identify_var_types_result.length < 5} -->
                          <!-- <div
                            class="editable-area min-w-[50px] rounded-sm px-1 text-sm italic outline-dashed outline-1 outline-gray-300"
                            style="flex: 1;"
                            contenteditable="true"
                            role="textbox"
                            tabindex="0"
                            aria-label="Enter var type"
                            on:input={(event) => handleInput(datum.id, event)}
                            on:keydown={(event) =>
                              handleKeydown(datum.id, event)}
                            on:blur={(event) => handleBlur(datum.id, event)}
                          ></div> -->
                        <!-- {/if} -->
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
