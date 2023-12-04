<script lang="ts">
  import { onMount } from "svelte";
  import { simgraph } from "./SimGraph";
  import Legend from "./Legend.svelte";
  import * as d3 from "d3";
  import { createEventDispatcher } from "svelte";
  import { categoricalColors, emotionColorScale } from "./Colors";
  const dispatch = createEventDispatcher();

  export let topic_data;
  // export let interview_data;
  export let keyword_data;
  let highlight_keywords: string[] | undefined = undefined;
  let container;
  $: hoveredHexKeywords = simgraph.hoveredHexKeywords;
  let filterClickedKeywords: string[] | undefined = undefined;

  const svgId = "simgraph-svg";
  const handlers = {
    // nodeClick: handleNodeClick,
    nodesSelected: handleNodesSelected,
    keywordsSelected: handleKeywordSelected,
    emotionSelected: handleEmotionSelected,
  };
  const paddings = {
    left: 300,
    right: 300,
    top: 300,
    bottom: 300,
  };
  $: width = container?.clientWidth;
  $: height = container?.clientHeight;
  $: if (width && height)
    simgraph.init(svgId, width, height, paddings, handlers);
  let topic_highlight_chunks = undefined;
  let keyword_highlight_chunks = undefined;
  let emotion_highlight_chunks = undefined;
  let selectedTopic = undefined;
  let selectedKeywords: string[] | undefined = undefined;
  let selectedHexBinKeywords: string[] | undefined = undefined;
  let selectedEmotion = undefined;

  $: keyword_highlight_chunks = ((_) => {
    if (!selectedKeywords) {
      return undefined;
    } else {
      const keyword_chunks = topic_data.nodes.filter((node) =>
        node.keywords.some((keyword) => selectedKeywords!.includes(keyword))
      );
      return keyword_chunks;
    }
  })(selectedKeywords);

  $: ((_) => {
    console.log({ filterClickedKeywords });
    if (!filterClickedKeywords) selectedKeywords = selectedHexBinKeywords;
    else {
      selectedKeywords = filterClickedKeywords;
    }
    dispatch("keywords-selected", selectedKeywords);
  })(filterClickedKeywords);

  $: highlight_chunks = intersection(
    emotion_highlight_chunks,
    intersection(topic_highlight_chunks, keyword_highlight_chunks)
  );

  let selected_links = undefined;
  let scaleRadius = undefined;
  // let topicColorScale = undefined;
  $: if (topic_data) {
    // topicColorScale = d3
    //   .scaleOrdinal()
    //   .domain(Object.keys(topic_data.groups))
    //   .range(categoricalColors);
    scaleRadius = d3
      .scaleLinear()
      .domain([
        Math.min(...topic_data.nodes.map((node) => node.degree)),
        Math.max(...topic_data.nodes.map((node) => node.degree)),
      ])
      .range([3, 12]);
    // const group_statistics = (() => {
    //   let res = {};
    //   Object.keys(topic_data.groups).forEach((topic) => {
    //     const topic_chunks = topic_data.groups[topic];
    //     const emotions_grouped = Object.groupBy(
    //       topic_chunks,
    //       ({ emotion }) => emotion
    //     );
    //     let emotion_counts = {};
    //     let total = 0;
    //     Object.keys(emotions_grouped).forEach((emotion) => {
    //       emotion_counts[emotion] = emotions_grouped[emotion].length;
    //       total += emotions_grouped[emotion].length;
    //     });
    //     res[topic] = {
    //       emotion_counts,
    //       total,
    //     };
    //   });
    //   return res;
    // })();
    simgraph.update_chunks(
      topic_data.groups,
      topic_data.group_ccs,
      emotionColorScale
    );
    // simgraph.update_force(
    //   topic_data.groups,
    //   topic_data.nodes,
    //   topic_data.links,
    //   topic_data.weights,
    //   scaleRadius,
    //   topicColorScale,
    //   emotionColorScale
    // );

    // simgraph.update_chunks(
    //   topic_data.groups,
    //   group_statistics,
    //   emotionColorScale
    // );

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

  // $: chunks = ((data) => {
  //   let chunks_dict = {};
  //   if (!interview_data) return {};
  //   data.forEach((interview) => {
  //     interview.data.forEach((chunk) => {
  //       chunks_dict[chunk.id] = chunk;
  //     });
  //   });
  //   return chunks_dict;
  // })(interview_data);

  // onMount(() => {
  //     simgraph.init(svgId, width, height, handleNodeClick);
  // })

  // function handleNodeClick(_, d) {
  //   selected_chunk = chunks[d.id];
  //   console.log(d.id, topic_data.links);
  //   selected_links = topic_data.links
  //     .filter((link) => link.source == d.id || link.target == d.id)
  //     .map((link) => link.source + "_" + link.target);
  //   // simgraph.highlight_links(svgId, selected_links)
  // }

  $: ((_) => {
    console.log({ highlight_chunks });
    dispatch("chunks-selected", highlight_chunks);
    if (!highlight_chunks) {
      simgraph.dehighlight_nodes();
      simgraph.dehighlight_keywords();
      return;
    }
    // update chunks
    simgraph.highlight_nodes(highlight_chunks);

    // update keyword hex
    let keyword_set = new Set<string>();
    highlight_chunks.forEach((node) => {
      node.keywords.forEach((keyword) => keyword_set.add(keyword));
    });
    highlight_keywords = Array.from(keyword_set);
    simgraph.highlight_keywords(highlight_keywords, keyword_data);
  })(highlight_chunks);

  function handleNodesSelected(nodes, topic) {
    // dispatch("chunks-selected", nodes);
    topic_highlight_chunks = nodes;
    selectedTopic = topic;
    // if (nodes === null) {
    //   simgraph.dehighlight_keywords();
    //   return;
    // }
    // let keyword_set = new Set<string>();
    // nodes.forEach((node) => {
    //   node.keywords.forEach((keyword) => keyword_set.add(keyword));
    // });
    // highlight_keywords = Array.from(keyword_set);
    // simgraph.highlight_keywords(highlight_keywords, keyword_data);
  }

  function handleKeywordSelected(keywords) {
    selectedKeywords = keywords;
    selectedHexBinKeywords = keywords;
    filterClickedKeywords = undefined;
    dispatch("keywords-selected", selectedKeywords);
    // handleNodesSelected(highlight_chunks);
    // simgraph.highlight_nodes(highlight_chunks);
  }

  function handleEmotionSelected(emotion) {
    console.log({ emotion }, topic_data.nodes);
    selectedEmotion = emotion;
    if (!emotion) {
      emotion_highlight_chunks = undefined;
      return;
    }
    const emotion_chunks = topic_data.nodes.filter(
      (node) => node.emotion === emotion
    );
    emotion_highlight_chunks = emotion_chunks;
    // highlight_chunks = intersection(highlight_chunks, emotion_chunks);
    // handleNodesSelected(highlight_chunks);
    // simgraph.highlight_nodes(highlight_chunks);
  }

  // export function highlight_nodes(nodes) {
  //   console.log({ nodes });
  //   simgraph.highlight_nodes(svgId, nodes);
  // }

  function intersection(l1, l2) {
    if (!l1) return l2;
    if (!l2) return l1;
    const res = l1.filter((value) => l2.includes(value));
    console.log(l1, l2, res);
    return res;
  }
</script>

<div bind:this={container} class="w-full h-full relative p-2 pt-4">
  <div class="absolute top-5 right-0 w-[150px] h-[150px]">
    <Legend
      bind:selectedEmotion
      on:selectEmotion={(e) => handleEmotionSelected(e.detail)}
    />
  </div>
  <div
    class="absolute flex flex-col text-sm top-[170px] right-1 w-[120px] h-[150px] text-left shadow rounded px-0.5 divide-y divide-black overflow-y-auto"
  >
    <span class="text-base font-bold"> Filter: </span>
    {#if !selectedTopic && !selectedHexBinKeywords && !selectedEmotion}
      <div class="text-gray-500">None</div>
    {/if}
    {#if selectedEmotion}
      <div>{selectedEmotion}</div>
    {/if}
    {#if selectedTopic}
      <div>{selectedTopic}</div>
    {/if}
    {#if selectedHexBinKeywords}
      <div class="flex flex-wrap justify-start items-center gap-x-0.5 gap-y-1">
        {#each selectedHexBinKeywords as selectedKeyword, index}
          <span
            role="button"
            tabindex={index}
            class="px-0.5 border border-gray rounded clickable"
            class:keyword-selected={filterClickedKeywords?.includes(
              selectedKeyword
            )}
            on:keyup={() => {
              if (!filterClickedKeywords) filterClickedKeywords = [];
              if (!filterClickedKeywords.includes(selectedKeyword)) {
                filterClickedKeywords.push(selectedKeyword);
                filterClickedKeywords = [...filterClickedKeywords];
              } else {
                filterClickedKeywords = filterClickedKeywords.filter(
                  (keyword) => keyword !== selectedKeyword
                );
                if (filterClickedKeywords.length === 0)
                  filterClickedKeywords = undefined;
              }
            }}
            on:click={() => {
              if (!filterClickedKeywords) filterClickedKeywords = [];
              if (!filterClickedKeywords.includes(selectedKeyword)) {
                filterClickedKeywords.push(selectedKeyword);
                filterClickedKeywords = [...filterClickedKeywords];
              } else {
                filterClickedKeywords = filterClickedKeywords.filter(
                  (keyword) => keyword !== selectedKeyword
                );
                if (filterClickedKeywords.length === 0)
                  filterClickedKeywords = undefined;
              }
            }}>{selectedKeyword}</span
          >
        {/each}
      </div>
    {/if}
  </div>
  <div
    class="tooltip absolute w-fit h-fit pl-0.5 pr-1 py-1 rounded bg-white border border-black opacity-0 pointer-events-none text-xs"
  ></div>
  <svg id={svgId} class="w-full h-full overflow-visible">
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
    <defs>
      <!-- border shadow filter -->
      <filter id="drop-shadow-border">
        <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="gray" />
      </filter>
    </defs>
  </svg>
</div>

<style>
  :global(.node-highlight) {
    stroke-width: 1.5;
    opacity: 1;
  }
  :global(.node-not-highlight) {
    opacity: 0.3;
  }
  /* borders */
  :global(.border-highlight) {
    stroke-width: 3;
    fill: yellow;
  }
  :global(.border:hover) {
    stroke-width: 3;
  }

  /* keywords */
  :global(.hex-highlight) {
    opacity: 0.8;
  }
  :global(.hex-not-highlight) {
    opacity: 0.2;
  }
  :global(.hex-hover) {
    stroke: black !important;
    stroke-width: 3 !important;
    /* transition: all 0.05s ease-in-out; */
  }
  :global(.hex-label-highlight) {
    opacity: 1;
  }
  :global(.hex-label-not-highlight) {
    opacity: 0;
  }
  :global(.hex-label-hover) {
    opacity: 1 !important;
  }
  :global(.hex-selected) {
    stroke: black;
    stroke-width: 3;
  }
  :global(.hex-not-selected) {
    stroke: white;
    stroke-width: 1;
  }
  :global(.shadow) {
    filter: box-shadow(0px 0px 3px #cccccc);
    /* filter: drop-shadow(0px 0px 3px #8abedd); */
  }
  :global(.topic-label:hover) {
    filter: drop-shadow(0px 0px 10px #1100ff);
  }
  :global(.topic-label-highlight) {
    filter: drop-shadow(0px 0px 10px #1100ff);
  }
  :global(.show-tooltip) {
    opacity: 1;
  }
  .keyword-selected {
    background-color: #d1d5db;
  }
</style>
