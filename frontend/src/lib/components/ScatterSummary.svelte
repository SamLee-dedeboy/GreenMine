<script lang="ts">

import * as d3 from "d3";
import { scattersummary } from "./ScatterSummary";
import { onMount, tick } from "svelte";
export let id: string;
export let summary_interviews: any;
// import { Check, ChevronDown } from '$icons/index.js';
import { createSelect, melt } from '@melt-ui/svelte';
import { fade } from 'svelte/transition';
// import  chevronDown  from "/chevrondown.svg";
const svgId = "scatter-svg";
let selectedAttr: string  = "emotion";
const paddings = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
};

const options = {
attribute: ['emotion', 'topic'],
// savory: ['Basil', 'Bacon', 'Rosemary'],
};

const {
    elements: { trigger, menu, option, group, groupLabel, label },
    states: { selectedLabel, open },
    helpers: { 
        isSelected ,
    },
} = createSelect<string>({
    forceVisible: true,
    defaultSelected: {value: 'emotion', label: 'emotion'},
    positioning: {
        placement: 'bottom',
        fitViewport: true,
        sameWidth: true,
    },
});

$: update_summary(summary_interviews,selectedAttr);
selectedLabel.subscribe((value) => {
    selectedAttr = value;
}); 
onMount(() => {
    let width = 500;
    let height = 300;
    scattersummary.init(svgId, width, height, paddings);
    // console.log(selectedLabel.subscribe().name);
  });
async function update_summary(summary_interviews,selectedAttr) {
    await tick();
    if (summary_interviews &&  selectedAttr) scattersummary.update_summary(summary_interviews,selectedAttr);
    else {
        // console.log("clearing summary")
        // console.log({summary_interviews})
        // console.log({selectedAttr})
        // scattersummary.clear_summary();
    
    }
}


</script>

<div id="svg-container" class="flex flex-col gap-y-1 outline outline-1 outline-gray-300 items-center">
    <div class="flex gap-1 menu w-fit items-center py-0.5">

        <!-- svelte-ignore a11y-label-has-associated-control - $label contains the 'for' attribute -->
        <!-- <label class="block text-magnum-900" use:melt={$label}>Choose attribute</label> -->
        <button
          class="flex h-8 min-w-[100px] items-center justify-center rounded-lg bg-white  py-1
        text-magnum-700 shadow transition-opacity hover:opacity-90"
          use:melt={$trigger}
          aria-label="Food"
        >
          {$selectedLabel || 'Select a attribute'}
        <img src="test.svg" alt="error" class="w-[1rem] h-[1rem]"/>
        <!-- <ChevronDown class="size-5" /> -->
        </button>
        {#if $open}
          <div
            class=" z-10 flex max-h-[300px] flex-col
          overflow-y-auto rounded-lg bg-white p-1
          shadow focus:!ring-0"
            use:melt={$menu}
            transition:fade={{ duration: 150 }}
          >
            {#each Object.entries(options) as [key, arr]}
              <div use:melt={$group(key)}>
                <!-- <div
                  class="py-1 pl-4 pr-4 font-semibold capitalize text-neutral-800"
                  use:melt={$groupLabel(key)}
                >
                  {key}
                </div> -->
                {#each arr as item}
                  <div
                    class="relative cursor-pointer rounded-lg py-1  text-neutral-800
                    hover:bg-stone-100 focus:z-10
                    focus:text-gray-700 w-full
                    flex items-center justify-center gap-x-2
                    data-[highlighted]:bg-stone-200 data-[highlighted]:text-gray-900
                    data-[disabled]:opacity-50"
                    use:melt={$option({ value: item, label: item })}
                  >
                    <div class="check {$isSelected(item) ? 'block' : 'hidden'}">
                      <!-- <Check class="size-4" /> --> ✓
                    </div>
      
                    {item}
                  </div>
                {/each}
              </div>
            {/each}
          </div>
        {/if}
    </div>
    <svg
    id = {svgId}
    class="w-full grow border border-gray-300 rounded p-2 text-sm"
    viewBox="0 0 500 300"
    >
    </svg>
</div>



<style>
#svg-container {
    position: absolute;
    /* width: 35rem;
    height: 20rem; */
    width: 30rem;
    height: 20rem;
    /* left: 50%;
    transform: translateX(-50%);
    top: 26%; */
    left:80%;
    bottom:5%

}

/* .menu {
    position: absolute;
    left: 50%;
    top: 5%;
    transform: translateX(-50%);
    width: 15rem;
}
     */
.check {
    /* position: absolute; */
    /* left: theme(spacing.2); */
    /* top: 50%; */
    z-index: theme(zIndex.20);
    /* translate: 0 calc(-50% + 1px); */
    /* color: theme(colors.magnum.500); */
    color: green;
}
</style>
