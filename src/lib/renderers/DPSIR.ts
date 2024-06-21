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
import { name } from "@melt-ui/svelte";
// import socialIcon from '../../public/social.svg';
const width = 1500;
const height = 1000;
const padding = { top: 10, right: 50, bottom: 10, left: 50 };
const rows = 120;
const columns = 90;
let grid = Array.from({ length: rows+1 }, () => Array(columns+1).fill(0));
let global_rects:tRectObject[] = [];
// Calculate the cell size
const cellWidth = width / columns;
const cellHeight = height / rows;

class PriorityQueue {
  constructor() {
    this.elements = [];
  }

  enqueue(priority, element) {
    this.elements.push({ priority, element });
    this.elements.sort((a, b) => a.priority - b.priority);
  }

  dequeue() {
    return this.elements.shift().element;
  }

  isEmpty() {
    return this.elements.length === 0;
  }
}

export const DPSIR = {
  init(svgId: string, utilities: string[], handlers: tUtilityHandlers) {
    // console.log("init");
    this.clicked_rect = null;
    this.clicked_link = null;
    // this.width = width - padding.left - padding.right;
    // this.height = height - padding.top - padding.bottom;
    this.svgId = svgId;
    this.utilities = utilities;
    this.handlers = handlers;
    this.varTypeColorScale = null;
    const self = this;
    const svg = d3
      .select("#" + svgId)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width",width)
      .attr("height",height)
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
    
    
    this.drawGids(svg,svgId,width,height);

    svg
      .append("g")
      .attr("class", "link_group")
      // .attr("transform", `translate(${padding.left}, ${padding.top})`);
    Constants.var_type_names.forEach((var_type_name) => {
      const var_type_region = svg
        .append("g")
        .attr("class", `${var_type_name}_region`)
        // .attr("transform", `translate(${padding.left}, ${padding.top})`);
      var_type_region.append("g").attr("class", "tag-group");
      var_type_region.append("g").attr("class", "bbox-group");
    });
  },

  update_vars(vars: tDPSIR, links: tVisLink[], varTypeColorScale: Function) {
    // console.log("update vars");
    console.log({links})
    this.varTypeColorScale = varTypeColorScale;
    const var_type_names = Constants.var_type_names;
    type VarTypeNames = typeof var_type_names[number];

    let categorizedLinks: Record<VarTypeNames, any[]> = {} as Record<VarTypeNames, any[]>;
    var_type_names.forEach(name => {
        categorizedLinks[name] = [];
    });
    // Iterate through the links array
    links.forEach(link => {
        const sourceType = link.source.var_type;
        const targetType = link.target.var_type;

        // Check if source equals target
        if (sourceType === targetType) {
            const filteredLink = { source: link.source, target: link.target };
            switch (sourceType) {
                case 'driver':
                    categorizedLinks[var_type_names[0]].push(filteredLink);
                    break;
                case 'pressure':
                    categorizedLinks[var_type_names[1]].push(filteredLink);
                    break;
                case 'state':
                    categorizedLinks[var_type_names[2]].push(filteredLink);
                    break;
                case 'impact':
                    categorizedLinks[var_type_names[3]].push(filteredLink);
                    break;
                case 'response':
                    categorizedLinks[var_type_names[4]].push(filteredLink);
                    break;
                default:
                    // Do nothing for unmatched types
                    break;
            }
        }
    });
    console.log({categorizedLinks});
    const bboxes_sizes: { [key in string]: [number, number] } = {
      [var_type_names[0]]: [30, 32],
      [var_type_names[1]]: [20, 40],
      [var_type_names[2]]: [18, 32],
      [var_type_names[3]]: [30, 30],
      [var_type_names[4]]: [24, 26],
    };
    const bboxes = radialBboxes(var_type_names, 
                                columns, 
                                rows, 
                                bboxes_sizes);
    // console.log({bboxes});
    Object.keys(vars).forEach((key) => {
      this.drawVars(
        vars[key],
        bboxes[key],
        categorizedLinks[key])
    });
    // this.drawLinks(links, bboxes);
  },
  drawGids(svg, svgId, width, height) {
    // Get the dimensions of the SVG
    const svgElement = document.getElementById(svgId);
    const boundingRect = svgElement?.getBoundingClientRect();

    // const svgWidth = boundingRect?.width ?? 0;
    // const svgHeight = boundingRect?.height ?? 0;

    // Append the grid group
    let gridGroup = svg.append("g")
      .attr("class", "grid_group")  
      // .attr("transform", `translate(${padding.left}, ${padding.top})`);

    // Function to draw horizontal lines
    for (let i = 0; i <= rows; i++) {
      gridGroup.append("line")
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
      gridGroup.append("line")
        .attr("x1", i * cellWidth)
        .attr("y1", 0)//-padding.top
        .attr("x2", i * cellWidth)
        .attr("y2", height) //+padding.bottom
        .attr("stroke", "#D3D3D3")
        .attr("stroke-width", 1)
        .attr("opacity", 0.3);
    }



    gridGroup.append("circle")
    .attr("cx", gridToSvgCoordinate(90,120).x) 
    .attr("cy", gridToSvgCoordinate(90,120).y) 
    .attr("r", 1)
    .attr("fill", "red");

  },

  //center(gridX,gridY), size(x grids,y grids)
  drawVars(
    vars: tVariableType,
    box_coor: { center: [number, number],size:[number,number] },
    inLinks,
  ) {
    const var_type_name = vars.variable_type;
    // const charWidth = 15;
    const rectWidth = 6; //(g)
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
          height: (Math.ceil(nameLength / 4)) * 3 //(g)
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
    const rectangleCoordinates = Placing_node(
      bboxWidth,
      bboxHeight,
      rectangles,
      bbox_origin,
      inLinks
    );
    const rectWithVar = combineData(vars, rectangleCoordinates); //return as an object
    //merge all rects info(grid coordinate position and size) to a global var
    rectWithVar.forEach((rect) => {
        global_rects.push(rect);
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
    );
    const scaleVarColor = d3
      .scaleLinear()
      .domain([minMentions, maxMentions])
      .range(["#f7f7f7", self.varTypeColorScale(var_type_name)]);

    //draw each variable
    this.drawTags(var_type_name, rectWithVar, scaleVarColor);
  },

  drawLinks(
    links: tVisLink[],
    bboxes: { [key: string]: { center: [number, number] } },
  ) {

    console.log(grid.map(row => row.join(' ')).join('\n'));
    console.log({global_rects});
    const frequencyList = calculateFrequencyList(links); // includes variables frequency and link frequency among all groups

    const svg = d3.select("#" + this.svgId);
    const mergedData: (tLinkObject | null)[] = links.map((link) => {
      const source_block = document.querySelector(`#${link.source.var_type}`);
      const target_block = document.querySelector(`#${link.target.var_type}`);
      const sourceElement = global_rects.find((rect) => rect.variable_name === link.source.variable_name);
      const targetElement = global_rects.find((rect) => rect.variable_name === link.target.variable_name);

      // const sourceElement = document.querySelector(
      //   `#${link.source.variable_name}`,
      // );
      // const targetElement = document.querySelector(
      //   `#${link.target.variable_name}`,
      // );
      if (
        sourceElement === null ||
        targetElement === null ||
        target_block === null ||
        source_block === null
      ) {
        return null;
      }
      // const sourceElement = global_rects.find((rect) => rect.variable_name === variable_name);

      // const x_s = parseFloat(sourceElement.getAttribute("x") || "0");
      // const y_s = parseFloat(sourceElement.getAttribute("y") || "0");
      // const width_s = parseFloat(sourceElement.getAttribute("width") || "0");
      // const height_s = parseFloat(sourceElement.getAttribute("height") || "0");

      // const block_x_s = parseFloat(source_block.getAttribute("x") || "0");
      // const block_y_s = parseFloat(source_block.getAttribute("y") || "0");
      // const block_width_s = parseFloat(
      //   source_block.getAttribute("width") || "0",
      // );
      // const block_height_s = parseFloat(
      //   source_block.getAttribute("height") || "0",
      // );

      // const x_t = parseFloat(targetElement.getAttribute("x") || "0");
      // const y_t = parseFloat(targetElement.getAttribute("y") || "0");
      // const width_t = parseFloat(targetElement.getAttribute("width") || "0");
      // const height_t = parseFloat(targetElement.getAttribute("height") || "0");

      // const block_x_t = parseFloat(target_block.getAttribute("x") || "0");
      // const block_y_t = parseFloat(target_block.getAttribute("y") || "0");
      // const block_width_t = parseFloat(
      //   target_block.getAttribute("width") || "0",
      // );
      // const block_height_t = parseFloat(
      //   target_block.getAttribute("height") || "0",
      // );
      // console.log({sourceElement,targetElement,target_block,source_block})
  

      
      const sourcePosition = {
        var_type: link.source.var_type,
        var_name: link.source.variable_name,
        leftTop:[sourceElement.x,sourceElement.y],
        width: sourceElement.width,
        height: sourceElement.height,

        newX_source: 0,
        newY_source: 0,
      };
      
      const targetPosition = {
        var_type: link.target.var_type,
        var_name: link.target.variable_name,
        leftTop:[targetElement.x,targetElement.y],
        width: targetElement.width,
        height: targetElement.height,

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
    // console.log({ mergedData, filteredMergeData });
    const self = this;

    let linkCounts = {};
  
    filteredMergeData.forEach(item => {
      if (item === null) return;
  
      const sourceVarName = item.source.var_name;
      const targetVarName = item.target.var_name;
  
      // Initialize or update the source
      if (!linkCounts[sourceVarName]) {
        linkCounts[sourceVarName] = {
          outLinks: 0,
          inLinks: 0,
          x: item.source.leftTop[0],
          y: item.source.leftTop[1],
          width: item.source.width,
          height: item.source.height
        };
      }
      linkCounts[sourceVarName].outLinks += 1;
  
      // Initialize or update the target
      if (!linkCounts[targetVarName]) {
        linkCounts[targetVarName] = {
          outLinks: 0,
          inLinks: 0,
          x: item.target.leftTop[0],
          y: item.target.leftTop[1],
          width: item.target.width,
          height: item.target.height
        };
      }
      linkCounts[targetVarName].inLinks += 1;

      // console.log(item.source.var_name, item.target.var_name)
    });
    
    console.log({linkCounts});
    const points = generatePoints(linkCounts);
    console.log(points);
    
    // M: move to, H: horizontal line, V: vertical line
    const lineGenerator = (link,i,bbox_source,bbox_target) => {
      let source_grid, target_grid;
        // console.log(bbox_source,bbox_target)
        // console.log({link})
        // if(link.source.var_type == "state" && link.target.var_type == "impact"){
        //   console.log(points[link.source.var_name].startPoints,points[link.target.var_name].endPoints)
        //   // source_grid = points[link.source.var_name].startPoints[i]
        //   // target_grid = points[link.target.var_name].endPoints[i]
        // }
        // else{
        //   source_grid = [link.source.newX_source, link.source.newY_source];
        //   target_grid = [link.target.newX_target, link.target.newY_target];
        // }
        source_grid = [link.source.newX_source, link.source.newY_source];
        target_grid = [link.target.newX_target, link.target.newY_target];
        
        // if(link.source.var_type == "state" && link.target.var_type == "impact"){
        //   console.log(link.source.var_name, link.target.var_name)
        //   console.log(source_grid,target_grid);
        // }
        // console.log(grid[48][73])
        let path = dijkstra(link, grid, points);
        if(link.source.var_type == "state" && link.target.var_type == "impact"){
          console.log(path);
        }
        if (path) {

          path.forEach(point => {
            grid[point[1]][point[0]] = 3;
          });
          // console.log(grid.map(row => row.join(' ')).join('\n'));
          // console.log(grid[48][73])
          const svgPath = path.map(point => gridToSvgCoordinate(point[0], point[1]));
          // console.log(svgPath);
          const d3Path = d3.path();
          d3Path.moveTo(svgPath[0].x, svgPath[0].y);
          for (let i = 1; i < svgPath.length; i++) {
            d3Path.lineTo(svgPath[i].x, svgPath[i].y);
          }

          return d3Path.toString();
        }
        // const source = gridToSvgCoordinate(link.source.newX_source, link.source.newY_source); //left top
        // const source_rt = gridToSvgCoordinate((link.source.newX_source+link.source.width), link.source.newY_source); //right top
        // const x_offset = gridToSvgCoordinate(link.source.newX_source+link.source.width+2, link.source.newY_source).x;
        // const target = gridToSvgCoordinate(link.target.newX_target+2, link.target.newY_target); //left top
        // const y_offset = gridToSvgCoordinate(link.target.newX_target, link.target.newY_target-2).y;
        // const target_rt = gridToSvgCoordinate((link.target.newX_target+link.target.width), link.target.newY_target); //right top

  
    }
    svg
    .select("g.link_group")
    .selectAll(".link") 
    .data(filteredMergeData)
    .join("path")
    .attr("class", "link")
    .attr(
      "id",
      (d) =>
        `${d.source.var_name}` + "-" + `${d.target.var_name}`,
    )
    .attr("d", function (d,i) {

      if (
        d.source.var_type == "state" &&
        d.target.var_type == "impact"
      ) {
        console.log(d.source.var_name, d.source.leftTop[0], d.source.leftTop[1], d.target.var_name,d.target)
        d.source.newX_source = d.source.leftTop[0];
        d.source.newY_source = d.source.leftTop[1];
        d.target.newX_target = d.target.leftTop[0];
        d.target.newY_target = d.target.leftTop[1];
      } 
      
      return lineGenerator(d,i,bboxes[d.source.var_type],bboxes[d.target.var_type]);
  })
      .attr("cursor", "pointer")
      .attr("fill", "none")
      // .attr("stroke", "url(#grad)")
      // .attr("stroke",d=> scaleColor(d.frequency))m
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
      .attr("opacity", 1)
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
              const svg = d3.select("#" + self.svgId);
              return createOrUpdateGradient(svg, d, self);
            })
            // .attr("marker-mid", `url(#${arrowId})`)
            // .attr("marker-end", (d: tLinkObject) => {
            //   const svg = d3.select("#" + self.svgId);
            //   return createArrow(svg, d, self);
            // });

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

    // group bounding box
    group
      .select("g.bbox-group")
      .append("rect")
      .attr("class", "bbox")
      .attr("id", var_type_name)
      .attr("x", gridToSvgCoordinate(bbox_center[0] - bboxWidth / 2, bbox_center[1] - bboxHeight / 2).x)
      .attr("y", gridToSvgCoordinate(bbox_center[0] - bboxWidth / 2, bbox_center[1] - bboxHeight / 2).y)
      .attr("width", bboxWidth*cellWidth)
      .attr("height", bboxHeight*cellHeight)
      .attr("fill", "none")
      .attr("stroke", "grey")
      .attr("stroke-width", 2)
      .attr("opacity", "1") //do not show the bounding box


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
      .attr("x", gridToSvgCoordinate(bbox_center[0],bbox_center[1] - bboxHeight / 2 -2 ).x)
      .attr("y", gridToSvgCoordinate(bbox_center[0],bbox_center[1] - bboxHeight / 2 -2 ).y)
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
    group.append("circle")
    .attr("cx", gridToSvgCoordinate(bbox_center[0],bbox_center[1]).x) 
    .attr("cy", gridToSvgCoordinate(bbox_center[0],bbox_center[1]).y ) 
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
      .attr("x", gridToSvgCoordinate(bbox_center[0]+ (var_type_name.length)/2+2,bbox_center[1] - bboxHeight / 2 -4).x)
      .attr("y", gridToSvgCoordinate(bbox_center[0],bbox_center[1] - bboxHeight / 2 -4 ).y)
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
  ) {
    const self = this;
    const group = d3
      .select("#" + this.svgId)
      .select(`.${var_type_name}_region`);
    console.log({ rectWithVar });

    markOccupiedGrid(grid, rectWithVar);
    // console.log(grid.map(row => row.join(' ')).join('\n'));

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
          .attr("x", gridToSvgCoordinate(d.x,d.y).x)
          .attr("y", gridToSvgCoordinate(d.x,d.y).y)
          .attr("width", d.width*cellWidth)
          .attr("height", d.height*cellHeight)
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
                  const svg = d3.select("#" + self.svgId);
                  return createOrUpdateGradient(svg, link_data, self);
                })
                .attr("marker-end", (d: tLinkObject) => {
                  const svg = d3.select("#" + self.svgId);
                  return createArrow(svg, d, self);
                });
            }
          });

        const tagWidth = d.width*cellWidth*0.7;
        tag
          .append("text")
          .attr("class", "label")
          .text(d.variable_name)
          .attr("class", "label")
          .attr("x", gridToSvgCoordinate(d.x+d.width/2 ,d.y+d.height/2).x) // slightly move text to the left within the rectangle
          .attr("y", gridToSvgCoordinate(d.x+d.width/2 ,d.y+d.height/2).y)
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
            .attr("x", gridToSvgCoordinate(d.x + d.width-1.2,d.y).x)
            .attr("y", gridToSvgCoordinate(d.x + d.width-1.2,d.y).y)
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
  bboxesSizes: { [key: string]: [number, number] }
) {

  // change to svg size
  const width = cellWidth*columns-padding.left-padding.right
  const height = cellHeight*rows-padding.top-padding.bottom
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
  let bboxes: { [key: string]: { center: [number, number], size: [number, number]  } } = {};
  groups.forEach((group, index) => {
    const angle = angles[index];
    const a = width / 2 - bboxesSizes[group][0]* cellWidth / 2;  //change to svg size
    const b = height / 2.5 - bboxesSizes[group][1]* cellHeight / 2; //change to svg size
    const r =
      ((a * b) /
        Math.sqrt(
          Math.pow(b * Math.cos(angle), 2) + Math.pow(a * Math.sin(angle), 2),
        )) *
      scaleFactors[index];
    const pre_x = width / 2 + r * Math.cos(angle);
    const pre_y = height / 2 + r * Math.sin(angle);

    // Calculate the new center to align with the grid
    const { x, y } = svgToGridCoordinate(pre_x, pre_y);
    // const newCenter = gridToSvgCoordinate(x, y, cellWidth, cellHeight); //d3 draws the rect from the topleft point
    
    bboxes[group] = {
      center: [x, y],
      size: bboxesSizes[group]
    };
  });
  return bboxes;
}


function gridToSvgCoordinate(gridX:number, gridY:number,) {
  const svgX = (gridX ) * cellWidth;
  const svgY = (gridY ) * cellHeight;
  return { x: svgX, y: svgY };
}

//top left most as (0,0)
function svgToGridCoordinate(svgX:number, svgY:number) {
  const gridX = Math.ceil((svgX) / cellWidth) + 1;
  const gridY = Math.ceil((svgY ) / cellHeight) + 1;
  return { x: gridX, y: gridY };
}

// Function to mark the occupied grid points
function markOccupiedGrid(grid: number[][], rects: { x: number, y: number, width: number, height: number }[]) {
  rects.forEach(rect => {
    const startX = rect.x;
    const startY = rect.y;
    const endX = startX + rect.width;
    const endY = startY + rect.height;


    // x:columns, y:rows
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (y === startY || y === endY || x === startX || x === endX) {
          grid[y][x] = 1; // Mark edges as 1
        } else {
          grid[y][x] = 2; // Mark inside as 2
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
  regionHeight: number,
  rectangles: tRectangle[], 
  bbox_origin: number[],
) {
  console.log({ regionWidth, rectangles, bbox_origin });


  // assuming rectangles has the same width
  const rect_width = cellWidth * rectangles[0].width;
  // const rect_height = rectangles[0].height;
  const max_rect_per_row = Math.floor(regionWidth / rectangles[0].width);
  // const space_between_rectangles = (regionWidth - max_rect_per_row * rect_width) / (max_rect_per_row - 1)
  const space_between_rectangles = 2*cellWidth;
  const y_offset = 3*cellHeight;
  // return value
  let rectangleCoordinates: [number, number, number, number, string][] = [];


  // first row
  const first_row_rect_number = Math.max(1, max_rect_per_row - 2);
  const first_row_offset_left =
    (cellWidth *regionWidth -
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

    let x = (bbox_origin[0]-1)*cellWidth + first_row_offset_left + i * (rect_width + space_between_rectangles);
    let y = (bbox_origin[1])*cellHeight;
    let Grid = svgToGridCoordinate(x, y);

    rectangleCoordinates.push([
      Grid.x,
      Grid.y,
      rectangles[i].width,
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
    ...rectangles.slice(0, first_row_rect_number).map((rect) => cellHeight*rect.height),
  );
  let accumulative_y_offset = y_offset;
  for (let i = 0; i < middle_row_number; i++) {
    let x1 = (bbox_origin[0]-1)*cellWidth;
    let y1 = bbox_origin[1]*cellHeight + accumulative_y_offset + last_row_max_height;
    
    let Grid1 = svgToGridCoordinate(x1, y1);

    let x2 = (bbox_origin[0]-1)*cellWidth + cellWidth *regionWidth - rect_width;
    let y2 = bbox_origin[1]*cellHeight + accumulative_y_offset + last_row_max_height;
    let Grid2 = svgToGridCoordinate(x2, y2);

    rectangleCoordinates.push([
      Grid1.x,
      Grid1.y,
      rectangles[i].width,
      rectangles[2 * i + first_row_rect_number].height,
      rectangles[2 * i + first_row_rect_number].name,
    ]);
    rectangleCoordinates.push([
      Grid2.x,
      Grid2.y,
      rectangles[i].width,
      rectangles[2 * i + 1 + first_row_rect_number].height,
      rectangles[2 * i + 1 + first_row_rect_number].name,
    ]);
    accumulative_y_offset += last_row_max_height + y_offset;
    last_row_max_height = Math.max(
      cellHeight*rectangles[i + first_row_rect_number].height,
      cellHeight*rectangles[2 * i + 1 + first_row_rect_number].height,
    );
  }
  accumulative_y_offset += last_row_max_height+ y_offset;
  // last row
  const last_row_rect_number =
    rectangles.length - first_row_rect_number - middle_row_number * 2;
  const last_row_offset_left =
    (cellWidth *regionWidth -
      (last_row_rect_number * rect_width +
        (last_row_rect_number - 1) * space_between_rectangles)) /
    2;
  for (let i = 0; i < last_row_rect_number; i++) {

    let x = (bbox_origin[0]-1)*cellWidth + last_row_offset_left + i * (rect_width + space_between_rectangles);
    let y = bbox_origin[1]*cellHeight + accumulative_y_offset;
    let Grid = svgToGridCoordinate(x, y);


    rectangleCoordinates.push([
      Grid.x,
      Grid.y,
      rectangles[i].width,
      rectangles[i + first_row_rect_number + middle_row_number * 2].height,
      rectangles[i + first_row_rect_number + middle_row_number * 2].name,
    ]);
  }
  return rectangleCoordinates;
}


function Placing_node(bboxWidth, bboxHeight, rectangles, bbox_origin, inLinks) {

  console.log({inLinks})
  
  const numRectangles = rectangles.length;
  const gridSize = Math.floor(5*Math.sqrt(numRectangles));
  let grid = Array.from({ length: bboxHeight }, () => Array(bboxWidth).fill(0));
  let tempInitial = Math.floor(2 * Math.sqrt(numRectangles));
  const tempMin = 0.2;
  const iterationCount = 90 * Math.floor(Math.sqrt(numRectangles));
  const coolingRate = Math.pow(tempMin / tempInitial, 1 / iterationCount);
  let compactedNodes = rectangles;
  let visibilityGraph = generateVisibilityGraph(rectangles);
  let compactionDir = true;

  // Adjust origin
  const originX = bbox_origin[0];
  const originY = bbox_origin[1];
  // console.log({rectangles})
  // place node randomly and treat them all 1*1 sized
  rectangles.forEach((rect, index) => {
    let placed = false;
    while (!placed) {
      const x = Math.floor(Math.random() * (bboxWidth - rect.width + 1));
      const y = Math.floor(Math.random() * (bboxHeight - rect.height + 1));

      if (isPlaceable(grid, x, y, 1, 1)) {
        placeRectangle(grid, x, y, 1, 1, 1); // Mark the grid as used with 1
        rect.x = x; // Record the x position
        rect.y = y; // Record the y position
        placed = true;
      }
    }
  });
  
  // console.log(grid.map(row => row.join(' ')).join('\n'));



  const neighbors: { [ key: string]: string[] } = {};
  rectangles.forEach(rect => {
    neighbors[rect.name] = inLinks
        .filter(link => link.source.variable_name === rect.name || link.target.variable_name === rect.name)
        .reduce((acc, link) => {
            const neighborName = link.source.variable_name === rect.name ? link.target.variable_name : link.source.variable_name;
            if (!acc.includes(neighborName)) {
                acc.push(neighborName);
            }
            return acc;
        }, []);
  });
  // console.log({neighbors}) 
  for(let i=0; i<iterationCount/2; i++){

      rectangles.forEach(rect => {
          const rect_neighbors = neighbors[rect.name] || [];
          // console.log({rect_neighbors})
          const medianPositions = neighborsMedian(rectangles,rect.name,rect_neighbors);
            // const medianPositions = neighborsMedian(rectangles, rect, inLinks);
            const x = clamp(Math.floor((Math.random() * 2 - 1) * tempInitial + medianPositions.medianX), 0, bboxWidth - rect.width + 1);
            const y = clamp(Math.floor((Math.random() * 2 - 1) * tempInitial + medianPositions.medianY), 0, bboxHeight - rect.height + 1);
            // console.log({x,y})
            const { bestX, bestY  } = findClosestPlace(grid, x, y, 1, 1,rectangles,rect_neighbors, rect.name);
            // // if the place is different from the current place get from previous interation
            if (rect.x !== bestX || rect.y !== bestY) {
              placeRectangle(grid, rect.x!, rect.y!, 1, 1, 0); // Remove from old position
              placeRectangle(grid, bestX, bestY, 1, 1, 1); // Place at new position
              rect.x = bestX; //update 
              rect.y = bestY; //update
            } else {
              console.log("change position")
              // Find the closest occupied node
              let closestNode = rectangles.find(rect => rect.name === rect.name); ;
              let minDistance = Infinity;
      
              rectangles.forEach(otherRect => {
                  if (otherRect !== rect && !isPlaceable(grid, otherRect.x, otherRect.y, 1, 1)) {
                      const distance = Math.abs(rect.x - otherRect.x) + Math.abs(rect.y - otherRect.y);
                      if (distance < minDistance) {
                          minDistance = distance;
                          closestNode = otherRect;
                      }
                  }
              });
              console.log({closestNode})
      
              if (closestNode) {
                  const originalEdgeLength = calculateTotalEdgeLength(rect.x, rect.y, rectangles, rect_neighbors, rect.name) +
                                             calculateTotalEdgeLength(closestNode.x, closestNode.y, rectangles, rect_neighbors, closestNode.name);
                  const swappedEdgeLength = calculateTotalEdgeLength(closestNode.x, closestNode.y, rectangles, rect_neighbors, rect.name) +
                                            calculateTotalEdgeLength(rect.x, rect.y, rectangles, rect_neighbors, closestNode.name);
                  const gain = originalEdgeLength - swappedEdgeLength;
      
                  if (gain > 0) {
                      // Remove the original values from the grid
                      placeRectangle(grid, rect.x, rect.y, 1, 1, 0);
                      placeRectangle(grid, closestNode.x, closestNode.y, 1, 1, 0);

                      // Swap the nodes
                      [rect.x, closestNode.x] = [closestNode.x, rect.x];
                      [rect.y, closestNode.y] = [closestNode.y, rect.y];

                      // Add the new values to the grid
                      placeRectangle(grid, rect.x, rect.y, 1, 1, 1);
                      placeRectangle(grid, closestNode.x, closestNode.y, 1, 1, 1);
                  }
              }
          }
      });
      visibilityGraph = generateVisibilityGraph(rectangles);
      if (i % 9 === 0) {
        compactedNodes = compact(visibilityGraph, inLinks, bboxWidth,bboxHeight, 10,3,compactionDir,false);
        compactionDir = !compactionDir;
      }
      tempInitial *= coolingRate;
  }

  compact(visibilityGraph, inLinks, bboxWidth,bboxHeight, 10,3,true,true);
  compact(visibilityGraph, inLinks, bboxWidth,bboxHeight, 10,3,false,true);


  
  // console.log({rectangles})
  
  // console.log(visibilityGraph);
  // const compactedNodes = compact(visibilityGraph, inLinks, bboxWidth,bboxHeight, 10,3,false,false);
  // console.log(compactedNodes);
  // console.log(grid.map(row => row.join(' ')).join('\n'));




  let rectangleCoordinates: [number, number, number, number, string][] = [];
  compactedNodes.forEach(rect => {
    const x = rect.x+originX;
    const y = rect.y+originY;
    const width = rect.width;
    const height = rect.height;
    const name = rect.name;
    rectangleCoordinates.push([x, y, width, height, name]);
  });
  return rectangleCoordinates;
}
function compact(visibilityGraph, inLinks, bboxWidth,bboxHeight, iterations = 10,alpha=3,compactionDir:boolean,expandFactor:boolean) {
  const { nodes, edges } = visibilityGraph;
  // const alpha = 1; // Coefficient to define the minimum space between nodes
  
  // Function to calculate the objective value
  function calculateObjective(nodes) {
      let objectiveValue = 0;
      edges.forEach(edge => {
          const sourceNode = nodes.find(node => node.name === edge.source);
          const targetNode = nodes.find(node => node.name === edge.target);

          if (sourceNode && targetNode) {
              const sourceCenterX = sourceNode.x + 0.5 * (compactionDir ? (expandFactor ? sourceNode.width : 1) : (expandFactor ? sourceNode.height : 1));
              const targetCenterX = targetNode.x + 0.5 * (compactionDir ? (expandFactor ? targetNode.width : 1) : (expandFactor ? targetNode.height : 1));
              objectiveValue += Math.pow(sourceCenterX - targetCenterX, 2);
          }
      });
      return objectiveValue;
  }

  // Function to check if constraints are satisfied
  function areConstraintsSatisfied(nodes) {
      return inLinks.every(edge => {
          const sourceNode = nodes.find(node => node.name === edge.source);
          const targetNode = nodes.find(node => node.name === edge.target);

          if (sourceNode && targetNode) {
              const sourceEdge = compactionDir ? sourceNode.x + (expandFactor ? sourceNode.width : 1) : sourceNode.y + (expandFactor ? sourceNode.height : 1);
              const targetEdge = compactionDir ? targetNode.x : targetNode.y;
              const dij = alpha * (expandFactor ? (compactionDir ? sourceNode.width : sourceNode.height) : 1);
              return targetEdge - sourceEdge >= dij;
          }
          return true;
      });
  }

  let bestNodes = nodes; //initialize the best nodes with the original nodes
  let bestObjective = calculateObjective(nodes); // Calculate the initial objective value

  // Try random positions for a given number of iterations
  for (let i = 0; i < iterations; i++) {
      let newNodes = nodes

      newNodes.forEach(node => {
        if (compactionDir) {
          node.x = clamp(Math.floor(Math.random() * (bboxWidth - (expandFactor ? node.width : 1) + 1)), 0, bboxWidth - (expandFactor ? node.width : 1));
        } else {
            node.y = clamp(Math.floor(Math.random() * (bboxHeight - (expandFactor ? node.height : 1) + 1)), 0, bboxHeight - (expandFactor ? node.height : 1));
        }
      });

      if (areConstraintsSatisfied(newNodes)) {
          const newObjective = calculateObjective(newNodes);
          if (newObjective < bestObjective) {
              bestNodes = newNodes;
              bestObjective = newObjective;
          }
      }
  }

  // Update the positions of the original nodes with the best found positions
  bestNodes.forEach(bestNode => {
      const originalNode = nodes.find(node => node.name === bestNode.name);
      if (originalNode) {
          if (compactionDir) {
            originalNode.x = bestNode.x;
          } else {
              originalNode.y = bestNode.y;
          }
      }
  });

  return bestNodes;
}
function generateVisibilityGraph(rectangles) {
  const visibilityGraph = {
      nodes: rectangles,
      edges: []
  };

  // Iterate through each rectangle to determine visibility edges
  for (let i = 0; i < rectangles.length; i++) {
      const rectA = rectangles[i];

      for (let j = 0; j < rectangles.length; j++) {
          if (i === j) continue;

          const rectB = rectangles[j];

          // Ensure rectB is to the right of rectA
          if (rectB.x > rectA.x && isHorizontallyVisible(rectA, rectB, rectangles)) {
              visibilityGraph.edges.push({
                  source: rectA.name,
                  target: rectB.name
              });
          }
      }
  }

  return visibilityGraph;
}

function isHorizontallyVisible(rectA, rectB, rectangles) {
  // Check if a horizontal line segment from the right edge of rectA to the left edge of rectB
  // intersects any other rectangle
  const rightEdgeA = rectA.x + rectA.width;
  const leftEdgeB = rectB.x;

  for (const rect of rectangles) {
      if (rect === rectA || rect === rectB) continue;

      const rightEdge = rect.x + rect.width;
      const leftEdge = rect.x;

      if ((leftEdge > rightEdgeA && rightEdge < leftEdgeB) && intersects(rectA.y, rectA.y + rectA.height, rect.y, rect.y + rect.height)) {
          return false;
      }
  }

  return true;
}

function intersects(a1, a2, b1, b2) {
  return Math.max(a1, b1) < Math.min(a2, b2);
}
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function MDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}
function findClosestPlace(grid: number[][], x: number, y: number, width: number, height: number,rectangles, rect_neighbors, rectName: string) {
  let closestX = x;
  let closestY = y;
  let minDistance = Infinity;

  for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
          if (isPlaceable(grid, j, i, width, height)) {
              const distance = MDistance(x, y, j, i);
              if (distance < minDistance) {
                  minDistance = distance; //d
                  closestX = j;
                  closestY = i;
              }
          }
      }
  }
  // Check all cells within Manhattan distance d + 1 from (x,y)
  const bestPosition = PositionWithinD1(grid, x, y, minDistance + 1, width, height,rectangles, rect_neighbors,rectName);
  return bestPosition ;
}

function PositionWithinD1(grid: number[][], x: number, y: number, maxDistance: number, width: number, height: number,rectangles, rect_neighbors,rectName: string) {
  let bestX = x;
  let bestY = y;
  let minEdgeLength = Infinity;

  for (let i = Math.max(0, y - maxDistance); i < Math.min(grid.length, y + maxDistance + 1); i++) {
      for (let j = Math.max(0, x - maxDistance); j < Math.min(grid[0].length, x + maxDistance + 1); j++) {
          if (MDistance(x, y, j, i) <= maxDistance && isPlaceable(grid, j, i, width, height)) {
              const edgeLength = calculateTotalEdgeLength(j, i, rectangles, rect_neighbors,rectName); // Use the distance function (2)
              if (edgeLength < minEdgeLength) {
                  minEdgeLength = edgeLength;
                  bestX = j;
                  bestY = i;
              }
          }
      }
  }

  return {
    bestX: clamp(bestX, 0, grid.length - 1),
    bestY: clamp(bestY, 0, grid[0].length - 1)
  };
}
function calculateTotalEdgeLength(x: number, y: number, rectangles, rect_neighbors, rectName:string): number {

  // Find the current rectangle
  const currentRect = rectangles.find(rect => rect.name === rectName);

  if (!currentRect) return 0;
  if(! rect_neighbors) return 0;

  // extract neighbor information from global rectangles
  const neighborRects = rect_neighbors.map(name => rectangles.find(rect => rect.name === name)).filter(Boolean);

  let totalEdgeLength = 0;

  neighborRects.forEach(neighborRect => {
      const sourceCenterX = x + 0.5 * currentRect.width;
      const sourceCenterY = y + 0.5 * currentRect.height;
      const targetCenterX = neighborRect.x + 0.5 * neighborRect.width;
      const targetCenterY = neighborRect.y + 0.5 * neighborRect.height;

      const euclideanDistance = Math.sqrt(
          Math.pow(targetCenterX - sourceCenterX, 2) +
          Math.pow(targetCenterY - sourceCenterY, 2)
      );

      const alignmentTerm = (1 / 20) * Math.min(
          Math.abs(targetCenterX - sourceCenterX) / (currentRect.width + neighborRect.width),
          Math.abs(targetCenterY - sourceCenterY) / (currentRect.height + neighborRect.height)
      );

      totalEdgeLength += euclideanDistance + alignmentTerm;
  });

  return totalEdgeLength;
}
function neighborsMedian(rectangles, currentRectName, neighbors) {
    const currentRect = rectangles.find(rect => rect.name === currentRectName); //name,width,height,x,y
    const neighborRects = neighbors.map(name => rectangles.find(rect => rect.name === name)).filter(Boolean);
    if (neighbors.length === 0) { // if no neighbors, return the position of the current rectangle
      return { medianX: currentRect.x!, medianY: currentRect.y! };
    }
    const xPositions = neighborRects.map(neighbor => neighbor.x!); //x position of all neighbors
    const yPositions = neighborRects.map(neighbor => neighbor.y!); //y position of all neighbors

    const medianX = median(xPositions);
    const medianY = median(yPositions);
    return { medianX, medianY };
}

// function neighborsMedian(rectangles, currentRectName, neighbors) {
//   // Find the current rectangle
//   const currentRect = rectangles.find(rect => rect.name === currentRectName);
//   if (!currentRect) return { medianX: 0, medianY: 0 };

//   // Get the neighbors of the current rectangle
//   const neighborNames = neighbors[currentRectName] || [];
//   const neighborRects = neighborNames.map(name => rectangles.find(rect => rect.name === name)).filter(Boolean);

//   if (neighborRects.length === 0) {
//       return { medianX: currentRect.x + 0.5 * currentRect.width, medianY: currentRect.y + 0.5 * currentRect.height };
//   }

//   // Calculate the centers of the neighbors
//   const neighborCentersX = neighborRects.map(rect => rect.x + 0.5 * rect.width);
//   const neighborCentersY = neighborRects.map(rect => rect.y + 0.5 * rect.height);

//   // Calculate the median of the centers
//   const medianX = median(neighborCentersX);
//   const medianY = median(neighborCentersY);

//   return { medianX, medianY };
// }

function median(values) {
  if (values.length === 0) return 0;
  values.sort((a, b) => a - b);
  const half = Math.floor(values.length / 2);

  if (values.length % 2) {
      return values[half];
  } else {
      return (values[half - 1] + values[half]) / 2.0;
  }
}
function isPlaceable(grid, x, y, width, height) {
  for (let i = y; i < y + height; i++) {
      for (let j = x; j < x + width; j++) {
        if (grid[i][j] !== 0) return false;
      }
  }
  return true;
}

function placeRectangle(grid, x, y, width, height, value: number) {
  for (let i = y; i < y + height; i++) {
      for (let j = x; j < x + width; j++) {
          grid[i][j] = value;
      }
  }
}

function combineData(
  vars: tVariableType,
  rectangles: [number, number, number, number, string][],
): tRectObject[] {
  return rectangles.map((rect) => {
    let [x, y, width, height, variable_name] = rect;
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


function dijkstra(link, grid, points) {
  // console.log("dijkstra", start, goal);

  let start, goal;
  if (link.source.var_type == "state" && link.target.var_type == "impact") {
      start = getNextStartPoint(link.source.var_name, points);
      goal = getNextEndPoint(link.target.var_name, points);
  } else {
      start = [link.source.newX_source, link.source.newY_source];
      goal = [link.target.newX_target, link.target.newY_target];
  }

  // console.log({ start, goal });

  const rows = grid.length;
  const cols = grid[0].length;
  const openSet = new PriorityQueue();
  const cameFrom = new Map();
  const costSoFar = new Map();
  const directions = [[1, 0], [-1, 0],[0, 1], [0, -1]];

  // Manually set the first point after start
  const initialPoint = [start[0] - 1, start[1]];
  if (
      initialPoint[0] >= 0 &&
      initialPoint[0] < cols &&
      initialPoint[1] >= 0 &&
      initialPoint[1] < rows &&
      grid[initialPoint[1]][initialPoint[0]] !== 2 
  ) {
      openSet.enqueue(1, initialPoint);
      cameFrom.set(initialPoint.toString(), start);
      costSoFar.set(initialPoint.toString(), 1);
  } else {
      return null; // No valid initial point found
  }

  costSoFar.set(start.toString(), 0);
  openSet.enqueue(0, start);

  while (!openSet.isEmpty()) {
      const current = openSet.dequeue();
      // console.log({ current });

      if (current[0] === goal[0] && current[1] === goal[1]) {
          const path = [];
          let temp = current;
          while (temp) {
              path.push(temp);
              temp = cameFrom.get(temp.toString());
          }
          path.reverse();
          return path;
      }

      for (const direction of directions) {
          const neighbor = [current[0] + direction[0], current[1] + direction[1]];
          const [x, y] = neighbor;
          

          if (
              x >= 0 &&
              x < cols &&
              y >= 0 &&
              y < rows &&
              grid[y][x] !== 2 
          ) {
              const newCost = costSoFar.get(current.toString()) + 1;

              if (
                  !costSoFar.has(neighbor.toString()) ||
                  newCost < costSoFar.get(neighbor.toString())
              ) {
                  costSoFar.set(neighbor.toString(), newCost);
                  const priority = newCost;
                  openSet.enqueue(priority, neighbor);
                  cameFrom.set(neighbor.toString(), current);
              }
          }
      }
  }

  return null; // No path found
}


function generatePoints(linkCounts) {
  const result = {};

  for (const varName in linkCounts) {
    const { outLinks, inLinks, x, y, width, height } = linkCounts[varName];

    const startPoints = [];
    const endPoints = [];

    let remainingOutLinks = outLinks;
    for (let i = 0; i <= height && remainingOutLinks > 0; i += 1) {
      startPoints.push([x , y+i]);
      remainingOutLinks--;
    }

    while (remainingOutLinks > 0) {
      startPoints.push([x, y]); // Assign the left-top point
      remainingOutLinks--;
    }

    // Generate end points for inLinks from the right edge
    let remainingInLinks = inLinks;
    for (let j = 1; j <= width && remainingInLinks > 0; j += 1) {
      endPoints.push([x + j, y]);
      remainingInLinks--;
    }

    while (remainingInLinks > 0) {
      endPoints.push([x + width, y]); // Assign the right-bottom point
      remainingInLinks--;
    }

    result[varName] = {
      startPoints,
      endPoints
    };
  }

  return result;
}

function getNextStartPoint(varName, points) {
  const pointData = points[varName];
  // console.log({pointData})
  return pointData.startPoints.shift();
}

function getNextEndPoint(varName, points) {
  const pointData = points[varName];
  return pointData.endPoints.shift();
}