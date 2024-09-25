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
  tLinkObjectOverview,
  tBbox,
} from "../types/variables";
import { setOpacity } from "lib/utils";
// import { link } from "fs";

export const OverviewDPSIR = {
  init(svgId: string) {
    // this.clicked_rect = null;
    this.clicked_link = null;
    this.svgId = svgId;
    this.dispatch = d3.dispatch(
      "VarTypeLinkSelected",
      "VarTypeSelected",
      "VarTypeUnSelected",
    );
    this.varTypeColorScale = null;
    const svg = d3.select("#" + svgId);
    svg.append("g").attr("class", "overview_link_group");
    svg.append("g").attr("class", "overview_bbox_region");
    svg.append("g").attr("class", "overview_arrow_group");
  },
  on(event, handler) {
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
    this.clicked_link = null;
  },

  update_vars(
    links: tVisLink[],
    varTypeColorScale: Function,
    bboxes: Record<string, tBbox>,
    var_type_states: Record<string, { revealed: boolean }>,
  ) {
    // this.grid_renderer?.reset_global_grid(300, 240);
    this.varTypeColorScale = varTypeColorScale;

    this.drawBboxes(bboxes, var_type_states);
    this.drawLinks(links, bboxes, var_type_states);
  },

  drawVars(vars: tVariableType, bbox_info: tBbox) {
    // console.log(vars);
    const self = this;
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
    bboxes: Record<string, tBbox>,
    var_type_states: Record<string, { revealed: boolean; visible: boolean }>,
  ) {
    const self = this;
    links = links.filter(
      (link) => link.source.var_type !== link.target.var_type,
    );
    links = links.filter(
      (link) =>
        !var_type_states[link.source.var_type].revealed ||
        !var_type_states[link.target.var_type].revealed,
    );
    links = links.filter(
      (link) =>
        var_type_states[link.source.var_type].visible &&
        var_type_states[link.target.var_type].visible,
    );
    const uniquePairs = extractUniquePairs(links);
    const pairCounts: Record<string, number> = {};
    links.forEach((link) => {
      const key = `${link.source.var_type}-${link.target.var_type}`;
      pairCounts[key] = (pairCounts[key] || 0) + 1;
    });

    const linkData = uniquePairs.map(({ source, target }) => {
      const linkKey = `${source}-${target}`;

      const overviewLink = {
        source: source,
        target: target,
        source_center: bboxes[source].center,
        target_center: bboxes[target].center,
        count: pairCounts[linkKey] || 0,
      };
      const [_1, _2, svgWidth, svgHeight] = d3
        .select("#" + self.svgId)
        .attr("viewBox")
        .split(" ")
        .map((d) => +d);
      const path = lineGenerator(overviewLink, bboxes, svgWidth, svgHeight);
      return { ...overviewLink, ...path };
    });

    // Modify the lineGenerator function to handle the direction
    const svg = d3.select("#" + this.svgId);
    const tooltip = d3.select(".tooltip-content");
    // if (svg.select("defs").empty()) {
    //   svg.append("defs");
    // }

    const widthScale = d3
      .scaleLinear()
      .domain([
        Math.min(...linkData.map((d) => d.count)),
        Math.max(...linkData.map((d) => d.count)),
      ])
      .range([3, 15]);
    const opacityScale = d3
      .scaleLinear()
      .domain([
        Math.min(...linkData.map((d) => d.count)),
        Math.max(...linkData.map((d) => d.count)),
      ])
      .range([0.4, 0.8]);

    const link_paths = svg
      .select("g.overview_link_group")
      .selectAll(".link")
      .data(linkData, (d) => `${d.source}-${d.target}`)
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "link")
            .attr("id", (d) => `${d.source}-${d.target}`)
            .attr("cursor", "pointer")
            .attr("fill", "none")
            .attr("stroke", "#777777")
            .attr("stroke-width", (d) => widthScale(d.count))
            .attr("opacity", (d) => opacityScale(d.count))
            .attr("filter", "drop-shadow( 2px 2px 2px rgba(255, 255, 255, 1))")
            .on("mouseover", function (event, d) {
              // d3.selectAll("path.link").classed("link-not-highlight", true);
              d3.select(this)
                .classed("link-highlight", true)
                .classed("link-not-highlight", false)
                .raise()
                .attr("stroke", (d: tLinkObject) => {
                  return self.varTypeColorScale(d.source);
                });
              d3.select(`#arrow-${d.source}-${d.target}`).attr("opacity", 1);
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
              // d3.select(`#arrow-${d.source}-${d.target} path`).attr("fill", "gray");
              d3.select(`#arrow-${d.source}-${d.target}`).attr("opacity", "0");

              tooltip.style("visibility", "hidden");
            })
            .on("click", function (event, d: tLinkObjectOverview) {
              event.preventDefault();
              self.dispatch.call("VarTypeLinkSelected", null, d);
            })
            .attr("d", (d) =>
              arcGenerator({ ...d.arc_data, endPoint: d.arc_data.startPoint }),
            )
            .transition()
            .delay(100)
            .duration(600)
            .attrTween(
              "d",
              (d) => (t) =>
                arcGenerator({
                  ...d.arc_data,
                  endPoint: interpolateArc({
                    ...d.arc_data,
                    t,
                  }),
                }),
            ),
        (update) =>
          update
            .transition()
            .duration(500)
            .attr("d", (d) => arcGenerator({ ...d.arc_data })),
        (exit) =>
          exit
            .transition()
            .duration(300)
            .attrTween(
              "d",
              (d) => (t) =>
                arcGenerator({
                  ...d.arc_data,
                  endPoint: interpolateArc({
                    ...d.arc_data,
                    t: 1 - t,
                  }),
                }),
            )
            .remove(),
      );

    const arrowData = linkData.map((d) => d.arrows).flat();
    svg
      .selectAll("defs")
      .data(arrowData)
      .enter()
      .append("defs")
      .append("marker")
      .attr("id", (d) => `arrowhead-${d.source}-${d.target}`)
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 5) // Adjust the reference point as needed
      .attr("refY", 5)
      .attr("markerWidth", 4)
      .attr("markerHeight", 4)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M 0 0 L 10 5 L 0 10 Z")
      .attr("fill", (d) => self.varTypeColorScale(d.source));
    svg
      .select("g.overview_arrow_group")
      .selectAll("line")
      .data(arrowData)
      .join("line")
      .attr("id", (d) => `arrow-${d.source}-${d.target}`)
      .attr("x1", (d) => d.startX)
      .attr("y1", (d) => d.startY)
      .attr("x2", (d) => d.endX)
      .attr("y2", (d) => d.endY)
      .attr("stroke-width", (d) => widthScale(d.count))
      .attr("marker-end", (d) => `url(#arrowhead-${d.source}-${d.target})`)
      .attr("fill", (d) => self.varTypeColorScale(d.source))
      .attr("opacity", 0);
  },

  drawBboxes(
    bboxes: Record<string, tBbox>,
    var_type_states: Record<string, { revealed: boolean; visible: boolean }>,
  ) {
    // console.log({ bboxes, var_type_states });
    const self = this;
    const not_revealed_var_types = Object.keys(var_type_states).filter(
      (var_type) =>
        !var_type_states[var_type].revealed &&
        var_type_states[var_type].visible,
    );
    // console.log({ not_revealed_var_types });
    const svg = d3.select("#" + this.svgId);

    svg
      .select(".overview_bbox_region")
      .selectAll("g.bbox")
      .data(not_revealed_var_types, (d) => d)
      .join(
        (enter) => {
          enter
            .append("g")
            .attr("class", "bbox")
            .attr("id", (d) => `overview_${d}_bbox_container`)
            .each(function (d) {
              const group = d3.select(this);
              const bbox_center = bboxes[d].center;
              const [bboxWidth, bboxHeight] = bboxes[d].size;
              const rect = group
                .append("rect")
                .attr("class", "bbox")
                .attr("id", d)
                .attr(
                  "fill",
                  setOpacity(self.varTypeColorScale(d), 0.8, "rgbHex"),
                )
                .attr("rx", "0.4%")
                .attr("cursor", "pointer")
                .attr("x", bbox_center[0])
                .attr("y", bbox_center[1])
                .attr("width", 0)
                .attr("height", 0);
              rect
                .transition()
                .duration(500)
                .attr("x", bbox_center[0] - bboxWidth / 2)
                .attr("y", bbox_center[1] - bboxHeight / 2)
                .attr("width", bboxWidth)
                .attr("height", bboxHeight);
              rect
                .on("mouseover", function () {
                  // apply hovering effect
                  d3.selectAll(".link")
                    .classed("overview-link-highlight", false)
                    .classed("link-not-highlight", true)
                    .attr("stroke", "gray")
                    .filter(
                      (link_data) =>
                        link_data.source === d || link_data.target === d,
                    )
                    .classed("overview-link-highlight", true)
                    .classed("link-not-highlight", false)
                    .raise()
                    .attr("stroke", (d: tVisLink) => {
                      return self.varTypeColorScale(d.source);
                    });
                  svg
                    .select("g.overview_arrow_group")
                    .selectAll("line")
                    .filter((link) => link.source === d)
                    .attr("opacity", 1);

                  // d3.selectAll("marker")
                  //   .filter(function () {
                  //     const [, source, target] = this.id.split("-");
                  //     return source === d || target === d;
                  //   })
                  //   .select("path")
                  //   .attr("fill", function () {
                  //     const [, source, target] =
                  //       this.parentElement.id.split("-");
                  //     return self.varTypeColorScale(source);
                  //   });

                  d3.select(this).classed("overview-var-type-hover", true);
                })
                .on("mouseout", function () {
                  d3.selectAll(".link")
                    .classed("overview-link-highlight", false)
                    .classed("link-not-highlight", false)
                    .attr("stroke", "gray");

                  svg
                    .select("g.overview_arrow_group")
                    .selectAll("line")
                    .attr("opacity", 0);
                  // d3.selectAll("marker").select("path").attr("fill", "gray");

                  d3.select(this).classed("overview-var-type-hover", false);
                })
                .on("click", function (event) {
                  event.preventDefault();
                  self.dispatch.call("VarTypeSelected", null, d);

                  d3.selectAll(".link")
                    .classed("overview-link-highlight", false)
                    .classed("link-not-highlight", false)
                    .attr("stroke", "gray");

                  d3.selectAll("marker").select("path").attr("fill", "gray");
                });
              group
                .append("text")
                .attr("class", "bbox-label")
                .attr("id", `${d}` + `_label`)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .text(d.charAt(0).toUpperCase() + d.slice(1) + "s")
                .attr("text-transform", "capitalize")
                .attr("pointer-events", "none")
                .attr("font-family", "serif")
                .attr("font-style", "italic")
                .attr("font-size", "3rem")
                .attr("font-weight", "bold")
                .attr("fill", "#636363")
                .attr("x", bbox_center[0])
                .attr("y", bbox_center[1])
                .attr("opacity", 0)
                .transition()
                .duration(500)
                .attr("opacity", 1);
            });
        },
        (update) =>
          update.each(function (d) {
            const group = d3.select(this);
            const bbox_center = bboxes[d].center;
            const [bboxWidth, bboxHeight] = bboxes[d].size;
            group
              .select("rect")
              .transition()
              .duration(500)
              .attr("width", bboxWidth)
              .attr("height", bboxHeight)
              .attr("x", bbox_center[0] - bboxWidth / 2)
              .attr("y", bbox_center[1] - bboxHeight / 2);
            group
              .select("text")
              .transition()
              .duration(500)
              .attr("x", bbox_center[0])
              .attr("y", bbox_center[1]);
          }),
        (exit) => {
          exit.select("text").remove();
          exit
            .select("rect")
            .transition()
            .duration(200)
            .attr("width", 0)
            .attr("height", 0)
            .on("end", () => exit.remove());
        },
      );
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

function extractUniquePairs(links: tVisLink[]) {
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
}

/**
 * Calculates the angle between two vectors defined by three 2D points: start, center, and end.
 * The angle calculated is ∠start-center-end, which is the same as ∠end-center-start.
 *
 * @param {[number, number]} startPoint - The [x, y] coordinates of the start point.
 * @param {[number, number]} centerPoint - The [x, y] coordinates of the center point.
 * @param {[number, number]} endPoint - The [x, y] coordinates of the end point.
 * @returns {number} The angle in radians between the vectors (start-center) and (end-center).
 *
 * @example
 * // Example usage:
 * const start = [1, 0];
 * const center = [0, 0];
 * const end = [0, 1];
 * const angle = calculateAngle(start, center, end); // in radian
 */
function calculateAngle(
  startPoint: [number, number],
  centerPoint: [number, number],
  endPoint: [number, number],
): number {
  const [x1, y1] = startPoint;
  const [x2, y2] = centerPoint;
  const [x3, y3] = endPoint;

  // Calculate vectors
  const vectorA = [x1 - x2, y1 - y2];
  const vectorB = [x3 - x2, y3 - y2];

  // Calculate dot product
  const dotProduct = vectorA[0] * vectorB[0] + vectorA[1] * vectorB[1];

  // Calculate magnitudes
  const magnitudeA = Math.sqrt(vectorA[0] ** 2 + vectorA[1] ** 2);
  const magnitudeB = Math.sqrt(vectorB[0] ** 2 + vectorB[1] ** 2);

  // Calculate the cosine of the angle
  const cosTheta = dotProduct / (magnitudeA * magnitudeB);

  // Calculate the angle in radians
  const angleRadians = Math.acos(cosTheta);

  // Convert the angle to degrees (optional)
  // const angleDegrees = angleRadians * (180 / Math.PI);

  return angleRadians; // Return the angle in degrees
}

// Function to calculate the arc's center
function calculateArcCenter(
  start: { x: number; y: number },
  end: { x: number; y: number },
  r: number,
  sweepFlag: number,
) {
  const midPoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const d = Math.sqrt(dx * dx + dy * dy);

  const h = Math.sqrt(r * r - (d / 2) * (d / 2));

  // Calculate the unit vector perpendicular to the line between start and end
  const ux = -dy / d;
  const uy = dx / d;

  const cx = midPoint.x + (sweepFlag === 1 ? 1 : -1) * h * ux;
  const cy = midPoint.y + (sweepFlag === 1 ? 1 : -1) * h * uy;

  return { x: cx, y: cy };
}

function calculateIntersection(
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
  dr: number,
  sweepFlag: number,
  bbox: { center: [number, number]; size: [number, number] },
) {
  const [centerX, centerY] = bbox.center;
  const [width, height] = bbox.size;
  const left = centerX - width / 2;
  const right = centerX + width / 2;
  const top = centerY - height / 2;
  const bottom = centerY + height / 2;

  // Function to check intersection of a line with an ellipse
  function intersectEllipseLine(cx, cy, rx, ry, x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;

    // Transform line coordinates into the ellipse's coordinate system
    const a = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
    const b =
      (2 * (x0 - cx) * dx) / (rx * rx) + (2 * (y0 - cy) * dy) / (ry * ry);
    const c =
      ((x0 - cx) * (x0 - cx)) / (rx * rx) +
      ((y0 - cy) * (y0 - cy)) / (ry * ry) -
      1;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return []; // No intersection

    const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);

    const intersectionPoints: { x: number; y: number }[] = [];
    if (0 <= t1 && t1 <= 1)
      intersectionPoints.push({ x: x0 + t1 * dx, y: y0 + t1 * dy });
    if (0 <= t2 && t2 <= 1)
      intersectionPoints.push({ x: x0 + t2 * dx, y: y0 + t2 * dy });

    return intersectionPoints;
  }

  // Function to calculate tangent direction at a point on the ellipse
  function calculateTangentAtPoint(arcCenter, rx, ry, point) {
    // Convert the point to an angle parameter 't' relative to the arc center
    const t = Math.atan2(
      (point.y - arcCenter.y) / ry,
      (point.x - arcCenter.x) / rx,
    );

    // Calculate the derivatives (tangent vector) at this point
    const dx = -rx * Math.sin(t);
    const dy = ry * Math.cos(t);

    // Calculate the tangent angle
    const tangentAngle = Math.atan2(dy, dx);

    return { dx, dy, tangentAngle };
  }

  // Calculate arc center
  const arcCenter = calculateArcCenter(startPoint, endPoint, dr, sweepFlag);

  // Compute angles for start and end points

  const maxAngle = calculateAngle(
    [startPoint.x, startPoint.y],
    [arcCenter.x, arcCenter.y],
    [endPoint.x, endPoint.y],
  );

  // Collect intersections with all four sides of the rectangle
  const intersections_whole_arc = [
    ...intersectEllipseLine(
      arcCenter.x,
      arcCenter.y,
      dr,
      dr,
      left,
      top,
      right,
      top,
    ), // Top edge
    ...intersectEllipseLine(
      arcCenter.x,
      arcCenter.y,
      dr,
      dr,
      right,
      top,
      right,
      bottom,
    ), // Right edge
    ...intersectEllipseLine(
      arcCenter.x,
      arcCenter.y,
      dr,
      dr,
      left,
      bottom,
      right,
      bottom,
    ), // Bottom edge
    ...intersectEllipseLine(
      arcCenter.x,
      arcCenter.y,
      dr,
      dr,
      left,
      top,
      left,
      bottom,
    ), // Left edge
  ];

  // Filter valid intersections based on angle
  const intersections_curve = intersections_whole_arc.filter((intersection) => {
    const intersectionAngle = calculateAngle(
      [intersection.x, intersection.y],
      [arcCenter.x, arcCenter.y],
      [startPoint.x, startPoint.y],
    );
    return intersectionAngle < maxAngle;
  });
  const intersectionsWithTangents = intersections_curve.map((intersection) => {
    const tangent = calculateTangentAtPoint(arcCenter, dr, dr, intersection);
    return {
      x: intersection.x,
      y: intersection.y,
      tangentDirection: tangent.tangentAngle, // Direction of the tangent in radians
      tangentVector: { dx: tangent.dx, dy: tangent.dy }, // Tangent vector at the intersection
    };
  });
  return intersectionsWithTangents;
  // return intersections_whole_arc;
}

function lineGenerator(
  link: {
    source: string;
    target: string;
    source_center: [number, number];
    target_center: [number, number];
    count: number;
  },
  bboxes: Record<string, { center: [number, number]; size: [number, number] }>,
  svgWidth: number,
  svgHeight: number,
) {
  const startPoint = {
    x: link.source_center[0],
    y: link.source_center[1],
  };
  const endPoint = {
    x: link.target_center[0],
    y: link.target_center[1],
  };

  const sourceBbox = bboxes[link.source];
  const targetBbox = bboxes[link.target];

  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const dr = Math.sqrt(dx * dx + dy * dy) * 0.8; // Increase radius by 20% for more pronounced curves

  const sweepFlag =
    calculateAngle(
      [startPoint.x, startPoint.y],
      [svgWidth / 2, svgHeight / 2],
      [endPoint.x, endPoint.y],
    ) > Math.PI
      ? 1
      : 0;
  const intersection_points = calculateIntersection(
    startPoint,
    endPoint,
    dr,
    sweepFlag,
    sweepFlag ? sourceBbox : targetBbox,
  );

  // Create the partial arc path
  return {
    arc_data: { startPoint, endPoint, dr, sweepFlag },
    arrows: intersection_points.map((point) => {
      return {
        source: link.source,
        target: link.target,
        startX: point.x + 20 * Math.cos(point.tangentDirection),
        startY: point.y + 20 * Math.sin(point.tangentDirection),
        endX: point.x,
        endY: point.y,
        count: link.count,
      };
    }),
  };
}

function arcGenerator({ startPoint, endPoint, dr, sweepFlag }) {
  return `M${startPoint.x},${startPoint.y}A${dr},${dr} 0 0 ${sweepFlag} ${endPoint.x},${endPoint.y}`;
}

function interpolate_linear(
  start: { x: number; y: number },
  end: { x: number; y: number },
  t: number,
) {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
}
function interpolateArc({ startPoint, endPoint, dr, sweepFlag, t }) {
  // interpolate along the arc between (startPoint) and (endPoint), with radius (dr) and sweepFlag indicating its direction (start to end or end to start)
  const arcCenter = calculateArcCenter(startPoint, endPoint, dr, sweepFlag);
  const startAngle = Math.atan2(
    startPoint.y - arcCenter.y,
    startPoint.x - arcCenter.x,
  );
  const endAngle = Math.atan2(
    endPoint.y - arcCenter.y,
    endPoint.x - arcCenter.x,
  );

  // Calculate the total angle covered by the arc, considering sweepFlag
  let totalAngle = endAngle - startAngle;
  if (sweepFlag === 1 && totalAngle < 0) {
    totalAngle += 2 * Math.PI; // Adjust for counterclockwise
  } else if (sweepFlag === 0 && totalAngle > 0) {
    totalAngle -= 2 * Math.PI; // Adjust for clockwise
  }

  // Calculate the interpolated angle at parameter t
  const interpolatedAngle = startAngle + t * totalAngle;

  // Calculate the interpolated (x, y) point on the arc
  const x = arcCenter.x + dr * Math.cos(interpolatedAngle);
  const y = arcCenter.y + dr * Math.sin(interpolatedAngle);

  // Return the interpolated point on the arc
  return { x, y };
}
