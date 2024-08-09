<script lang="ts">
  import { fade } from "svelte/transition";
  import type { tIdentifyVarTypes, tVarTypeResult } from "../types";
  import { varTypeColorScale } from "lib/store";
  import { compare_var_types, sort_by_id } from "lib/utils";
  export let data: tIdentifyVarTypes[];
  // export let title: string = "Results";
  export let title: string;
  export let titleOptions: string[]=[];
  export let buttonText: string = ""; // New prop for button text
  export let data_loading:boolean;
  import { createEventDispatcher, onMount } from "svelte";
  let selectedTitle: string = title;
  const dispatch = createEventDispatcher();
  const validTypes = ["driver", "pressure", "state", "impact", "response"];

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
</script>

<div
  class="relative z-50 flex
    max-h-[85vh] w-[100vw]
            max-w-[600px] flex-col
            bg-gray-100 px-1 shadow-lg"
  transition:fade={{
    duration: 100,
  }}
>
  {#if titleOptions.length > 0 }
    <select
      bind:value={selectedTitle} 
      class="text-lg font-medium capitalize text-black text-center"
    >
      {#each titleOptions as option}
        <option value={option}>{option}</option>
      {/each}
    </select>
  {:else}
    <h2 class="text-lg font-medium capitalize text-black text-center">{title}</h2>
  {/if}
  <div class="flex grow flex-col divide-y divide-black">
    <div class="flex gap-x-2 divide-x">
      <div class="w-[3rem] shrink-0">ID</div>
      <div class="flex pl-2">Var Type</div>
      <div
        role="button"
        tabindex="0"
        class="ml-auto flex items-center justify-center self-center  bg-gray-200 text-gray-700 rounded-sm px-2 py-1 text-[0.7rem] normal-case italic leading-3 text-gray-600 outline-double outline-1 outline-gray-600 hover:bg-gray-300  transition-colors duration-200"
        on:click={() => dispatch("base_or_new_button_click")}
        on:keyup={() => {}}
        >
        {buttonText}
      </div>
    </div>
    {#if data_loading}
      <div class="flex justify-center items-center h-full">Data Loading...</div>
    {:else}
      <div class="flex h-1 grow flex-col divide-y divide-black overflow-y-scroll">
        {#each sort_by_id(data) as datum, i}
          {#if datum.identify_var_types_result}
            {@const isNone = datum.identify_var_types_result.length === 0}
            <div
              class="flex items-center gap-x-2 divide-x bg-gray-200"
              class:isNone
            >
              <div class="w-[3rem] shrink-0 text-[0.9rem]">{datum.id}</div>
              <div
                class="flex grow items-center gap-x-1 py-0.5 pl-1 pr-3 capitalize"
              >
                {#if isNone}
                  <div class="text-sm">None</div>
                  <!-- <label for="varType" class="text-sm mr-2">Enter var type...</label> -->
                  <div
                    class="editable-area min-w-[50px] rounded-sm px-1 text-sm italic outline-dashed outline-1 outline-gray-300"
                    style="flex: 1;"
                    contenteditable="true"
                    role="textbox"
                    tabindex="0"
                    aria-label="Enter var type"
                    on:input={(event) => handleInput(datum.id, event)}
                    on:keydown={(event) => handleKeydown(datum.id, event)}
                    on:blur={(event) => handleBlur(datum.id, event)}
                  ></div>
                {:else}
                  {#each datum.identify_var_types_result
                    // .filter((item) => item.evidence && item.evidence.length > 0)
                    .sort( (a, b) => compare_var_types(a.var_type, b.var_type), ) as var_type_wrapper, i}
                    <div
                      role="button"
                      tabindex="0"
                      class="rounded-sm px-0.5 text-sm italic opacity-70 outline-double outline-1 outline-gray-300 hover:outline-gray-600"
                      style={`background-color: ${$varTypeColorScale(var_type_wrapper.var_type)}`}
                      on:click={() => {
                        if (
                          var_type_wrapper.evidence &&
                          var_type_wrapper.evidence.length > 0
                        ) {
                          dispatch("fetch_var_types_evidence", {
                            result: datum.identify_var_types_result,
                            id: datum.id,
                            var_type: var_type_wrapper.var_type,
                          });
                        } else {
                          alert("No evidence. Add manually.");
                        }
                      }}
                      on:keyup={() => {}}
                    >
                      <span>{var_type_wrapper.var_type}</span>
                      <button
                        class="font-bold  hover:text-white focus:outline-none"
                        on:click={(event) => {
                          event.stopPropagation();
                          dispatch("remove_var_type", {
                            id: datum.id,
                            variable: var_type_wrapper,
                          })
                        }}
                        on:keyup={() => {}}
                      >
                        ×
                      </button>
                    </div>
                  {/each}
                  {#if datum.identify_var_types_result.length < 5}
                    <div
                      class="editable-area min-w-[50px] rounded-sm px-1 text-sm italic outline-dashed outline-1 outline-gray-300"
                      style="flex: 1;"
                      contenteditable="true"
                      role="textbox"
                      tabindex="0"
                      aria-label="Enter var type"
                      on:input={(event) => handleInput(datum.id, event)}
                      on:keydown={(event) => handleKeydown(datum.id, event)}
                      on:blur={(event) => handleBlur(datum.id, event)}
                    ></div>
                  {/if}
                {/if}
              </div>
            </div>
          {/if}
        {/each}
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
</style>
