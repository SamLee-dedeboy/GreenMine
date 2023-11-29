<script lang="ts">
  import { onMount } from "svelte";
  import { simgraph } from "./SimGraph";
  import * as d3 from "d3";

  export let topic_data;
  export let interview_data;
  export let keyword_data;
  let container;

  const categoricalColors = [
    "#8dd3c7",
    "#ffffb3",
    "#bebada",
    "#fb8072",
    "#80b1d3",
    "#fdb462",
    "#b3de69",
    "#fccde5",
    "#d9d9d9",
    "#bc80bd",
    "#ccebc5",
    "#ffed6f",
    "#1f78b4",
    "#33a02c",
    "#e31a1c",
    "#ff7f00",
    "#6a3d9a",
    "#b15928",
    "#a6cee3",
    "#b2df8a",
    "#fb9a99",
    "#fdbf6f",
  ];

  const svgId = "simgraph-svg";
  const handlers = {
    nodeClick: handleNodeClick,
  };
  const paddings = {
    left: 300,
    right: 300,
    top: 300,
    bottom: 300,
  };
  // const width = 1000
  // const height = 1000
  $: width = container?.clientWidth;
  $: height = container?.clientHeight;
  $: if (width && height)
    simgraph.init(svgId, width, height, paddings, handlers);
  let selected_chunk;
  let selected_links = undefined;
  let scaleRadius = undefined;
  let topicColorScale = undefined;
  $: if (topic_data) {
    topicColorScale = d3
      .scaleOrdinal()
      .domain(Object.keys(topic_data.groups))
      .range(categoricalColors);
    scaleRadius = d3
      .scaleLinear()
      .domain([
        Math.min(...topic_data.nodes.map((node) => node.degree)),
        Math.max(...topic_data.nodes.map((node) => node.degree)),
      ])
      .range([3, 12]);

    // simgraph.update_treemap(
    //   svgId,
    //   topic_data.groups,
    //   topic_data.nodes,
    //   topic_data.links,
    //   topic_data.weights,
    //   scaleRadius,
    //   topicColorScale
    // );
  }

  $: if (keyword_data) {
    const keyword_statistics = keyword_data.keyword_statistics;
    const overall_freqs: number[] = Object.keys(keyword_statistics).map(
      (keyword) => keyword_statistics[keyword].frequency
    );
    const overall_min_freq = Math.min(...overall_freqs);
    const overall_max_freq = Math.max(...overall_freqs);
    const scaleRadius = d3
      .scaleLinear()
      .domain([overall_min_freq, overall_max_freq])
      .range([5, 30]);
    simgraph.update_keywords(keyword_data, scaleRadius);
  }

  $: chunks = ((data) => {
    console.log(data);
    let chunks_dict = {};
    if (!interview_data) return {};
    data.forEach((interview) => {
      interview.data.forEach((chunk) => {
        chunks_dict[chunk.id] = chunk;
      });
    });
    return chunks_dict;
  })(interview_data);

  // onMount(() => {
  //     simgraph.init(svgId, width, height, handleNodeClick);
  // })

  function handleNodeClick(_, d) {
    selected_chunk = chunks[d.id];
    console.log(d.id, topic_data.links);
    selected_links = topic_data.links
      .filter((link) => link.source == d.id || link.target == d.id)
      .map((link) => link.source + "_" + link.target);
    // simgraph.highlight_links(svgId, selected_links)
  }

  export function highlight_nodes(nodes) {
    console.log({ nodes });
    simgraph.highlight_nodes(svgId, nodes);
  }
</script>

<div bind:this={container} class="w-full h-full relative">
  <svg id={svgId} class="w-full h-full">
    <g class="chunk_region"></g>
    <g class="keyword_region"></g>
    <defs>
      <filter id="drop-shadow-hex" x="0" y="0">
        <feOffset result="offOut" in="SourceAlpha" dx="0" dy="3" />
        <feGaussianBlur result="blurOut" in="offOut" stdDeviation="2" />
        <feBlend
          in="SourceGraphic"
          in2="blurOut"
          mode="normal"
          flood-color="rgba(0, 0, 0, 0)"
        />
      </filter>
    </defs>
  </svg>
  <!-- <div class='top-[15%] bottom-[15%] left-[20%] right-[20%] absolute p-2 flex flex-col text-left pointer-events-none'>
        <div class='border-b border-black'> Title: {selected_chunk?.title} </div>
        <div class='border-b border-black'> Topic: {selected_chunk?.topic} </div>
        <div>
            <div> Summary: </div>
            <div> {selected_chunk?.summary} </div>
        </div>
    </div> -->
</div>
