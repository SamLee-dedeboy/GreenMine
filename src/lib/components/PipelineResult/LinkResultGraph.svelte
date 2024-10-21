<script lang="ts">
  import type { tLink } from "lib/types";
  import { onMount } from "svelte";
  import { varTypeColorScale } from "lib/store";
  import { createEventDispatcher } from "svelte";
  import * as d3 from "d3";
  export let svgId: string = "link-graph";
  export let data: tLink[] = [];
  export let max_degree: number = 0;
  const var_types = ["driver", "pressure", "state", "impact", "response"];
  const dispatch = createEventDispatcher();
  let simulation;
  const graph_renderer = {
    init() {
      this.radiusScale = d3
        .scaleLinear()
        .domain([0, max_degree])
        .range([2, 30]);
      this.confidenceOpacityScale = d3
        .scaleLinear()
        .domain([0, 1])
        .range([0.2, 0.8]);
      this.confidenceStrokeWidthScale = d3
        .scaleLinear()
        .domain([0, 1])
        .range([0.5, 1.5]);
      d3.select(`#${svgId}`).append("g").attr("class", "node-label-group");
      d3.select(`#${svgId}`).append("g").attr("class", "node-group");
      d3.select(`#${svgId}`).append("g").attr("class", "link-group");
      d3.select(`#${svgId}`).append("g").attr("class", "link-label-group");
      this.dispatch = d3.dispatch("link-clicked");
    },
    on(event, callback) {
      this.dispatch.on(event, callback);
    },
    update(link_data: tLink[]) {
      const svg = d3.select(`#${svgId}`);
      let nodes_dict = collect_nodes(link_data);
      let force_links = link_data.map((link) => {
        return {
          ...link,
          source: nodes_dict[link.var1],
          target: nodes_dict[link.var2],
        };
      });
      const self = this;
      // update nodes
      const nodes = svg
        .select("g.node-group")
        .selectAll(".node")
        .data(Object.values(nodes_dict), (d) => d.var)
        .join("circle")
        .attr("class", "node")
        .attr("r", (d) => this.radiusScale(d.degree))
        .attr("fill", (d) => $varTypeColorScale(d.var_type))
        .attr("stroke-width", 0.5)
        .on("mouseover", function (e, d) {
          d3.selectAll(".link")
            .classed("link-highlighted", false)
            .classed("link-not-highlighted", true)
            .filter((link) => link.var1 === d.var || link.var2 === d.var)
            .classed("link-not-highlighted", false)
            .classed("link-highlighted", true);
          d3.selectAll(".link-label")
            .classed("link-highlighted", false)
            .classed("link-not-highlighted", true)
            .filter((link) => link.var1 === d.var || link.var2 === d.var)
            .classed("link-not-highlighted", false)
            .classed("link-highlighted", true);
          d3.select(this).classed("node-hovered", true);
        })
        .on("mouseout", function () {
          d3.selectAll(".link")
            .classed("link-highlighted", false)
            .classed("link-not-highlighted", false);
          d3.selectAll(".link-label")
            .classed("link-highlighted", false)
            .classed("link-not-highlighted", false);
          d3.select(this).classed("node-hovered", false);
        });

      const node_labels = svg
        .select("g.node-label-group")
        .selectAll(".node-label")
        .data(Object.values(nodes_dict), (d) => d.var)
        .join("text")
        .attr("class", "node-label")
        .text((d) => d.var)
        .attr("font-size", "0.2rem")
        .attr("text-anchor", "middle")
        .attr("fill", "black");

      // update links
      const links = svg
        .select("g.link-group")
        .selectAll(".link")
        .data(force_links, (d) => `${d.var1}-${d.var2}`)
        .join("path")
        .attr("id", (d) => `${d.var1}-${d.var2}`)
        .attr("class", "link")
        .attr("stroke", "gray")
        .attr("stroke-width", (d) =>
          this.confidenceStrokeWidthScale(d.confidence),
        )
        .attr("opacity", (d) => this.confidenceOpacityScale(d.confidence))
        .attr("cursor", "pointer")
        .on("mouseover", function (e, d) {
          console.log("link hover", d);
          d3.select(`#label-${d.var1}-${d.var2}`)
            .select("rect")
            .classed("link-label-hover", true);
          d3.select(`#${d.var1}-${d.var2}`).classed("link-hover", true);
          d3.select(`#arrow-${d.var1}-${d.var2}`)
            .select("path")
            .classed("link-arrow-hover", true);
        })
        .on("mouseout", function (e, d) {
          d3.select(`#label-${d.var1}-${d.var2}`)
            .select("rect")
            .classed("link-label-hover", false);
          d3.select(`#${d.var1}-${d.var2}`).classed("link-hover", false);
          d3.select(`#arrow-${d.var1}-${d.var2}`)
            .select("path")
            .classed("link-arrow-hover", false);
        })
        .on("click", (e, d) => {
          self.dispatch.call("link-clicked", null, d);
        });

      const link_labels = svg
        .select("g.link-label-group")
        .selectAll("g.link-label")
        .data(force_links, (d) => `${d.var1}-${d.var2}`)
        .join("g")
        .attr("class", "link-label")
        .attr("id", (d) => `label-${d.var1}-${d.var2}`)
        .attr("opacity", 0.8)
        .each(function (d) {
          d3.select(this).selectAll("*").remove();
          const label = d3
            .select(this)
            .append("text")
            .text((d) =>
              d.response.relationship
                .map(
                  (relationship) =>
                    relationship.label.charAt(0).toUpperCase() +
                    relationship.label.slice(1),
                )
                .join("/"),
            )
            .attr("font-size", "0.2rem")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "hanging")
            .attr("pointer-events", "none")
            .attr("fill", "#555555");
          const border = d3
            .select(this)
            .append("rect")
            .attr("width", label.node().getBBox().width + 0.2)
            .attr("height", 5)
            .attr("fill", "white")
            .attr("stroke", "gray")
            .attr("stroke-width", 0.1)
            .attr("rx", 1)
            .attr("x", -label.node().getBBox().width / 2 - 0.1)
            .attr("y", -1)
            .attr("cursor", "pointer")
            .on("mouseover", function () {
              d3.select(this).classed("link-label-hover", true);
              d3.select(`#${d.var1}-${d.var2}`).classed("link-hover", true);
              d3.select(`#arrow-${d.var1}-${d.var2}`)
                .select("path")
                .classed("link-arrow-hover", true);
            })
            .on("mouseout", function () {
              d3.select(this).classed("link-label-hover", false);
              d3.select(`#${d.var1}-${d.var2}`).classed("link-hover", false);
              d3.select(`#arrow-${d.var1}-${d.var2}`)
                .select("path")
                .classed("link-arrow-hover", false);
            })
            .on("click", (e, d) => {
              self.dispatch.call("link-clicked", null, d);
            })
            .lower();
        });

      // update force
      const forceNode = d3.forceManyBody();
      const forceLink = d3
        .forceLink(force_links)
        .id((d) => `${d.var1}-${d.var2}`)
        .distance(65);
      simulation = d3
        .forceSimulation(Object.values(nodes_dict))
        .alphaMin(0.1)
        .force("link", forceLink)
        .force("center", d3.forceCenter(50, 35).strength(0.1))
        .force("charge", forceNode.distanceMin(30))
        .force("collide", (d) => d3.forceCollide(this.radiusScale(d.degree)))
        .on("tick", () => {
          nodes
            .attr(
              "cx",
              (d) =>
                (d.x = clip(d.x, [
                  0 + this.radiusScale(d.degree),
                  100 - this.radiusScale(d.degree),
                ])),
            )
            .attr(
              "cy",
              (d) =>
                (d.y = clip(d.y, [
                  0 + this.radiusScale(d.degree) + 5, // 5 is for the label
                  100 - this.radiusScale(d.degree),
                ])),
            );
          node_labels
            .attr("x", (d) => d.x)
            .attr("y", (d) => d.y - this.radiusScale(d.degree) - 1);
          links
            .attr("d", (d) => {
              const tangent = Math.atan2(
                d.target.y - d.source.y,
                d.target.x - d.source.x,
              );
              return `M${d.source.x + Math.cos(tangent) * this.radiusScale(d.source.degree)},${
                d.source.y +
                Math.sin(tangent) * this.radiusScale(d.source.degree)
              } L${d.target.x - Math.cos(tangent) * this.radiusScale(d.target.degree)},${
                d.target.y -
                Math.sin(tangent) * this.radiusScale(d.target.degree)
              }`;
            })
            .attr("marker-end", (d) => {
              return createArrow(svg, d);
            });
          link_labels.attr(
            "transform",
            (d) =>
              `translate(${(d.source.x + d.target.x) / 2}, ${(d.source.y + d.target.y) / 2})`,
          );
        });
      nodes.call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended),
      );
    },
  };

  function clip(x, range) {
    return Math.max(Math.min(x, range[1]), range[0]);
  }
  function collect_nodes(links: tLink[]) {
    const node_dict: Record<
      string,
      { var: string; var_type: string; degree: number; x: number; y: number }
    > = {};
    links.forEach((link) => {
      const var1 = link.var1;
      if (node_dict[var1]) {
        node_dict[var1].degree += 1;
      } else {
        node_dict[var1] = {
          var: var1,
          var_type: link.indicator1,
          degree: 1,
          x: 0,
          y: 0,
        };
      }
      const var2 = link.var2;
      if (node_dict[var2]) {
        node_dict[var2].degree += 1;
      } else {
        node_dict[var2] = {
          var: var2,
          var_type: link.indicator2,
          degree: 1,
          x: 0,
          y: 0,
        };
      }
    });
    return node_dict;
  }
  function createArrow(svg, d: tLink) {
    const arrowId = `arrow-${d.var1}-${d.var2}`;
    let arrow = svg.select(`#${arrowId}`);
    if (arrow.empty()) {
      svg
        .select("defs")
        .append("marker")
        .attr("id", arrowId)
        .attr("viewBox", [0, 0, 10, 10])
        .attr("refX", 5)
        .attr("refY", 5)
        .attr("markerWidth", 4)
        .attr("markerHeight", 4)
        .attr("orient", "auto-start-reverse")
        .append("path")
        .attr(
          "d",
          d3.line()([
            [0, 0],
            [10, 5],
            [0, 10],
          ]),
        )
        // .attr('fill', self.varTypeColorScale(d.target.var_type));
        .attr("fill", "gray");
    }

    return `url(#${arrowId})`;
  }
  function dragstarted(event) {
    console.log("drag started", simulation);
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  // Update the subject (dragged node) position during drag.
  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  // Restore the target alpha so the simulation cools after dragging ends.
  // Unfix the subject position now that it’s no longer being dragged.
  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  function handleLinkClicked(link) {
    dispatch("link-clicked", link);
  }
  onMount(() => {
    graph_renderer.init();
    graph_renderer.update(data);
    graph_renderer.on("link-clicked", handleLinkClicked);
  });
</script>

<div class="relative">
  <div class="absolute bottom-0 right-0 flex flex-col">
    {#each var_types as var_type, index}
      <div class="flex">
        <svg class="h-[1.2rem] w-[1.2rem]" viewBox="0 0 10 10"
          ><circle cx="6" cy="4" r="3" fill={$varTypeColorScale(var_type)}
          ></circle></svg
        >
        <span
          class="items-center rounded px-1 text-xs capitalize text-gray-500"
        >
          {var_type}
        </span>
      </div>
    {/each}
  </div>
  <svg id={svgId} viewBox="0 0 100 100" class="overflow-visible">
    <defs> </defs>
  </svg>
</div>

<style lang="postcss">
  svg {
    & .node-hovered {
      stroke: black;
      filter: drop-shadow(2px 3px 2px rgba(0, 0, 0, 0.3));
    }
    & .link-not-highlighted {
      opacity: 0.05;
    }
    & .link-hover {
      stroke: black;
    }
    & .link-arrow-hover {
      fill: black;
    }
    & .link-label-hover {
      fill: lightgray;
    }
  }
</style>
