<script lang="ts">
  import type { tLink } from "lib/types";
  import { onMount } from "svelte";
  import { varTypeColorScale } from "lib/store";
  import * as d3 from "d3";
  export let svgId: string = "link-graph";
  export let data: tLink[] = [];
  export let max_degree: number = 0;
  const graph_renderer = {
    init() {
      console.log("init");
      this.radiusScale = d3
        .scaleLinear()
        .domain([0, max_degree])
        .range([5, 20]);
      console.log(max_degree);
    },
    update(links: tLink[]) {
      const svg = d3.select(`#${svgId}`);
      const nodes_dict = collect_nodes(links);
      // update nodes
      const nodes = svg
        .selectAll(".node")
        .data(Object.values(nodes_dict), (d) => d.var)
        .join("circle")
        .attr("class", "node")
        .attr("r", (d) => this.radiusScale(d.degree))
        .attr("fill", (d) => $varTypeColorScale(d.var_type))
        .attr("cx", (d, i) => (i + 1) * 25)
        .attr("cy", 100);
      // update links
    },
  };

  function collect_nodes(links: tLink[]) {
    const node_dict: Record<
      string,
      { var: string; var_type: string; degree: number }
    > = {};
    links.forEach((link) => {
      const var1 = link.var1;
      if (node_dict[var1]) {
        node_dict[var1].degree += 1;
      } else {
        node_dict[var1] = { var: var1, var_type: link.indicator1, degree: 1 };
      }
      const var2 = link.var2;
      if (node_dict[var2]) {
        node_dict[var2].degree += 1;
      } else {
        node_dict[var2] = { var: var2, var_type: link.indicator2, degree: 1 };
      }
    });
    return node_dict;
  }
  onMount(() => {
    graph_renderer.init();
    graph_renderer.update(data);
  });
</script>

<svg id={svgId}> </svg>
