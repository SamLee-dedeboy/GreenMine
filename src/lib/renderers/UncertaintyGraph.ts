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
  update(data, noise_cluster_index) {
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
    console.log({ data, clusters });
    const cluster_angles = computeAngles(clusters);

    // update axis
    this.updateAxis(cluster_angles);

    const noise_data = data.filter((d) => d.cluster === noise_cluster_index);
    const min_noise_angle = d3.min(noise_data, (d) => d.angle);
    const max_noise_angle = d3.max(noise_data, (d) => d.angle);
    // update nodes
    const noiseAngleScale = d3
      .scaleLinear()
      .domain([min_noise_angle, max_noise_angle])
      .range([
        cluster_angles[noise_cluster_index].start,
        cluster_angles[noise_cluster_index].start +
          cluster_angles[noise_cluster_index].range,
      ]);
    // const angleScale = d3
    //   .scaleLinear()
    //   .domain([d3.min(data, (d) => d.angle), d3.max(data, (d) => d.angle)])
    //   .range([0, Math.PI * 2]);
    const data_w_coordinates = data.map((datum) => {
      return {
        ...datum,
        coordinates_2d: polarToCartesian(
          self.innerSize.center,
          //   angleScale(datum.angle),
          datum.cluster === noise_cluster_index
            ? noiseAngleScale(datum.angle)
            : cluster_angles[datum.cluster].mid,
          self.polarRadiusScale(datum.uncertainty),
        ),
      };
    });

    const nodes = svg
      .select("g.node-group")
      .selectAll("circle.node")
      .data(data_w_coordinates, (d) => d.id)
      .join("circle")
      .attr("class", "node")
      .attr("cx", (d) => (d.x = d.coordinates_2d[0]))
      .attr("cy", (d) => (d.y = d.coordinates_2d[1]))
      //   .attr("r", (d) => (d.r = d.cluster === -1 ? 2 : 5))
      .attr("r", (d) => (d.r = 3))
      .attr("fill", (d) =>
        d.cluster === noise_cluster_index
          ? this.noiseColorScale(d.angle)
          : this.colorScale(d.cluster),
      )
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("cursor", "pointer")
      .on("mouseover", function (e, d) {
        d3.select(".uncertainty-tooltip").html(d.text);
      });
    const simulation = d3
      .forceSimulation(data_w_coordinates)
      .alphaMin(0.01)
      .force(
        "radial",
        d3
          .forceRadial(null, this.innerSize.center[0], this.innerSize.center[1])
          .radius((d) => self.polarRadiusScale(d.uncertainty))
          .strength(1),
      )
      .force(
        "collide",
        d3.forceCollide((d) => d.r * 1.3),
      )
      .on("tick", () => {
        nodes.each(function (d) {
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
      });
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
  _update_2(
    data: (tIdentifyVarTypes | tIdentifyVars | tIdentifyLinks)[],
    key: string,
  ) {
    if (data.length === 0) return;
    return;
    const self = this;
    const svg = d3.select("#" + this.svgId);
    const groups_by_participants = group_by_participant(data);
    svg
      .select("g.participant-group")
      .selectAll("g.participant-container")
      .data(Object.keys(groups_by_participants), (d) => d)
      .join(
        (enter) => {
          const container = enter
            .append("g")
            .attr("class", "participant-container")
            .attr("id", (d) => d);
          container
            .append("text")
            .text((d) => d)
            .attr("x", (d) => 0)
            .attr("y", (d, i) => +d.replace("N", "") * (10 + 3) + 5)
            .attr("dominant-baseline", "middle")
            .attr("font-size", 10);
          container.each(function (pid) {
            const group = d3.select(this);
            group
              .selectAll("rect.chunk")
              .data(groups_by_participants[pid])
              .join("rect")
              .attr("class", "chunk")
              .attr("x", (_, i) => 25 + 15 * i)
              .attr("y", +pid.replace("N", "") * (10 + 3))
              .attr("width", (d) => 10)
              .attr("height", (d) => 10)
              .attr("fill", "red");
          });
        },
        (update) => update,

        (exit) => exit.remove(),
      );
  }
  _update(
    data: (tIdentifyVarTypes | tIdentifyVars | tIdentifyLinks)[],
    key: string,
  ) {
    console.log("UncertaintyGraph update", data, key);
    if (data.length === 0) return;
    const self = this;
    const svg = d3.select("#" + this.svgId);
    const filtered_data = data.map((datum) => {
      return {
        ...datum,
        has_uncertainty: datum.uncertainty[key] !== 0,
      };
    });
    const groups_by_participants = group_by_participant(filtered_data);
    const group_coordinates = this.calculateGridCoordinates(
      groups_by_participants,
    );
    svg
      .select("g.participant-group")
      .selectAll("g.participant-container")
      .data(Object.keys(groups_by_participants), (d) => d)
      .join(
        (enter) => {
          const container = enter
            .append("g")
            .attr("class", "participant-container")
            .attr("id", (d) => d);
          container
            .append("text")
            .text((d) => d)
            .attr("x", (d) => group_coordinates[d].x + 1)
            .attr("y", (d) => group_coordinates[d].y + 1)
            .attr("dominant-baseline", "hanging")
            .attr("font-size", 10);
          container
            .append("rect")
            .attr("class", "participant-rect")
            .attr("x", (d) => group_coordinates[d].x)
            .attr("y", (d) => group_coordinates[d].y)
            .attr("width", (d) => group_coordinates[d].width)
            .attr("height", (d) => group_coordinates[d].height)
            .attr("fill", "none")
            .attr("stroke", "lightgray")
            .attr("stroke-width", 1);
        },
        (update) => {
          update
            .select("text")
            .attr("x", (d) => group_coordinates[d].x + 1)
            .attr("y", (d) => group_coordinates[d].y + 1);
          update
            .select("rect")
            .attr("x", (d) => group_coordinates[d].x)
            .attr("y", (d) => group_coordinates[d].y)
            .attr("width", (d) => group_coordinates[d].width)
            .attr("height", (d) => group_coordinates[d].height);
        },
        (exit) => exit.remove(),
      );
    const scaleRadius = d3.scaleLinear().domain([0, 1]).range([3, 15]);
    const nodes = svg
      .select("g.node-group")
      .selectAll("circle.node")
      .data(filtered_data, (d) => d.id)
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", "node")
            .attr(
              "r",
              (d) =>
                (d.r = d.has_uncertainty ? scaleRadius(d.uncertainty[key]) : 2),
            )
            .attr("fill", (d) => (d.has_uncertainty ? "red" : "white"))
            .attr("opacity", (d) => (d.has_uncertainty ? 1 : 0.5))
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("cx", (d) => {
              const participant = d.id.split("_")[0];
              d.x =
                group_coordinates[participant].x +
                Math.random() * group_coordinates[participant].width;
            })
            .attr("cy", (d) => {
              const participant = d.id.split("_")[0];
              d.y =
                group_coordinates[participant].y +
                Math.random() * group_coordinates[participant].height;
            }),
        (update) =>
          update
            .attr("cx", (d) => {
              const participant = d.id.split("_")[0];
              return (d.x =
                group_coordinates[participant].x +
                Math.random() * group_coordinates[participant].width);
            })
            .attr("cy", (d) => {
              const participant = d.id.split("_")[0];
              return (d.y =
                group_coordinates[participant].y +
                Math.random() * group_coordinates[participant].height);
            }),

        (exit) => exit.remove(),
      );
  }
  calculateGridCoordinates(groups_by_participants) {
    const rows = 5;
    const cols = 4;
    const bboxSize = {
      width: this.innerSize.width / cols,
      height: this.innerSize.height / rows,
    };
    let group_coordinates = {};
    Object.keys(groups_by_participants)
      .sort((a, b) => +a.replace("N", "") - +b.replace("N", ""))
      .forEach((participant, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        console.log(i, participant, row, col, bboxSize);
        group_coordinates[participant] = {
          x: col * bboxSize.width,
          y: row * bboxSize.height,
          width: bboxSize.width,
          height: bboxSize.height,
        };
      });
    return group_coordinates;
  }
}

function group_by_participant(
  data: (tIdentifyVarTypes | tIdentifyVars | tIdentifyLinks)[],
) {
  const groups = data.reduce((acc, datum) => {
    const participant = datum.id.split("_")[0];
    if (!acc[participant]) {
      acc[participant] = [];
    }
    acc[participant].push(datum);
    return acc;
  }, {});
  return groups;
}

function clip(x, range) {
  return Math.max(Math.min(x, range[1]), range[0]);
}

function clipClusterRange(x, y, innerSize, cluster_angle) {
  const [angle, radius] = cartesianToPolar(innerSize.center, x, y);
  const offset = Math.PI / 36;
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

function force() {
  return;
  const scaleCenterForce = d3.scaleLinear().domain([0, 1]).range([0.05, 0.8]);
  const nodes = svg
    .select("g.node-group")
    .selectAll("circle.node")
    .data(filtered_data)
    .join("circle")
    .attr("class", "node")
    .attr("cx", (d, i) => (d.x = Math.random() * this.innerSize.width))
    .attr("cy", (d, i) => (d.y = Math.random() * this.innerSize.height))
    .attr("r", (d) => (d.r = scaleRadius(d.uncertainty[key])))
    .style("fill", "red")
    .style("stroke", "black")
    .style("stroke-width", 1);
  const simulation = d3
    .forceSimulation(filtered_data)
    .alphaMin(0.01)
    .force("charge", d3.forceManyBody().strength(-1))
    .force(
      "x",
      d3
        .forceX((this.innerSize.x + this.innerSize.width) / 2)
        .strength((d) => scaleCenterForce(d.uncertainty[key])),
    )
    .force(
      "y",
      d3
        .forceY((this.innerSize.y + this.innerSize.height) / 2)
        .strength((d) => scaleCenterForce(d.uncertainty[key])),
    )
    .force(
      "collide",
      d3.forceCollide((d) => d.r),
    )
    .on("tick", () => {
      nodes.each(function (d) {
        d.x = clip(d.x, [
          self.innerSize.x,
          self.innerSize.x + self.innerSize.width,
        ]);
        d.y = clip(d.y, [
          self.innerSize.y,
          self.innerSize.y + self.innerSize.height,
        ]);
        d3.select(this).attr("cx", d.x).attr("cy", d.y);
      });
    });
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
    console.log("ratio", ratio);
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
