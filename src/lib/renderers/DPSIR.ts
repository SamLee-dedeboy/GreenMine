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
import type { tVarTypeDef } from "lib/types";
import { space } from "postcss/lib/list";
// import socialIcon from '../../public/social.svg';
const width = 1300;
const height = 1000;
const padding = { top: 0, right: 20, bottom: 0, left: 50 };
export const DPSIR = {
  init(svgId: string, utilities: string[], handlers: tUtilityHandlers) {
    console.log("init");
    this.clicked_rect = null;
    this.clicked_link = null;
    this.width = width - padding.left - padding.right;
    this.height = height - padding.top - padding.bottom;
    this.svgId = svgId;
    this.utilities = utilities;
    this.handlers = handlers;
    this.varTypeColorScale = null;
    const self = this;
    const svg = d3
      .select("#" + svgId)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .on("click", function (e) {
        if (!e.defaultPrevented) {
          console.log("remove all highlights");
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
    svg
      .append("g")
      .attr("class", "link_group")
      .attr("transform", `translate(${padding.left}, ${padding.top})`);
    Constants.var_type_names.forEach((var_type_name) => {
      const var_type_region = svg
        .append("g")
        .attr("class", `${var_type_name}_region`)
        .attr("transform", `translate(${padding.left}, ${padding.top})`);
      var_type_region.append("g").attr("class", "tag-group");
      var_type_region.append("g").attr("class", "bbox-group");
      // var_type_region.append("g").attr("class", "label-group")
    });
  },

  update_vars(vars: tDPSIR, links: tVisLink[], varTypeColorScale: Function) {
    console.log("update vars");

    this.varTypeColorScale = varTypeColorScale;
    const var_type_names = Constants.var_type_names;
    const bboxes = radialBboxes(var_type_names, this.width, this.height, {
      width: 0,
      height: this.height / 10,
    });
    const bboxes_sizes = {
      [var_type_names[0]]: [0.35 * this.width, 0.2 * this.height],
      [var_type_names[1]]: [0.45 * this.width, 0.2 * this.height],
      [var_type_names[2]]: [0.3 * this.width, 0.2 * this.height],
      [var_type_names[3]]: [0.5 * this.width, 0.2 * this.height],
      [var_type_names[4]]: [0.3 * this.width, 0.2 * this.height],
    };

    Object.keys(vars).forEach((key) => {
      console.log(bboxes_sizes, key, bboxes_sizes[key][0]);
      this.drawVars(
        vars[key],
        bboxes[key],
        bboxes_sizes[key][0],
        bboxes_sizes[key][1],
      );
    });
    this.drawLinks(links, bboxes);
  },

  drawVars(
    vars: tVariableType,
    box_coor: { center: [number, number] },
    bboxWidth: number,
    bboxHeight: number,
  ) {
    const var_type_name = vars.variable_type;
    // const rectHeight = 35;
    const charWidth = 15;
    const rectWidth = charWidth * 7;
    const charHeight = 25;
    const rectangles = Object.values(
      vars.variable_mentions as Record<string, tVariable>,
    )
      .sort((a, b) => b.mentions.length - a.mentions.length) // Sorting in descending order by mentions length
      .map((variable) => ({
        name: variable.variable_name,
        width: rectWidth,
        height:
          (Math.round((variable.variable_name.length * charWidth) / rectWidth) +
            1) *
          charHeight,
        // width: variable.variable_name.length * charWidth,
        // height: rectHeight,
      }));

    const self = this;
    const bbox_center = box_coor.center;
    const bbox_origin = [
      bbox_center[0] - bboxWidth / 2,
      bbox_center[1] - bboxHeight / 2,
    ];
    // const rectangleCoordinates = matrixLayout(bboxWidth, rectangles, bbox_origin);
    console.log({ bboxWidth, rectangles, bbox_origin });
    const rectangleCoordinates = squareLayout(
      bboxWidth,
      rectangles,
      bbox_origin,
    );
    const rectWithVar = combineData(vars, rectangleCoordinates); //return as an object
    console.log({ rectangleCoordinates, rectWithVar });
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
    );
    const scaleVarColor = d3
      .scaleLinear()
      .domain([minMentions, maxMentions])
      .range(["#f7f7f7", self.varTypeColorScale(var_type_name)]);
    this.drawTags(var_type_name, rectWithVar, scaleVarColor);
  },

  drawLinks(
    links: tVisLink[],
    bboxes: { [key: string]: { center: [number, number] } },
  ) {
    const frequencyList = calculateFrequencyList(links); // includes variables frequency and link frequency among all groups
    const svg = d3.select("#" + this.svgId);
    const mergedData: (tLinkObject | null)[] = links.map((link) => {
      const source_block = document.querySelector(`#${link.source.var_type}`);
      const target_block = document.querySelector(`#${link.target.var_type}`);
      const sourceElement = document.querySelector(
        `#${link.source.variable_name}`,
      );
      const targetElement = document.querySelector(
        `#${link.target.variable_name}`,
      );
      if (
        sourceElement === null ||
        targetElement === null ||
        target_block === null ||
        source_block === null
      ) {
        return null;
      }
      const x_s = parseFloat(sourceElement.getAttribute("x") || "0");
      const y_s = parseFloat(sourceElement.getAttribute("y") || "0");
      const width_s = parseFloat(sourceElement.getAttribute("width") || "0");
      const height_s = parseFloat(sourceElement.getAttribute("height") || "0");

      const block_x_s = parseFloat(source_block.getAttribute("x") || "0");
      const block_y_s = parseFloat(source_block.getAttribute("y") || "0");
      const block_width_s = parseFloat(
        source_block.getAttribute("width") || "0",
      );
      const block_height_s = parseFloat(
        source_block.getAttribute("height") || "0",
      );

      const x_t = parseFloat(targetElement.getAttribute("x") || "0");
      const y_t = parseFloat(targetElement.getAttribute("y") || "0");
      const width_t = parseFloat(targetElement.getAttribute("width") || "0");
      const height_t = parseFloat(targetElement.getAttribute("height") || "0");

      const block_x_t = parseFloat(target_block.getAttribute("x") || "0");
      const block_y_t = parseFloat(target_block.getAttribute("y") || "0");
      const block_width_t = parseFloat(
        target_block.getAttribute("width") || "0",
      );
      const block_height_t = parseFloat(
        target_block.getAttribute("height") || "0",
      );
      // console.log({sourceElement,targetElement,target_block,source_block})

      const sourcePosition = {
        var_type: link.source.var_type,
        var_name: link.source.variable_name,
        x: x_s + width_s / 2, // Center X
        y: y_s + height_s / 2, // Center Y
        x_right: x_s + width_s, // Right edge, 10 units from the right
        x_left: x_s, // Left edge
        y_top: y_s, // Top edge
        y_bottom: y_s + height_s, // Bottom edge
        block_x: block_x_s + block_width_s / 2, // Center X of the block
        block_y: block_y_s + block_height_s / 2, // Center Y of the block
        block_y_top: block_y_s, // Top edge of the block
        block_y_bottom: block_y_s + block_height_s, // Bottom edge of the block
        newX_source: 0,
        newY_source: 0,
      };

      const targetPosition = {
        var_type: link.target.var_type,
        var_name: link.target.variable_name,
        x: x_t + width_t / 2, // Center X
        y: y_t + height_t / 2, // Center Y
        x_right: x_t + width_t, // Right edge, 10 units from the right
        x_left: x_t, // Left edge
        y_top: y_t, // Top edge
        y_bottom: y_t + height_t, // Bottom edge
        block_x: block_x_t + block_width_t / 2, // Center X of the block
        block_y: block_y_t + block_height_t / 2, // Center Y of the block
        block_y_top: block_y_t, // Top edge of the block
        block_y_bottom: block_y_t + block_height_t, // Bottom edge of the block
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
    console.log({ mergedData, filteredMergeData });
    const self = this;
    svg
      .select("g.link_group")
      .selectAll(".link")
      .data(filteredMergeData)
      .join("path")
      .attr("class", "link")
      .attr(
        "id",
        (d: tLinkObject) =>
          `${d.source.var_name}` + "-" + `${d.target.var_name}`,
      )
      .attr("d", function (d: tLinkObject, i) {
        let middleX1;
        let middleY1;
        // inner connections
        if (d.source.var_type === d.target.var_type) {
          middleX1 = bboxes[d.source.var_type].center[0];
          middleY1 = bboxes[d.source.var_type].center[1];
          d.source.newX_source = d.source.x_right;
          d.source.newY_source = d.source.y;
          d.target.newX_target = d.target.x_left;
          d.target.newY_target = d.target.y;
        } else if (
          d.source.var_type == "driver" &&
          d.target.var_type == "pressure"
        ) {
          let threshold;
          threshold = Math.abs(d.source.block_y - d.source.y) * 1.5;
          middleX1 = d.source.x + (d.target.x - d.source.x) / 2;
          middleY1 = d.source.block_y_top - threshold; // Target is top
          d.source.newX_source = d.source.x_right;
          d.source.newY_source = d.source.y;
          d.target.newX_target = d.target.x_left;
          d.target.newY_target = d.target.y;
        } else if (
          d.source.var_type == "pressure" &&
          d.target.var_type == "state"
        ) {
          let threshold;
          threshold = Math.abs(d.source.block_y - d.source.y);
          middleX1 = d.target.x + (1 * (d.target.x - d.source.x)) / 3;
          middleY1 =
            d.source.block_y - (d.source.block_y - d.target.block_y) / 4; // Target is top
          d.source.newX_source = d.source.x_right;
          d.source.newY_source = d.source.y;
          d.target.newX_target = d.target.x_right;
          d.target.newY_target = d.target.y;
        } else if (
          d.source.var_type == "state" &&
          d.target.var_type == "impact"
        ) {
          let threshold;
          threshold = Math.abs(d.source.block_y - d.source.y) * 2;
          middleX1 = d.target.x + Math.abs(d.target.x - d.source.x);
          middleY1 = d.source.block_y_bottom + threshold; // Target is top
          d.source.newX_source = d.source.x_left;
          d.source.newY_source = d.source.y;
          d.target.newX_target = d.target.x_right;
          d.target.newY_target = d.target.y;
        } else if (
          d.source.var_type == "impact" &&
          d.target.var_type == "response"
        ) {
          let threshold;
          threshold = Math.abs(d.source.block_y - d.source.y) * 2;
          middleX1 = d.source.x + (d.target.x - d.source.x) / 1.5;
          middleY1 = d.source.block_y + threshold; // Target is top
          d.source.newX_source = d.source.x_left;
          d.source.newY_source = d.source.y;
          d.target.newX_target = d.target.x_right;
          d.target.newY_target = d.target.y;
        } else if (
          d.source.var_type == "response" &&
          d.target.var_type == "driver"
        ) {
          let threshold;
          threshold = Math.abs(d.source.block_y - d.source.y);
          middleX1 = d.target.x - Math.abs(d.target.x - d.source.x) * 1.35;
          // middleX1 = d.source.x - (d.target.x - d.source.x) / 2.5;
          middleY1 = d.source.block_y - (d.source.block_y - d.target.block_y); // Target is top
          d.source.newX_source = d.source.x_left;
          d.source.newY_source = d.source.y;
          d.target.newX_target = d.target.x_left;
          d.target.newY_target = d.target.y;
        } else if (
          d.source.var_type == "response" &&
          d.target.var_type == "state"
        ) {
          let threshold;
          // threshold = Math.abs((d.source.block_y - d.source.y)) * 2
          threshold = 0;
          middleX1 = d.source.x + (d.target.x - d.source.x) / 2;
          middleY1 = d.source.block_y_top - threshold; // Target is top
          d.source.newX_source = d.source.x_right;
          d.source.newY_source = d.source.y;
          d.target.newX_target = d.target.x_left;
          d.target.newY_target = d.target.y;
        } else if (
          d.source.var_type == "response" &&
          d.target.var_type == "pressure"
        ) {
          let threshold;
          threshold = Math.abs(d.source.block_y - d.source.y) * 2;
          middleX1 = d.source.x + (d.target.x - d.source.x) / 2;
          middleY1 = d.source.block_y - threshold; // Target is top
          d.source.newX_source = d.source.x_right;
          d.source.newY_source = d.source.y;
          d.target.newX_target = d.target.x_left;
          d.target.newY_target = d.target.y;
        }
        let path = d3.path();
        path.moveTo(d.source.newX_source, d.source.newY_source); // Start at the source
        // Curve to (middleX1, middleY1), descending to midPoint1
        path.quadraticCurveTo(
          middleX1,
          middleY1, // Control point at the first peak
          d.target.newX_target,
          d.target.newY_target, // End at the first midpoint
        );
        return path.toString();
      })
      .attr("cursor", "pointer")
      .attr("fill", "none")
      // .attr("stroke", "url(#grad)")
      // .attr("stroke",d=> scaleColor(d.frequency))
      .attr("stroke", "gray")
      .attr("stroke-width", function (d: tLinkObject) {
        const widthSacle = d3
          .scaleLinear()
          .domain([
            frequencyList.minLinkFrequency,
            frequencyList.maxLinkFrequency,
          ])
          .range([2, 15]);
        return widthSacle(d.frequency);
      })
      .attr("opacity", 0.1)
      .on("mouseover", function (e, d: tLinkObject) {
        d3.select(this).classed("line-hover", true);
        d3.select(this.parentNode) // this refers to the path element, and parentNode is the SVG or a <g> element containing it
          .append("text")
          .attr("class", "link-frequency-text") // Add a class for styling if needed
          .attr("x", () => e.clientX + 10) // Position the text in the middle of the link
          .attr("y", () => e.clientY - 20)
          .attr("text-anchor", "middle") // Center the text on its coordinates
          .attr("fill", "black") // Set the text color
          .text(d.frequency);
      })
      .on("mouseout", function (e, d) {
        d3.select(this).classed("line-hover", false);
        d3.selectAll(".link-frequency-text").remove();
      })
      .on("click", function (e, d: tLinkObject) {
        console.log(d);
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
              const svg = d3.select("#" + self.svgId);
              return createOrUpdateGradient(svg, d, self);
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
  ) {
    const group = d3
      .select("#" + this.svgId)
      .select(`.${var_type_name}_region`);
    group
      .select("g.bbox-group")
      .append("rect")
      .attr("class", "bbox")
      .attr("id", var_type_name)
      .attr("x", bbox_center[0] - bboxWidth / 2)
      .attr("y", bbox_center[1] - bboxHeight / 2)
      .attr("width", bboxWidth)
      .attr("height", bboxHeight)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 2)
      .attr("opacity", "0") //do not show the bounding box
      .attr("rx", "5");

    group
      .select("g.bbox-group")
      .append("rect")
      .attr("class", "bbox-label-container")
      .attr("x", bbox_center[0] - ((var_type_name.length + 1) * 25) / 2)
      .attr("y", bbox_center[1] - bboxHeight / 2 - 38)
      .attr("width", (var_type_name.length + 1) * 25)
      .attr("height", 45)
      .attr("fill", varTypeColorScale(var_type_name))
      .attr("rx", "0.5%")
      .attr("opacity", 0)
      .attr("cursor", "pointer")
      .on("mouseover", function () {
        d3.select(this).classed("bbox-label-hover", true);
      })
      .on("mouseout", function () {
        d3.select(this).classed("bbox-label-hover", false);
      })
      .on("click", function (e) {
        const utility_group = d3
          .select(this.parentNode)
          .select("g.utility-group");
        const shown = utility_group.attr("opacity") === 1;
        utility_group
          .transition()
          .duration(300)
          .attr("opacity", shown ? 0 : 1)
          .attr("pointer-events", shown ? "none" : "all");
        console.log("click on bbox");
      });
    group
      .select("g.bbox-group")
      .append("text")
      .attr("class", "bbox-label")
      .attr("x", bbox_center[0])
      .attr("y", bbox_center[1] - bboxHeight / 2 - 15)
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
      .attr("x", bbox_center[0] + (var_type_name.length + 1) * 12)
      .attr("y", bbox_center[1] - bboxHeight / 2 - 28)
      .attr("width", 30)
      .attr("height", 30);

    this.drawUtilities(
      var_type_name,
      bbox_center,
      bboxWidth,
      bboxHeight,
      this.utilities,
    );
  },
  drawUtilities(
    var_type_name: string,
    bbox_center: number[],
    bboxWidth: number,
    bboxHeight: number,
    utilities: string[],
  ) {
    console.log("draw utilities", utilities);
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
  ) {
    const self = this;
    const group = d3
      .select("#" + this.svgId)
      .select(`.${var_type_name}_region`);
    console.log({ rectWithVar });
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
          .attr("x", d.x)
          .attr("y", d.y)
          .attr("width", d.width)
          .attr("height", d.height)
          .attr("stroke", "#cdcdcd")
          .attr("stroke-width", "1px")
          .attr("rx", "5")
          .attr(
            "fill",
            d.frequency !== 0 ? scaleVarColor(d.frequency) : "#cdcdcd",
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
                  const svg = d3.select("#" + self.svgId);
                  return createOrUpdateGradient(svg, link_data, self);
                })
                .attr("marker-end", (d: tLinkObject) => {
                  const svg = d3.select("#" + self.svgId);
                  return createArrow(svg, d, self);
                });
            }
          });

        const tagWidth = d.width * 0.7;
        tag
          .append("text")
          .attr("class", "label")
          .text(d.variable_name)
          .attr("class", "label")
          .attr("x", d.x + d.width / 2) // slightly move text to the left within the rectangle
          .attr("y", d.y + d.height / 2)
          .attr("fill", "black")
          .attr("font-size", "0.9rem")
          // .attr("font-weight", "bold")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("pointer-events", "none")
          .call(wrap, tagWidth);

        const icon_size = 20;
        if (var_type_name === "pressure") {
          tag
            .append("image")
            .attr(
              "xlink:href",
              d.factor_type === "social" ? "social.svg" : "ecological.svg",
            )
            .attr("x", d.x + d.width - icon_size)
            .attr("y", d.y)
            .attr("width", icon_size) // icon width
            .attr("height", icon_size) // icon height
            .attr("pointer-events", "none");
        }

        // tooltip
        const charWidth = 10;
        const charHeight = 25;
        const tooltip_width = d.width * 1.5;
        const tooltip_height =
          (Math.round((d.definition.length * charWidth) / tooltip_width) + 1) *
          charHeight;
        const tooltip = tag
          .append("g")
          .attr("class", "tooltip")
          .attr("opacity", 0)
          .attr("pointer-events", "none");
        tooltip
          .append("rect")
          .attr("class", "tooltip-box")
          .attr("x", d.x + d.width)
          .attr("y", d.y)
          .attr("width", tooltip_width)
          .attr("height", tooltip_height)
          .attr("fill", "white")
          .attr("stroke", "black")
          .attr("stroke-width", 1)
          .attr("rx", 5);
        tooltip
          .append("text")
          .attr("class", "tooltip-text")
          .attr("x", d.x + d.width + tooltip_width / 2)
          .attr("y", d.y + tooltip_height / 2)
          .text(d.definition)
          .attr("font-size", "0.8rem")
          .attr("fill", "black")
          .attr("pointer-events", "none")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .call(wrap, tooltip_width - 10);
      });
  },
};

function radialBboxes(
  groups: string[],
  width: number,
  height: number,
  maxBboxSize: { width: number; height: number },
) {
  const offset = (234 * Math.PI) / 180;
  // const angleScale = d3.scaleBand().domain(groups).range([offset, offset + Math.PI * 2])
  // five groups
  const angles = [
    offset - (Math.PI * 2 * 1) / 40,
    offset + (Math.PI * 2 * 1) / 5 + (Math.PI * 2 * 1) / 40,
    offset + (Math.PI * 2 * 2) / 5.4,
    offset + (Math.PI * 2 * 3) / 5.1 - (Math.PI * 2 * 1) / 60,
    offset + (Math.PI * 2 * 4) / 4.85,
  ];
  const scaleFactors = [
    1.05, // D
    1.05, // P
    0.8, // S
    0.74, // I
    0.82, // R
  ];
  let bboxes: { [key: string]: { center: [number, number] } } = {};
  const a = width / 2 - maxBboxSize.width / 2;
  const b = height / 2.5 - maxBboxSize.height / 2;
  groups.forEach((group, index) => {
    // const angle = angleScale(group)
    const angle = angles[index];
    const r =
      ((a * b) /
        Math.sqrt(
          Math.pow(b * Math.cos(angle), 2) + Math.pow(a * Math.sin(angle), 2),
        )) *
      scaleFactors[index];
    const x = width / 2 + r * Math.cos(angle);
    const y = height / 2 + r * Math.sin(angle);
    bboxes[group] = {
      center: [x, y],
    };
  });
  return bboxes;
}

function matrixLayout(
  regionWidth: number,
  rectangles: tRectangle[],
  bbox_origin: number[],
): [number, number, number, number, string][] {
  let padding = 10;
  let xStart = padding; // Start x-coordinate, will be updated for center alignment
  let y = padding;
  let rowMaxHeight = 0;

  const rectangleCoordinates: [number, number, number, number, string][] = [];

  // Function to reset for a new row
  function newRow(): void {
    y += rowMaxHeight + padding;
    rowMaxHeight = 0;
  }

  // Function to calculate row width (helper function)
  function calculateRowWidth(rectangles: tRectangle[]): number {
    return (
      rectangles.reduce((acc, rect) => acc + rect.width + padding, 0) - padding
    ); // Minus padding to adjust for extra padding at the end
  }

  // Temp array to hold rectangles for current row, to calculate total width for centering
  let tempRowRectangles: tRectangle[] = [];

  rectangles.forEach((rect) => {
    if (
      xStart + calculateRowWidth(tempRowRectangles) + rect.width + padding >
      regionWidth
    ) {
      // Center align previous row's rectangles before starting a new row
      let rowWidth = calculateRowWidth(tempRowRectangles);
      let startX = (regionWidth - rowWidth) / 2 + bbox_origin[0]; // Calculate starting X for center alignment

      // Assign coordinates with center alignment
      tempRowRectangles.forEach((tempRect) => {
        rectangleCoordinates.push([
          startX,
          y + bbox_origin[1],
          tempRect.width,
          tempRect.height,
          tempRect.name,
        ]);
        startX += tempRect.width + padding;
      });

      // Reset for new row
      newRow();
      tempRowRectangles = [];
      xStart = padding;
    }

    // Add current rectangle to temp row for future processing
    tempRowRectangles.push(rect);
    rowMaxHeight = Math.max(rowMaxHeight, rect.height);
  });

  // Process the last row, if there are any rectangles left
  if (tempRowRectangles.length > 0) {
    let rowWidth = calculateRowWidth(tempRowRectangles);
    let startX = (regionWidth - rowWidth) / 2 + bbox_origin[0]; // Center align

    tempRowRectangles.forEach((tempRect) => {
      rectangleCoordinates.push([
        startX,
        y + bbox_origin[1],
        tempRect.width,
        tempRect.height,
        tempRect.name,
      ]);
      startX += tempRect.width + padding;
    });
  }

  return rectangleCoordinates;
}

// layout should be like this:
//   ---
//  -   -
//  -   -
//   ---
function squareLayout(
  regionWidth: number,
  rectangles: tRectangle[],
  bbox_origin: number[],
) {
  console.log({ regionWidth, rectangles, bbox_origin });
  // assuming rectangles has the same width
  const rect_width = rectangles[0].width;
  const max_rect_per_row = Math.floor(regionWidth / rect_width);
  // const space_between_rectangles = (regionWidth - max_rect_per_row * rect_width) / (max_rect_per_row - 1)
  const space_between_rectangles = 50;
  const y_offset = 20;
  // return value
  let rectangleCoordinates: [number, number, number, number, string][] = [];
  // first row
  const first_row_rect_number = Math.max(1, max_rect_per_row - 2);
  const first_row_offset_left =
    (regionWidth -
      (first_row_rect_number * rect_width +
        (first_row_rect_number - 1) * space_between_rectangles)) /
    2;
  console.log({
    rectangles,
    regionWidth,
    rect_width,
    max_rect_per_row,
    space_between_rectangles,
    first_row_offset_left,
  });
  for (let i = 0; i < first_row_rect_number; i++) {
    rectangleCoordinates.push([
      bbox_origin[0] +
        first_row_offset_left +
        i * (rect_width + space_between_rectangles),
      bbox_origin[1],
      rect_width,
      rectangles[i].height,
      rectangles[i].name,
    ]);
  }
  // middle rows
  const middle_row_number =
    rectangles.length % 2 === 0
      ? (rectangles.length - first_row_rect_number * 2) / 2
      : (rectangles.length - first_row_rect_number * 2 - 1) / 2;
  let last_row_max_height = Math.max(
    ...rectangles.slice(0, first_row_rect_number).map((rect) => rect.height),
  );
  let accumulative_y_offset = y_offset;
  for (let i = 0; i < middle_row_number; i++) {
    rectangleCoordinates.push([
      bbox_origin[0],
      bbox_origin[1] + accumulative_y_offset + last_row_max_height,
      rect_width,
      rectangles[2 * i + first_row_rect_number].height,
      rectangles[2 * i + first_row_rect_number].name,
    ]);
    rectangleCoordinates.push([
      bbox_origin[0] + regionWidth - rect_width,
      bbox_origin[1] + accumulative_y_offset + last_row_max_height,
      rect_width,
      rectangles[2 * i + 1 + first_row_rect_number].height,
      rectangles[2 * i + 1 + first_row_rect_number].name,
    ]);
    accumulative_y_offset += last_row_max_height + y_offset;
    last_row_max_height = Math.max(
      rectangles[i + first_row_rect_number].height,
      rectangles[2 * i + 1 + first_row_rect_number].height,
    );
  }
  accumulative_y_offset += last_row_max_height;
  // last row
  const last_row_rect_number =
    rectangles.length - first_row_rect_number - middle_row_number * 2;
  const last_row_offset_left =
    (regionWidth -
      (last_row_rect_number * rect_width +
        (last_row_rect_number - 1) * space_between_rectangles)) /
    2;
  for (let i = 0; i < last_row_rect_number; i++) {
    rectangleCoordinates.push([
      bbox_origin[0] +
        last_row_offset_left +
        i * (rect_width + space_between_rectangles),
      bbox_origin[1] + accumulative_y_offset,
      rect_width,
      rectangles[i + first_row_rect_number + middle_row_number * 2].height,
      rectangles[i + first_row_rect_number + middle_row_number * 2].name,
    ]);
  }
  return rectangleCoordinates;
}

function combineData(
  vars: tVariableType,
  rectangles: [number, number, number, number, string][],
): tRectObject[] {
  return rectangles.map((rect) => {
    const [x, y, width, height, variable_name] = rect;
    const variable = vars.variable_mentions[variable_name];
    const mentions = variable?.mentions || [];
    const factor_type = variable?.factor_type;
    const definition = variable?.definition;
    const frequency = mentions.length;
    return {
      x,
      y,
      width,
      height,
      variable_name,
      mentions,
      factor_type,
      frequency,
      definition,
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
          console.log({ stateless });
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
