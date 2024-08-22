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
} from "../types/variables";
import * as Constants from "../constants";
import * as grid_layout from "./grid_layout";
import { toggle } from "@melt-ui/svelte/internal/helpers";

export const OverviewDPSIR = {
  init(svgId: string) {
    // this.clicked_rect = null;
    this.clicked_link = null;
    this.width = 1550;
    this.height = 950;
    this.padding = { top: 10, right: 50, bottom: 10, left: 50 };
    this.bboxes = {
      driver: { center: [58, 90], size: [58, 48] },
      pressure: { center: [160, 50], size: [58, 56] },
      state: { center: [260, 100], size: [38, 21] },
      impact: { center: [220, 185], size: [58, 50] },
      response: { center: [100, 190], size: [58, 53] },
    };
    this.grid_renderer = grid_layout.grid_renderer;
    this.grid_renderer.init(300, 240);
    // console.log(this.grid_renderer.columns, this.grid_renderer.rows);
    this.cellWidth = this.width / this.grid_renderer.columns;
    this.cellHeight = this.height / this.grid_renderer.rows;
    this.svgId = svgId;
    // this.dispatch = d3.dispatch("VarOrLinkSelected");
    this.dispatch = d3.dispatch("VarTypeLinkSelected", "VarTypeHovered");
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
      .attr("height", this.height)
      .on("click", function (e) {
        if (!e.defaultPrevented) {
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
            .classed("not-show-link-not-highlight", false)
            .attr("stroke", "gray")
            .attr("marker-end", "");
          //   self.dispatch.call("VarOrLinkSelected", null, null);
          self.dispatch.call("VarTypeLinkSelected", null, null);
          self.clicked_link = null;
          //   self.clicked_rect = null;
        }
      });

    // this.drawGids(svg, svgId);

    svg.append("g").attr("class", "link_group");
    // .attr("transform", `translate(${padding.left}, ${padding.top})`);
    Constants.var_type_names.forEach((var_type_name) => {
      const var_type_region = svg
        .append("g")
        .attr("class", `${var_type_name}_region`);
      // .attr("transform", `translate(${padding.left}, ${padding.top})`);
      var_type_region.append("g").attr("class", "tag-group");
      var_type_region.append("g").attr("class", "bbox-group");
    });
  },
  on(event, handler) {
    this.dispatch.on(event, handler);
  },
  //   toggleLinks(showLinks: boolean) {
  //     this.showLinks = showLinks;
  //   },
  update_vars(vars: tDPSIR, links: tVisLink[], varTypeColorScale: Function) {
    this.grid_renderer?.reset_global_grid(300, 240);
    // console.log(this.grid_renderer.global_grid)
    this.varTypeColorScale = varTypeColorScale;
    const var_type_names = Constants.var_type_names;
    type VarTypeNames = (typeof var_type_names)[number];

    Object.values(var_type_names).forEach((varType) => {
      //   console.log(varType);
      if (vars?.[varType] && this.bboxes?.[varType]) {
        this.drawVars(vars[varType], this.bboxes[varType]);
      }
    });
    // console.log({links})
    this.drawLinks(links, this.bboxes);
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

  drawLinks(
    links: tVisLink[],
    bboxes: { center: [number, number]; size: [number, number] },
  ) {
    const self = this;
    // let global_grid: string[][] = this.grid_renderer.global_grid;
    let cellWidth: number = self.cellWidth;
    let cellHeight: number = self.cellHeight;
    // const frequencyList = calculateFrequencyList(links); // includes variables frequency and link frequency among all groups

    const mappedLinks = links
      .filter((link) => link.source.var_type !== link.target.var_type)
      .map((link) => {
        const sourceType = link.source.var_type;
        const targetType = link.target.var_type;
        return {
          source: sourceType,
          target: targetType,
          source_center: bboxes[sourceType]?.center || [0, 0],
          target_center: bboxes[targetType]?.center || [0, 0],
          source_size: bboxes[sourceType]?.size || [0, 0],
          target_size: bboxes[targetType]?.size || [0, 0],
        };
      });

    const pairInfo = Object.values(
      mappedLinks.reduce(
        (acc, curr) => {
          const key = `${curr.source}-${curr.target}`;
          if (!acc[key]) {
            acc[key] = {
              ...curr,
              count: 0,
            };
          }
          acc[key].count++;
          return acc;
        },
        {} as Record<string, tLinkObjectOverview>,
      ),
    );

    const svg = d3.select("#" + this.svgId);

    const lineGenerator = (link) => {
      const d3Path = d3.path();

      // Convert all points to SVG coordinates
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

      const givenPoint = grid_layout.gridToSvgCoordinate(
        150,
        120,
        cellWidth,
        cellHeight,
      );

      // Calculate the vector from source to target
      const vectorX = targetPoint.x - sourcePoint.x;
      const vectorY = targetPoint.y - sourcePoint.y;

      // Calculate the length of the vector
      const vectorLength = Math.sqrt(vectorX * vectorX + vectorY * vectorY);

      // Normalize the vector
      const normalizedVectorX = vectorX / vectorLength;
      const normalizedVectorY = vectorY / vectorLength;

      // Calculate the projection of the given point onto the source-target line
      const dotProduct =
        (givenPoint.x - sourcePoint.x) * normalizedVectorX +
        (givenPoint.y - sourcePoint.y) * normalizedVectorY;

      const projectionX = sourcePoint.x + dotProduct * normalizedVectorX;
      const projectionY = sourcePoint.y + dotProduct * normalizedVectorY;

      // Calculate the reflected point (twice the projection minus the given point)
      const reflectedX = 2 * projectionX - givenPoint.x;
      const reflectedY = 2 * projectionY - givenPoint.y;

      // Draw the path
      d3Path.moveTo(sourcePoint.x, sourcePoint.y);
      // d3Path.quadraticCurveTo(
      //     reflectedX,
      //     reflectedY,
      //     targetPoint.x,
      //     targetPoint.y
      // );
      // d3Path.quadraticCurveTo(
      //     givenPoint.x,
      //     givenPoint.y,
      //     targetPoint.x,
      //     targetPoint.y
      // );
      d3Path.lineTo(targetPoint.x, targetPoint.y);

      return d3Path.toString();
    };
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip-content")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgb(249 250 251)")
      .style("width", "170px")
      .style("text-align", "center")
      .style("border-radius", "6px")
      .style("padding", "5px 5px")
      .style("border", "2px solid grey")
      .style("margin-left", "10px")
      .style("font-size", "0.8rem");

    if (svg.select("defs").empty()) {
      svg.append("defs");
    }
    const link_paths = svg
      .select("g.link_group")
      .selectAll(".link")
      .data(pairInfo)
      .join("path")
      .attr("class", "link")
      .attr(
        "id",
        (d: tLinkObjectOverview) => `${d.source}` + "-" + `${d.target}`,
      )
      .attr("d", function (d: tLinkObjectOverview) {
        // console.log(d);
        return lineGenerator(d);
      })
      .attr("cursor", "pointer")
      .attr("fill", "none")
      //   .attr("stroke", (d) => {
      //     const svg = d3.select("#" + self.svgId);
      //     return createOrUpdateGradient(svg, d, this)
      //   })
      .attr("stroke", (d) => {
        return "gray";
      })
      .attr("stroke-width", function (d) {
        const widthSacle = d3
          .scaleLinear()
          .domain([
            Math.min(...Object.values(pairInfo).map((d) => d.count)),
            Math.max(...Object.values(pairInfo).map((d) => d.count)),
          ])
          .range([2, 15]);
        return widthSacle(d.count);
      })
      .on("mouseover", function (event, d) {
        tooltip
          .html(
            `
            <span style="background-color: ${self.varTypeColorScale(d.source)}">${d.source}</span>
            &rarr;
            <span style="background-color: ${self.varTypeColorScale(d.target)}">${d.target}</span>
            : ${d.count}
          `,
          )
          .style("visibility", "visible");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("top", event.pageY - 10 + "px")
          .style("left", event.pageX + 10 + "px");
      })
      .on("mouseout", function () {
        tooltip.style("visibility", "hidden");
      })
      .on("click", function (event, d: tLinkObjectOverview) {
        event.preventDefault();
        self.dispatch.call("VarTypeLinkSelected", null, d);
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
      .select(`.${var_type_name}_region`);

    // group bounding box
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
      .attr("fill", varTypeColorScale(var_type_name))
      .attr("rx", "0.4%")
      .on("mouseover", function () {
        self.dispatch.call("VarTypeHovered", null, var_type_name);

        // apply hovering effect
        d3.select(this).classed("overview-var-type-hover", true);
      })
      .on("mouseout", function () {
        self.dispatch.call("VarTypeHovered", null, undefined);
        d3.select(this).classed("overview-var-type-hover", false);
      });
    //   .attr("stroke", "grey")
    //   .attr("stroke-width", 2)
    //   .attr("opacity", "0.1"); //do not show the bounding box

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
      // .attr("font-family", "Montserrat Alternate")
      .attr("font-style", "italic")
      .attr("font-size", "2.5rem")
      .attr("font-weight", "bold")
      .attr("fill", "#636363");
    //   .attr("stroke", "black")  // Add black stroke
    //   .attr("stroke-width", "2px")  // Adjust stroke width as needed
    //   .attr("paint-order", "stroke")  // Ensures stroke is under the fill
    //   .attr("fill", "white")
    //   .attr("opacity", "0.2");
  },
};

function createOrUpdateGradient(svg, link_data, self) {
  const gradientId = `gradient-${link_data.source}-${link_data.target}`;
  // Attempt to select an existing gradient
  console.log(self.cellWidth, self.cellHeight);
  let gradient = svg.select(`#${gradientId}`);
  // If the gradient does not exist, create it
  if (gradient.empty()) {
    gradient = svg
      .select("defs")
      .append("linearGradient")
      .attr("id", gradientId)
      .attr("gradientUnits", "userSpaceOnUse");

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", self.varTypeColorScale(link_data.source));

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", self.varTypeColorScale(link_data.target));
  }
  const sourcePoint = grid_layout.gridToSvgCoordinate(
    link_data.source_center[0],
    link_data.source_center[1],
    self.cellWidth,
    self.cellHeight,
  );

  const targetPoint = grid_layout.gridToSvgCoordinate(
    link_data.target_center[0],
    link_data.target_center[1],
    self.cellWidth,
    self.cellHeight,
  );
  // Update gradient coordinates
  gradient
    .attr("x1", sourcePoint.x)
    .attr("y1", sourcePoint.y)
    .attr("x2", targetPoint.x)
    .attr("y2", targetPoint.y);

  return `url(#${gradientId})`;
}
