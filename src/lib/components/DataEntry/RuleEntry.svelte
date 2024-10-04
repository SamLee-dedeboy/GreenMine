<script lang="ts">
  import { fade, slide } from "svelte/transition";
  import { createEventDispatcher, onMount } from "svelte";
  import * as Constants from "lib/constants";
  import type { LogRecord, LogEntry } from "lib/types";
  import { varTypeColorScale } from "lib/store";
  import VarsDropDown from "lib/components/VarsDropDown.svelte";
  import { sort_by_id, setOpacity, sort_by_var_type } from "lib/utils";
  const dispatch = createEventDispatcher();

  export let interview_ids: any = [];
  export let menu_data;
  export let step: string = "";
  export let logData: LogEntry[] = [];

  // let logType = `identify_${step}s`
  let show_rules = true;
  let have_or_not_have = true;
  let selectedAction: string = "add";
  let selectedSnippet: string | undefined = undefined;
  let selectedValue: { varType: string; varName: string } | undefined =
    undefined;
  let selectedSourceValue: { varType: string; varName: string } | undefined =
    undefined;
  let selectedTargetValue: { varType: string; varName: string } | undefined =
    undefined;

  function handleActionSnippetChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    selectedSnippet = value;
  }

  function handleValueChange(
    event: CustomEvent,
    type: "source" | "target" | "value",
  ) {
    const { varType, varName } = event.detail;
    const newValue = { varType, varName };

    if (step === "link") {
      if (type === "source") {
        selectedSourceValue = newValue;
      } else if (type === "target") {
        selectedTargetValue = newValue;
      }
    } else {
      // selectedValue = newValue;
    }
  }

  function handleRuleChange() {
    if (
      selectedAction === undefined ||
      selectedSnippet === undefined ||
      (step === "link"
        ? selectedSourceValue === undefined || selectedTargetValue === undefined
        : selectedValue === undefined)
    ) {
      alert("Please make all selections before updating rules.");
    } else {
      console.log("All selections made:", {
        selectedAction,
        selectedSnippet,
        ...(step === "link"
          ? { selectedSourceValue, selectedTargetValue }
          : { selectedValue }),
      });

      const logEntry: LogEntry = {
        action: selectedAction,
        id: selectedSnippet,
        value:
          step === "link"
            ? [selectedSourceValue!, selectedTargetValue!]
            : [selectedValue!],
      };

      dispatch("rule_change", logEntry);

      // Reset all selections
      selectedAction = "add";
      selectedSnippet = undefined;
      selectedValue = undefined;
      selectedSourceValue = undefined;
      selectedTargetValue = undefined;
    }
  }

  const VarSpan = ({ value, action, type }) => (`
    <span
      class="rounded-sm px-1 py-0.5 capitalize italic ${action === 'remove' ? ' line-through' : ''}"
      style="background-color: ${setOpacity($varTypeColorScale(value.varType), 0.7)};"
    >
      ${type === 'type' ? value.varType : value.varName}
    </span>
  `);
</script>

<div
  class="relative z-50 flex h-full flex-col px-1"
  transition:fade={{
    duration: 100,
  }}
>
  <div class="flex flex-col">
    <div
      tabindex="0"
      role="button"
      class="entry-trigger font-serif"
      on:click={() => (show_rules = !show_rules)}
      on:keyup={() => {}}
    >
      Rules
    </div>
    {#if show_rules}
      <div transition:slide class="text-sm">
        <div class="flex flex-row space-x-4">
          <!-- Left column: Control panel -->
          <div class="flex-1">
            <div
              class="control-panel mx-1 flex flex-col border border-gray-200"
            >
              <div class="mx-1 my-1 flex flex-grow flex-col space-y-2">
                <div class="flex flex-row">
                  <label
                    for="snippet-select"
                    class="w-1/3 text-sm italic text-gray-600">Snippet</label
                  >
                  <select
                    id="snippet-select"
                    class="w-2/3 cursor-pointer rounded-md border border-gray-300 text-gray-500 focus:border-blue-500 focus:outline-none"
                    on:change={(event) => handleActionSnippetChange(event)}
                    bind:value={selectedSnippet}
                  >
                    <option
                      value={undefined}
                      disabled
                      selected={selectedSnippet === undefined}>Select</option
                    >
                    {#if interview_ids.length === 0}
                      <option value="none" disabled>none</option>
                    {/if}
                    {#each interview_ids as id}
                      <option value={id}>{id}</option>
                    {/each}
                  </select>
                </div>
                <div class="flex flex-row">
                  <label
                    for="action-select"
                    class="w-1/3 text-sm italic text-gray-600">Action</label
                  >
                  <div
                    role="button"
                    tabindex="0"
                    class="flex w-2/3 items-center gap-x-2 rounded-md px-1 text-xs italic outline outline-1 outline-gray-400 hover:outline-2"
                    on:click={() => {
                      have_or_not_have = !have_or_not_have;
                      selectedAction = have_or_not_have ? "add" : "remove";
                    }}
                    on:keyup={() => {}}
                  >
                    {have_or_not_have ? "Must Have" : "Must Not Have"}
                  </div>
                </div>
                {#if step === "link"}
                  <div class="flex flex-row">
                    <label
                      for="source-value-select"
                      class="w-1/3 text-sm italic text-gray-600"
                      >Source Value</label
                    >
                    <div class="w-2/3">
                      <VarsDropDown
                        {menu_data}
                        bind:selectedValue={selectedSourceValue}
                        on:select={(event) =>
                          handleValueChange(event, "source")}
                      />
                    </div>
                  </div>
                  <div class="flex flex-row">
                    <label
                      for="target-value-select"
                      class="w-1/3 text-sm italic text-gray-600"
                      >Target Value</label
                    >
                    <div class="w-2/3">
                      <VarsDropDown
                        {menu_data}
                        bind:selectedValue={selectedTargetValue}
                        on:select={(event) =>
                          handleValueChange(event, "target")}
                      />
                    </div>
                  </div>
                {:else}
                  <div class="flex flex-row">
                    <label
                      for="value-select"
                      class="w-1/3 text-sm italic text-gray-600">Value</label
                    >
                    <div class="w-2/3">
                      <VarsDropDown
                        {menu_data}
                        bind:selectedValue
                        on:select={(event) => handleValueChange(event, "value")}
                      />
                    </div>
                  </div>
                {/if}
              </div>
              <div class="mb-3 flex justify-center font-mono">
                <button
                  class=" inline-flex items-center justify-center rounded-sm bg-green-200 px-8 text-base capitalize outline outline-1 outline-gray-300 hover:bg-green-300"
                  on:click={() => handleRuleChange()}
                >
                  update rules
                </button>
              </div>
            </div>
          </div>

          <!-- Right column: Record part -->
          <div class="flex-1">
            <div
              class="scroll-panel mx-1 flex grow flex-col border border-gray-200 px-2 text-center text-xs text-gray-500"
            >
              <div
                class="sticky top-0 border-b border-gray-300 bg-gray-100 py-1 font-semibold"
              >
                {#if step === "var_type"}
                  Variable Types Rules Record
                {:else if step === "var"}
                  Variables Rules Record
                {:else if step === "link"}
                  Links Rules Record
                {/if}
              </div>
              <ul class="w-full">
                {#if logData.length > 0}
                  {#each logData as entry}
                  <li class="mt-2 flex items-center">
                    <span class="text-gray-600 mr-1 flex-shrink-0">{entry.id}</span>                    
                    {#if step === "var_type"}
                      {@html VarSpan({ value: entry.value[0], action: entry.action, type: 'type' })}
                    {:else if step === "var"}
                      {@html VarSpan({ value: entry.value[0], action: entry.action, type: 'type' })}
                      <span class="pl-0.5 {entry.action === 'remove' ? 'line-through' : ''}">
                        {entry.value[0].varName}
                      </span>
                    {:else if step === "link"}
                      <div class="flex items-center min-w-0 flex-grow">
                        <div class="rounded-sm flex-shrink min-w-0 truncate">
                          {@html VarSpan({ value: entry.value[0], action: entry.action, type: 'name' })}
                        </div>
                        <span class="px-0.5 flex-shrink-0">---</span>
                        <div class="rounded-sm flex-shrink min-w-0 truncate">
                          {@html VarSpan({ value: entry.value[1], action: entry.action, type: 'name' })}
                        </div>
                      </div>
                    {/if}
                  </li>
                  {/each}
                {:else}
                  <li class="mt-2">No rules recorded yet.</li>
                {/if}
              </ul>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style lang="postcss">
  .active {
    @apply bg-green-300;
    transition: all 0.5s;
  }
  .selected {
    @apply bg-blue-700 opacity-100;
  }
  .entry-trigger {
    @apply rounded-sm bg-gray-200 text-gray-700 outline-double outline-1 outline-gray-600 hover:bg-gray-300;
  }
  .var-span {
    @apply bg-opacity-80;
  }
  /* .container {
    display: flex;
    flex-direction: column;
  } */
  .control-panel {
    /* do nothing */
    position: absolute;
    /* overflow-y: scroll; */
    top: 1.8rem;
    bottom: 0.1rem;
    /* left and right is not necessary in vertical scroll */
    /* but it will help set the width */
    left: 0;
    right: 15rem;
  }
  .scroll-panel {
    position: absolute;
    overflow-y: scroll;
    top: 1.8rem;
    bottom: 0.1rem;
    /* left and right is not necessary in vertical scroll */
    /* but it will help set the width */
    left: 15rem;
    right: 0;
  }
</style>
