<script lang=ts>
    import { onMount } from 'svelte';
    import * as d3 from "d3"
    import { timeline } from "./timeline"

    export let timeline_data;
    let container;
    const svgId = 'report-timeline-svg'
    // const width = 1000
    // const height = 1000
    $: width = container?.clientWidth
    $: height = container?.clientHeight
    $: if(width && height) timeline.init(svgId, width, height, handleNodeClick)
    $: if(timeline_data) timeline.update(svgId, timeline_data)

    function handleNodeClick(event, d) {
        // selected_chunk = chunks[d.id]
        // console.log(d.id, graph.links)
        // selected_links = graph.links.filter(link => link.source == d.id || link.target == d.id).map(link => link.source + "_" + link.target)
        // simgraph.highlight_links(svgId, selected_links)
    }

    export function highlight_nodes(nodes) {
        console.log({nodes})
        timeline.highlight_nodes(svgId, nodes)
    }
</script>

<div bind:this={container} class='w-full h-full relative'>
    <svg id={svgId} class='w-full h-full'></svg>
</div>