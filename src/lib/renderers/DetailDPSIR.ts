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
  tBbox,
} from "../types/variables";
import * as Constants from "../constants";
import * as grid_layout from "./grid_layout";
import * as arc from "./Arcs";

export const DetailDPSIR = {
  init(svgId: string) {
    // console.log("init detailed");
    this.clicked_rect = null;
    this.clicked_link = null;
    this.rectClicked = false;
    this.linkClicked = false;
    this.svgId = svgId;
    this.dispatch = d3.dispatch("VarOrLinkSelected", "VarTypeUnSelected");
    this.varTypeColorScale = null;
    const svg = d3.select("#" + svgId);
    const bbox_group = svg.append("g").attr("class", "detail-bbox-group");
    const link_group = svg.append("g").attr("class", "detail-link-group");
    const tag_group = svg.append("g").attr("class", "detail-var-group");
    // Constants.var_type_names.forEach((var_type_name) => {
    //   bbox_group.append("g").attr("class", `${var_type_name}`);
    //   tag_group.append("g").attr("class", `${var_type_name}`);
    // });
  },
  on(event, handler) {
    this.dispatch.on(event, handler);
  },
  highlighting() {
    return this.rectClicked || this.linkClicked;
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
    // this.dispatch.call("VarOrLinkSelected", null, null);
    // this.dispatch.call("VarTypeUnSelected", null, null);
    this.clicked_link = null;
    this.clicked_rect = null;
    this.rectClicked = false;
    this.linkClicked = false;
  },

  update_vars(
    vars: tDPSIR,
    links: tVisLink[],
    varTypeColorScale: Function,
    var_type_states: Record<string, { revealed: boolean }>,
    bboxes: Record<string, tBbox>,
    varCoordinatesDict: Record<string, any>,
  ) {
    this.drawVars(
      varTypeColorScale,
      vars,
      bboxes,
      varCoordinatesDict,
      var_type_states,
    );
    this.drawLinks(links, bboxes, varCoordinatesDict, var_type_states);
  },

  drawVars(
    varTypeColorScale: Function,
    var_data: tDPSIR,
    bboxes: { center: [number, number]; size: [number, number] },
    varCoordinatesDict: Record<string, any>,
    var_type_states: Record<string, { revealed: boolean }>,
  ) {
    this.varTypeColorScale = varTypeColorScale;
    this.drawBboxes(bboxes, var_type_states);
    this.drawTags(var_data, varCoordinatesDict, var_type_states, bboxes);
  },

  drawLinks(
    links: tVisLink[],
    bboxes: Record<string, tBbox>,
    varsCoordinatesDict: Record<string, any[]>,
    var_type_states: Record<string, { revealed: boolean }>,
  ) {
    const self = this;
    const frequencyList = calculateFrequencyList(links); // includes variables frequency and link frequency among all groups
    const widthScale = d3
      .scaleLinear()
      .domain([frequencyList.minLinkFrequency, frequencyList.maxLinkFrequency])
      .range([2, 10]);

    links = links.filter(
      (link) =>
        var_type_states[link.source.var_type].revealed &&
        var_type_states[link.target.var_type].revealed,
    );
    console.log({ links, var_type_states });
    const svg = d3.select("#" + this.svgId);
    const [_1, _2, svgWidth, svgHeight] = d3
      .select("#" + self.svgId)
      .attr("viewBox")
      .split(" ")
      .map((d) => +d);
    const linkData = links
      .map((link) => {
        const source_variable_bbox = varsCoordinatesDict[
          link.source.var_type
        ].find((rect) => rect[4] === link.source.variable_name);
        const target_variable_bbox = varsCoordinatesDict[
          link.target.var_type
        ].find((rect) => rect[4] === link.target.variable_name);

        if (
          source_variable_bbox === undefined ||
          target_variable_bbox === undefined
        ) {
          return undefined;
        }

        link.source.x = source_variable_bbox[0] + source_variable_bbox[2] / 2;
        link.source.y = source_variable_bbox[1] + source_variable_bbox[3] / 2;
        link.target.x = target_variable_bbox[0] + target_variable_bbox[2] / 2;
        link.target.y = target_variable_bbox[1] + target_variable_bbox[3] / 2;
        const path = arc.detailPathGenerator(link, bboxes, svgWidth, svgHeight);
        return { ...link, ...path };
      })
      .filter((link) => link !== undefined);

    console.log({ linkData });
    const link_paths = svg
      .select("g.detail-link-group")
      .selectAll(".link")
      .data(
        linkData,
        (d) => `${d.source.variable_name}-${d.target.variable_name}`,
      )
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "link")
            .attr(
              "id",
              (d: tVisLink) =>
                `${d.source.variable_name}` + "-" + `${d.target.variable_name}`,
            )
            .attr("d", (d) => arc.arcGenerator(d.arc_data))
            .attr("cursor", "pointer")
            .attr("fill", "none")
            .attr("stroke", "gray")
            .attr("stroke-width", (d: tVisLink) => widthScale(d.frequency))
            .attr("opacity", (d) =>
              d.source.var_type == d.target.var_type ? 0.1 : 0.1,
            )
            .on("mouseover", function (e, d: tVisLink) {
              if (!self.rectClicked && !self.linkClicked) {
                d3.select(this)
                  .classed("line-hover", true)
                  .attr("stroke", (d: tVisLink) =>
                    self.varTypeColorScale(d.source.var_type),
                  );
              }
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
                .classed("detail-link-not-highlight", true);
              // .attr("stroke", "gray");

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
                  // .attr("stroke", "gray")
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
                  .attr("stroke", (d: tVisLink) =>
                    self.varTypeColorScale(d.source.var_type),
                  );
                // .attr("marker-end", (d: tVisLink) =>
                //   createArrow(d3.select("#" + self.svgId), d, self),
                // );

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
            }),
        (update) =>
          update
            .transition()
            .duration(500)
            .attr("d", (d) => arc.arcGenerator(d.arc_data)),
        (exit) => exit.remove(),
      );
  },

  drawBboxes(
    bboxes: Record<string, tBbox>,
    var_type_states: Record<string, { revealed: boolean }>,
  ) {
    const self = this;
    const revealed_var_types = Object.keys(var_type_states).filter(
      (var_type) => var_type_states[var_type].revealed,
    );
    let varTypeColorScale = self.varTypeColorScale;
    d3.select("#" + this.svgId)
      .select("g.detail-bbox-group")
      .selectAll("g")
      .data(revealed_var_types)
      .join("g")
      .attr("class", (d) => d)
      .each(function (var_type_name: string) {
        const bbox_center = bboxes[var_type_name].center;
        const [bboxWidth, bboxHeight] = bboxes[var_type_name].size;

        const group = d3.select(this);
        group.selectAll("*").remove();
        group
          .append("rect")
          .attr("class", "bbox-label-container")
          .attr("x", bbox_center[0] - bboxWidth / 2)
          .attr("y", bbox_center[1] - bboxHeight / 2)
          .attr("width", bboxWidth)
          .attr("height", bboxHeight)
          .attr("fill", "white")
          .lower();
        group
          .append("text")
          .attr("class", "bbox-label")
          .attr("id", `${var_type_name}` + `_label`)
          .attr("x", bbox_center[0])
          .attr("y", bbox_center[1] - bboxHeight / 2 - 16)
          .attr("text-anchor", "middle")
          .attr("cursor", "pointer")
          .attr("dominant-baseline", "middle")
          .text(
            var_type_name.charAt(0).toUpperCase() +
              var_type_name.slice(1) +
              "s",
          )
          .attr("text-transform", "capitalize")
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
          .attr("x", bbox_center[0] + 12 * var_type_name.length)
          .attr("y", bbox_center[1] - bboxHeight / 2 - 32)
          .attr("width", 30)
          .attr("height", 30);
        // .attr("opacity", 0.5);
      });
  },

  drawTags(
    var_data: tDPSIR,
    varCoordinatesDict: Record<string, any[]>,
    var_type_states: Record<string, { revealed: boolean }>,
    bboxes: Record<string, tBbox>,
  ) {
    const self = this;
    const revealed_var_types = Object.keys(var_type_states).filter(
      (var_type) => var_type_states[var_type].revealed,
    );
    d3.select("#" + this.svgId)
      .select("g.detail-var-group")
      .selectAll("g.detail-tag-group")
      .data(revealed_var_types, (d) => d)
      .join(
        (enter) => {
          enter
            .append("g")
            .attr("id", (d) => d)
            .attr("class", "detail-tag-group")
            .each(function (var_type_name: string) {
              self.drawTagsInVarType(
                varCoordinatesDict,
                var_data,
                self.varTypeColorScale,
                var_type_name,
                d3.select(this),
              );
            });
        },
        (update) =>
          update.each(function (var_type_name: string) {
            self.drawTagsInVarType(
              varCoordinatesDict,
              var_data,
              self.varTypeColorScale,
              var_type_name,
              d3.select(this),
            );
          }),
        (exit) => exit.remove(),
      );
  },
  drawTagsInVarType(
    varCoordinatesDict,
    var_data,
    varTypeColorScale,
    var_type_name,
    parent,
  ) {
    const varCoordinates = varCoordinatesDict[var_type_name];
    const variables = var_data[var_type_name];
    const { rectWithVar, minMentions, maxMentions } = combineData(
      variables,
      varCoordinates,
    ); //return as an object
    const scaleVarColor = d3
      .scaleLinear()
      .domain([minMentions, maxMentions])
      .range(["#f7f7f7", varTypeColorScale(var_type_name)]);
    const self = this;
    parent
      .selectAll("g.tag")
      .data(rectWithVar, (d) => d.variable_name)
      .join(
        (enter) => {
          enter
            .append("g")
            .attr("class", "tag")
            .each(function (d: tRectObject) {
              const tag = d3.select(this);
              const rect = tag
                .append("rect")
                .attr("class", "box")
                .attr("id", d.variable_name)
                .attr("width", d.width)
                .attr("height", d.height)
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
                  d3.select(this.parentNode)
                    .select(".tooltip")
                    .attr("opacity", 1);
                })
                .on("mouseout", function () {
                  d3.select(this).classed("box-hover", false);
                  d3.select(this.parentNode)
                    .select(".tooltip")
                    .attr("opacity", 0);
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
                    .classed("detail-link-not-highlight", true);
                  // .attr("stroke", "gray");
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
                      // .attr("stroke", "gray")
                      // .attr("marker-end", "")
                      .filter(
                        (link_data: tVisLink) =>
                          link_data.source.variable_name === d.variable_name ||
                          link_data.target.variable_name === d.variable_name,
                      )
                      .classed("link-highlight", true)
                      .classed("detail-link-not-highlight", false)
                      .raise()
                      .attr("stroke", (link_data: tVisLink) => {
                        return self.varTypeColorScale(
                          link_data.source.var_type,
                        );
                      })
                      // .attr("marker-end", (d: tVisLink) => {
                      //   const svg = d3.select("#" + self.svgId);
                      //   return createArrow(svg, d, self);
                      // })
                      .each(function (link_data: tVisLink) {
                        // Highlight the target rect of each related link
                        const targetRectId = link_data.target.variable_name;
                        const sourceRectId = link_data.source.variable_name;

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

              rect.attr("x", d.x).attr("y", d.y);
              const tagWidth = d.width * 0.8; //width space for text
              const label = tag
                .append("text")
                .attr("class", "label")
                .text(d.variable_name)
                .attr("class", "label")
                .attr("fill", "black")
                .attr("font-size", "0.8rem")
                // .attr("font-weight", "bold")
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("pointer-events", "none");
              label
                .attr("x", d.x + d.width / 2)
                .attr("y", d.y + d.height / 2)
                .call(grid_layout.wrap, tagWidth);

              const icon_size = 20;
              if (var_type_name === "pressure") {
                tag
                  .append("image")
                  .attr(
                    "xlink:href",
                    d.factor_type === "social"
                      ? "social.svg"
                      : "ecological.svg",
                  )
                  .attr("id", d.variable_name)
                  .attr("x", d.x + d.width - 2.4)
                  .attr("y", d.y)
                  .attr("width", icon_size) // icon width
                  .attr("height", icon_size) // icon height
                  .attr("pointer-events", "none");
              }
            });
        },
        (update) =>
          update.each(function (d: tRectObject) {
            const tag = d3.select(this);
            const rect = tag.select("rect.box");
            const label = tag.select("text.label");
            const icon = tag.select("image");
            const offset = [d.x - +rect.attr("x"), d.y - +rect.attr("y")];
            rect.transition().duration(500).attr("x", d.x).attr("y", d.y);
            label
              .selectAll("tspan")
              .transition()
              .duration(500)
              .attr("x", function () {
                return +d3.select(this).attr("x") + offset[0];
              })
              .attr("y", function () {
                return +d3.select(this).attr("y") + offset[1];
              });
            icon
              .transition()
              .duration(500)
              .attr("x", d.x + d.width - 2.4)
              .attr("y", d.y);
          }),
        (exit) => exit.remove(),
      );
  },
};

function calculateFrequencyList(new_links: tVisLink[]) {
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

function createArrow(svg, d: tVisLink, self) {
  const arrowId = `arrow-${d.source.variable_name}-${d.target.variable_name}`;
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
      .attr("fill", self.varTypeColorScale(d.source.var_type));
    // .attr('fill', 'gray')
  }

  return `url(#${arrowId})`;
}

function combineData(
  vars: tVariableType,
  rectangles: [number, number, number, number, string, string, number][],
) {
  // console.log({rectangles})
  const allX = rectangles.map((rect) => rect[0]);
  const allY = rectangles.map((rect) => rect[1]);
  const allXPlusWidth = rectangles.map((rect) => rect[0] + rect[2]);
  const allYPlusHeight = rectangles.map((rect) => rect[1] + rect[3]);

  // const x_value = Array.from(new Set(allX)).sort((a, b) => a - b);
  // const min_x = vars.variable_type === "state" ? x_value[0] : x_value[1]; // if var type is response, choose the third min value
  const min_x = Math.min(...allXPlusWidth);
  const max_x = Math.max(...allX);
  const min_y = Math.min(...allYPlusHeight);
  const max_y = Math.max(...allY);
  // console.log("combine data")
  // mark boundary for outGroup links with "-" in the grid
  // let boundary_arr: { x: number; y: number; width: number; height: number }[] =
  //   [];
  // boundary_arr.push({
  //   x: min_x + 1,
  //   y: min_y + 1,
  //   width: max_x - min_x - 1,
  //   height: max_y - min_y - 1,
  // });
  // markOccupiedGrid(global_grid, boundary_arr, "-");

  const rectWithVar = rectangles.map((rect) => {
    let [x, y, width, height, variable_name, position, degree] = rect;
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
      degree,
    };
  });
  let minMentions = Infinity;
  let maxMentions = -Infinity;

  Object.values(rectWithVar).forEach((rect: tRectObject) => {
    const degree = rect.degree;
    if (degree < minMentions) minMentions = degree;
    if (degree > maxMentions) maxMentions = degree;
  });
  return { rectWithVar, minMentions, maxMentions };
}
