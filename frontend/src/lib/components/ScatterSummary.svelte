<script lang="ts">

import * as d3 from "d3";
import { scattersummary } from "./ScatterSummary";
import { onMount, tick } from "svelte";
import { createSelect, melt } from '@melt-ui/svelte';
import { fade } from 'svelte/transition';
import type {
    tMention,
    tVariableType,
    tTranscript,
    tLink,
    tServerData,
    tVariable,

    tChunk

  } from "lib/types";

export let id: string;
export let summary_interviews: any[]| undefined = undefined;

const svgId ={
  emotion: "scatter-svg-emotion",
  topic: "scatter-svg-topic"
}

const attrs = ["topic","emotion"]
// let selectedAttr: string  = "emotion";
const paddings = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
};




$: update_summary(summary_interviews,attrs);
// $:update_summary(summary_interviews,"emotion")

onMount(() => {
    let width = 500;
    let height = 300;
    // scattersummary.init(svgId.topic, width, height, paddings,"topic");
    scattersummary.init(svgId, width,height,paddings);
    // document
    //   .querySelector(".container")
    //   ?.addEventListener("click", (e) => {
    //     if (e.defaultPrevented) return;
    //     summary_interviews = [];
        
    //   });
  });


async function update_summary(summary_interviews:any[],attrs:string[]) {
    await tick();
    if (summary_interviews &&  attrs) scattersummary.update_summary(summary_interviews,attrs);
    else {
        // console.log("clearing summary")
        // console.log({summary_interviews})
        // console.log({selectedAttr})
        // scattersummary.clear_summary();
    
    }
}


</script>

<div class="flex">
  <div id="svg-container-emotion" class="flex-1">
    <svg
      id={svgId.emotion}
      class="w-full h-full border border-gray-300 rounded p-2 text-sm"
      viewBox="0 0 500 300"
    >
    </svg>
  </div>
  <div id="svg-container-topic" class="flex-1">
    <svg
      id={svgId.topic}
      class="w-full h-full border border-gray-300 rounded p-2 text-sm"
      viewBox="0 0 500 300"
    >
    </svg>
  </div>
</div>



<style>
#svg-container {
    /* position: absolute; */
    /* width: 35rem;
    height: 20rem; */
    /* width: 30rem;
    height: 20rem; */
    /* left: 50%;
    transform: translateX(-50%);
    top: 26%; */
    /* left:80%;
    bottom:5% */

}

</style>
