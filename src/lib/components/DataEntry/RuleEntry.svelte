<script lang="ts">
  import { fade, slide } from "svelte/transition";
  import { createEventDispatcher, onMount } from "svelte";
  import type {LogRecord, LogEntry} from "lib/types";
  const dispatch = createEventDispatcher();

  export let pipeline_ids: string[] = [];
  let show_rules = true;
  const validTypes = ["driver", "pressure", "state", "impact", "response"];
  let selectedAction : string | undefined = undefined;
  let selectedSnippet : string | undefined = undefined;
  let selectedValue : string | undefined = undefined;

  function handleSelectChange(event: Event, type: 'action' | 'snippet' | 'value') {
    const value = (event.target as HTMLSelectElement).value;
    switch (type) {
      case 'action':
        selectedAction = value;
        break;
      case 'snippet':
        selectedSnippet = value;
        break;
      case 'value':
        selectedValue = value;
        break;
    }
  }
  function handleRuleChange() {
    if(selectedAction === undefined || selectedSnippet === undefined || selectedValue === undefined){
      console.log("Please make all selections before updating");
    } else {
      console.log("All selections made:", { selectedAction, selectedSnippet, selectedValue });
      dispatch('rule_change', { action: selectedAction, id: selectedSnippet, value: selectedValue });
    } 
  }

</script>

<div
  class="relative z-50 flex flex-col px-1"
  transition:fade={{
    duration: 100,
  }}
>
  <div class="flex flex-col ">
    <div
      tabindex="0"
      role="button"
      class="entry-trigger"
      on:click={() => (show_rules = !show_rules)}
      on:keyup={() => {}}
    >
      Rules
    </div>
    {#if show_rules}
      <div transition:slide class="text-sm">
        <div class="flex flex-col divide-y">
          <div class="flex w-full my-2">
              <div class="flex flex-col flex-1 mr-2">
                <label for="action-select" class="text-sm text-gray-500">Action</label>
                <select 
                  id="action-select" 
                  class="rounded-md border border-gray-300 text-gray-700 focus:border-blue-500 focus:outline-none"
                  on:change={(event) => handleSelectChange(event, 'action')}
                >
                  <option value="" disabled selected>Select</option>
                  <option value="add">Add</option>
                  <option value="remove">Remove</option>
                </select>
              </div>
              <div class="flex flex-col flex-1 mr-2 ">
                <label for="snippet-select" class="text-sm text-gray-500">Snippet</label>
                <select 
                  id="snippet-select" 
                  class="rounded-md border border-gray-300 text-gray-700 focus:border-blue-500 focus:outline-none"
                  on:change={(event) => handleSelectChange(event, 'snippet')}
                >
                  <option value="" disabled selected>Select</option>
                  {#each pipeline_ids as id}
                    <option value={id}>{id}</option>
                  {/each}
                </select>
              </div>
              <div class="flex flex-col flex-1 mr-2">
                <label for="value-select" class="text-sm text-gray-500">Value</label>
                <select 
                  id="value-select" 
                  class=" rounded-md border border-gray-300 text-gray-700 focus:border-blue-500 focus:outline-none"
                  on:change={(event) => handleSelectChange(event, 'value')}
                >
                  <option value="" disabled selected>Select</option>
                  {#each validTypes as type}
                    <option value={type}>{type}</option>
                  {/each}
                </select>
              </div>
              <div class="flex flex-wrap justify-center">
                <button
                    class=" capitalize inline-flex items-center px-2 py-0.5 justify-center rounded-sm bg-green-200 outline outline-1 outline-gray-300 hover:bg-green-300"
                    on:click={() => handleRuleChange()}
                >
                    update
                </button>
              </div>
          </div>
          <div class="flex grow divide-x ">
              <div class="w-[5rem] shrink-0 text-center capitalize italic text-gray-600">
              Log
              </div>
              <div
              class="flex grow pl-2 text-left italic text-gray-500 overflow-y-scroll h-[7rem]"
              >
              (TO DO) These changes will create a scrollable log area that fills the remaining vertical space after the "Add", "Remove", and "Update Rules" sections. The log will automatically scroll when new entries are added and the content exceeds the available space. The log will automatically scroll when new entries are added and the content exceeds the available space.
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
</style>
