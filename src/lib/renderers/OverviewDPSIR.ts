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
  SelectedType,
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
    Constants.var_type_names.forEach((var_type_name) => {
      const var_type_region = svg
        .append("g")
        .attr("class", `overview_${var_type_name}_region`);
      // .attr("transform", `translate(${padding.left}, ${padding.top})`);
      var_type_region.append("g").attr("class", "tag-group");
      var_type_region.append("g").attr("class", "bbox-group");
    });
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
    this.dispatch.call("VarTypeLinkSelected", null, null);
    // this.dispatch.call("VarTypeHovered", null, null);
    this.dispatch.call("VarTypeSelected", null, null);
    this.clicked_link = null;
  },
  //   toggleLinks(showLinks: boolean) {
  //     this.showLinks = showLinks;
  //   },
  update_vars(
    vars: tDPSIR,
    links: tVisLink[],
    varTypeColorScale: Function,
    bboxes,
  ) {
    this.grid_renderer?.reset_global_grid(300, 240);
    // console.log(this.grid_renderer.global_grid)
    this.varTypeColorScale = varTypeColorScale;
    const var_type_names = Constants.var_type_names;
    type VarTypeNames = (typeof var_type_names)[number];

    Object.values(var_type_names).forEach((varType) => {
      //   console.log(varType);
      if (vars?.[varType] && bboxes?.[varType]) {
        this.drawVars(vars[varType], bboxes[varType]);
      }
    });
    // console.log({links})
    this.drawLinks(links, bboxes);
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
  drawVars(
    vars: tVariableType,
    bbox_info: { center: [number, number]; size: [number, number] },
  ) {
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
  extractUniquePairs(links: any[]): SelectedType[] {
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
    bboxes: { center: [number, number]; size: [number, number] },
  ) {
    const self = this;
    // console.log(bboxes);
    let cellWidth: number = self.cellWidth;
    let cellHeight: number = self.cellHeight;
    // const frequencyList = calculateFrequencyList(links); // includes variables frequency and link frequency among all groups
    const Ports = generatePorts(bboxes);
    links = links.filter(
      (link) => link.source.var_type !== link.target.var_type,
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
    // .select("body")
    // .append("div")
    // .attr("class", "tooltip-content")
    // .style("position", "absolute")
    // .style("visibility", "hidden")
    // .style("background", "rgb(249 250 251)")
    // .style("width", "170px")
    // .style("text-align", "center")
    // .style("border-radius", "6px")
    // .style("padding", "5px 5px")
    // .style("border", "2px solid grey")
    // .style("margin-left", "10px")
    // .style("font-size", "0.8rem");

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
    svg.select("g.overview_link_group");
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
        return createArrow(svg, d, self);
      })
      //   .attr("stroke-dasharray", "5,5")
      .on("mouseover", function (event, d) {
        d3.selectAll("path.link").classed("link-not-highlight", true);
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
        // self.dispatch.call("VarTypeLinkSelected", null, d);
      });
  },

  drawBbox(
    var_type_name: string,
    bbox_center: number[],
    bboxWidth: number,
    bboxHeight: number,
  ) {
    const self = this;
    let cellWidth: number = self.cellWidth;
    let cellHeight: number = self.cellHeight;
    let varTypeColorScale = self.varTypeColorScale;
    const group = d3
      .select("#" + this.svgId)
      .select(`.overview_${var_type_name}_region`);
    group.select("g.bbox-group").select("rect").remove();
    group
      .select("g.bbox-group")
      .append("rect")
      .attr("class", "bbox")
      .attr("id", var_type_name)
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
      .attr("fill", setOpacity(varTypeColorScale(var_type_name), 0.8, "rgbHex"))
      .attr("rx", "0.4%")
      .attr("cursor", "pointer")
      .on("mouseover", function () {
        // apply hovering effect
        d3.selectAll(".link")
          .classed("overview-link-highlight", false)
          .classed("link-not-highlight", true)
          .attr("stroke", "gray")
          .filter(
            (link_data) =>
              link_data.source === var_type_name ||
              link_data.target === var_type_name,
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
            // console.log(source, target);
            return source === var_type_name || target === var_type_name;
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
        self.dispatch.call("VarTypeSelected", null, var_type_name);

        d3.selectAll(".link")
          .classed("overview-link-highlight", false)
          .classed("link-not-highlight", false)
          .attr("stroke", "gray");

        d3.selectAll("marker").select("path").attr("fill", "gray");
      });

    //group name
    group
      .select("g.bbox-group")
      .append("text")
      .attr("class", "bbox-label")
      .attr("id", `${var_type_name}` + `_label`)
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
      .text(
        var_type_name.charAt(0).toUpperCase() + var_type_name.slice(1) + "s",
      )
      .attr("text-transform", "capitalize")
      .attr("pointer-events", "none")
      .attr("font-family", "serif")
      .attr("font-style", "italic")
      .attr("font-size", "3rem")
      .attr("font-weight", "bold")
      .attr("fill", "#636363");
    //   .attr("stroke", "black")  // Add black stroke
    //   .attr("stroke-width", "2px")  // Adjust stroke width as needed
    //   .attr("paint-order", "stroke")  // Ensures stroke is under the fill
    //   .attr("fill", "white")
    //   .attr("opacity", "0.2");
  },
};

function createArrow(svg, d: tLinkObject, self) {
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

function generatePorts(bboxes) {
  // First, add 'original' property to each object
  for (let key in bboxes) {
    bboxes[key].original = [
      bboxes[key].center[0] - bboxes[key].size[0] / 2,
      bboxes[key].center[1] - bboxes[key].size[1] / 2,
    ];
  }

  return {
    "driver-pressure": {
      source: {
        x: bboxes.driver.original[0] + bboxes.driver.size[0] / 2,
        y: bboxes.driver.original[1] + bboxes.driver.size[1] / 4,
      },
      target: {
        x: bboxes.pressure.original[0],
        y: bboxes.pressure.original[1] + bboxes.pressure.size[1] / 2,
      },
      reverse: true,
    },
    "pressure-driver": {
      source: {
        x: bboxes.pressure.original[0] + bboxes.pressure.size[0] / 4,
        y: bboxes.pressure.original[1] + bboxes.pressure.size[1] / 6,
      },
      target: {
        x: bboxes.driver.original[0] + bboxes.driver.size[0] / 6,
        y: bboxes.driver.original[1] - bboxes.driver.size[1] / 10,
      },
      reverse: false,
    },
    "pressure-state": {
      source: {
        x: bboxes.pressure.original[0] + (3 * bboxes.pressure.size[0]) / 4,
        y: bboxes.pressure.original[1] + bboxes.pressure.size[1] / 4,
      },
      target: {
        x: bboxes.state.original[0] + (3 * bboxes.state.size[0]) / 4,
        y: bboxes.state.original[1] - bboxes.state.size[1] / 10,
      },
      reverse: true,
    },
    "state-pressure": {
      source: {
        x: bboxes.pressure.original[0] + bboxes.pressure.size[0],
        y: bboxes.pressure.original[1] + bboxes.pressure.size[1] / 4,
      },
      target: {
        x: bboxes.state.original[0] + (bboxes.state.size[0] * 1) / 4,
        y: bboxes.state.original[1],
      },
      reverse: false,
    },
    "state-impact": {
      source: {
        x: bboxes.state.original[0] + (bboxes.state.size[0] * 3) / 4,
        y: bboxes.state.original[1] + bboxes.state.size[1],
      },
      target: {
        x: bboxes.impact.original[0] + bboxes.impact.size[0],
        y: bboxes.impact.original[1] + (bboxes.impact.size[1] * 2) / 3,
      },
    },
    "impact-response": {
      source: {
        x: bboxes.impact.original[0] + bboxes.impact.size[0] / 4,
        y: bboxes.impact.original[1] + (3 * bboxes.impact.size[1]) / 4,
      },
      target: {
        x: bboxes.response.original[0] + (7 * bboxes.response.size[0]) / 8,
        y: bboxes.response.original[1] + (3 * bboxes.response.size[1]) / 4,
      },
      reverse: false,
    },
    "response-impact": {
      source: {
        x: bboxes.response.original[0] + bboxes.response.size[0] / 2,
        y: bboxes.response.original[1] + (4 * bboxes.response.size[1]) / 4,
      },
      target: {
        x: bboxes.impact.original[0],
        y: bboxes.impact.original[1] + (4 * bboxes.impact.size[1]) / 4,
      },
      reverse: false,
    },
    "response-driver": {
      source: {
        x: bboxes.response.original[0] + bboxes.response.size[0] / 4,
        y: bboxes.response.original[1] + bboxes.response.size[1] / 4,
      },
      target: {
        x: bboxes.driver.original[0] + (2 * bboxes.driver.size[0]) / 4,
        y: bboxes.driver.original[1] + bboxes.driver.size[1],
      },
      reverse: false,
    },
    "driver-response": {
      source: {
        x: bboxes.driver.original[0] + bboxes.driver.size[0] / 4,
        y: bboxes.driver.original[1] + bboxes.driver.size[1] / 3,
      },
      target: {
        x: bboxes.response.original[0] - bboxes.response.size[0] / 10,
        y: bboxes.response.original[1] + bboxes.response.size[1] / 2,
      },
    },
    "driver-impact": {
      source: {
        x: bboxes.driver.original[0] + bboxes.driver.size[0] / 3,
        y: bboxes.driver.original[1] + (3 * bboxes.driver.size[1]) / 4,
      },
      target: {
        x: bboxes.impact.original[0] + bboxes.impact.size[0] * 0.3,
        y: bboxes.impact.original[1],
      },
      reverse: true,
    },
    "impact-driver": {
      source: {
        x: bboxes.impact.original[0] + bboxes.impact.size[0] / 4,
        y: bboxes.impact.original[1] + bboxes.impact.size[1] / 4,
      },
      target: {
        x: bboxes.driver.original[0] + (3 * bboxes.driver.size[0]) / 4,
        y: bboxes.driver.original[1] + (4 * bboxes.driver.size[1]) / 4,
      },
      reverse: true,
    },
    "pressure-impact": {
      source: {
        x: bboxes.pressure.original[0] + (3 * bboxes.pressure.size[0]) / 4,
        y: bboxes.pressure.original[1] + bboxes.pressure.size[1] / 2,
      },
      target: {
        x: bboxes.impact.original[0] + (2 * bboxes.impact.size[0]) / 4,
        y: bboxes.impact.original[1],
      },
    },
    "impact-pressure": {
      source: {
        x: bboxes.impact.original[0] + (4 * bboxes.impact.size[0]) / 5,
        y: bboxes.impact.original[1] + bboxes.impact.size[1] / 4,
      },
      target: {
        x: bboxes.pressure.original[0] + (4 * bboxes.pressure.size[0]) / 5,
        y: bboxes.pressure.original[1] + (4 * bboxes.pressure.size[1]) / 5,
      },
    },
    "state-driver": {
      source: {
        x: bboxes.state.original[0] + bboxes.state.size[0] / 5,
        y: bboxes.state.original[1] + bboxes.state.size[1] / 10,
      },
      target: {
        x: bboxes.driver.original[0] + bboxes.driver.size[0],
        y: bboxes.driver.original[1] + bboxes.driver.size[1] / 20,
      },
      reverse: true,
    },
    "driver-state": {
      source: {
        x: bboxes.driver.original[0] + (3 * bboxes.driver.size[0]) / 4,
        y: bboxes.driver.original[1] + (3 * bboxes.driver.size[1]) / 4,
      },
      target: {
        x: bboxes.state.original[0] + (1 * bboxes.state.size[0]) / 3,
        y: bboxes.state.original[1] + (5 * bboxes.state.size[1]) / 4,
      },
    },
    "response-pressure": {
      source: {
        x: bboxes.response.original[0] + (bboxes.response.size[0] * 3) / 4,
        y: bboxes.response.original[1] + (3 * bboxes.response.size[1]) / 4,
      },
      target: {
        x: bboxes.pressure.original[0] + bboxes.pressure.size[0] / 2,
        y: bboxes.pressure.original[1] + bboxes.pressure.size[1],
      },
    },
    "pressure-response": {
      source: {
        x: bboxes.pressure.original[0] + bboxes.pressure.size[0] / 3,
        y: bboxes.pressure.original[1] + (3 * bboxes.pressure.size[1]) / 4,
      },
      target: {
        x: bboxes.response.original[0] + (bboxes.response.size[0] * 3) / 4,
        y: bboxes.response.original[1],
      },
      reverse: true,
    },
    "response-state": {
      source: {
        x: bboxes.response.original[0] + (bboxes.response.size[0] * 7) / 8,
        y: bboxes.response.original[1] + bboxes.response.size[1] / 3,
      },
      target: {
        x: bboxes.state.original[0],
        y: bboxes.state.original[1] + bboxes.state.size[1] / 1,
      },
      reverse: true,
    },
  };
}

function _generatePorts(bboxes) {
  // First, add 'original' property to each object
  for (let key in bboxes) {
    bboxes[key].original = [
      bboxes[key].center[0] - bboxes[key].size[0] / 2,
      bboxes[key].center[1] - bboxes[key].size[1] / 2,
    ];
  }

  return {
    "driver-pressure": {
      source: {
        x: bboxes.driver.original[0] + (bboxes.driver.size[0] * 2) / 3,
        y: bboxes.driver.original[1],
      },
      target: {
        x: bboxes.pressure.original[0],
        y: bboxes.pressure.original[1] + bboxes.pressure.size[1] / 4,
      },
    },
    "pressure-state": {
      source: {
        x: bboxes.pressure.original[0] + bboxes.pressure.size[0],
        y: bboxes.pressure.original[1] + bboxes.pressure.size[1] / 4,
      },
      target: {
        x: bboxes.state.original[0] + (bboxes.state.size[0] * 1) / 4,
        y: bboxes.state.original[1],
      },
    },
    "state-impact": {
      source: {
        x: bboxes.state.original[0] + (bboxes.state.size[0] * 3) / 4,
        y: bboxes.state.original[1] + bboxes.state.size[1],
      },
      target: {
        x: bboxes.impact.original[0] + bboxes.impact.size[0],
        y: bboxes.impact.original[1] + (bboxes.impact.size[1] * 2) / 3,
      },
    },
    "impact-response": {
      source: {
        x: bboxes.impact.original[0],
        y: bboxes.impact.original[1] + bboxes.impact.size[1] / 2,
      },
      target: {
        x: bboxes.response.original[0] + bboxes.response.size[0],
        y: bboxes.response.original[1] + bboxes.response.size[1] / 2,
      },
    },
    "response-driver": {
      source: {
        x: bboxes.response.original[0],
        y: bboxes.response.original[1] + bboxes.response.size[1] / 2,
      },
      target: {
        x: bboxes.driver.original[0] + bboxes.driver.size[0] / 4,
        y: bboxes.driver.original[1] + bboxes.driver.size[1],
      },
    },
    "driver-impact": {
      source: {
        x: bboxes.driver.original[0] + bboxes.driver.size[0],
        y: bboxes.driver.original[1] + bboxes.driver.size[1] / 2,
      },
      target: {
        x: bboxes.impact.original[0] + bboxes.impact.size[0] * 0.3,
        y: bboxes.impact.original[1],
      },
    },
    "pressure-impact": {
      source: {
        x: bboxes.pressure.original[0] + bboxes.pressure.size[0] / 2,
        y: bboxes.pressure.original[1] + bboxes.pressure.size[1],
      },
      target: {
        x: bboxes.impact.original[0] + bboxes.impact.size[0] * 0.3,
        y: bboxes.impact.original[1],
      },
    },
    "state-driver": {
      source: {
        x: bboxes.state.original[0],
        y: bboxes.state.original[1] + bboxes.state.size[1] / 2,
      },
      target: {
        x: bboxes.driver.original[0] + bboxes.driver.size[0],
        y: bboxes.driver.original[1] + bboxes.driver.size[1] / 2,
      },
    },
    "response-pressure": {
      source: {
        x: bboxes.response.original[0] + (bboxes.response.size[0] * 3) / 4,
        y: bboxes.response.original[1],
      },
      target: {
        x: bboxes.pressure.original[0] + bboxes.pressure.size[0] / 2,
        y: bboxes.pressure.original[1] + bboxes.pressure.size[1],
      },
    },
    "response-state": {
      source: {
        x: bboxes.response.original[0] + (bboxes.response.size[0] * 3) / 4,
        y: bboxes.response.original[1],
      },
      target: {
        x: bboxes.state.original[0],
        y: bboxes.state.original[1] + bboxes.state.size[1] / 2,
      },
    },
  };
}
