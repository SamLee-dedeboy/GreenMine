<script>
    import * as d3 from 'd3';
    import { tick } from 'svelte';
    import { varbox } from './Varbox'
    import { createEventDispatcher } from "svelte";
    export let drivers;
    export let pressures;
    export let states;
    export let impacts;
    export let responses;
    const svgId = "model-svg";
    const dispatch = createEventDispatcher();
    const handlers = {
    VarSelected: handleVarSelected,
  };
    let container;
    let selectedVar = undefined;
    const paddings = {
        left: 300,
        right: 300,
        top: 300,
        bottom: 300,
    };

    $: width = container?.clientWidth;
    $: height = container?.clientHeight;
    $: if (width && height)
        varbox.init(svgId, width, height, paddings, handlers);
    $: update_vars(drivers,pressures,states,impacts,responses);
    // $:((_) => {
    //     varbox.hight_hex(selectedVar);
    // })(selectedVar);

    async function update_vars(drivers,pressures,states,impacts,responses) { 
        await tick(); 
        if(drivers && pressures && states && impacts && responses) 
            varbox.update_vars(drivers,pressures,states,impacts,responses); 
    }

    function handleVarSelected(variable) {
        selectedVar = variable;
        dispatch("var-selected", selectedVar);
  }
</script>

<div bind:this={container} class="w-full h-full relative">
    <div
        class="tooltip absolute w-fit h-fit pl-0.5 pr-1 py-1 rounded bg-white border border-black opacity-0 pointer-events-none text-xs"
    ></div>
    <div class="summary_panel w-fit h-fit pr-1 py-1 rounded bg-white border border-black opacity-0"></div>
    <svg id={svgId} class="w-full h-full">
        <g class="driver_region"></g>
        <g class="pressure_region"></g>
        <g class="state_region"></g>
        <g class="impact_region"></g>
        <g class="response_region"></g>
    </svg>
    <svg id={`statistics-${svgId}`} class="absolute left-0 right-0 top-0 bottom-0">
    </svg>
</div>


<style>

  :global(.hex-hover) {
    stroke: black !important;
    stroke-width: 3 !important;
    /* transition: all 0.05s ease-in-out; */
  }

  :global(.show-tooltip) {
    opacity: 1;
  }

  :global(.hex-highlight) {
    opacity: 1;
    stroke: black !important;
    stroke-width: 3 !important;
  }
  :global(.hex-not-highlight) {
    opacity: 0.5;
  }
  :global(.hex-label-highlight) {
    opacity: 1;

  }
  :global(.hex-label-not-highlight) {
    opacity: 0.5;
  }

</style>




