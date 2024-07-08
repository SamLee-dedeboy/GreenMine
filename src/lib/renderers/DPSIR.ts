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
} from "../types/variables";
import * as Constants from "../constants";
import PriorityQueue from "lib/types/priorityQueue";
// import type { tVarTypeDef } from "lib/types";
// import { space } from "postcss/lib/list";
// import { name } from "@melt-ui/svelte";

export const DPSIR = {
  init(svgId: string, utilities: string[], handlers: tUtilityHandlers) {
    // console.log("init");
    this.clicked_rect = null;
    this.clicked_link = null;
    this.width = 1500;
    this.height = 1000;
    this.padding = { top: 10, right: 50, bottom: 10, left: 50 };
    this.rows = 240;
    this.columns = 180;
    this.cellWidth = this.width / this.columns;
    this.cellHeight = this.height / this.rows;
    this.global_rects = [];
    this.global_grid = Array.from({ length: this.columns + 1 }, () =>
      Array(this.rows + 1).fill("0"),
    );
    this.svgId = svgId;
    this.utilities = utilities;
    this.handlers = handlers;
    this.varTypeColorScale = null;
    const self = this;
    const svg = d3
      .select("#" + svgId)
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .attr("width", this.width)
      .attr("height", this.height)
      .on("click", function (e) {
        if (!e.defaultPrevented) {
          // console.log("remove all highlights");
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
            .attr("stroke", "gray")
            .attr("marker-end", "");
          handlers.VarOrLinkSelected(null);
          self.clicked_link = null;
          self.clicked_rect = null;
        }
      });

    // this.drawGids(
    //   svg,
    //   svgId,
    //   this.width,
    //   this.height,
    //   this.cellWidth,
    //   this.cellHeight,
    //   this.columns,
    //   this.rows,
    // );

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

  update_vars(vars: tDPSIR, links: tVisLink[], varTypeColorScale: Function) {
    // console.log("update vars");
    console.log({ links });
    this.varTypeColorScale = varTypeColorScale;
    const var_type_names = Constants.var_type_names;
    type VarTypeNames = (typeof var_type_names)[number];

    let categorizedLinks: Record<VarTypeNames, any[]> = {} as Record<
      VarTypeNames,
      any[]
    >;
    var_type_names.forEach((name) => {
      categorizedLinks[name] = [];
    });
    // Iterate through the links array
    links.forEach((link) => {
      const sourceType = link.source.var_type;
      const targetType = link.target.var_type;

      // Check if source equals target
      if (sourceType === targetType) {
        const filteredLink = { source: link.source, target: link.target };
        switch (sourceType) {
          case "driver":
            categorizedLinks[var_type_names[0]].push(filteredLink);
            break;
          case "pressure":
            categorizedLinks[var_type_names[1]].push(filteredLink);
            break;
          case "state":
            categorizedLinks[var_type_names[2]].push(filteredLink);
            break;
          case "impact":
            categorizedLinks[var_type_names[3]].push(filteredLink);
            break;
          case "response":
            categorizedLinks[var_type_names[4]].push(filteredLink);
            break;
          default:
            // Do nothing for unmatched types
            break;
        }
      }
    });
    console.log({ categorizedLinks });
    const bboxes_sizes: { [key in string]: [number, number] } = {
      [var_type_names[0]]: [68, 64],
      [var_type_names[1]]: [60, 68],
      [var_type_names[2]]: [36, 64],
      [var_type_names[3]]: [84, 68],
      [var_type_names[4]]: [48, 52],
    };

    const bboxes = radialBboxes(
      var_type_names,
      this.columns,
      this.rows,
      bboxes_sizes,
      this.padding,
      this.cellWidth,
      this.cellHeight,
    );
    // console.log({bboxes});
    Object.keys(vars).forEach((key) => {
      this.drawVars(
        vars[key],
        bboxes[key],
        categorizedLinks[key],
        this.global_grid,
        this.cellWidth,
        this.cellHeight,
      );
    });
    this.drawLinks(
      links,
      bboxes,
      this.global_grid,
      this.cellWidth,
      this.cellHeight,
    );
  },
  drawGids(svg, svgId, width, height, cellWidth, cellHeight, columns, rows) {
    console.log(cellWidth, cellHeight);
    // Get the dimensions of the SVG
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

    gridGroup
      .append("circle")
      .attr("cx", gridToSvgCoordinate(90, 120, cellWidth, cellHeight).x)
      .attr("cy", gridToSvgCoordinate(90, 120, cellWidth, cellHeight).y)
      .attr("r", 1)
      .attr("fill", "red");
  },

  //center(gridX,gridY), size(x grids,y grids)
  drawVars(
    vars: tVariableType,
    box_coor: { center: [number, number]; size: [number, number] },
    inLinks,
    global_grid: string[][],
    cellWidth: number,
    cellHeight: number,
  ) {
    const var_type_name = vars.variable_type;
    // const charWidth = 15;
    const rectWidth = 12; //(g)
    // const charHeight = 25;
    const rectangles = Object.values(
      vars.variable_mentions as Record<string, tVariable>,
    )
      .sort((a, b) => b.mentions.length - a.mentions.length) // Sorting in descending order by mentions length
      .map((variable) => {
        const nameLength = variable.variable_name.length;
        return {
          name: variable.variable_name,
          width: rectWidth,
          height: Math.ceil(nameLength / 4) * 6, //(g)
        };
      });

    const self = this;
    const bbox_center = box_coor.center;
    const bboxWidth = box_coor.size[0];
    const bboxHeight = box_coor.size[1];
    const bbox_origin = [
      bbox_center[0] - bboxWidth / 2,
      bbox_center[1] - bboxHeight / 2,
    ];

    //change the grid layout to node placing algo

    // const rectangleCoordinates = matrixLayout(bboxWidth, rectangles, bbox_origin);
    // console.log({ bboxWidth, rectangles, bbox_origin });
    // const rectangleCoordinates = Placing_node(
    //   bboxWidth,
    //   bboxHeight,
    //   rectangles,
    //   bbox_origin,
    //   inLinks
    // );

    const rectangleCoordinates = squareLayout(
      bboxWidth,
      rectangles,
      bbox_origin,
      cellWidth,
      cellHeight,
    );
    console.log({ rectangleCoordinates });
    const rectWithVar = combineData(vars, rectangleCoordinates, global_grid); //return as an object
    console.log({bbox_origin,bboxWidth,bboxHeight})



    //merge all rects info(grid coordinate position and size) to a global var
    rectWithVar.forEach((rect) => {
      self.global_rects.push(rect);
    });
    // console.log({ rectangleCoordinates, rectWithVar });
    // min and max frequency for each group
    let minMentions = Infinity;
    let maxMentions = -Infinity;

    Object.values(vars.variable_mentions).forEach((variable: tVariable) => {
      const length = variable.mentions.length;
      if (length < minMentions) minMentions = length;
      if (length > maxMentions) maxMentions = length;
    });

    this.drawBbox(
      var_type_name,
      bbox_center,
      bboxWidth,
      bboxHeight,
      self.varTypeColorScale,
      cellWidth,
      cellHeight,
    );
    const scaleVarColor = d3
      .scaleLinear()
      .domain([minMentions, maxMentions])
      .range(["#f7f7f7", self.varTypeColorScale(var_type_name)]);

    //draw each variable
    this.drawTags(
      var_type_name,
      rectWithVar,
      scaleVarColor,
      global_grid,
      cellWidth,
      cellHeight,
    );
  },

  drawLinks(
    links: tVisLink[],
    bboxes: { [key: string]: { center: [number, number] } },
    global_grid: string[][],
    cellWidth: number,
    cellHeight: number,
  ) {
    // console.log({global_grid})
    // console.log(global_grid.map(row => row.join(' ')).join('\n'));
    // console.log({global_rects});
    // const frequencyList = calculateFrequencyList(links); // includes variables frequency and link frequency among all groups

    const svg = d3.select("#" + this.svgId);
    const mergedData: (tLinkObject | undefined)[] = links.map((link) => {
      const source_block = document.querySelector(`#${link.source.var_type}`);
      const target_block = document.querySelector(`#${link.target.var_type}`);
      const sourceElement = this.global_rects.find(
        (rect) => rect.variable_name === link.source.variable_name,
      );
      const targetElement = this.global_rects.find(
        (rect) => rect.variable_name === link.target.variable_name,
      );

      if (
        sourceElement === undefined ||
        targetElement === undefined ||
        target_block === undefined ||
        source_block === undefined
      ) {
        return undefined;
      }

      const sourcePosition = {
        var_type: link.source.var_type,
        var_name: link.source.variable_name,
        leftTop: [sourceElement.x, sourceElement.y],
        width: sourceElement.width,
        height: sourceElement.height,
        position: sourceElement.position,
        boundary: sourceElement.boundary,
        newX_source: 0,
        newY_source: 0,
      };

      const targetPosition = {
        var_type: link.target.var_type,
        var_name: link.target.variable_name,
        leftTop: [targetElement.x, targetElement.y],
        width: targetElement.width,
        height: targetElement.height,
        position: targetElement.position,
        boundary: targetElement.boundary,
        newX_target: 0,
        newY_target: 0,
      };

      return {
        source: sourcePosition,
        target: targetPosition,
        frequency: link.frequency,
        mentions: link.mentions,
      };
    });
    const filteredMergeData: tLinkObject[] = mergedData.filter(
      (data) => data !== null,
    ) as tLinkObject[];
    const self = this;

    let linkCounts = {};

    filteredMergeData.forEach((item) => {
      if (item === null) return;

      const sourceVarName = item.source.var_name;
      const targetVarName = item.target.var_name;
      const isInGroup = item.source.var_type === item.target.var_type;

      // Initialize or update the source
      if (!linkCounts[sourceVarName]) {
        linkCounts[sourceVarName] = {
          InGroup_inLinks: 0,
          InGroup_outLinks: 0,
          OutGroup_inLinks: 0,
          OutGroup_outLinks: 0,
          x: item.source.leftTop[0],
          y: item.source.leftTop[1],
          width: item.source.width,
          height: item.source.height,
          boundry: item.source.boundary,
          position: item.source.position,
        };
      }
      // Initialize or update the target
      if (!linkCounts[targetVarName]) {
        linkCounts[targetVarName] = {
          InGroup_inLinks: 0,
          InGroup_outLinks: 0,
          OutGroup_inLinks: 0,
          OutGroup_outLinks: 0,
          x: item.target.leftTop[0],
          y: item.target.leftTop[1],
          width: item.target.width,
          height: item.target.height,
          boundry: item.target.boundary,
          position: item.target.position,
        };
      }
      if (isInGroup) {
        linkCounts[sourceVarName].InGroup_outLinks += 1;
        linkCounts[targetVarName].InGroup_inLinks += 1;
      } else {
        linkCounts[sourceVarName].OutGroup_outLinks += 1;
        linkCounts[targetVarName].OutGroup_inLinks += 1;
      }
    });

    console.log({ linkCounts });
    const points = generatePoints(linkCounts);

    // M: move to, H: horizontal line, V: vertical line
    const lineGenerator = (link, i, bbox_source, bbox_target) => {
      let source_grid, target_grid;

      source_grid = [link.source.newX_source, link.source.newY_source];
      target_grid = [link.target.newX_target, link.target.newY_target];

      let path_points;
      if (link.source.var_type !== link.target.var_type) {
        path_points = pathFinding(link, global_grid, points);
        // console.log(path_points);
      }

      if (path_points) {
        const svgPath = path_points.map((point) =>
          gridToSvgCoordinate(point[0], point[1], cellWidth, cellHeight),
        );

        const d3Path = d3.path();
        d3Path.moveTo(svgPath[0].x, svgPath[0].y);
        for (let i = 1; i < svgPath.length; i++) {
          d3Path.lineTo(svgPath[i].x, svgPath[i].y);
        }

        return d3Path.toString();
      }
    };
    svg
      .select("g.link_group")
      .selectAll(".link")
      .data(filteredMergeData)
      .join("path")
      .attr("class", "link")
      .attr("id", (d) => `${d.source.var_name}` + "-" + `${d.target.var_name}`)
      .attr("d", function (d, i) {
        d.source.newX_source = d.source.leftTop[0];
        d.source.newY_source = d.source.leftTop[1];
        d.target.newX_target = d.target.leftTop[0];
        d.target.newY_target = d.target.leftTop[1];
        // if(  d.source.var_type == "state" && d.target.var_type == "impact"){
        //       console.log(d.source.var_name, d.target.var_name)
        // }
        return lineGenerator(
          d,
          i,
          bboxes[d.source.var_type],
          bboxes[d.target.var_type],
        );
      })
      .attr("cursor", "pointer")
      .attr("fill", "none")
      // .attr("stroke", "url(#grad)")
      // .attr("stroke",d=> scaleColor(d.frequency))
      .attr("stroke", "black")
      .attr("stroke-width", function (d: tLinkObject) {
        // const widthSacle = d3
        //   .scaleLinear()
        //   .domain([
        //     frequencyList.minLinkFrequency,
        //     frequencyList.maxLinkFrequency,
        //   ])
        //   .range([2, 15]);
        // return widthSacle(d.frequency);
        return 1;
      })
      .attr("opacity", (d) => {
        // if(d.source.var_type == "state" && d.target.var_type == "impact"){
        //   return 1;
        // }
        // else{
        //   return 0;
        // }
        return 1;
      })
      .on("mouseover", function (e, d: tLinkObject) {
        d3.select(this).classed("line-hover", true);
        // d3.select(this.parentNode) // this refers to the path element, and parentNode is the SVG or a <g> element containing it
        //   .append("text")
        //   .attr("class", "link-frequency-text") // Add a class for styling if needed
        //   .attr("x", () => e.clientX + 10) // Position the text in the middle of the link
        //   .attr("y", () => e.clientY - 20)
        //   .attr("text-anchor", "middle") // Center the text on its coordinates
        //   .attr("fill", "black") // Set the text color
        //   .text(d.frequency);
      })
      .on("mouseout", function (e, d) {
        d3.select(this).classed("line-hover", false);
        d3.selectAll(".link-frequency-text").remove();
      })
      .on("click", function (e, d: tLinkObject) {
        // console.log(d);
        e.preventDefault();

        const links = d3
          .selectAll("path.link")
          .classed("link-highlight", false)
          .classed("link-not-highlight", true)
          .attr("stroke", "gray")
          .attr("marker-end", "");

        const rects = d3
          .selectAll("rect.box")
          .classed("box-highlight", false)
          .classed("box-not-highlight", true);

        const labels = d3
          .selectAll("text.label")
          .classed("box-label-highlight", false)
          .classed("box-label-not-highlight", true);

        if (self.clicked_link === d) {
          self.clicked_link = null;
          self.handlers.VarOrLinkSelected(null);
        } else {
          self.clicked_link = d;
          self.handlers.VarOrLinkSelected(d);
          d3.select(this)
            .classed("link-highlight", true)
            .classed("link-not-highlight", false)
            .raise()
            .attr("stroke", (d: tLinkObject) => {
              // const svg = d3.select("#" + self.svgId);
              // return createOrUpdateGradient(svg, d, self);
              return self.varTypeColorScale(d.source.var_type);
            })
            // .attr("marker-mid", `url(#${arrowId})`)
            .attr("marker-end", (d: tLinkObject) => {
              const svg = d3.select("#" + self.svgId);
              return createArrow(svg, d, self);
            });

          rects
            .filter(
              (box_data: tRectObject) =>
                box_data.variable_name === d.source.var_name ||
                box_data.variable_name === d.target.var_name,
            )
            .classed("box-highlight", true)
            .classed("box-not-highlight", false)
            .raise();

          labels
            .filter(
              (label_data: tRectObject) =>
                label_data.variable_name === d.source.var_name ||
                label_data.variable_name === d.target.var_name,
            )
            .classed("box-label-highlight", true)
            .classed("box-label-not-highlight", false)
            .raise();
        }
      });
  },

  drawBbox(
    var_type_name: string,
    bbox_center: number[],
    bboxWidth: number,
    bboxHeight: number,
    varTypeColorScale: any,
    cellWidth: number,
    cellHeight: number,
  ) {
    const group = d3
      .select("#" + this.svgId)
      .select(`.${var_type_name}_region`);

    // group bounding box
    // group
    //   .select("g.bbox-group")
    //   .append("rect")
    //   .attr("class", "bbox")
    //   .attr("id", var_type_name)
    //   .attr(
    //     "x",
    //     gridToSvgCoordinate(
    //       bbox_center[0] - bboxWidth / 2,
    //       bbox_center[1] - bboxHeight / 2,
    //       cellWidth,
    //       cellHeight,
    //     ).x,
    //   )
    //   .attr(
    //     "y",
    //     gridToSvgCoordinate(
    //       bbox_center[0] - bboxWidth / 2,
    //       bbox_center[1] - bboxHeight / 2,
    //       cellWidth,
    //       cellHeight,
    //     ).y,
    //   )
    //   .attr("width", bboxWidth * cellWidth)
    //   .attr("height", bboxHeight * cellHeight)
    //   .attr("fill", "none")
    //   .attr("stroke", "grey")
    //   .attr("stroke-width", 2)
    //   .attr("opacity", "0.1"); //do not show the bounding box

    //group name for clicking
    // group
    //   .select("g.bbox-group")
    //   .append("rect")
    //   .attr("class", "bbox-label-container")
    //   .attr("x", bbox_center[0] - ((var_type_name.length + 1) * 25) / 2)
    //   .attr("y", bbox_center[1] - bboxHeight / 2 - 38)
    //   .attr("width", (var_type_name.length + 1) * 25)
    //   .attr("height", 45)
    //   .attr("fill", varTypeColorScale(var_type_name))
    //   .attr("rx", "0.5%")
    //   .attr("opacity", 0)
    //   .attr("cursor", "pointer")
    //   .on("mouseover", function () {
    //     d3.select(this).classed("bbox-label-hover", true);
    //   })
    //   .on("mouseout", function () {
    //     d3.select(this).classed("bbox-label-hover", false);
    //   })
    //   .on("click", function (e) {
    //     const utility_group = d3
    //       .select(this.parentNode)
    //       .select("g.utility-group");
    //     const shown = utility_group.attr("opacity") === 1;
    //     utility_group
    //       .transition()
    //       .duration(300)
    //       .attr("opacity", shown ? 0 : 1)
    //       .attr("pointer-events", shown ? "none" : "all");
    //     console.log("click on bbox");
    //   });

    //group name
    group
      .select("g.bbox-group")
      .append("text")
      .attr("class", "bbox-label")
      .attr("id", `${var_type_name}` + `_label`)
      .attr(
        "x",
        gridToSvgCoordinate(
          bbox_center[0],
          bbox_center[1] - bboxHeight / 2 - 2,
          cellWidth,
          cellHeight,
        ).x,
      )
      .attr(
        "y",
        gridToSvgCoordinate(
          bbox_center[0],
          bbox_center[1] - bboxHeight / 2 - 2,
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
      .attr("fill", "#636363")
      .attr("fill", varTypeColorScale(var_type_name))
      .attr("opacity", "0.8");

    //group center
    group
      .append("circle")
      .attr(
        "cx",
        gridToSvgCoordinate(
          bbox_center[0],
          bbox_center[1],
          cellWidth,
          cellHeight,
        ).x,
      )
      .attr(
        "cy",
        gridToSvgCoordinate(
          bbox_center[0],
          bbox_center[1],
          cellWidth,
          cellHeight,
        ).y,
      )
      .attr("r", 1)
      .attr("fill", "red");

    //group icon
    group
      .select("g.bbox-group")
      .append("image")
      .attr("xlink:href", function () {
        return var_type_name === "driver"
          ? "social.svg"
          : var_type_name === "pressure"
            ? ""
            : "ecological.svg";
      })
      .attr(
        "x",
        gridToSvgCoordinate(
          bbox_center[0] + var_type_name.length / 2 + 8,
          bbox_center[1] - bboxHeight / 2 - 7,
          cellWidth,
          cellHeight,
        ).x,
      )
      .attr(
        "y",
        gridToSvgCoordinate(
          bbox_center[0] + var_type_name.length / 2 + 8,
          bbox_center[1] - bboxHeight / 2 - 7,
          cellWidth,
          cellHeight,
        ).y,
      )
      .attr("width", 30)
      .attr("height", 30);

    // this.drawUtilities(
    //   var_type_name,
    //   bbox_center,
    //   bboxWidth,
    //   bboxHeight,
    //   this.utilities,
    // );
  },
  drawUtilities(
    var_type_name: string,
    bbox_center: number[],
    bboxWidth: number,
    bboxHeight: number,
    utilities: string[],
  ) {
    // console.log("draw utilities", utilities);
    const group = d3
      .select("#" + this.svgId)
      .select(`.${var_type_name}_region`);
    const utility_group = group
      .select("g.bbox-group")
      .append("g")
      .attr("class", "utility-group")
      .attr("opacity", 0)
      .attr("pointer-events", "none");
    const utility_group_origin = [
      bbox_center[0] + (var_type_name.length + 1) * 12,
      bbox_center[1] - bboxHeight / 2 - 40,
    ];
    const self = this;
    const width = Math.max(...utilities.map((d) => d.length)) * 12;
    utility_group
      .selectAll("g.utility")
      .data(utilities)
      .join("g")
      .attr("class", "utility")
      .attr(
        "transform",
        `translate(${utility_group_origin[0]}, ${utility_group_origin[1]})`,
      )
      .each(function (d: string, i) {
        const utility_container = d3.select(this);
        utility_container.selectAll("*").remove();
        const height = 20;
        const y_offset = 1;
        const utility_attrs = {
          parent: utility_container,
          class_name: d,
          activated_color: "rgb(187 247 208)",
          deactivated_color: "white",
          activated_text_color: "black",
          deactivated_text_color: "#aaaaaa",
          text: d,
          x: 5,
          y: 5 + i * (height + y_offset),
          width: width,
          height: height,
          onClick: () => {
            d3.select(this.parentNode)
              .attr("opacity", 0)
              .attr("pointer-events", "none");
            self.handlers[d](var_type_name);
          },
        };
        add_utility_button(utility_attrs);
      });
  },

  drawTags(
    var_type_name: string,
    rectWithVar: tRectObject[],
    scaleVarColor: any,
    global_grid: string[][],
    cellWidth: number,
    cellHeight: number,
  ) {
    const self = this;
    const group = d3
      .select("#" + this.svgId)
      .select(`.${var_type_name}_region`);
    console.log({ rectWithVar });
    // mark rect with "*" in the grid
    markOccupiedGrid(global_grid, rectWithVar,"*");
    

    console.log(global_grid);

    group
      .select("g.tag-group")
      .selectAll("g.tag")
      .data(rectWithVar)
      .join("g")
      .attr("class", "tag")
      .each(function (d: tRectObject) {
        const tag = d3.select(this);
        tag.selectAll("*").remove();
        tag
          .append("rect")
          .attr("class", "box")
          .attr("id", d.variable_name)
          .attr("x", gridToSvgCoordinate(d.x, d.y, cellWidth, cellHeight).x)
          .attr("y", gridToSvgCoordinate(d.x, d.y, cellWidth, cellHeight).y)
          .attr("width", d.width * cellWidth)
          .attr("height", d.height * cellHeight)
          .attr("stroke", "#cdcdcd")
          .attr("stroke-width", "1px")
          .attr(
            "fill",
            d.frequency !== 0 ? scaleVarColor(d.frequency) : "#cdcdcd",
            // "none"
          )
          .attr("opacity", "0.8")
          .attr("cursor", "pointer")
          .on("mouseover", function () {
            d3.select(this).classed("box-hover", true);
            d3.select(this.parentNode).raise();
            d3.select(this.parentNode).select(".tooltip").attr("opacity", 1);
          })
          .on("mouseout", function () {
            d3.select(this).classed("box-hover", false);
            d3.select(this.parentNode).select(".tooltip").attr("opacity", 0);
          })
          .on("click", function (e) {
            e.preventDefault();
            d3.selectAll("rect.box")
              .transition()
              .duration(250)
              .attr("transform", ""); // Reset transformation on all boxes to remove any previous magnification

            const rects = d3
              .selectAll("rect.box")
              .classed("box-highlight", false)
              .classed("box-not-highlight", true);
            const labels = d3
              .selectAll("text.label")
              .classed("box-label-highlight", false)
              .classed("box-label-not-highlight", true);

            // style changing after select a variable, including the links and labels
            if (self.clicked_rect === d) {
              self.clicked_rect = null;
              self.handlers.VarOrLinkSelected(null);
              d3.selectAll(".link")
                .classed("link-highlight", false)
                .classed("link-not-highlight", false);
              rects
                .classed("box-highlight", false)
                .classed("box-not-highlight", false);
              labels
                .classed("box-label-highlight", false)
                .classed("box-label-not-highlight", false);
            } else {
              self.clicked_rect = d;

              self.handlers.VarOrLinkSelected(d);
              d3.select(this)
                .classed("box-highlight", true)
                .classed("box-not-highlight", false)
                .raise()
                .transition()
                .duration(250);
              // .attr("transform", function() {
              //     const bbox = this.getBBox(); // Get bounding box of the element, which gives you its height, width, and position
              //     const scale = 1.2; // Define your scale factor
              //     // Calculate the center of the box
              //     const centerX = bbox.x + bbox.width / 2;
              //     const centerY = bbox.y + bbox.height / 2;
              //     // Scale about the center of the box
              //     return `translate(${centerX * (1 - scale)}, ${centerY * (1 - scale)}) scale(${scale})`;
              // });
              labels
                .filter(
                  (label_data: tRectObject) =>
                    d.variable_name === label_data.variable_name,
                )
                .classed("box-label-highlight", true)
                .classed("box-label-not-highlight", false)
                .raise();

              d3.selectAll(".link")
                .classed("link-highlight", false)
                .classed("link-not-highlight", true)
                .attr("stroke", "gray")
                .attr("marker-end", "")
                .filter(
                  (link_data: tLinkObject) =>
                    link_data.source.var_name === d.variable_name ||
                    link_data.target.var_name === d.variable_name,
                )
                .classed("link-highlight", true)
                .classed("link-not-highlight", false)
                .raise()
                .attr("stroke", (link_data: tLinkObject) => {
                  // const svg = d3.select("#" + self.svgId);
                  // return createOrUpdateGradient(svg, link_data, self);
                  return self.varTypeColorScale(link_data.source.var_type);
                })
                .attr("marker-end", (d: tLinkObject) => {
                  const svg = d3.select("#" + self.svgId);
                  return createArrow(svg, d, self);
                });
            }
          });

        const tagWidth = d.width * cellWidth * 0.7;
        tag
          .append("text")
          .attr("class", "label")
          .text(d.variable_name)
          .attr("class", "label")
          .attr(
            "x",
            gridToSvgCoordinate(
              d.x + d.width / 2,
              d.y + d.height / 2,
              cellWidth,
              cellHeight,
            ).x,
          ) // slightly move text to the left within the rectangle
          .attr(
            "y",
            gridToSvgCoordinate(
              d.x + d.width / 2,
              d.y + d.height / 2,
              cellWidth,
              cellHeight,
            ).y,
          )
          .attr("fill", "black")
          .attr("font-size", "0.9rem")
          // .attr("font-weight", "bold")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("pointer-events", "none")
          .call(wrap, tagWidth);

        // tag
        // .append("circle")
        // .attr("cx", d=>{

        //   return gridToSvgCoordinate(d.x,d.y).x
        // })
        // .attr("cy", d=>{
        //   return gridToSvgCoordinate(d.x,d.y).y
        // })
        // .attr("r", 1)
        // .attr("fill", "red")

        const icon_size = 20;
        if (var_type_name === "pressure") {
          tag
            .append("image")
            .attr(
              "xlink:href",
              d.factor_type === "social" ? "social.svg" : "ecological.svg",
            )
            .attr(
              "x",
              gridToSvgCoordinate(
                d.x + d.width - 2.4,
                d.y,
                cellWidth,
                cellHeight,
              ).x,
            )
            .attr(
              "y",
              gridToSvgCoordinate(
                d.x + d.width - 2.4,
                d.y,
                cellWidth,
                cellHeight,
              ).y,
            )
            .attr("width", icon_size) // icon width
            .attr("height", icon_size) // icon height
            .attr("pointer-events", "none");
        }

        // tooltip
        // const charWidth = 10;
        // const charHeight = 25;
        // const tooltip_width = d.width * 1.5;
        // const tooltip_height =
        //   (Math.round((d.definition.length * charWidth) / tooltip_width) + 1) *
        //   charHeight;
        // const tooltip = tag
        //   .append("g")
        //   .attr("class", "tooltip")
        //   .attr("opacity", 0)
        //   .attr("pointer-events", "none");
        // tooltip
        //   .append("rect")
        //   .attr("class", "tooltip-box")
        //   .attr("x", d.x + d.width)
        //   .attr("y", d.y)
        //   .attr("width", tooltip_width)
        //   .attr("height", tooltip_height)
        //   .attr("fill", "white")
        //   .attr("stroke", "black")
        //   .attr("stroke-width", 1)
        //   .attr("rx", 5);
        // tooltip
        //   .append("text")
        //   .attr("class", "tooltip-text")
        //   .attr("x", d.x + d.width + tooltip_width / 2)
        //   .attr("y", d.y + tooltip_height / 2)
        //   .text(d.definition)
        //   .attr("font-size", "0.8rem")
        //   .attr("fill", "black")
        //   .attr("pointer-events", "none")
        //   .attr("text-anchor", "middle")
        //   .attr("dominant-baseline", "middle")
        //   .call(wrap, tooltip_width - 10);
      });
  },
};

function radialBboxes(
  groups: string[],
  columns: number,
  rows: number,
  bboxesSizes: { [key: string]: [number, number] },
  padding: { top: number; right: number; bottom: number; left: number },
  cellWidth: number,
  cellHeight: number,
) {
  // change to svg size
  // console.log(this.padding)
  const width = cellWidth * columns - padding.left - padding.right;
  const height = cellHeight * rows - padding.top - padding.bottom;
  const offset = (234 * Math.PI) / 180;
  //angles adjust the position of the components
  const angles = [
    offset - (Math.PI * 2 * 1) / 40,
    offset + (Math.PI * 2 * 1) / 5 + (Math.PI * 2 * 1) / 41,
    offset + (Math.PI * 2 * 2) / 5.6,
    offset + (Math.PI * 2 * 3) / 5.1 - (Math.PI * 2 * 1) / 60,
    offset + (Math.PI * 2 * 4) / 4.75,
  ];
  const scaleFactors = [
    1.4, // D
    1.4, // P
    1.0, // S
    1.3, // I
    0.8, // R
  ];
  let bboxes: {
    [key: string]: { center: [number, number]; size: [number, number] };
  } = {};
  groups.forEach((group, index) => {
    const angle = angles[index];
    const a = width / 2 - (bboxesSizes[group][0] * cellWidth) / 2; //change to svg size
    const b = height / 2.5 - (bboxesSizes[group][1] * cellHeight) / 2; //change to svg size
    const r =
      ((a * b) /
        Math.sqrt(
          Math.pow(b * Math.cos(angle), 2) + Math.pow(a * Math.sin(angle), 2),
        )) *
      scaleFactors[index];
    const pre_x = width / 2 + r * Math.cos(angle);
    const pre_y = height / 2 + r * Math.sin(angle);

    // Calculate the new center to align with the grid
    const { x, y } = svgToGridCoordinate(pre_x, pre_y, cellWidth, cellHeight);

    bboxes[group] = {
      center: [x, y],
      size: bboxesSizes[group],
    };
  });
  return bboxes;
}

function gridToSvgCoordinate(
  gridX: number,
  gridY: number,
  cellWidth: number,
  cellHeight: number,
) {
  const svgX = gridX * cellWidth;
  const svgY = gridY * cellHeight;
  return { x: svgX, y: svgY };
}

//top left most as (0,0)
function svgToGridCoordinate(
  svgX: number,
  svgY: number,
  cellWidth: number,
  cellHeight: number,
) {
  const gridX = Math.ceil(svgX / cellWidth) + 1;
  const gridY = Math.ceil(svgY / cellHeight) + 1;
  return { x: gridX, y: gridY };
}

// Function to mark the occupied grid points
function markOccupiedGrid(
  global_grid: string[][],
  rects: { x: number; y: number; width: number; height: number }[],
  symbol,
) {
  rects.forEach((rect) => {
    const startX = rect.x;
    const startY = rect.y;
    const endX = startX + rect.width;
    const endY = startY + rect.height;

    // x:columns, y:rows
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
          if(global_grid[x][y] == "0" || global_grid[x][y] !== "*"){
              global_grid[x][y] = symbol; 
          }else{
            continue; // if the grid is already marked, skip
          }
      }
    }
  });
}
// function matrixLayout(
//   regionWidth: number,
//   rectangles: tRectangle[],
//   bbox_origin: number[],
// ): [number, number, number, number, string][] {
//   let padding = 10;
//   let xStart = padding; // Start x-coordinate, will be updated for center alignment
//   let y = padding;
//   let rowMaxHeight = 0;

//   const rectangleCoordinates: [number, number, number, number, string][] = [];

//   // Function to reset for a new row
//   function newRow(): void {
//     y += rowMaxHeight + padding;
//     rowMaxHeight = 0;
//   }

//   // Function to calculate row width (helper function)
//   function calculateRowWidth(rectangles: tRectangle[]): number {
//     return (
//       rectangles.reduce((acc, rect) => acc + rect.width + padding, 0) - padding
//     ); // Minus padding to adjust for extra padding at the end
//   }

//   // Temp array to hold rectangles for current row, to calculate total width for centering
//   let tempRowRectangles: tRectangle[] = [];

//   rectangles.forEach((rect) => {
//     if (
//       xStart + calculateRowWidth(tempRowRectangles) + rect.width + padding >
//       regionWidth
//     ) {
//       // Center align previous row's rectangles before starting a new row
//       let rowWidth = calculateRowWidth(tempRowRectangles);
//       let startX = (regionWidth - rowWidth) / 2 + bbox_origin[0]; // Calculate starting X for center alignment

//       // Assign coordinates with center alignment
//       tempRowRectangles.forEach((tempRect) => {
//         rectangleCoordinates.push([
//           startX,
//           y + bbox_origin[1],
//           tempRect.width,
//           tempRect.height,
//           tempRect.name,
//         ]);
//         startX += tempRect.width + padding;
//       });

//       // Reset for new row
//       newRow();
//       tempRowRectangles = [];
//       xStart = padding;
//     }

//     // Add current rectangle to temp row for future processing
//     tempRowRectangles.push(rect);
//     rowMaxHeight = Math.max(rowMaxHeight, rect.height);
//   });

//   // Process the last row, if there are any rectangles left
//   if (tempRowRectangles.length > 0) {
//     let rowWidth = calculateRowWidth(tempRowRectangles);
//     let startX = (regionWidth - rowWidth) / 2 + bbox_origin[0]; // Center align

//     tempRowRectangles.forEach((tempRect) => {
//       rectangleCoordinates.push([
//         startX,
//         y + bbox_origin[1],
//         tempRect.width,
//         tempRect.height,
//         tempRect.name,
//       ]);
//       startX += tempRect.width + padding;
//     });
//   }

//   return rectangleCoordinates;
// }

// layout should be like this:
//   ---
//  -   -
//  -   -
//   ---
function squareLayout(
  regionWidth: number,
  rectangles: tRectangle[],
  bbox_origin: number[],
  cellWidth: number,
  cellHeight: number,
) {
  // console.log({ regionWidth, rectangles, bbox_origin });
  console.log({ rectangles });
  // assuming rectangles has the same width
  const rect_width = cellWidth * rectangles[0].width;
  // const rect_height = rectangles[0].height;
  const max_rect_per_row = Math.floor(regionWidth / rectangles[0].width);
  // const space_between_rectangles = (regionWidth - max_rect_per_row * rect_width) / (max_rect_per_row - 1)
  const space_between_rectangles = 4 * cellWidth;
  const y_offset = 6 * cellHeight;
  // return value
  let rectangleCoordinates: [number, number, number, number, string, string][] =
    [];

  // first row
  const first_row_rect_number = Math.max(1, max_rect_per_row - 2);
  const first_row_offset_left =
    (cellWidth * regionWidth -
      (first_row_rect_number * rect_width +
        (first_row_rect_number - 1) * space_between_rectangles)) /
    2;
  // console.log({
  //   rectangles,
  //   regionWidth,
  //   rect_width,
  //   max_rect_per_row,
  //   space_between_rectangles,
  //   first_row_offset_left,
  // });
  for (let i = 0; i < first_row_rect_number; i++) {
    let x =
      (bbox_origin[0] - 1) * cellWidth +
      first_row_offset_left +
      i * (rect_width + space_between_rectangles);
    let y = bbox_origin[1] * cellHeight;
    let Grid = svgToGridCoordinate(x, y, cellWidth, cellHeight);

    rectangleCoordinates.push([
      Grid.x,
      Grid.y,
      rectangles[i].width,
      rectangles[i].height,
      rectangles[i].name,
      "top", // top row
    ]);
  }
  // middle rows
  const middle_row_number =
    rectangles.length % 2 === 0
      ? (rectangles.length - first_row_rect_number * 2) / 2
      : (rectangles.length - first_row_rect_number * 2 - 1) / 2;
  let last_row_max_height = Math.max(
    ...rectangles
      .slice(0, first_row_rect_number)
      .map((rect) => cellHeight * rect.height),
  );
  let accumulative_y_offset = y_offset;
  for (let i = 0; i < middle_row_number; i++) {
    let x1 = (bbox_origin[0] - 1) * cellWidth;
    let y1 =
      bbox_origin[1] * cellHeight + accumulative_y_offset + last_row_max_height;

    let Grid1 = svgToGridCoordinate(x1, y1, cellWidth, cellHeight);

    let x2 =
      (bbox_origin[0] - 1) * cellWidth + cellWidth * regionWidth - rect_width;
    let y2 =
      bbox_origin[1] * cellHeight + accumulative_y_offset + last_row_max_height;
    let Grid2 = svgToGridCoordinate(x2, y2, cellWidth, cellHeight);

    rectangleCoordinates.push([
      Grid1.x,
      Grid1.y,
      rectangles[i].width,
      rectangles[2 * i + first_row_rect_number].height,
      rectangles[2 * i + first_row_rect_number].name,
      "left",
    ]);
    rectangleCoordinates.push([
      Grid2.x,
      Grid2.y,
      rectangles[i].width,
      rectangles[2 * i + 1 + first_row_rect_number].height,
      rectangles[2 * i + 1 + first_row_rect_number].name,
      "right",
    ]);
    accumulative_y_offset += last_row_max_height + y_offset;
    last_row_max_height = Math.max(
      cellHeight * rectangles[i + first_row_rect_number].height,
      cellHeight * rectangles[2 * i + 1 + first_row_rect_number].height,
    );
  }
  accumulative_y_offset += last_row_max_height + y_offset;
  // last row
  const last_row_rect_number =
    rectangles.length - first_row_rect_number - middle_row_number * 2;
  const last_row_offset_left =
    (cellWidth * regionWidth -
      (last_row_rect_number * rect_width +
        (last_row_rect_number - 1) * space_between_rectangles)) /
    2;
  for (let i = 0; i < last_row_rect_number; i++) {
    let x =
      (bbox_origin[0] - 1) * cellWidth +
      last_row_offset_left +
      i * (rect_width + space_between_rectangles);
    let y = bbox_origin[1] * cellHeight + accumulative_y_offset;
    let Grid = svgToGridCoordinate(x, y, cellWidth, cellHeight);

    rectangleCoordinates.push([
      Grid.x,
      Grid.y,
      rectangles[i].width,
      rectangles[i + first_row_rect_number + middle_row_number * 2].height,
      rectangles[i + first_row_rect_number + middle_row_number * 2].name,
      "bottom",
    ]);
  }
  return rectangleCoordinates;
}

function combineData(
  vars: tVariableType,
  rectangles: [number, number, number, number, string, string][],
  global_grid: string[][],
): tRectObject[] {
  const allX = rectangles.map((rect) => rect[0]);
  const allY = rectangles.map((rect) => rect[1]);
  const allYPlusHeight = rectangles.map((rect) => rect[1] + rect[3]);

  const x_value = Array.from(new Set(allX)).sort((a, b) => a - b);
  const min_x = (vars.variable_type === "response") ? x_value[2] : x_value[1]; // if var type is response, choose the third min value
  const max_x = Math.max(...allX);
  const min_y = Math.min(...allYPlusHeight);
  const max_y = Math.max(...allY);
  console.log("combine data")
  // mark boundary for outGroup links with "-" in the grid
  let boundary_arr: { x: number; y: number; width: number; height: number }[] = []
  boundary_arr.push({
    x: min_x+1,
    y: min_y+1,
    width: max_x - min_x -1,
    height: max_y - min_y-1
  });
  markOccupiedGrid(global_grid, boundary_arr,"-");
  return rectangles.map((rect) => {
    let [x, y, width, height, variable_name, position] = rect;
    const variable = vars.variable_mentions[variable_name];
    const mentions = variable?.mentions || [];
    const factor_type = variable?.factor_type;
    const definition = variable?.definition;
    const frequency = mentions.length;
    const boundary = { min_x, max_x, min_y, max_y };
    return {
      x,
      y,
      width,
      height,
      variable_name,
      position,
      mentions,
      factor_type,
      frequency,
      definition,
      boundary,
    };
  });
}

function createOrUpdateGradient(svg, link_data: tLinkObject, self) {
  const gradientId = `gradient-${link_data.source.var_name}-${link_data.target.var_name}`;

  // Attempt to select an existing gradient
  let gradient = svg.select(`#${gradientId}`);

  // If the gradient does not exist, create it
  if (gradient.empty()) {
    // console.log("Creating gradient", gradientId);
    gradient = svg
      .select("defs")
      .append("linearGradient")
      .attr("id", gradientId)
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", link_data.source.newX_source)
      .attr("y1", link_data.source.newY_source)
      .attr("x2", link_data.target.newX_target)
      .attr("y2", link_data.target.newY_target)
      .selectAll("stop")
      .data([
        {
          offset: "0%",
          color: self.varTypeColorScale(link_data.source.var_type),
        },
        {
          offset: "100%",
          color: self.varTypeColorScale(link_data.target.var_type),
        },
      ])
      .enter()
      .append("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);
  }

  return `url(#${gradientId})`;
}

function createArrow(svg, d: tLinkObject, self) {
  const arrowId = `arrow-${d.source.var_name}-${d.target.var_name}`;
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
      .attr("fill", self.varTypeColorScale(d.target.var_type));
    // .attr('fill', 'gray')
  }

  return `url(#${arrowId})`;
}

// includes variables frequency and link frequency among all groups
function calculateFrequencyList(new_links: tVisLink[]) {
  // let { minLength, maxLength } = variables.reduce((result, item) => {
  //     if (item.variable_mentions) {
  //     Object.values(item.variable_mentions).forEach((variable:any) => {
  //         if (variable.mentions) {
  //         const mentionsLength = variable.mentions.length;
  //         result.minLength = Math.min(result.minLength, mentionsLength);
  //         result.maxLength = Math.max(result.maxLength, mentionsLength);
  //         }
  //     });
  //     }
  //     return result;
  // }, { minLength: Infinity, maxLength: -Infinity });

  const maxLinkFrequency = new_links.reduce(
    (max, link) => Math.max(max, link.frequency),
    0,
  );
  const minLinkFrequency = new_links.reduce(
    (min, link) => Math.min(min, link.frequency),
    Infinity,
  );

  const frequencyList = {
    // minLength: minLength,
    // maxLength: maxLength,
    minLinkFrequency: minLinkFrequency,
    maxLinkFrequency: maxLinkFrequency,
  };

  return frequencyList;
}

// text longer than `width` will be in next line
function wrap(text, width) {
  text.each(function (d, i) {
    var text = d3.select(this),
      // words = text.text().split(/\s+/).reverse(),
      words = text.text().split("").reverse(),
      word,
      line: any[] = [],
      lineNumber = 0,
      lineHeight = 1.1, // ems
      x = text.attr("x"),
      y = text.attr("y"),
      dy = 0, //parseFloat(text.attr("dy")),
      tspan = text
        .text(null)
        .append("tspan")
        .attr("x", x)
        .attr("y", y)
        .attr("dy", dy + "em")
        .attr("text-anchor", "bottom")
        .attr("dominant-baseline", "central");
    while ((word = words.pop())) {
      line.push(word);
      tspan.text(line.join(""));
      if (tspan.node()!.getComputedTextLength() > width && line.length > 1) {
        line.pop();
        tspan.text(line.join(""));
        line = [word];
        tspan = text
          .append("tspan")
          .attr("x", x)
          .attr("y", y)
          .attr("dy", ++lineNumber * lineHeight + dy + "em")
          .attr("dominant-baseline", "central")
          .text(word);
      }
    }
    const line_num = text.selectAll("tspan").nodes().length;
    const em_to_px = 16;
    text
      .selectAll("tspan")
      .attr("y", +y - (em_to_px / 2) * lineHeight * (line_num - 1));
  });
}

function add_utility_button({
  parent,
  class_name,
  activated_color,
  deactivated_color,
  activated_text_color,
  deactivated_text_color,
  text,
  x,
  y,
  width,
  height,
  onClick,
  stateless = true,
}) {
  const utility_button = parent.append("g").attr("class", class_name);
  const animation_scale_factor = 1.1;
  utility_button
    .append("rect")
    .classed("utility-button", true)
    .attr("x", x)
    .attr("y", y)
    .attr("width", width)
    .attr("height", height)
    .attr("fill", deactivated_color)
    .attr("rx", "0.2%")
    .attr("stroke", "gray")
    .attr("cursor", "pointer")
    .on("mouseover", function () {
      d3.select(this).attr("stroke-width", 2);
      if (stateless) return;
      const activated = d3.select(this).attr("fill") === activated_color;
      d3.select(this).attr("fill", activated ? activated_color : "lightgray");
    })
    .on("mouseout", function () {
      d3.select(this)
        .attr("stroke-width", 1)
        .attr("fill", () => {
          if (stateless) return deactivated_color;
          const activated = d3.select(this).attr("fill") === activated_color;
          return activated ? activated_color : deactivated_color;
        });
    })
    .on("click", function () {
      onClick();
      const button = d3.select(this);
      const activated = button.attr("fill") === activated_color;
      button.attr("fill", activated ? deactivated_color : activated_color);
      button
        .transition()
        .duration(200)
        .attr("x", function () {
          return x - (width * (animation_scale_factor - 1)) / 2;
        })
        .attr("y", function () {
          return y - (height * (animation_scale_factor - 1)) / 2;
        })
        .attr("width", function () {
          return width * animation_scale_factor;
        })
        .attr("height", function () {
          return height * animation_scale_factor;
        })
        .transition()
        .duration(100)
        .attr("x", x)
        .attr("y", y)
        .attr("width", width)
        .attr("height", height)
        .on("end", () => {
          // console.log({ stateless });
          if (stateless) button.attr("fill", deactivated_color);
        });
      if (!stateless) {
        d3.select(this.parentNode)
          .select("text")
          .attr(
            "fill",
            activated ? deactivated_text_color : activated_text_color,
          );
      }
    });
  utility_button
    .append("text")
    .attr("x", x + width / 2)
    .attr("y", y + height / 2)
    .attr("pointer-events", "none")
    .text(text)
    .attr("fill", stateless ? activated_text_color : deactivated_text_color)
    .attr("dominant-baseline", "middle")
    .attr("text-anchor", "middle");
}

function pathFinding(link, grid: string[][], points) {
  // console.log("dijkstra", start, goal);
  class Cell {
    parent_i: number;
    parent_j: number;
    f: number;
    g: number;
    h: number;

    constructor() {
      this.parent_i = 0;
      this.parent_j = 0;
      this.f = 0;
      this.g = 0;
      this.h = 0;
    }
  }
  let start, goal, inGroup = false;
  if (link.source.var_type == link.target.var_type) {
    start = getNextStartPoint(link.source.var_name, points, true);
    goal = getNextEndPoint(link.target.var_name, points, true);
    inGroup = true;
  } else {
    start = getNextStartPoint(link.source.var_name, points, false);
    goal = getNextEndPoint(link.target.var_name, points, false);
  }

  // console.log({ start, goal });

  const rows = grid[0].length;
  const cols = grid.length;
  let closedList = new Array(cols);
  for (let i = 0; i < cols; i++) {
    closedList[i] = new Array(rows).fill(false);
  }

  // Declare a 2D array of structure to hold the details
  // of that Cell
  let cellDetails = new Array(cols);
  for (let i = 0; i < cols; i++) {
    cellDetails[i] = new Array(rows);
  }

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      cellDetails[i][j] = new Cell();
      // Initialising the parameters of the starting node
      cellDetails[i][j].f = i === start[0] && j === start[1] ? 0 : 2147483647;
      cellDetails[i][j].g = i === start[0] && j === start[1] ? 0 : 2147483647;
      cellDetails[i][j].h = i === start[0] && j === start[1] ? 0 : 2147483647;
      cellDetails[i][j].parent_i = -1;
      cellDetails[i][j].parent_j = -1;
    }
  }

  let openList = new PriorityQueue();
  openList.enqueue(0, [start[0], start[1]]);
  let foundDest = false;

  while (!openList.isEmpty()) {
    let p = openList.dequeue();
    
    let i = p[0];
    let j = p[1];
    // console.log("i,j",i,j)

    closedList[i][j] = true;
    let gNew, hNew, fNew;

    const directions = [
      [0, 1],
      [-1, 0],
      [0, -1],
      [1, 0],
    ];
    //North
    for (const [di, dj] of directions) {
      const ni = i + di; // neighbor i
      const nj = j + dj; // neighbor j
      if (isValid(ni, nj, rows, cols)) {
        if (isDestination(ni, nj, goal)) {
          cellDetails[ni][nj].parent_i = i;
          cellDetails[ni][nj].parent_j = j;
          // console.log("The destination cell is found");
          // console.log(cellDetails)
          let path = tracePath(cellDetails, start, goal, grid);
          foundDest = true;
          return path;
        } else if (!closedList[ni][nj] && isUnBlocked(grid, ni, nj, inGroup)) {
          
          // console.log("if the neighbor not in the closed list and is not blocked")
          if((cellDetails[i][j].parent_i == i && i == ni) || (cellDetails[i][j].parent_j == j && j == nj)){
            gNew = cellDetails[i][j].g + 1.0;
          }
          else{
            gNew = cellDetails[i][j].g + 2; //add the turn cost
          }
          // gNew = cellDetails[i][j].g + 1.0;
          hNew = calculateHValue(ni, nj, goal);
          fNew = gNew + hNew;

          if (
            cellDetails[ni][nj].f == Number.MAX_VALUE ||
            cellDetails[ni][nj].f > fNew
          ) {
            openList.enqueue(fNew, [ni, nj]);
            cellDetails[ni][nj].f = fNew;
            cellDetails[ni][nj].g = gNew;
            cellDetails[ni][nj].h = hNew;
            cellDetails[ni][nj].parent_i = i;
            cellDetails[ni][nj].parent_j = j;
            
          }

           // Handle special case for entering a cell marked with '.'
          // if (grid[ni][nj] === '.') {
          //   for (const [ddi, ddj] of directions) {
          //     const nni = ni + ddi;
          //     const nnj = nj + ddj;
          //     if (isValid(nni, nnj, rows, cols) && grid[nni][nnj] != "*" && grid[nni][nnj] != ".") {
          //       gNew = cellDetails[ni][nj].g + 1.0;
          //       hNew = calculateHValue(nni, nnj, goal);
          //       fNew = gNew + hNew;

          //       if (cellDetails[nni][nnj].f == Number.MAX_VALUE || cellDetails[nni][nnj].f > fNew) {
          //         openList.enqueue(fNew, [nni, nnj]);
          //         cellDetails[nni][nnj].f = fNew;
          //         cellDetails[nni][nnj].g = gNew;
          //         cellDetails[nni][nnj].h = hNew;
          //         cellDetails[nni][nnj].parent_i = ni;
          //         cellDetails[nni][nnj].parent_j = nj;
          //       }
          //     }
          //   }
          // }
        }
      }
    }
  }
  if (foundDest == false) {
    console.log("Failed to find the destination cell");
    console.log(link.source.var_name, link.target.var_name, start, goal);
    return null;
  }
}

function isValid(col, row, rows, cols) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}
function isUnBlocked(grid, col, row, inGroup) {
  if (!inGroup) {
    return grid[col][row] != "*" && grid[col][row] != "-"; //set block for outGroup links
  }
  return grid[col][row] != "*";
}
function isDestination(col, row, dest) {
  return row == dest[1] && col == dest[0];
}
function calculateHValue(row, col, dest) {
  return Math.abs(row - dest[1]) + Math.abs(col - dest[0]);
}
function tracePath(cellDetails, start, goal, grid) {
  // console.log("The Path is ");
  let col = goal[0];
  let row = goal[1];
  // console.log(cellDetails[col][row])
  let Path: [number, number][] = [];
  while (true) {
    // if start is reached, break out of the loop
    if (
      cellDetails[col][row].parent_i == start[0] &&
      cellDetails[col][row].parent_j == start[1]
    )
      break;
    Path.push([col, row]);
    // console.log(Path)
    let temp_col = cellDetails[col][row].parent_i;
    let temp_row = cellDetails[col][row].parent_j;
    console.assert(Math.abs(temp_col - col) + Math.abs(temp_row - row) == 1);
    row = temp_row;
    col = temp_col;
  }
  Path.push([col, row]); //put the cell before start cell in the path
  const col_pre = cellDetails[col][row].parent_i;
  const row_pre = cellDetails[col][row].parent_j;
  Path.push([col_pre, row_pre]);
  Path.push([start[0], start[1]]);
  Path.reverse();
  // console.log(Path)
  Path.forEach(point => {
    if((point[0]!==start[0] || point[1]!==start[1]) && (point[0]!==goal[0] || point[1]!==goal[1])){
      grid[point[0]][point[1]] = ".";
    }
  });
  return Path;
}

function generatePoints(linkCounts) {
  const result: {
    [varName: string]: {
      inGroup_startPoints: [number, number][];
      inGroup_endPoints: [number, number][];
      outGroup_startPoints: [number, number][];
      outGroup_endPoints: [number, number][];
    };
  } = {};

  for (const varName in linkCounts) {
    const {
      InGroup_inLinks,
      InGroup_outLinks,
      OutGroup_inLinks,
      OutGroup_outLinks,
      x,
      y,
      width,
      height,
      position,
    } = linkCounts[varName];

    const inGroup_startPoints: [number, number][] = [];
    const inGroup_endPoints: [number, number][] = [];
    const outGroup_startPoints: [number, number][] = [];
    const outGroup_endPoints: [number, number][] = [];

    // Helper function to add points based on position
    const addPoints = (
      startPoints: [number, number][],
      endPoints: [number, number][],
      outLinks: number,
      inLinks: number,
      primaryStartX: number,
      primaryStartY: number,
      primaryIncrementX: number,
      primaryIncrementY: number,
      primaryMaxX: number,
      primaryMaxY: number,
      secondaryStartX: number,
      secondaryStartY: number,
      secondaryIncrementX: number,
      secondaryIncrementY: number,
      secondaryMaxX: number,
      secondaryMaxY: number,
    ) => {
      let remainingOutLinks = outLinks;
      let usedSecondaryEdge = false;
      let lastPrimaryPoint = [primaryStartX, primaryStartY];
      let lastSecondaryPoint = [secondaryStartX, secondaryStartY];
      // Assign start points for outLinks
      while (remainingOutLinks > 0) {
        for (
          let i = primaryStartX, j = primaryStartY;
          (primaryIncrementX ? i <= primaryMaxX : j <= primaryMaxY) &&
          remainingOutLinks > 0;
          primaryIncrementX
            ? (i += primaryIncrementX)
            : (j += primaryIncrementY)
        ) {
          startPoints.push([i, j]);
          lastPrimaryPoint = [i, j];
          remainingOutLinks--;
        }

        // If primary edge is used up, use secondary edge
        if (remainingOutLinks > 0) {
          usedSecondaryEdge = true;
          for (
            let i = secondaryStartX, j = secondaryStartY;
            (secondaryIncrementX > 0
              ? i <= secondaryMaxX
              : i >= secondaryMaxX) &&
            (secondaryIncrementY > 0
              ? j <= secondaryMaxY
              : j >= secondaryMaxY) &&
            remainingOutLinks > 0;
            secondaryIncrementX
              ? (i += secondaryIncrementX)
              : (j += secondaryIncrementY)
          ) {
            startPoints.push([i, j]);
            lastSecondaryPoint = [i, j];
            remainingOutLinks--;
          }
        }
      }

      // Assign end points for inLinks
      let remainingInLinks = inLinks;
      let i, j;

      if (!usedSecondaryEdge) {
        // Start from the next point of the last point used by start points on the primary edge
        [i, j] = lastPrimaryPoint;
        primaryIncrementX ? (i += primaryIncrementX) : (j += primaryIncrementY);
      }
      while (remainingInLinks > 0) {
        if (!usedSecondaryEdge) {
          for (
            ;
            (primaryIncrementX ? i <= primaryMaxX : j <= primaryMaxY) &&
            remainingInLinks > 0;
            primaryIncrementX
              ? (i += primaryIncrementX)
              : (j += primaryIncrementY)
          ) {
            endPoints.push([i, j]);
            remainingInLinks--;
          }
        }

        if (remainingInLinks > 0) {
          if (!usedSecondaryEdge) {
            i = secondaryStartX;
            j = secondaryStartY;
          } else if(varName == "規劃"){
            i = secondaryMaxX + 1;
            j = secondaryMaxY;
          } else if(varName == "管理和規範"){
            i = primaryMaxX + 1;
            j = secondaryStartY;
          }else {
            [i, j] = lastSecondaryPoint;
            secondaryIncrementX ? (i += secondaryIncrementX) : (j += secondaryIncrementY);
          }

          for (
            ;
            (secondaryIncrementX > 0
              ? i <= secondaryMaxX
              : i >= secondaryMaxX) &&
            (secondaryIncrementY > 0
              ? j <= secondaryMaxY
              : j >= secondaryMaxY) &&
            remainingInLinks > 0;
            secondaryIncrementX
              ? (i += secondaryIncrementX)
              : (j += secondaryIncrementY)
          ) {
            endPoints.push([i, j]);
            remainingInLinks--;
          }
        }
        //those who needs the third edge
        if (remainingInLinks > 0) {
          if (varName == "交通運輸") {
            endPoints.push([primaryStartX - 1, primaryStartY - 1]); //inGroup left edge
          } else if (
            varName == "教育和意識" ||
            varName == "恢復"
          ) {
            for (
              let i = primaryMaxX + 1, j = secondaryStartY;
              (secondaryIncrementY > 0 ? j <= secondaryMaxY : j >= primaryMaxY) &&
              remainingInLinks > 0;
              j += secondaryIncrementY
            ) {
              endPoints.push([i, j]);
              remainingInLinks--;
            }
          } else if (varName == "規劃") {
            for (
              let i = secondaryStartX, j = primaryMaxY;
              i <= secondaryMaxX && remainingInLinks > 0;
              i += secondaryIncrementX
            ) {
              endPoints.push([i, j]);
              remainingInLinks--;
            }
          }
        }
      }
    };

    // Set points for inGroup links
    if (position === "top") {
      addPoints(
        inGroup_startPoints,
        inGroup_endPoints,
        InGroup_outLinks,
        InGroup_inLinks,
        x + 1,
        y + height,
        1,
        0,
        x + width - 1,
        y + height, // Primary edge: bottom
        x + width,
        y + height,
        0,
        -1,
        x + width,
        y, // Secondary edge: right
      );
    } else if (position === "left") {
      addPoints(
        inGroup_startPoints,
        inGroup_endPoints,
        InGroup_outLinks,
        InGroup_inLinks,
        x + width,
        y,
        0,
        1,
        x + width,
        y + height, // Primary edge: right
        x + width - 1,
        y + height,
        -1,
        0,
        x + 1,
        y + height, // Secondary edge: bottom
      );
    } else if (position === "right") {
      addPoints(
        inGroup_startPoints,
        inGroup_endPoints,
        InGroup_outLinks,
        InGroup_inLinks,
        x,
        y,
        0,
        1,
        x,
        y + height, // Primary edge: left
        x + 1,
        y + height,
        1,
        0,
        x + width - 1,
        y + height, // Secondary edge: bottom
      );
    } else if (position === "bottom") {
      addPoints(
        inGroup_startPoints,
        inGroup_endPoints,
        InGroup_outLinks,
        InGroup_inLinks,
        x + 1,
        y,
        1,
        0,
        x + width - 1,
        y, // Primary edge: top
        x + width,
        y,
        0,
        1,
        x + width,
        y + height, // Secondary edge: right
      );
    }

    // Set points for outGroup links
    if (position === "top") {
      addPoints(
        outGroup_startPoints,
        outGroup_endPoints,
        OutGroup_outLinks,
        OutGroup_inLinks,
        x + 1,
        y,
        1,
        0,
        x + width - 1,
        y, // Primary edge: top )(left to right)
        x,
        y,
        0,
        1,
        x,
        y + height, // Secondary edge: left (top to bottom
      );
    } else if (position === "left") {
      addPoints(
        outGroup_startPoints,
        outGroup_endPoints,
        OutGroup_outLinks,
        OutGroup_inLinks,
        x,
        y,
        0,
        1,
        x,
        y + height, // Primary edge: left (top to bottom)
        x + 1,
        y,
        1,
        0,
        x + width - 1,
        y, // Secondary edge: top (left to right)
      );
    } else if (position === "right") {
      addPoints(
        outGroup_startPoints,
        outGroup_endPoints,
        OutGroup_outLinks,
        OutGroup_inLinks,
        x + width,
        y,
        0,
        1,
        x + width,
        y + height, // Primary edge: right (top to bottom)
        x + width - 1,
        y,
        -1,
        0,
        x - 1,
        y, // Secondary edge: top (right to left)
      );
    } else if (position === "bottom") {
      addPoints(
        outGroup_startPoints,
        outGroup_endPoints,
        OutGroup_outLinks,
        OutGroup_inLinks,
        x + 1,
        y + height,
        1,
        0,
        x + width - 1,
        y + height, // Primary edge: bottom (left to right)
        x,
        y + height,
        0,
        -1,
        x,
        y, // Secondary edge: left (bottom to top)
      );
    }

    result[varName] = {
      inGroup_startPoints,
      inGroup_endPoints,
      outGroup_startPoints,
      outGroup_endPoints,
    };
  }

  return result;
}

function getNextStartPoint(varName, points, isSameGroup) {
  const pointData = points[varName];
  // console.log({ pointData });
  if (isSameGroup) {
    return pointData.inGroup_startPoints.shift();
  } else {
    return pointData.outGroup_startPoints.shift();
  }
}

function getNextEndPoint(varName, points, isSameGroup) {
  const pointData = points[varName];
  if (isSameGroup) {
    return pointData.inGroup_endPoints.shift();
  } else {
    return pointData.outGroup_endPoints.shift();
  }
}
