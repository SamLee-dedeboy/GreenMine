import * as d3 from "d3";
// import {tick} from 'svelte';
// import { scale } from 'svelte/transition';
import type {
  tVariable,
  tVariableType,
  tUtilityHandlers,
  tMention,
  tDPSIR,
  tRectangle,
  tRectObject,
  tLinkObject,
  tVisLink,
  tLink,
  tLinkObjectOverview,
  tBbox,
} from "../types/variables";
import * as Constants from "../constants";
import * as grid_layout from "./grid_layout";
import { toggle } from "@melt-ui/svelte/internal/helpers";
import { setOpacity } from "lib/utils";
// import { link } from "fs";

export const OverviewDPSIR = {
  init(svgId: string) {
    // this.clicked_rect = null;
    this.clicked_link = null;
    this.width = 1550;
    this.height = 950;
    this.padding = { top: 10, right: 50, bottom: 10, left: 50 };
    this.grid_renderer = grid_layout.grid_renderer;
    this.grid_renderer.init(300, 240);
    // console.log(this.grid_renderer.columns, this.grid_renderer.rows);
    this.cellWidth = this.width / this.grid_renderer.columns;
    this.cellHeight = this.height / this.grid_renderer.rows;
    // console.log(this.cellWidth, this.cellHeight);
    this.svgId = svgId;
    // this.dispatch = d3.dispatch("VarOrLinkSelected");
    this.dispatch = d3.dispatch(
      "VarTypeLinkSelected",
      //   "VarTypeHovered",
      "VarTypeSelected",
      "VarTypeUnSelected",
    );
    // this.utilities = utilities;
    // this.handlers = handlers;
    this.varTypeColorScale = null;
    // this.showLinks = true;
    // this.enable = false;
    const self = this;
    const svg = d3
      .select("#" + svgId)
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .attr("width", this.width)
      .attr("height", this.height);

    // this.drawGids(svg, svgId);
    svg.append("g").attr("class", "overview_link_group");

    // .attr("transform", `translate(${padding.left}, ${padding.top})`);
    svg.append("g").attr("class", "overview_bbox_region");
    // Constants.var_type_names.forEach((var_type_name) => {
    //   const var_type_region = svg
    //     .append("g")
    //     .attr("class", `overview_${var_type_name}_region`);
    //   // .attr("transform", `translate(${padding.left}, ${padding.top})`);
    //   var_type_region.append("g").attr("class", "tag-group");
    //   var_type_region.append("g").attr("class", "bbox-group");
    // });
  },
  on(event, handler) {
    // console.log(event, handler);
    this.dispatch.on(event, handler);
  },
  resetHighlights() {
    d3.selectAll("rect.box")
      .classed("box-highlight", false)
      .classed("box-not-highlight", false)
      .transition()
      .duration(250)
      .attr("transform", ""); // Reset transformation on all boxes to remove any previous magnification
    d3.selectAll("text.label")
      .classed("box-label-highlight", false)
      .classed("box-label-not-highlight", false);
    d3.selectAll("path.link")
      .classed("link-highlight", false)
      .classed("link-not-highlight", false)
      //   .classed("not-show-link-not-highlight", false)
      .attr("stroke", "gray");

    d3.selectAll("marker").select("path").attr("fill", "gray");
    // this.dispatch.call("VarTypeLinkSelected", null, null);
    // this.dispatch.call("VarTypeHovered", null, null);
    // this.dispatch.call("VarTypeUnSelected", null, null);
    this.clicked_link = null;
  },
  //   toggleLinks(showLinks: boolean) {
  //     this.showLinks = showLinks;
  //   },
  update_vars(
    links: tVisLink[],
    varTypeColorScale: Function,
    bboxes: Record<string, tBbox>,
    var_type_states: Record<string, { revealed: boolean }>,
  ) {
    this.grid_renderer?.reset_global_grid(300, 240);
    this.varTypeColorScale = varTypeColorScale;

    this.drawBboxes(bboxes, var_type_states);
    this.drawLinks(links, bboxes, var_type_states);
  },
  drawGids(svg, svgId) {
    // Get the dimensions of the SVG
    const self = this;
    let cellWidth: number = self.cellWidth;
    let cellHeight: number = self.cellHeight;
    let columns = self.grid_renderer.columns;
    let rows = self.grid_renderer.rows;
    let width = self.width;
    let height = self.height;
    const svgElement = document.getElementById(svgId);

    // Append the grid group
    let gridGroup = svg.append("g").attr("class", "grid_group");
    // .attr("transform", `translate(${padding.left}, ${padding.top})`);

    // Function to draw horizontal lines
    for (let i = 0; i <= rows; i++) {
      gridGroup
        .append("line")
        .attr("x1", 0)
        .attr("y1", i * cellHeight)
        .attr("x2", width)
        .attr("y2", i * cellHeight)
        .attr("stroke", "#D3D3D3")
        .attr("stroke-width", 1)
        .attr("opacity", 0.3);
    }

    // Function to draw vertical lines
    for (let i = 0; i <= columns; i++) {
      gridGroup
        .append("line")
        .attr("x1", i * cellWidth)
        .attr("y1", 0) //-padding.top
        .attr("x2", i * cellWidth)
        .attr("y2", height) //+padding.bottom
        .attr("stroke", "#D3D3D3")
        .attr("stroke-width", 1)
        .attr("opacity", 0.3);
    }
  },

  //center(gridX,gridY), size(x grids,y grids)
  drawVars(vars: tVariableType, bbox_info: tBbox) {
    // console.log(vars);
    const self = this;
    let cellWidth: number = self.cellWidth;
    let cellHeight: number = self.cellHeight;
    const var_type_name = vars.variable_type;

    this.drawBbox(
      var_type_name,
      bbox_info.center,
      bbox_info.size[0],
      bbox_info.size[1],
    );
  },

  extractUniquePairs(links: any[]) {
    const uniquePairs = new Set<string>();

    links.forEach((link) => {
      if (
        link.source &&
        link.source.var_type &&
        link.target &&
        link.target.var_type
      ) {
        const pair = `${link.source.var_type}-${link.target.var_type}`;
        uniquePairs.add(pair);
      }
    });

    return Array.from(uniquePairs).map((pair) => {
      const [source, target] = pair.split("-");
      return { source, target };
    });
  },

  drawLinks(
    links: tVisLink[],
    bboxes: Record<string, tBbox>,
    var_type_states: Record<string, { revealed: boolean }>,
  ) {
    const self = this;
    let cellWidth: number = self.cellWidth;
    let cellHeight: number = self.cellHeight;
    const Ports = generatePorts(bboxes);
    links = links.filter(
      (link) => link.source.var_type !== link.target.var_type,
    );
    links = links.filter(
      (link) =>
        !var_type_states[link.source.var_type].revealed ||
        !var_type_states[link.target.var_type].revealed,
    );
    const uniquePairs = this.extractUniquePairs(links);
    const pairCounts: Record<string, number> = {};
    links.forEach((link) => {
      const key = `${link.source.var_type}-${link.target.var_type}`;
      pairCounts[key] = (pairCounts[key] || 0) + 1;
    });

    const pairInfo = uniquePairs.map(
      ({ source: sourceType, target: targetType }) => {
        const linkKey = `${sourceType}-${targetType}`;
        const inverseKey = `${targetType}-${sourceType}`;

        let sourceCenter, targetCenter;
        let reverse = false;

        if (Ports[linkKey]) {
          sourceCenter = [Ports[linkKey].source.x, Ports[linkKey].source.y];
          targetCenter = [Ports[linkKey].target.x, Ports[linkKey].target.y];
          reverse = Ports[linkKey].reverse;
        } else if (Ports[inverseKey]) {
          sourceCenter = [
            Ports[inverseKey].target.x,
            Ports[inverseKey].target.y,
          ];
          targetCenter = [
            Ports[inverseKey].source.x,
            Ports[inverseKey].source.y,
          ];
          reverse = Ports[inverseKey].reverse;
        } else {
          sourceCenter = bboxes[sourceType]?.center || [0, 0];
          targetCenter = bboxes[targetType]?.center || [0, 0];
        }

        return {
          source: sourceType,
          target: targetType,
          source_center: sourceCenter,
          target_center: targetCenter,
          count: pairCounts[linkKey] || 0,
          reverse: reverse,
        };
      },
    );

    // Modify the lineGenerator function to handle the direction
    const lineGenerator = (link) => {
      //   console.log({ link });
      const sourcePoint = grid_layout.gridToSvgCoordinate(
        link.source_center[0],
        link.source_center[1],
        cellWidth,
        cellHeight,
      );

      const targetPoint = grid_layout.gridToSvgCoordinate(
        link.target_center[0],
        link.target_center[1],
        cellWidth,
        cellHeight,
      );

      const dx = targetPoint.x - sourcePoint.x;
      const dy = targetPoint.y - sourcePoint.y;
      const dr = Math.sqrt(dx * dx + dy * dy) * 0.8; // Increase radius by 20% for more pronounced curves
      const dScale = d3
        .scaleLinear()
        .domain([
          Math.min(...pairInfo.map((d) => d.count)),
          Math.max(...pairInfo.map((d) => d.count)),
        ])
        .range([0.99, 0.84]); // Adjust this range as needed
      const startPoint = {
        x: sourcePoint.x + dx * 0.05,
        y: sourcePoint.y + dy * 0.05,
      };
      const endPoint = {
        x: sourcePoint.x + dx * dScale(link.count),
        y: sourcePoint.y + dy * dScale(link.count),
      };
      const sweepFlag = link.reverse ? 1 : 0;
      // Create the partial arc path
      return `M${startPoint.x},${startPoint.y}A${dr},${dr} 0 0 ${sweepFlag} ${endPoint.x},${endPoint.y}`;
      // return `M${startPoint.x},${startPoint.y}A${dr},${dr} 0 0 0 ${endPoint.x},${endPoint.y}`;
    };

    const svg = d3.select("#" + this.svgId);
    const tooltip = d3.select(".tooltip-content");
    if (svg.select("defs").empty()) {
      svg.append("defs");
    }

    const widthScale = d3
      .scaleLinear()
      .domain([
        Math.min(...pairInfo.map((d) => d.count)),
        Math.max(...pairInfo.map((d) => d.count)),
      ])
      .range([3, 15]);
    const opacityScale = d3
      .scaleLinear()
      .domain([
        Math.min(...pairInfo.map((d) => d.count)),
        Math.max(...pairInfo.map((d) => d.count)),
      ])
      .range([0.4, 0.8]);

    const link_paths = svg
      .select("g.overview_link_group")
      .selectAll(".link")
      .data(pairInfo)
      .join("path")
      .attr("class", "link")
      .attr("id", (d) => `${d.source}-${d.target}`)
      .attr("d", lineGenerator)
      .attr("cursor", "pointer")
      .attr("fill", "none")
      .attr("stroke", "#777777")
      .attr("stroke-width", (d) => widthScale(d.count))
      // .attr("opacity", 0.5)
      .attr("opacity", (d) => opacityScale(d.count))
      .attr("filter", "drop-shadow( 2px 2px 2px rgba(255, 255, 255, 1))")
      .attr("marker-end", (d: tLinkObject) => {
        const svg = d3.select("#" + self.svgId);
        return createArrow(svg, d);
      })
      //   .attr("stroke-dasharray", "5,5")
      .on("mouseover", function (event, d) {
        // d3.selectAll("path.link").classed("link-not-highlight", true);
        d3.select(this)
          .classed("link-highlight", true)
          .classed("link-not-highlight", false)
          .raise()
          .attr("stroke", (d: tLinkObject) => {
            return self.varTypeColorScale(d.source);
          });
        d3.select(`#arrow-${d.source}-${d.target} path`).attr(
          "fill",
          self.varTypeColorScale(d.source),
        );
        // .attr("marker-end", (d:tLinkObject) => {
        //     return createArrow(svg,d,self)
        // });
        tooltip
          .html(
            `
            <span style="background-color: ${setOpacity(self.varTypeColorScale(d.source), 0.7, "rgbHex")}">${d.source}</span>
            &rarr;
            <span style="background-color: ${setOpacity(self.varTypeColorScale(d.target), 0.7, "rgbHex")}">${d.target}</span>
            : ${d.count} occurrences
          `,
          )
          .style("visibility", "visible");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("top", event.pageY - 10 + "px")
          .style("left", event.pageX + 10 + "px");
      })
      .on("mouseout", function (event, d) {
        d3.selectAll("path.link").classed("link-not-highlight", false);
        d3.select(this)
          .classed("link-highlight", false)
          .classed("link-not-highlight", false)
          .raise()
          .attr("stroke", "gray");
        d3.select(`#arrow-${d.source}-${d.target} path`).attr("fill", "gray");

        tooltip.style("visibility", "hidden");
      })
      .on("click", function (event, d: tLinkObjectOverview) {
        event.preventDefault();
        self.dispatch.call("VarTypeLinkSelected", null, d);
      });
  },

  drawBboxes(
    bboxes: Record<string, tBbox>,
    var_type_states: Record<string, { revealed: boolean }>,
  ) {
    // console.log({ bboxes, var_type_states });
    const self = this;
    const not_revealed_var_types = Object.keys(var_type_states).filter(
      (var_type) => !var_type_states[var_type].revealed,
    );
    // console.log({ not_revealed_var_types });
    d3.select("#" + this.svgId)
      .select(".overview_bbox_region")
      .selectAll("g.bbox")
      .data(not_revealed_var_types)
      .join("g")
      .attr("class", "bbox")
      .attr("id", (d) => `overview_${d}_bbox_container`)
      .each(function (d) {
        const bbox_center = bboxes[d].center;
        const [bboxWidth, bboxHeight] = bboxes[d].size;
        let cellWidth: number = self.cellWidth;
        let cellHeight: number = self.cellHeight;
        let varTypeColorScale = self.varTypeColorScale;
        const group = d3.select(this);
        group.selectAll("*").remove();
        group
          .append("rect")
          .attr("class", "bbox")
          .attr("id", d)
          .attr(
            "x",
            grid_layout.gridToSvgCoordinate(
              bbox_center[0] - bboxWidth / 2,
              bbox_center[1] - bboxHeight / 2,
              cellWidth,
              cellHeight,
            ).x,
          )
          .attr(
            "y",
            grid_layout.gridToSvgCoordinate(
              bbox_center[0] - bboxWidth / 2,
              bbox_center[1] - bboxHeight / 2,
              cellWidth,
              cellHeight,
            ).y,
          )
          .attr("width", bboxWidth * cellWidth)
          .attr("height", bboxHeight * cellHeight)
          .attr("fill", setOpacity(varTypeColorScale(d), 0.8, "rgbHex"))
          .attr("rx", "0.4%")
          .attr("cursor", "pointer")
          .on("mouseover", function () {
            // apply hovering effect
            d3.selectAll(".link")
              .classed("overview-link-highlight", false)
              .classed("link-not-highlight", true)
              .attr("stroke", "gray")
              .filter(
                (link_data) => link_data.source === d || link_data.target === d,
              )
              .classed("overview-link-highlight", true)
              .classed("link-not-highlight", false)
              .raise()
              .attr("stroke", (d: tLinkObject) => {
                return self.varTypeColorScale(d.source);
              });

            d3.selectAll("marker")
              .filter(function () {
                const [, source, target] = this.id.split("-");
                return source === d || target === d;
              })
              .select("path")
              .attr("fill", function () {
                const [, source, target] = this.parentElement.id.split("-");
                return self.varTypeColorScale(source);
              });

            d3.select(this).classed("overview-var-type-hover", true);
          })
          .on("mouseout", function () {
            // self.dispatch.call("VarTypeHovered", null, undefined);
            d3.selectAll(".link")
              .classed("overview-link-highlight", false)
              .classed("link-not-highlight", false)
              .attr("stroke", "gray");

            d3.selectAll("marker").select("path").attr("fill", "gray");

            d3.select(this).classed("overview-var-type-hover", false);
          })
          .on("click", function (event) {
            event.preventDefault();
            // console.log("click", var_type_name);
            self.dispatch.call("VarTypeSelected", null, d);

            d3.selectAll(".link")
              .classed("overview-link-highlight", false)
              .classed("link-not-highlight", false)
              .attr("stroke", "gray");

            d3.selectAll("marker").select("path").attr("fill", "gray");
          });
        //group name
        group
          .append("text")
          .attr("class", "bbox-label")
          .attr("id", `${d}` + `_label`)
          .attr(
            "x",
            grid_layout.gridToSvgCoordinate(
              bbox_center[0],
              bbox_center[1] - bboxHeight / 2 - 2,
              cellWidth,
              cellHeight,
            ).x,
          )
          .attr(
            "y",
            grid_layout.gridToSvgCoordinate(
              bbox_center[0],
              bbox_center[1],
              cellWidth,
              cellHeight,
            ).y,
          )
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .text(d.charAt(0).toUpperCase() + d.slice(1) + "s")
          .attr("text-transform", "capitalize")
          .attr("pointer-events", "none")
          .attr("font-family", "serif")
          .attr("font-style", "italic")
          .attr("font-size", "3rem")
          .attr("font-weight", "bold")
          .attr("fill", "#636363");
      });
  },
};

function createArrow(svg, d: tLinkObject) {
  const arrowId = `arrow-${d.source}-${d.target}`;
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
      // .attr('fill',self.varTypeColorScale(d.source));
      .attr("fill", "#777777");
  }

  return `url(#${arrowId})`;
}

function generatePorts(bboxes: Record<string, tBbox>) {
  let origins: Record<string, [number, number]> = {};
  for (let key in bboxes) {
    origins[key] = [
      bboxes[key].center[0] - bboxes[key].size[0] / 2,
      bboxes[key].center[1] - bboxes[key].size[1] / 2,
    ];
  }

  return {
    "driver-pressure": {
      source: {
        x: origins.driver[0] + bboxes.driver.size[0] / 2,
        y: origins.driver[1] + bboxes.driver.size[1] / 4,
      },
      target: {
        x: origins.pressure[0],
        y: origins.pressure[1] + bboxes.pressure.size[1] / 2,
      },
      reverse: true,
    },
    "pressure-driver": {
      source: {
        x: origins.pressure[0] + bboxes.pressure.size[0] / 4,
        y: origins.pressure[1] + bboxes.pressure.size[1] / 6,
      },
      target: {
        x: origins.driver[0] + bboxes.driver.size[0] / 6,
        y: origins.driver[1] - bboxes.driver.size[1] / 10,
      },
      reverse: false,
    },
    "pressure-state": {
      source: {
        x: origins.pressure[0] + (3 * bboxes.pressure.size[0]) / 4,
        y: origins.pressure[1] + bboxes.pressure.size[1] / 4,
      },
      target: {
        x: origins.state[0] + (3 * bboxes.state.size[0]) / 4,
        y: origins.state[1] - bboxes.state.size[1] / 10,
      },
      reverse: true,
    },
    "state-pressure": {
      source: {
        x: origins.pressure[0] + bboxes.pressure.size[0],
        y: origins.pressure[1] + bboxes.pressure.size[1] / 4,
      },
      target: {
        x: origins.state[0] + (bboxes.state.size[0] * 1) / 4,
        y: origins.state[1],
      },
      reverse: false,
    },
    "state-impact": {
      source: {
        x: origins.state[0] + (bboxes.state.size[0] * 3) / 4,
        y: origins.state[1] + bboxes.state.size[1] / 2,
      },
      target: {
        x: origins.impact[0] + (bboxes.impact.size[0] * 6) / 7,
        y: origins.impact[1],
      },
      reverse: false,
    },
    "impact-state": {
      source: {
        x: origins.impact[0] + bboxes.impact.size[0],
        y: origins.impact[1] + (bboxes.impact.size[1] * 2) / 3,
      },
      target: {
        x: origins.state[0] + (bboxes.state.size[0] * 3) / 4,
        y: origins.state[1] + bboxes.state.size[1],
      },
    },
    "impact-response": {
      source: {
        x: origins.impact[0] + bboxes.impact.size[0] / 4,
        y: origins.impact[1] + (3 * bboxes.impact.size[1]) / 4,
      },
      target: {
        x: origins.response[0] + (10 * bboxes.response.size[0]) / 9.5,
        y: origins.response[1] + (3 * bboxes.response.size[1]) / 4,
      },
      reverse: true,
    },
    "response-impact": {
      source: {
        x: origins.response[0] + bboxes.response.size[0] / 2,
        y: origins.response[1] + (4 * bboxes.response.size[1]) / 4,
      },
      target: {
        x: origins.impact[0] + bboxes.impact.size[0] / 3,
        y: origins.impact[1] + (4 * bboxes.impact.size[1]) / 4 + 2,
      },
      reverse: false,
    },
    "response-driver": {
      source: {
        x: origins.response[0] + bboxes.response.size[0] / 4,
        y: origins.response[1] + bboxes.response.size[1] / 4,
      },
      target: {
        x: origins.driver[0] + (2 * bboxes.driver.size[0]) / 4,
        y: origins.driver[1] + bboxes.driver.size[1],
      },
      reverse: false,
    },
    "driver-response": {
      source: {
        x: origins.driver[0] + bboxes.driver.size[0] / 4,
        y: origins.driver[1] + bboxes.driver.size[1] / 3,
      },
      target: {
        x: origins.response[0] - bboxes.response.size[0] / 10,
        y: origins.response[1] + bboxes.response.size[1] / 2,
      },
    },
    "driver-impact": {
      source: {
        x: origins.driver[0] + bboxes.driver.size[0] / 3,
        y: origins.driver[1] + (3 * bboxes.driver.size[1]) / 4,
      },
      target: {
        x: origins.impact[0] + bboxes.impact.size[0] * 0.3,
        y: origins.impact[1],
      },
      reverse: true,
    },
    "impact-driver": {
      source: {
        x: origins.impact[0] + bboxes.impact.size[0] / 4,
        y: origins.impact[1] + bboxes.impact.size[1] / 4,
      },
      target: {
        x: origins.driver[0] + (3 * bboxes.driver.size[0]) / 4,
        y: origins.driver[1] + (4 * bboxes.driver.size[1]) / 4,
      },
      reverse: true,
    },
    "pressure-impact": {
      source: {
        x: origins.pressure[0] + (3 * bboxes.pressure.size[0]) / 4,
        y: origins.pressure[1] + bboxes.pressure.size[1] / 2,
      },
      target: {
        x: origins.impact[0] + (2 * bboxes.impact.size[0]) / 4,
        y: origins.impact[1],
      },
    },
    "impact-pressure": {
      source: {
        x: origins.impact[0] + (4 * bboxes.impact.size[0]) / 5,
        y: origins.impact[1] + bboxes.impact.size[1] / 4,
      },
      target: {
        x: origins.pressure[0] + (4 * bboxes.pressure.size[0]) / 5,
        y: origins.pressure[1] + (4 * bboxes.pressure.size[1]) / 5,
      },
    },
    "state-driver": {
      source: {
        x: origins.state[0] + bboxes.state.size[0] / 5,
        y: origins.state[1] + bboxes.state.size[1] / 10,
      },
      target: {
        x: origins.driver[0] + bboxes.driver.size[0],
        y: origins.driver[1] + bboxes.driver.size[1] / 20,
      },
      reverse: true,
    },
    "driver-state": {
      source: {
        x: origins.driver[0] + (3 * bboxes.driver.size[0]) / 4,
        y: origins.driver[1] + (3 * bboxes.driver.size[1]) / 4,
      },
      target: {
        x: origins.state[0] + (1 * bboxes.state.size[0]) / 3,
        y: origins.state[1] + (5 * bboxes.state.size[1]) / 4,
      },
    },
    "response-pressure": {
      source: {
        x: origins.response[0] + (bboxes.response.size[0] * 3) / 4,
        y: origins.response[1] + (3 * bboxes.response.size[1]) / 4,
      },
      target: {
        x: origins.pressure[0] + bboxes.pressure.size[0] / 2,
        y: origins.pressure[1] + bboxes.pressure.size[1],
      },
    },
    "pressure-response": {
      source: {
        x: origins.pressure[0] + bboxes.pressure.size[0] / 3,
        y: origins.pressure[1] + (3 * bboxes.pressure.size[1]) / 4,
      },
      target: {
        x: origins.response[0] + (bboxes.response.size[0] * 3) / 4,
        y: origins.response[1],
      },
      reverse: true,
    },
    "response-state": {
      source: {
        x: origins.response[0] + (bboxes.response.size[0] * 7) / 8,
        y: origins.response[1] + bboxes.response.size[1] / 3,
      },
      target: {
        x: origins.state[0],
        y: origins.state[1] + bboxes.state.size[1] / 2,
      },
      reverse: true,
    },
    "state-response": {
      source: {
        x: origins.state[0] + bboxes.state.size[0] / 5,
        y: origins.state[1] + bboxes.state.size[1] / 3,
      },
      target: {
        x: origins.response[0] + bboxes.response.size[0] + 1,
        y: origins.response[1] + bboxes.response.size[1] / 4,
      },
      reverse: true,
    },
  };
}

function _generatePorts(bboxes) {
  // First, add 'original' property to each object
  for (let key in bboxes) {
    bboxes[key] = [
      bboxes[key].center[0] - bboxes[key].size[0] / 2,
      bboxes[key].center[1] - bboxes[key].size[1] / 2,
    ];
  }

  return {
    "driver-pressure": {
      source: {
        x: bboxes.driver[0] + (bboxes.driver.size[0] * 2) / 3,
        y: bboxes.driver[1],
      },
      target: {
        x: bboxes.pressure[0],
        y: bboxes.pressure[1] + bboxes.pressure.size[1] / 4,
      },
    },
    "pressure-state": {
      source: {
        x: bboxes.pressure[0] + bboxes.pressure.size[0],
        y: bboxes.pressure[1] + bboxes.pressure.size[1] / 4,
      },
      target: {
        x: bboxes.state[0] + (bboxes.state.size[0] * 1) / 4,
        y: bboxes.state[1],
      },
    },
    "state-impact": {
      source: {
        x: bboxes.state[0] + (bboxes.state.size[0] * 3) / 4,
        y: bboxes.state[1] + bboxes.state.size[1],
      },
      target: {
        x: bboxes.impact[0] + bboxes.impact.size[0],
        y: bboxes.impact[1] + (bboxes.impact.size[1] * 2) / 3,
      },
    },
    "impact-response": {
      source: {
        x: bboxes.impact[0],
        y: bboxes.impact[1] + bboxes.impact.size[1] / 2,
      },
      target: {
        x: bboxes.response[0] + bboxes.response.size[0],
        y: bboxes.response[1] + bboxes.response.size[1] / 2,
      },
    },
    "response-driver": {
      source: {
        x: bboxes.response[0],
        y: bboxes.response[1] + bboxes.response.size[1] / 2,
      },
      target: {
        x: bboxes.driver[0] + bboxes.driver.size[0] / 4,
        y: bboxes.driver[1] + bboxes.driver.size[1],
      },
    },
    "driver-impact": {
      source: {
        x: bboxes.driver[0] + bboxes.driver.size[0],
        y: bboxes.driver[1] + bboxes.driver.size[1] / 2,
      },
      target: {
        x: bboxes.impact[0] + bboxes.impact.size[0] * 0.3,
        y: bboxes.impact[1],
      },
    },
    "pressure-impact": {
      source: {
        x: bboxes.pressure[0] + bboxes.pressure.size[0] / 2,
        y: bboxes.pressure[1] + bboxes.pressure.size[1],
      },
      target: {
        x: bboxes.impact[0] + bboxes.impact.size[0] * 0.3,
        y: bboxes.impact[1],
      },
    },
    "state-driver": {
      source: {
        x: bboxes.state[0],
        y: bboxes.state[1] + bboxes.state.size[1] / 2,
      },
      target: {
        x: bboxes.driver[0] + bboxes.driver.size[0],
        y: bboxes.driver[1] + bboxes.driver.size[1] / 2,
      },
    },
    "response-pressure": {
      source: {
        x: bboxes.response[0] + (bboxes.response.size[0] * 3) / 4,
        y: bboxes.response[1],
      },
      target: {
        x: bboxes.pressure[0] + bboxes.pressure.size[0] / 2,
        y: bboxes.pressure[1] + bboxes.pressure.size[1],
      },
    },
    "response-state": {
      source: {
        x: bboxes.response[0] + (bboxes.response.size[0] * 3) / 4,
        y: bboxes.response[1],
      },
      target: {
        x: bboxes.state[0],
        y: bboxes.state[1] + bboxes.state.size[1] / 2,
      },
    },
  };
}
