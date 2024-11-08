<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";

  export let estimated_time;
  const svgId = "loading-bar-" + Math.floor(Math.random() * 1000);
  let mounted = false;
  $: if (mounted) {
    update(estimated_time);
  }
  function startCounting(estimated_time: number) {
    let count = 0;
    const svg = d3.select("#" + svgId);
    const interval = setInterval(() => {
      svg
        .selectAll("rect")
        .filter((d) => d === count)
        .attr("opacity", 0.5);
      count += 1;
    }, 1000);
    return interval;
  }

  function initLoadingBar(estimated_time) {
    const rect_data = [...Array(estimated_time / 1000).keys()];
    const svg = d3.select("#" + svgId);
    const svgWidth = svg.node().clientWidth;
    const svgHeight = svg.node().clientHeight;
    const offset = 1;
    const xScale = d3
      .scaleLinear()
      .domain([0, rect_data.length])
      .range([0, svgWidth]);

    svg
      .selectAll("rect")
      .data(rect_data)
      .join("rect")
      .attr("x", (d) => xScale(d))
      .attr("y", 0)
      .attr("width", Math.max(1, svgWidth / rect_data.length - offset))
      .attr("height", svgHeight)
      .attr("fill", "black")
      .attr("opacity", 0);
  }

  function update(estimated_time) {
    initLoadingBar(estimated_time);
    startCounting(estimated_time);
  }
  onMount(() => {
    mounted = true;
  });
</script>

<div class="flex w-full flex-col px-4">
  <div>Data Loading...</div>
  <div>Estimated Time: {estimated_time / 1000} seconds</div>
  <div class="h-8 w-full p-0.5 outline outline-1 outline-black">
    <svg id={svgId} class="h-full w-full"> </svg>
  </div>
</div>
