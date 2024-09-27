<script lang="ts">
  import { fade, slide } from "svelte/transition";
  import { createEventDispatcher, onMount } from "svelte";
  import * as Constants from "lib/constants";
  import type { LogRecord, LogEntry } from "lib/types";  
  import { varTypeColorScale } from "lib/store";
  import VarsDropDown from "lib/components/VarsDropDown.svelte";
  const dispatch = createEventDispatcher();

  export let interview_ids: any = [];
  export let menu_data;
  export let step: string = "";
  export let logData: LogEntry[] = [];

  // let logType = `identify_${step}s`
  let show_rules = false;
  let show_rule_record = false;
  let selectedAction: string | undefined = undefined;
  let selectedSnippet: string | undefined = undefined;
  let selectedValue: { varType: string; varName: string } | undefined = undefined;
  let selectedSourceValue: { varType: string; varName: string } | undefined = undefined;
  let selectedTargetValue: { varType: string; varName: string } | undefined = undefined;
 
  function handleActionSnippetChange(
    event: Event,
    type: "action" | "snippet"
  ) {
    const value = (event.target as HTMLSelectElement).value;
    switch (type) {
      case "action":
        selectedAction = value;
        break;
      case "snippet":
        selectedSnippet = value;
        break;
    }
  }


  function handleValueChange(
    event: CustomEvent,
    type: "source" | "target" | "value"
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
        value: step === "link"
          ? [selectedSourceValue!, selectedTargetValue!]
          : [selectedValue!]
      };

      dispatch("rule_change", logEntry);

      // Reset all selections
      selectedAction = undefined;
      selectedSnippet = undefined;
      selectedValue = undefined;
      selectedSourceValue = undefined;
      selectedTargetValue = undefined;
    }
  }

</script>

<div
  class="relative z-50 flex flex-col px-1 h-full"
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
        <div class="flex flex-col">
          <div class="control-panel">
            <div class="my-2 flex w-full space-x-2">
              <div class="flex flex-col flex-1">
                <label for="snippet-select" class="text-sm text-gray-500">Snippet</label>
                <select
                  id="snippet-select"
                  class="w-full rounded-md border border-gray-300 text-gray-700 focus:border-blue-500 focus:outline-none"
                  on:change={(event) => handleActionSnippetChange(event, "snippet")}
                  bind:value={selectedSnippet}
                >
                  <option value={undefined} disabled selected={selectedSnippet === undefined}>Select</option>
                  {#if interview_ids.length === 0}
                    <option value="none" disabled>none</option>
                  {/if}
                  {#each interview_ids as id}
                    <option value={id}>{id}</option>
                  {/each}
                </select>
              </div>
              <div class="flex flex-col flex-1">
                <label for="action-select" class="text-sm text-gray-500">Action</label>
                <select
                  id="action-select"
                  class="w-full rounded-md border border-gray-300 text-gray-700 focus:border-blue-500 focus:outline-none"
                  on:change={(event) => handleActionSnippetChange(event, "action")}
                  bind:value={selectedAction}
                >
                  <option value={undefined} disabled selected={selectedAction === undefined}>Select</option>
                  <option value="add">Must Have</option>
                  <option value="remove">Must Not Have</option>
                </select>
              </div>
              {#if step === "link"}
                <div class="flex flex-col flex-1">
                  <label for="source-value-select" class="text-sm text-gray-500">Source Value</label>
                  <VarsDropDown
                    {menu_data}
                    bind:selectedValue={selectedSourceValue}
                    on:select={(event) => handleValueChange(event, "source")}
                  />
                </div>
                <div class="flex flex-col flex-1">
                  <label for="target-value-select" class="text-sm text-gray-500">Target Value</label>
                  <VarsDropDown
                    {menu_data}
                    bind:selectedValue={selectedTargetValue}
                    on:select={(event) => handleValueChange(event, "target")}
                  />
                </div>
              {:else}
                <div class="flex flex-col flex-1">
                  <label for="value-select" class="text-sm text-gray-500">Value</label>
                  <VarsDropDown
                    {menu_data}
                    bind:selectedValue = {selectedValue}
                    on:select={(event) => handleValueChange(event, "value")}
                  />
                </div>
              {/if}
            </div>
            <div class="flex justify-center font-mono ">
              <button
                class="inline-flex items-center justify-center rounded-sm bg-green-200 px-8 capitalize outline outline-1 outline-gray-300 hover:bg-green-300"
                on:click={() => handleRuleChange()}
              >
                update
              </button>
              <div
                role="button"
                tabindex="0"
                class="ml-4 px-1 flex w-fit items-center gap-x-1 rounded-sm bg-gray-200 text-xs italic outline outline-1 outline-gray-300 hover:outline-2"
                on:click={() => show_rule_record = !show_rule_record}
                on:keyup={() => {}}
              >
                <div
                  class="px-1 h-2 w-2 rounded-full bg-gray-200 outline-double outline-1 outline-gray-500"
                  class:active={show_rule_record}
                ></div>
                Show Rules Record
              </div>
            </div>
          </div>
          {#if show_rule_record && logData.length > 0}
            <div class="flex grow px-2 mx-1 text-center text-xs text-gray-500 border border-gray-200 scroll-panel">
              <ul class="w-full">
                {#each logData as entry}
                  <li class="mt-2 {entry.action === 'remove' ? 'line-through text-gray-600' : ''}">
                    <span style="font-style: italic;">{entry.id}</span>{' '}
                    {#if step === 'var_type'}
                      <span style="background-color: {$varTypeColorScale(entry.value[0].varType)}">{entry.value[0].varType}</span>
                    {:else if step === 'var'}
                      <span style="background-color: {$varTypeColorScale(entry.value[0].varType)}">{entry.value[0].varType}</span>{entry.value[0].varName}
                    {:else if step === 'link'}
                      <span style="background-color: {$varTypeColorScale(entry.value[0].varType)}">{entry.value[0].varType}</span>-{entry.value[0].varName} to <span style="background-color: {$varTypeColorScale(entry.value[1].varType)}">{entry.value[1].varType}</span>-{entry.value[1].varName}
                    {/if}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
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
  /* .container {
    display: flex;
    flex-direction: column;
  } */
  .control-panel {
      /* do nothing */
  }
  .scroll-panel {
      position: absolute;
      overflow-y: scroll;
      top: 6.5rem;
      bottom: 0.1rem;
      /* left and right is not necessary in vertical scroll */
      /* but it will help set the width */
      left: 0; 
      right: 0;
  }
</style>
