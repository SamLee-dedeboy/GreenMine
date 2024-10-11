import * as d3 from "d3";
import type {
  tUncertainty,
  tChunk,
  tIdentifyVarTypes,
  tIdentifyVars,
  tIdentifyLinks,
} from "lib/types";

export class UncertaintyGraph {
  svgId: string;
  width: number = 300;
  height: number = 300;
  padding = {
    left: 3,
    right: 3,
    top: 3,
    bottom: 3,
  };
  innerSize: {
    x: number;
    y: number;
    width: number;
    height: number;
    center: [number, number];
  } = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    center: [0, 0],
  };
  xScale: any;
  yScale: any;
  //   angleScale: any;
  polarRadiusScale: any;
  colorScale: any;
  noiseColorScale: any;
  dispatch: any;
  constructor(svgId) {
    this.svgId = svgId;
  }
  init() {
    console.log("init");
    const svg = d3
      .select("#" + this.svgId)
      .attr("viewBox", `0 0 ${this.width} ${this.height}`);
    this.innerSize = {
      x: this.padding.left,
      y: this.padding.top,
      width: this.width - this.padding.left - this.padding.right,
      height: this.height - this.padding.top - this.padding.bottom,
      center: [
        this.padding.left + this.width / 2,
        this.padding.top + this.height / 2,
      ],
    };
    this.dispatch = d3.dispatch("force_end");

    this.polarRadiusScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range([50, Math.min(this.innerSize.width, this.innerSize.height) / 2]);
    // this.noiseColorScale = d3.scaleSequential(d3.interpolateRainbow);
    this.noiseColorScale = () => "#c3c3c3";
    this.colorScale = d3.scaleOrdinal(d3.schemeSet3);

    svg.append("g").attr("class", "radius-axis-group");
    svg.append("g").attr("class", "participant-group");
    svg.append("g").attr("class", "node-group");
    svg.append("g").attr("class", "angle-axis-group");
    svg.append("g").attr("class", "legend-group");

    svg
      .select("g.radius-axis-group")
      .selectAll("circle")
      //   .data([0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0])
      .data([0.0, 0.2, 0.4, 0.6, 0.8, 1.0])
      .join("circle")
      .attr("cx", this.innerSize.center[0])
      .attr("cy", this.innerSize.center[1])
      .attr("r", (d) => this.polarRadiusScale(d))
      .attr("fill", "none")
      .attr("stroke", "lightgray")
      .attr("stroke-width", 1);
    svg
      .select("g.radius-axis-group")
      .selectAll("text")
      .data([0.0, 0.2, 0.4, 0.6, 0.8, 1.0])
      .join("text")
      .text((d) => d)
      .attr("x", this.innerSize.center[0])
      .attr("y", (d) => this.innerSize.center[1] - this.polarRadiusScale(d))
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 10)
      .attr("fill", "#3c3c3c");

    // .attr("stroke-dasharray", "5,5");
  }
  on(event, handler) {
    this.dispatch.on(event, handler);
  }
  update(data, highlight_ids: string[], func_id = (d) => d.id) {
    const self = this;
    const svg = d3.select("#" + this.svgId);
    const clusters = data
      .map((d) => d.cluster)
      .reduce((acc, cur) => {
        if (acc[cur] === undefined) {
          acc[cur] = 0;
        }
        acc[cur] += 1;
        return acc;
      }, {});
    const cluster_angles = computeAngles(clusters);

    // update axis
    this.updateAxis(cluster_angles);

    const data_w_coordinates = data.map((datum) => {
      return {
        ...datum,
        coordinates_2d: polarToCartesian(
          self.innerSize.center,
          cluster_angles[datum.cluster].mid,
          self.polarRadiusScale(datum.uncertainty),
        ),
      };
    });
    console.log({ data_w_coordinates });

    const nodes = svg
      .select("g.node-group")
      .selectAll("circle.node")
      .data(data_w_coordinates, func_id)
      .join(
        (enter) => {
          console.log("enter", enter.nodes());
          const enter_nodes = enter
            .append("circle")
            .attr("class", "node")
            .classed("node-not-highlighted", false)
            .classed("node-highlighted", false)
            .attr("cx", (d) => (d.x = d.coordinates_2d[0]))
            .attr("cy", (d) => (d.y = d.coordinates_2d[1]))
            .attr("r", (d) => (d.r = 2))
            .attr("fill", (d) => this.colorScale(d.cluster))
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("cursor", "pointer")
            .on("mouseover", function (e, d) {
              d3.select(".uncertainty-tooltip").html(d.text);
            });
          if (highlight_ids.length > 0) {
            enter_nodes
              .classed("node-not-highlighted", true)
              .classed("node-highlighted", false)
              .filter((d) => highlight_ids.includes(d.id))
              .classed("node-not-highlighted", false)
              .classed("node-highlighted", true);
          }
          const simulation = d3
            .forceSimulation(data_w_coordinates)
            .alphaMin(0.01)
            .force(
              "radial",
              d3
                .forceRadial(
                  null,
                  this.innerSize.center[0],
                  this.innerSize.center[1],
                )
                .radius((d) => self.polarRadiusScale(d.uncertainty))
                .strength(1),
            )
            .force(
              "collide",
              d3.forceCollide((d) => d.r * 1.3),
            )
            .on("tick", () => {
              enter_nodes.each(function (d) {
                d.x = clip(d.x, [
                  self.innerSize.x + d.r,
                  self.innerSize.x + self.innerSize.width - d.r,
                ]);
                d.y = clip(d.y, [
                  self.innerSize.y + d.r,
                  self.innerSize.y + self.innerSize.height - d.r,
                ]);
                [d.x, d.y] = clipClusterRange(
                  d.x,
                  d.y,
                  self.innerSize,
                  cluster_angles[d.cluster],
                );
                d3.select(this).attr("cx", d.x).attr("cy", d.y);
              });
            })
            .on("end", () => self.dispatch.call("force_end"));
        },
        (update) => {
          console.log("update", update.nodes());
          update
            .classed("node-not-highlighted", false)
            .classed("node-highlighted", false);
          if (highlight_ids.length > 0) {
            update
              .classed("node-not-highlighted", true)
              .classed("node-highlighted", false)
              .filter((d) => highlight_ids.includes(d.id))
              .classed("node-not-highlighted", false)
              .classed("node-highlighted", true);
          }
          self.dispatch.call("force_end");
        },
        (exit) => exit.remove(),
      );
  }
  clear() {
    const svg = d3.select("#" + this.svgId);
    svg.select("g.node-group").selectAll("circle.node").remove();
  }
  updateAxis(cluster_angles: Record<number, any>) {
    const svg = d3.select("#" + this.svgId);
    const axis_group = svg.select("g.angle-axis-group");
    axis_group
      .selectAll("line")
      .data(Object.keys(cluster_angles))
      .join("line")
      .attr("x1", this.innerSize.center[0])
      .attr("y1", this.innerSize.center[1])
      .attr(
        "x2",
        (d) =>
          polarToCartesian(
            this.innerSize.center,
            cluster_angles[d].start,
            Math.min(this.innerSize.width, this.innerSize.height) / 2,
          )[0],
      )
      .attr(
        "y2",
        (d) =>
          polarToCartesian(
            this.innerSize.center,
            cluster_angles[d].start,
            Math.min(this.innerSize.width, this.innerSize.height) / 2,
          )[1],
      )
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "5,5");
  }
}
function clip(x, range) {
  return Math.max(Math.min(x, range[1]), range[0]);
}

function clipClusterRange(x, y, innerSize, cluster_angle) {
  //   console.log({ cluster_angle, innerSize });
  //   return [x, y];
  const [angle, radius] = cartesianToPolar(innerSize.center, x, y);
  const offset = Math.PI / 60;
  if (
    angle < cluster_angle.start + offset ||
    angle > cluster_angle.start + cluster_angle.range - offset
  ) {
    // increase radius
    const new_radius = radius + 10;
    const clipped_angle =
      Math.abs(angle - (cluster_angle.start + offset)) <
      Math.abs(angle - (cluster_angle.start + cluster_angle.range - offset))
        ? cluster_angle.start + 2 * offset
        : cluster_angle.start + cluster_angle.range - 2 * offset;
    const [new_x, new_y] = polarToCartesian(
      innerSize.center,
      clipped_angle,
      new_radius,
    );
    return [new_x, new_y];
  }
  return [x, y];
}

/**
 *
 * @param center [x, y]
 * @param angle
 * @param radius
 * @returns [x, y]
 */
function polarToCartesian(center, angle, radius) {
  return [
    center[0] + radius * Math.cos(angle),
    center[1] + radius * Math.sin(angle),
  ];
}

/**
 *
 * @param center [x, y]
 * @param x number
 * @param y number
 * @returns [angle, radius]
 */
function cartesianToPolar(center, x, y) {
  const adjustedX = x - center[0];
  const adjustedY = y - center[1];

  let theta = Math.atan2(adjustedY, adjustedX); // Calculate the angle in radians
  // Normalize theta to be in the range [0, 2π]
  if (theta < 0) {
    theta += 2 * Math.PI;
  }
  const r = Math.sqrt(adjustedX * adjustedX + adjustedY * adjustedY); // Calculate the radius

  return [theta, r];
}

function computeAngles(clusters: Record<number, number>) {
  const total = Object.values(clusters).reduce(
    (acc, cur) => acc + Math.sqrt(cur),
    0,
  );
  let offset = 0;
  const angles = Object.keys(clusters).reduce((acc, cur) => {
    const ratio = Math.sqrt(clusters[cur]) / total;
    const angle = ratio * Math.PI * 2;
    acc[cur] = {
      start: offset,
      range: ratio * Math.PI * 2,
      mid: offset + angle / 2,
    };
    offset += angle;
    return acc;
  }, {});
  return angles;
}
