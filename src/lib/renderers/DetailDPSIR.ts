import * as d3 from "d3";
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
} from "../types/variables";
import * as Constants from "../constants";
import * as grid_layout from "./grid_layout";

export const DetailDPSIR = {
  init(svgId: string) {
    // console.log("init detailed");
    this.clicked_rect = null;
    this.clicked_link = null;
    this.rectClicked = false;
    this.linkClicked = false;
    this.width = 1550;
    this.height = 950;
    this.padding = { top: 10, right: 50, bottom: 10, left: 50 };
    this.rows = 300;
    this.columns = 240;
    this.global_rects = [];
    this.grid_renderer = grid_layout.grid_renderer;
    this.grid_renderer.init(this.rows, this.columns);
    this.cellWidth = this.width / this.grid_renderer.columns;
    this.cellHeight = this.height / this.grid_renderer.rows;
    this.svgId = svgId;
    this.dispatch = d3.dispatch("VarOrLinkSelected", "VarTypeUnSelected");
    this.varTypeColorScale = null;
    this.varCoordinatesDict = {};
    const self = this;
    const svg = d3
      .select("#" + svgId)
      .attr("viewBox", `0 0 ${this.width} ${this.height}`);

    const bbox_group = svg.append("g").attr("class", "detail-bbox-group");
    const link_group = svg.append("g").attr("class", "detail-link-group");
    const tag_group = svg.append("g").attr("class", "detail-tag-group");
    Constants.var_type_names.forEach((var_type_name) => {
      bbox_group.append("g").attr("class", `${var_type_name}`);
      tag_group.append("g").attr("class", `${var_type_name}`);
    });
  },
  on(event, handler) {
    this.dispatch.on(event, handler);
  },

  resetHighlights() {
    d3.selectAll("rect.box")
      .classed("box-highlight", false)
      .classed("clicked-box-highlight", false)
      .classed("box-not-highlight", false);
    // .transition()
    // .duration(250)
    // .attr("transform", ""); // Reset transformation on all boxes to remove any previous magnification
    d3.selectAll("text.label")
      .classed("box-label-highlight", false)
      .classed("box-label-not-highlight", false);
    d3.selectAll("path.link")
      .classed("link-highlight", false)
      .classed("detail-link-not-highlight", false)
      .attr("stroke", "gray")
      .attr("pointer-events", "default");
    // .attr("marker-end", "");
    d3.selectAll("g.tag")
      .select("image")
      .classed("box-icon-highlight", false)
      .classed("box-icon-not-highlight", false);
    console.log("click on svg");
    this.dispatch.call("VarOrLinkSelected", null, null);
    this.dispatch.call("VarTypeUnSelected", null, null);
    this.clicked_link = null;
    this.clicked_rect = null;
    this.rectClicked = false;
    this.linkClicked = false;
  },

  // toggleLinks(showLinks: boolean) {
  //   this.showLinks = showLinks;
  // },
  categorizedLinkByVarType(
    vars: Record<string, { variable_mentions: Record<string, any> }>,
    links: Array<{
      source: { var_type: string; variable_name: string };
      target: { var_type: string; variable_name: string };
    }>,
    var_type_names: Array<string>,
  ): Record<
    string,
    Record<string, { inGroup_link: number; outGroup_link: number }>
  > {
    type VarTypeNames = string;

    let categorizedLinks: Record<
      VarTypeNames,
      Record<string, { inGroup_link: number; outGroup_link: number }>
    > = {};

    // Initialize categorizedLinks with var_type_names
    var_type_names.forEach((name) => {
      categorizedLinks[name] = {};
    });

    // Initialize categorizedLinks with variable names
    Object.keys(vars).forEach((varType) => {
      const type = vars[varType];
      Object.keys(type.variable_mentions).forEach((varName) => {
        if (!categorizedLinks[varType][varName]) {
          categorizedLinks[varType][varName] = {
            inGroup_link: 0,
            outGroup_link: 0,
          };
        }
      });
    });

    // Categorize links
    links.forEach((link) => {
      const { source, target } = link;
      const isInGroup = source.var_type === target.var_type;

      // Ensure source and target entries exist
      [source, target].forEach((node) => {
        if (!categorizedLinks[node.var_type][node.variable_name]) {
          categorizedLinks[node.var_type][node.variable_name] = {
            inGroup_link: 0,
            outGroup_link: 0,
          };
        }
      });

      // Increment link counts
      if (isInGroup) {
        categorizedLinks[source.var_type][source.variable_name].inGroup_link +=
          1;
        categorizedLinks[target.var_type][target.variable_name].inGroup_link +=
          1;
      } else {
        categorizedLinks[source.var_type][source.variable_name].outGroup_link +=
          1;
        categorizedLinks[target.var_type][target.variable_name].outGroup_link +=
          1;
      }
    });

    return categorizedLinks;
  },

  calculateBoxInfo(vars, links, var_type_names: string[], bboxes) {
    const categorizedLinks = this.categorizedLinkByVarType(
      vars,
      links,
      var_type_names,
    );
    Object.values(var_type_names).forEach((varType: string) => {
      let linkCount = categorizedLinks[varType];
      const rectWidth = 20; //(g)
      const rectangles = Object.entries(linkCount)
        .map(([name, counts]) => {
          return {
            name,
            width: rectWidth,
            height: 12, // height might be adjusted later as needed
            outgroup_degree:
              linkCount[name].outGroup_link + linkCount[name].inGroup_link,
          };
        })
        .sort(
          (a, b) =>
            linkCount[b.name].outGroup_link - linkCount[a.name].outGroup_link,
        );
      // console.log({ rectangles });
      const { rectangleCoordinates, bbox } = grid_layout.squareLayout(
        rectangles,
        bboxes[varType],
      );
      bboxes[varType] = bbox;
      this.varCoordinatesDict[varType] = rectangleCoordinates;
    });

    return bboxes;
  },
  update_vars(
    vars: tDPSIR,
    links: tVisLink[],
    varTypeColorScale: Function,
    all_selected_types,
    bboxes,
    clickable: boolean,
  ) {
    this.grid_renderer?.reset_global_grid(this.rows, this.columns);
    // console.log(this.grid_renderer.global_grid)
    // this.varTypeColorScale = varTypeColorScale;
    const var_type_names = Constants.var_type_names;
    // type VarTypeNames = (typeof var_type_names)[number];
    const self = this;
    // TODO: feed the selected varType to drawVars and drawLinks
    Object.values(var_type_names).forEach((varType) => {
      self.drawVars(
        varTypeColorScale,
        vars[varType],
        varType,
        bboxes[varType],
        clickable,
      );
    });
    this.drawLinks(links, bboxes, all_selected_types);
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
    varTypeColorScale: Function,
    vars: tVariableType,
    varType: string,
    bbox_info: { center: [number, number]; size: [number, number] },
    clickable: boolean,
  ) {
    console.log("varCoordinatesDict", this.varCoordinatesDict, varType);
    const varCoordinates = this.varCoordinatesDict[varType];
    // console.log(vars);
    this.varTypeColorScale = varTypeColorScale;
    const self = this;
    const var_type_name = vars.variable_type;
    // console.log(rectangleCoordinates);
    const rectWithVar = grid_layout.combineData(
      vars,
      varCoordinates,
      this.grid_renderer?.global_grid,
    ); //return as an object
    // console.log(rectWithVar);
    //merge all rects info(grid coordinate position and size) to a global var
    rectWithVar.forEach((rect) => {
      self.global_rects?.push(rect);
    });
    // min and max frequency for each group
    let minMentions = Infinity;
    let maxMentions = -Infinity;

    // Object.values(vars.variable_mentions).forEach((variable: tVariable) => {
    //   const length = variable.mentions.length;
    //   if (length < minMentions) minMentions = length;
    //   if (length > maxMentions) maxMentions = length;
    // });

    Object.values(rectWithVar).forEach((rect: tRectObject) => {
      const degree = rect.degree;
      if (degree < minMentions) minMentions = degree;
      if (degree > maxMentions) maxMentions = degree;
    });

    this.drawBbox(
      var_type_name,
      bbox_info.center,
      bbox_info.size[0],
      bbox_info.size[1],
      clickable,
    );
    const scaleVarColor = d3
      .scaleLinear()
      .domain([minMentions, maxMentions])
      .range(["#f7f7f7", self.varTypeColorScale(var_type_name)]);

    //draw each variable
    this.drawTags(var_type_name, rectWithVar, scaleVarColor);
  },

  drawLinks(links: tVisLink[], bboxes, all_selected_types) {
    const self = this;
    // let global_grid: string[][] = this.grid_renderer.global_grid;
    let cellWidth: number = self.cellWidth;
    let cellHeight: number = self.cellHeight;
    const frequencyList = grid_layout.calculateFrequencyList(links); // includes variables frequency and link frequency among all groups
    // console.log(frequencyList);
    const varTypeOrder = {
      "driver-pressure": 1,
      "pressure-state": 2,
      "state-impact": 7,
      "impact-response": 6,
      "response-driver": 5,
      "response-pressure": 4,
      "response-state": 3,
    };

    // Function to get the order of the var_type pair
    function getVarTypePairOrder(sourceType, targetType) {
      const pair = `${sourceType}-${targetType}`;
      return varTypeOrder[pair] || 999; // Default order if pair is not found
    }

    function getManhattanDistance(rect1, rect2, prioritize = "y") {
      const xDistance = Math.abs(rect1?.x - rect2?.x);
      const yDistance = Math.abs(rect1?.y - rect2?.y);

      return xDistance + yDistance;
    }

    console.log(all_selected_types);
    links = links.filter((link) => {
      const linkSourceType = link.source.var_type;
      const linkTargetType = link.target.var_type;

      // Check if the link matches any of the selected types
      return all_selected_types.some(
        ({ source, target }) =>
          linkSourceType === source && linkTargetType === target,
      );
    });

    console.log(links);
    // Sort the links
    links.sort((a, b) => {
      const aOrder = getVarTypePairOrder(a.source.var_type, a.target.var_type);
      const bOrder = getVarTypePairOrder(b.source.var_type, b.target.var_type);

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      } else {
        // Get the rectangles for source and target variables
        const aSourceRect = this.global_rects?.find(
          (rect) => rect.variable_name === a.source.variable_name,
        );
        const aTargetRect = this.global_rects?.find(
          (rect) => rect.variable_name === a.target.variable_name,
        );
        const bSourceRect = this.global_rects?.find(
          (rect) => rect.variable_name === b.source.variable_name,
        );
        const bTargetRect = this.global_rects?.find(
          (rect) => rect.variable_name === b.target.variable_name,
        );

        // Calculate the Manhattan distances
        const aDistance = getManhattanDistance(aSourceRect, aTargetRect);
        const bDistance = getManhattanDistance(bSourceRect, bTargetRect);

        // Sort by Manhattan distance
        return aDistance - bDistance;
      }
    });
    // console.log("link sort done");

    const svg = d3.select("#" + this.svgId);
    const mergedData: (tLinkObject | undefined)[] = links.map((link) => {
      const source_block = document
        .querySelector(`g.${link.source.var_type}`)
        ?.querySelector(`#${link.source.var_type}`);
      const target_block = document
        .querySelector(`g.${link.target.var_type}`)
        ?.querySelector(`#${link.target.var_type}`);
      const sourceElement = this.global_rects?.find(
        (rect) => rect.variable_name === link.source.variable_name,
      );
      const targetElement = this.global_rects?.find(
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
    // console.log("link merged");
    let filteredMergeData: tLinkObject[] = mergedData.filter(
      (data) => data !== null,
    ) as tLinkObject[];

    let linkCounts = {};

    filteredMergeData.forEach((item) => {
      if (item === null) return;

      const sourceVarName = item?.source.var_name;
      const targetVarName = item?.target.var_name;
      const isInGroup = item?.source.var_type === item?.target.var_type;

      // Initialize or update the source
      if (!linkCounts[sourceVarName]) {
        linkCounts[sourceVarName] = {
          InGroup_links: 0,
          OutGroup_links: 0,
          InGroup_inLinks: 0,
          InGroup_outLinks: 0,
          OutGroup_inLinks: 0,
          OutGroup_outLinks: 0,
          x: item?.source.leftTop[0],
          y: item?.source.leftTop[1],
          width: item?.source.width,
          height: item?.source.height,
          boundry: item?.source.boundary,
          position: item?.source.position,
        };
      }
      // Initialize or update the target
      if (!linkCounts[targetVarName]) {
        linkCounts[targetVarName] = {
          InGroup_links: 0,
          OutGroup_links: 0,
          InGroup_inLinks: 0,
          InGroup_outLinks: 0,
          OutGroup_inLinks: 0,
          OutGroup_outLinks: 0,
          x: item?.target.leftTop[0],
          y: item?.target.leftTop[1],
          width: item?.target.width,
          height: item?.target.height,
          boundry: item?.target.boundary,
          position: item?.target.position,
        };
      }
      if (isInGroup) {
        linkCounts[sourceVarName].InGroup_outLinks += 1;
        linkCounts[targetVarName].InGroup_inLinks += 1;
        linkCounts[sourceVarName].InGroup_links += 1;
        linkCounts[targetVarName].InGroup_links += 1;
      } else {
        linkCounts[sourceVarName].OutGroup_outLinks += 1;
        linkCounts[targetVarName].OutGroup_inLinks += 1;
        linkCounts[sourceVarName].OutGroup_links += 1;
        linkCounts[targetVarName].OutGroup_links += 1;
      }
    });
    // console.log(filteredMergeData);
    // // filteredMergeData = filteredMergeData.slice(0, 10);
    // console.log("link filtered");
    const points = grid_layout.generatePoints(linkCounts);

    // M: move to, H: horizontal line, V: vertical line
    const lineGenerator = (link, i, bbox_source, bbox_target) => {
      let source_grid, target_grid;

      source_grid = [link.source.newX_source, link.source.newY_source];
      target_grid = [link.target.newX_target, link.target.newY_target];

      let path_points;

      // if (
      //   !((link.source.var_type === "driver" && (link.target.var_type === "impact" || link.target.var_type === "state")) ||
      //     ((link.source.var_type === "impact" || link.source.var_type === "state") && link.target.var_type === "driver"))
      // ) {
      path_points = grid_layout.pathFinding(
        link,
        this.grid_renderer.global_grid,
        points,
      );
      // }

      if (path_points) {
        const svgPath = path_points.map((point) =>
          grid_layout.gridToSvgCoordinate(
            point[0],
            point[1],
            cellWidth,
            cellHeight,
          ),
        );

        const d3Path = d3.path();
        // d3Path.moveTo(svgPath[0].x, svgPath[0].y);
        if (link.source.var_type == link.target.var_type) {
          d3Path.moveTo(svgPath[0].x, svgPath[0].y);
          d3Path.quadraticCurveTo(
            grid_layout.gridToSvgCoordinate(
              bboxes[link.source.var_type].center[0],
              bboxes[link.source.var_type].center[1],
              cellWidth,
              cellHeight,
            ).x,
            grid_layout.gridToSvgCoordinate(
              bboxes[link.source.var_type].center[0],
              bboxes[link.source.var_type].center[1],
              cellWidth,
              cellHeight,
            ).y,
            svgPath[1].x,
            svgPath[1].y,
          );
          return d3Path.toString();
        } else {
          // for (let i = 1; i < svgPath.length; i++) {
          //   d3Path.lineTo(svgPath[i].x, svgPath[i].y);
          // }
          const sourcePoint = svgPath[0];
          const targetPoint = svgPath[1];
          const dx = targetPoint.x - sourcePoint.x;
          const dy = targetPoint.y - sourcePoint.y;
          const dr = Math.sqrt(dx * dx + dy * dy) * 0.8; // Increase radius by 20% for more pronounced curves
          // const dScale = d3
          //   .scaleLinear()
          //   .domain([
          //     Math.min(...pairInfo.map((d) => d.count)),
          //     Math.max(...pairInfo.map((d) => d.count)),
          //   ])
          //   .range([0.99, 0.84]); // Adjust this range as needed
          // const startPoint = {
          //   x: sourcePoint.x + dx * 0.05,
          //   y: sourcePoint.y + dy * 0.05,
          // };
          // const endPoint = {
          //   x: sourcePoint.x + dx * 0.95,
          //   y: sourcePoint.y + dy * 0.95,
          // };
          // const sweepFlag = link.reverse ? 1 : 0;
          // Create the partial arc path
          return `M${sourcePoint.x},${sourcePoint.y}A${dr},${dr} 0 0 0 ${targetPoint.x},${targetPoint.y}`;
        }

        // return d3Path.toString();
      }
    };

    const link_paths = svg
      .select("g.detail-link-group")
      .selectAll(".link")
      .data(filteredMergeData)
      .join("path")
      .attr("class", (d) => `link ${d.source.var_type}-${d.target.var_type}`)
      .attr("id", (d) => `${d.source.var_name}` + "-" + `${d.target.var_name}`)
      .attr("cursor", "pointer")
      .attr("fill", "none")
      // .attr("stroke", "url(#grad)")
      // .attr("stroke",d=> scaleColor(d.frequency))
      .attr("stroke", (d) => {
        return "gray";
      })
      .attr("stroke-width", function (d: tLinkObject) {
        const widthSacle = d3
          .scaleLinear()
          .domain([
            frequencyList.minLinkFrequency,
            frequencyList.maxLinkFrequency,
          ])
          .range([2, 10]);
        return widthSacle(d.frequency);
        return 1;
      })
      .attr("opacity", (d) => {
        return d.source.var_type == d.target.var_type ? 0.1 : 0.1;
      })
      .on("mouseover", function (e, d: tLinkObject) {
        if (!self.rectClicked && !self.linkClicked) {
          // if(!self.rectClicked ){
          d3.select(this).classed("line-hover", true);
        }
        // .attr("stroke", (d: tLinkObject) => {
        //   // const svg = d3.select("#" + self.svgId);
        //   // return createOrUpdateGradient(svg, d, self);
        //   return self.varTypeColorScale(d.source.var_type);
        // });
      })
      .on("mouseout", function (e, d) {
        d3.select(this).classed("line-hover", false);
        if (!d3.select(this).classed("link-highlight")) {
          //if the link is clicked then do not change the color
          d3.select(this).attr("stroke", "gray");
        }
        d3.selectAll(".link-frequency-text").remove();
      })
      .on("click", function (e, d: tLinkObject) {
        e.preventDefault();

        const detailLinks = d3.select("g.detail-link-group");
        const links = detailLinks
          .selectAll("path.link")
          .classed("link-highlight", false)
          .classed("detail-link-not-highlight", true)
          .attr("stroke", "gray");
        // .attr("pointer-events","none")
        // .attr("marker-end", "");

        const rects = d3
          .selectAll("rect.box")
          .classed("box-highlight", false)
          .classed("clicked-box-highlight", false)
          .classed("box-not-highlight", true);

        const labels = d3
          .selectAll("text.label")
          .classed("box-label-highlight", false)
          .classed("box-label-not-highlight", true);

        const icons = d3
          .selectAll("g.tag")
          .select("image")
          .classed("box-icon-highlight", false)
          .classed("box-icon-not-highlight", true);

        if (self.clicked_link === d) {
          self.clicked_link = null;
          self.linkClicked = false;
          // self.handlers.VarOrLinkSelected(null);
          self.dispatch.call("VarOrLinkSelected", null, null);
          d3.selectAll("rect.box")
            .classed("box-highlight", false)
            .classed("clicked-box-highlight", false)
            .classed("box-not-highlight", false);
          d3.selectAll("text.label")
            .classed("box-label-highlight", false)
            .classed("box-label-not-highlight", false);
          d3.selectAll("path.link")
            .classed("link-highlight", false)
            .classed("detail-link-not-highlight", false)
            .attr("stroke", "gray")
            .attr("pointer-events", "default");
          // .attr("marker-end", "");
          d3.selectAll("g.tag")
            .select("image")
            .classed("box-icon-highlight", false)
            .classed("box-icon-not-highlight", false);
        } else {
          self.clicked_link = d;
          self.linkClicked = true;
          // self.handlers.VarOrLinkSelected(d);
          self.dispatch.call("VarOrLinkSelected", null, d.mentions);
          d3.select(this)
            .classed("link-highlight", true)
            .classed("detail-link-not-highlight", false)
            .raise()
            .attr("stroke", (d: tLinkObject) => {
              // const svg = d3.select("#" + self.svgId);
              // return createOrUpdateGradient(svg, d, self);
              return self.varTypeColorScale(d.source.var_type);
            })
            .attr("marker-end", (d: tLinkObject) => {
              const svg = d3.select("#" + self.svgId);
              return grid_layout.createArrow(svg, d, self);
            });

          rects
            .filter(
              (box_data: tRectObject) =>
                box_data.variable_name === d.source.var_name ||
                box_data.variable_name === d.target.var_name,
            )
            .classed("clicked-box-highlight", true)
            .classed("box-not-highlight", false);

          d3.select(`image#${d.source.var_name}`)
            .classed("clicked-box-highlight", true)
            .classed("box-not-highlight", false);

          d3.select(`image#${d.target.var_name}`)
            .classed("clicked-box-highlight", true)
            .classed("box-not-highlight", false);

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

    link_paths
      // .filter((d) => d.source.var_type === d.target.var_type)
      .attr("d", function (d, i) {
        return lineGenerator(
          d,
          i,
          bboxes[d.source.var_type],
          bboxes[d.target.var_type],
        );
      });

    // draw links with animation
    // let next_path_index = 0;
    // let isTimerRunning = false;
    // const differentTypePaths = link_paths.filter(d => d.source.var_type !== d.target.var_type);
    // const t = d3.timer(() => {
    //   if (!isTimerRunning) {
    //     isTimerRunning = true;
    //     // self.handlers.EnableLinks(false);
    //   }
    //   const next_path = differentTypePaths.filter((d, i) => i === next_path_index);
    //   next_path
    //     .transition()
    //     .duration(0)
    //     .attr("d", function (d, i) {
    //       return lineGenerator(
    //         d,
    //         i,
    //         bboxes[d.source.var_type],
    //         bboxes[d.target.var_type],
    //       );
    //     });
    //   next_path_index++;
    //   if (next_path_index >= link_paths.size()) {
    //     console.log("done");
    //     t.stop();
    //     // this.enable = !this.enable;
    //     isTimerRunning = false;
    //     // self.handlers.EnableLinks(true);
    //   }
    // });
  },

  drawBbox(
    var_type_name: string,
    bbox_center: number[],
    bboxWidth: number,
    bboxHeight: number,
    clickable: boolean,
  ) {
    const self = this;
    let cellWidth: number = self.cellWidth;
    let cellHeight: number = self.cellHeight;
    let varTypeColorScale = self.varTypeColorScale;
    const group = d3
      .select("#" + this.svgId)
      .select("g.detail-bbox-group")
      .select(`.${var_type_name}`);

    // group bounding box
    // group
    //   .select("g.bbox-group")
    //   .append("rect")
    //   .attr("class", "bbox")
    //   .attr("id", var_type_name)
    //   .attr(
    //     "x",
    //     grid_layout.gridToSvgCoordinate(
    //       bbox_center[0] - bboxWidth / 2,
    //       bbox_center[1] - bboxHeight / 2,
    //       cellWidth,
    //       cellHeight,
    //     ).x,
    //   )
    //   .attr(
    //     "y",
    //     grid_layout.gridToSvgCoordinate(
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
    const bbox_coordinates = grid_layout.gridToSvgCoordinate(
      bbox_center[0],
      bbox_center[1],
      cellWidth,
      cellHeight,
    );
    group
      .append("rect")
      .attr("class", "bbox-label-container")
      .attr("x", bbox_coordinates.x - (bboxWidth * cellWidth) / 2)
      .attr("y", bbox_coordinates.y - (bboxHeight * cellHeight) / 2)
      .attr("width", bboxWidth * cellWidth)
      .attr("height", bboxHeight * cellHeight)
      .attr("fill", "white")
      .lower();
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
      // .select("g.detail-bbox-group")
      .append("text")
      .attr("class", "bbox-label")
      .attr("id", `${var_type_name}` + `_label`)
      .attr(
        "x",
        grid_layout.gridToSvgCoordinate(
          bbox_center[0],
          bbox_center[1] - bboxHeight / 2 - 5,
          cellWidth,
          cellHeight,
        ).x,
      )
      .attr(
        "y",
        grid_layout.gridToSvgCoordinate(
          bbox_center[0],
          bbox_center[1] - bboxHeight / 2 - 5,
          cellWidth,
          cellHeight,
        ).y,
      )
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("cursor", clickable ? "pointer" : "default")
      .text(
        var_type_name.charAt(0).toUpperCase() + var_type_name.slice(1) + "s",
      )
      .attr("text-transform", "capitalize")
      .attr("pointer-events", clickable ? "auto" : "none")
      .attr("font-family", "serif")
      // .attr("font-family", "Montserrat Alternate")
      .attr("font-style", "italic")
      .attr("font-size", "2.5rem")
      .attr("font-weight", "bold")
      .attr("fill", "#636363")
      .attr("fill", varTypeColorScale(var_type_name))
      .attr("opacity", "0.5")
      .on("click", function (event) {
        event.preventDefault();
        self.dispatch.call("VarTypeUnSelected", null, var_type_name);
      })
      .on("mouseover", function () {
        d3.select(this).attr("opacity", "1");
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", "0.5");
      });

    //group icon
    group
      // .select("g.detail-bbox-group")
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
        grid_layout.gridToSvgCoordinate(
          bbox_center[0] + (5.8 * var_type_name.length) / 2,
          bbox_center[1] - bboxHeight / 2 - 7,
          cellWidth,
          cellHeight,
        ).x,
      )
      .attr(
        "y",
        grid_layout.gridToSvgCoordinate(
          bbox_center[0] + (2 * var_type_name.length) / 2,
          bbox_center[1] - bboxHeight / 2 - 5 - 5,
          cellWidth,
          cellHeight,
        ).y,
      )
      .attr("width", 30)
      .attr("height", 30);
    // .attr("opacity", 0.5);

    // this.drawUtilities(
    //   var_type_name,
    //   bbox_center,
    //   bboxWidth,
    //   bboxHeight,
    //   this.utilities,
    // );
  },
  // drawUtilities(
  //   var_type_name: string,
  //   bbox_center: number[],
  //   bboxWidth: number,
  //   bboxHeight: number,
  //   utilities: string[],
  // ) {
  //   // console.log("draw utilities", utilities);
  //   const group = d3
  //     .select("#" + this.svgId)
  //     .select(`.${var_type_name}_region`);
  //   const utility_group = group
  //     .select("g.detail-bbox-group")
  //     .append("g")
  //     .attr("class", "utility-group")
  //     .attr("opacity", 0)
  //     .attr("pointer-events", "none");
  //   const utility_group_origin = [
  //     bbox_center[0] + (var_type_name.length + 1) * 12,
  //     bbox_center[1] - bboxHeight / 2 - 40,
  //   ];
  //   const self = this;
  //   const width = Math.max(...utilities.map((d) => d.length)) * 12;
  //   utility_group
  //     .selectAll("g.utility")
  //     .data(utilities)
  //     .join("g")
  //     .attr("class", "utility")
  //     .attr(
  //       "transform",
  //       `translate(${utility_group_origin[0]}, ${utility_group_origin[1]})`,
  //     )
  //     .each(function (d: string, i) {
  //       const utility_container = d3.select(this);
  //       utility_container.selectAll("*").remove();
  //       const height = 20;
  //       const y_offset = 1;
  //       const utility_attrs = {
  //         parent: utility_container,
  //         class_name: d,
  //         activated_color: "rgb(187 247 208)",
  //         deactivated_color: "white",
  //         activated_text_color: "black",
  //         deactivated_text_color: "#aaaaaa",
  //         text: d,
  //         x: 5,
  //         y: 5 + i * (height + y_offset),
  //         width: width,
  //         height: height,
  //         onClick: () => {
  //           d3.select(this.parentNode)
  //             .attr("opacity", 0)
  //             .attr("pointer-events", "none");
  //           self.handlers[d](var_type_name);
  //         },
  //       };
  //       grid_layout.add_utility_button(utility_attrs);
  //     });
  // },

  drawTags(
    var_type_name: string,
    rectWithVar: tRectObject[],
    scaleVarColor: any,
  ) {
    const self = this;
    // let global_grid: string[][] = this.grid_renderer.global_grid;
    let cellWidth: number = self.cellWidth;
    let cellHeight: number = self.cellHeight;
    const group = d3
      .select("#" + this.svgId)
      .select("g.detail-tag-group")
      .select(`.${var_type_name}`);
    // mark rect with "*" in the grid
    // grid_layout.markOccupiedGrid(
    //   this.grid_renderer?.global_grid,
    //   rectWithVar,
    //   "*",
    // );
    // console.log({ rectWithVar });
    group
      .selectAll("g.tag")
      .data(rectWithVar)
      .join("g")
      .attr("class", "tag")
      .each(function (d: tRectObject) {
        console.log({ d });
        const tag = d3.select(this);
        tag.selectAll("*").remove();
        tag
          .append("rect")
          .attr("class", "box")
          .attr("id", d.variable_name)
          .attr(
            "x",
            grid_layout.gridToSvgCoordinate(d.x, d.y, cellWidth, cellHeight).x,
          )
          .attr(
            "y",
            grid_layout.gridToSvgCoordinate(d.x, d.y, cellWidth, cellHeight).y,
          )
          .attr("width", d.width * cellWidth)
          .attr("height", d.height * cellHeight)
          .attr("stroke", "#cdcdcd")
          .attr("stroke-width", "1px")
          .attr(
            "fill",
            scaleVarColor(d.degree),
            // d.degree !== 0 ? scaleVarColor(d.degree) : "#cdcdcd",
          )
          .attr("rx", "0.2%")
          .attr("opacity", "1")
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
            // console.log("show links", self.showLinks);
            e.preventDefault();
            // d3.selectAll("rect.box")
            //   .transition()
            //   .duration(250)
            //   .attr("transform", ""); // Reset transformation on all boxes to remove any previous magnification

            const rects = d3
              .selectAll("rect.box")
              .classed("box-highlight", false)
              .classed("clicked-box-highlight", false)
              .classed("box-not-highlight", true);
            const labels = d3
              .selectAll("text.label")
              .classed("box-label-highlight", false)
              .classed("box-label-not-highlight", true);

            //icons
            d3.selectAll("g.tag")
              .select("image")
              .classed("box-icon-highlight", false)
              .classed("box-icon-not-highlight", true);
            //links

            const detailLinks = d3.select("g.detail-link-group");
            const links = detailLinks
              .selectAll("path.link")
              .classed("link-highlight", false)
              .classed("detail-link-not-highlight", true)
              .attr("stroke", "gray");
            // .attr("pointer-events","none")

            // style changing after select a variable, including the links and labels
            if (self.clicked_rect === d) {
              self.clicked_rect = null;
              self.rectClicked = false;
              self.dispatch.call("VarOrLinkSelected", null, null);
              d3.selectAll("rect.box")
                .classed("box-highlight", false)
                .classed("clicked-box-highlight", false)
                .classed("box-not-highlight", false);
              // .attr("marker-end", "");
              d3.selectAll("text.label")
                .classed("box-label-highlight", false)
                .classed("box-label-not-highlight", false);
              links
                .classed("link-highlight", false)
                .classed("detail-link-not-highlight", false);
              // .attr("link-not-highlight", false)
              d3.selectAll("g.tag")
                .select("image")
                .classed("box-icon-highlight", false)
                .classed("box-icon-not-highlight", false);
            } else {
              self.clicked_rect = d;
              self.rectClicked = true;
              self.dispatch.call("VarOrLinkSelected", null, d.mentions); //this refer to the context of the event

              d3.select(this)
                .classed("clicked-box-highlight", true)
                .classed("box-not-highlight", false);
              //   // .raise()
              //   .transition()
              //   .duration(250);
              labels
                .filter(
                  (label_data: tRectObject) =>
                    d.variable_name === label_data.variable_name,
                )
                .classed("box-label-highlight", true)
                .classed("box-label-not-highlight", false)
                .raise();

              d3.select(`image#${d.variable_name}`)
                .classed("box-icon-highlight", true)
                .classed("box-icon-not-highlight", false);

              links
                .classed("link-highlight", false)
                .classed("detail-link-not-highlight", true)
                .attr("stroke", "gray")
                // .attr("marker-end", "")
                .filter(
                  (link_data: tLinkObject) =>
                    link_data.source.var_name === d.variable_name ||
                    link_data.target.var_name === d.variable_name,
                )
                .classed("link-highlight", true)
                .classed("detail-link-not-highlight", false)

                .raise()
                .attr("stroke", (link_data: tLinkObject) => {
                  return self.varTypeColorScale(link_data.source.var_type);
                })
                .attr("marker-end", (d: tLinkObject) => {
                  const svg = d3.select("#" + self.svgId);
                  return grid_layout.createArrow(svg, d, self);
                })
                .each(function (link_data: tLinkObject) {
                  // Highlight the target rect of each related link
                  const targetRectId = link_data.target.var_name;
                  const sourceRectId = link_data.source.var_name;

                  if (sourceRectId !== d.variable_name) {
                    d3.select(`rect#${sourceRectId}`)
                      .classed("box-highlight", true)
                      .classed("box-not-highlight", false);

                    d3.select(`image#${sourceRectId}`)
                      .classed("box-icon-highlight", true)
                      .classed("box-icon-not-highlight", false);
                  } else if (targetRectId !== d.variable_name) {
                    d3.select(`rect#${targetRectId}`)
                      .classed("box-highlight", true)
                      .classed("box-not-highlight", false);

                    d3.select(`image#${targetRectId}`)
                      .classed("box-icon-highlight", true)
                      .classed("box-icon-not-highlight", false);
                  }

                  // Highlight the label of the target rect
                  labels
                    .filter(
                      (label_data: tRectObject) =>
                        targetRectId === label_data.variable_name ||
                        sourceRectId === label_data.variable_name,
                    )
                    .classed("box-label-highlight", true)
                    .classed("box-label-not-highlight", false)
                    .raise();
                });
            }
          });

        const tagWidth = d.width * cellWidth * 0.8; //width space for text
        tag
          .append("text")
          .attr("class", "label")
          .text(d.variable_name)
          .attr("class", "label")
          .attr(
            "x",
            grid_layout.gridToSvgCoordinate(
              d.x + d.width / 2,
              d.y + d.height / 2,
              cellWidth,
              cellHeight,
            ).x,
          ) // slightly move text to the left within the rectangle
          .attr(
            "y",
            grid_layout.gridToSvgCoordinate(
              d.x + d.width / 2,
              d.y + d.height / 2,
              cellWidth,
              cellHeight,
            ).y,
          )
          .attr("fill", "black")
          .attr("font-size", "0.8rem")
          // .attr("font-weight", "bold")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("pointer-events", "none")
          .call(grid_layout.wrap, tagWidth);

        const icon_size = 20;
        if (var_type_name === "pressure") {
          tag
            .append("image")
            .attr(
              "xlink:href",
              d.factor_type === "social" ? "social.svg" : "ecological.svg",
            )
            .attr("id", d.variable_name)
            .attr(
              "x",
              grid_layout.gridToSvgCoordinate(
                d.x + d.width - 2.4,
                d.y,
                cellWidth,
                cellHeight,
              ).x,
            )
            .attr(
              "y",
              grid_layout.gridToSvgCoordinate(
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
