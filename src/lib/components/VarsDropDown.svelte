<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    
    import { varTypeColorScale } from "lib/store";
  
    export let menu_data: { [key: string]: string[] };
    export let selectedValue: { varType: string; varName: string } | undefined = undefined;
    let isOpen = false;
    let hoveredValue: string | null = null;
    
    const dispatch = createEventDispatcher();
  
    function toggleDropdown() {
      isOpen = !isOpen;
      hoveredValue = null;
    }
  
    function handleSelect(value: string, subValue?: string) {
      selectedValue = { varType:value, varName: subValue || "" };
      isOpen = false;
      dispatch('select', { varType:value, varName:subValue?subValue:"" });
    }
  
    function handleMouseEnter(value: string) {
      hoveredValue = value;
    }

    function handleMouseLeave() {
    }

  </script>
  
  <div class="relative w-full">
    <button
      id="multiLevelDropdownButton"
      class="text-gray-500 bg-white border border-gray-300 focus:border-blue-500 focus:outline-none font-medium rounded-md text-sm inline-flex items-center justify-between w-full"
      type="button"
      on:click={toggleDropdown}
    >
      <span class="truncate ml-1 text-left">{selectedValue 
        ? `${selectedValue.varType}${selectedValue.varName ? '-' + selectedValue.varName : ''}`
        : 'Select'}
        </span>
      <svg class="w-2.5 h-2.5 mr-1 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="m1 1 4 4 4-4"/>
      </svg>
    </button>
  
    {#if isOpen}
      <div class="z-10 absolute left-0 right-0 bottom-6 mt-1 bg-white divide-y divide-gray-100 rounded-md shadow">
        <ul class="text-sm text-gray-500" aria-labelledby="multiLevelDropdownButton">
          <li class="text-white text-left px-4 cursor-default" style="background-color: rgb(200, 200, 200)">Select</li>
          {#each Object.entries(menu_data) as [value, subValues]}
            <li
              on:mouseenter={() => handleMouseEnter(value)}
              on:mouseleave={handleMouseLeave}
              class="relative"
            >
              <button 
                class="capitalize main-item flex items-center justify-between w-full px-4 hover:text-white hover:rounded-md"
                style="--hover-bg-color: {$varTypeColorScale(value)}"
                on:click={() => {
                  if (subValues.length === 0) {
                    handleSelect(value);
                  }
                }}
              >
                {value}
                {#if subValues.length > 0}
                  <svg class="w-2.5 h-2.5 ms-3 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 9 4-4-4-4"/>
                  </svg>
                {/if}
              </button>
              {#if subValues.length > 0 && hoveredValue === value}
                <div class="absolute left-full top-0 ml-1 bg-white divide-y divide-gray-100 rounded-md shadow w-full max-h-48 overflow-y-auto">
                  <ul class="text-sm text-gray-500">
                    {#each subValues as subValue}
                      <li>
                        <button 
                          class="sub-item block w-full text-left px-4 hover:rounded-md"
                          on:click={() => handleSelect(value, subValue)}
                        >
                          {subValue}
                        </button>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>


  <style lang="postcss">
  .main-item:hover {
    background-color: var(--hover-bg-color);
  }

  .sub-item:hover {
    background-color: rgb(37 99 235);
    color: white;
  }
  </style>