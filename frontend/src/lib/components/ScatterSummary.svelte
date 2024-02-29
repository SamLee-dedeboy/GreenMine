<script lang="ts">

import * as d3 from "d3";
import { scattersummary } from "./ScatterSummary";
import { onMount, tick } from "svelte";
export let id: string;
export let summary_interviews: any;
// import { Check, ChevronDown } from '$icons/index.js';
import { createSelect, melt } from '@melt-ui/svelte';
import { fade } from 'svelte/transition';
const svgId = "scatter-svg";
let selectedAttr: string  = "emotion";
const paddings = {
left: 300,
right: 300,
top: 300,
bottom: 300,
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
        console.log("clearing summary")
        console.log({summary_interviews})
        console.log({selectedAttr})
        scattersummary.clear_summary();
    
    }
}


</script>

<div id="svg-container">
    <svg
        id = {svgId}
        class="show-summary absolute left-0 right-0 top-0 bottom-0 flex gap-1 flex-wrap border border-gray-300 rounded p-2 text-sm"
    >
    </svg>
    <div class="flex flex-col gap-1 menu">
        <!-- svelte-ignore a11y-label-has-associated-control - $label contains the 'for' attribute -->
        <label class="block text-magnum-900" use:melt={$label}>Choose attribute</label>
        <button
          class="flex h-10 min-w-[100px] items-center justify-between rounded-lg bg-white px-3 py-2
        text-magnum-700 shadow transition-opacity hover:opacity-90"
          use:melt={$trigger}
          aria-label="Food"
        >
          {$selectedLabel || 'Select a attribute'}
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
                    class="relative cursor-pointer rounded-lg py-1 pl-8 pr-4 text-neutral-800
                    hover:bg-stone-100 focus:z-10
                    focus:text-gray-700
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
</div>



<style>
#scatter-svg {
    width: 35rem;
    height: 20rem;
    left: 50%;
    transform: translateX(-50%);
    top: 16%;
}

.menu{
    position: absolute;
    left: 50%;
    top: 5%;
    transform: translateX(-50%);
    width: 15rem;

}
    
.check {
    position: absolute;
    left: theme(spacing.2);
    top: 50%;
    z-index: theme(zIndex.20);
    translate: 0 calc(-50% + 1px);
    /* color: theme(colors.magnum.500); */
    color: green;
}
</style>
