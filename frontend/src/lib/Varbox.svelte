<script>
    import * as d3 from 'd3';
    import { tick } from 'svelte';
    import { varbox } from './Varbox'
    export let drivers;
    export let pressures;
    export let states;
    export let impacts;
    export let responses;
    const svgId = "model-svg";
    let container;
    const paddings = {
        left: 300,
        right: 300,
        top: 300,
        bottom: 300,
    };

    $: width = container?.clientWidth;
    $: height = container?.clientHeight;
    $: if (width && height)
        varbox.init(svgId, width, height, paddings);
    $: update_vars(drivers,pressures,states,impacts,responses);

    async function update_vars(drivers,pressures,states,impacts,responses) { 
        await tick(); 
        if(drivers && pressures && states && impacts && responses) 
            varbox.update_vars(drivers,pressures,states,impacts,responses); 
    }
</script>

<div bind:this={container} class="w-full h-full">
    <div
        class="tooltip absolute w-fit h-fit pl-0.5 pr-1 py-1 rounded bg-white border border-black opacity-0 pointer-events-none text-xs"
    ></div>
    <svg id={svgId} class="w-full h-full">
        <g class="driver_region"></g>
        <g class="pressure_region"></g>
        <g class="state_region"></g>
        <g class="impact_region"></g>
        <g class="response_region"></g>
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
</style>




