<script lang="ts">
  import { createEventDispatcher } from "svelte";

  import { varTypeColorScale } from "lib/store";

  export let menu_data: { [key: string]: string[] };
  export let selectedValue: { varType: string; varName: string } | undefined =
    undefined;
  let isOpen = false;
  let hoveredValue: string | null = null;

  const dispatch = createEventDispatcher();

  function toggleDropdown() {
    isOpen = !isOpen;
    hoveredValue = null;
  }

  function handleSelect(value: string, subValue?: string) {
    selectedValue = { varType: value, varName: subValue || "" };
    isOpen = false;
    dispatch("select", { varType: value, varName: subValue ? subValue : "" });
  }

  function handleMouseEnter(value: string) {
    hoveredValue = value;
  }

  function handleMouseLeave() {
    hoveredValue = null;
  }
</script>

<div class="relative w-full">
  <button
    id="multiLevelDropdownButton"
    class="inline-flex w-full items-center justify-between rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 opacity-70 focus:border-blue-500 focus:outline-none"
    type="button"
    style={`background-color: ${selectedValue ? $varTypeColorScale(selectedValue.varType) : "white"}`}
    on:click={toggleDropdown}
  >
    <span class="ml-1 truncate text-left capitalize"
      >{selectedValue
        ? `${selectedValue.varType}${selectedValue.varName ? "-" + selectedValue.varName : ""}`
        : "Select"}
    </span>
    <svg
      class="mr-1 h-2.5 w-2.5 flex-shrink-0"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 10 6"
    >
      <path
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1"
        d="m1 1 4 4 4-4"
      />
    </svg>
  </button>

  {#if isOpen}
    <div
      class="absolute bottom-6 left-0 right-0 z-10 mt-1 divide-y divide-gray-100 rounded-md bg-white shadow"
    >
      <ul
        class="text-sm text-gray-700"
        aria-labelledby="multiLevelDropdownButton"
      >
        <li
          class="cursor-default px-4 text-left text-gray-600"
          style="background-color: #f3f3f3"
        >
          Select
        </li>
        {#each Object.entries(menu_data) as [value, subValues]}
          <li
            on:mouseenter={() => handleMouseEnter(value)}
            on:mouseleave={handleMouseLeave}
            class="relative"
          >
            <button
              class="main-item flex w-full items-center justify-between pr-4 capitalize hover:rounded-md hover:text-black"
              style="--hover-bg-color: {$varTypeColorScale(
                value,
              )}; background-color: {hoveredValue === value
                ? $varTypeColorScale(value)
                : 'unset'}"
              on:click={() => {
                if (subValues.length === 0) {
                  handleSelect(value);
                }
              }}
            >
              <!-- {value} -->
              <span
                class="w-[5rem] px-1 opacity-70"
                style="background-color: {$varTypeColorScale(value)}"
              >
                {value}
              </span>
              {#if subValues.length > 0}
                <svg
                  class="ms-3 h-2.5 w-2.5 rtl:rotate-180"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 6 10"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="m1 9 4-4-4-4"
                  />
                </svg>
              {/if}
            </button>
            {#if subValues.length > 0 && hoveredValue === value}
              <div
                class="absolute bottom-[-1rem] left-full ml-0 max-h-[15rem] w-max divide-y divide-gray-100 overflow-y-auto rounded-md bg-white shadow"
              >
                <ul class="text-sm text-gray-500">
                  {#each subValues as subValue}
                    <li>
                      <button
                        class="sub-item block w-full px-4 text-left hover:rounded-md"
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
