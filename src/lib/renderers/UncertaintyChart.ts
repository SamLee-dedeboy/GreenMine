import * as d3 from "d3";
import { setOpacity } from "lib/utils";
export class UncertaintyChart {
  svgId: string;
  width: number = 300;
  height: number = 300;
  padding = {
    left: 30,
    right: 30,
    top: 30,
    bottom: 30,
  };
  innerSize: {
    x: number;
    y: number;
    width: number;
    height: number;
  } = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };
  constructor(svgId) {
    this.svgId = svgId;
  }
  init() {
    const svg = d3
      .select("#" + this.svgId)
      .attr("viewBox", `0 0 ${this.width} ${this.height}`);
    this.innerSize = {
      x: this.padding.left,
      y: this.padding.top,
      width: this.width - this.padding.left - this.padding.right,
      height: this.height - this.padding.top - this.padding.bottom,
    };
    svg.append("g").attr("class", "bar-group");
    const axis_group = svg.append("g").attr("class", "axis-group");
    axis_group.append("g").attr("class", "x-axis");
    axis_group.append("g").attr("class", "y-axis");
  }
  update(data: number[], color: string) {
    const svg = d3.select("#" + this.svgId);
    const bins = d3
      .bin()
      .thresholds([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0])
      .value((d) => d)(data);
    console.log({ data, bins });
    const xScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range([this.innerSize.x, this.innerSize.width]);
    const log_padding = 10;
    const yScale = d3
      .scaleLog()
      .base(10)
      .domain([1, Math.max(...bins.map((d) => d.length))])
      .range([this.innerSize.height - log_padding, this.innerSize.y])
      .nice();
    console.log({ bins });

    const xAxis = d3
      .axisBottom(xScale)
      .tickSize(2)
      .tickValues([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]);
    svg
      .select("g.axis-group")
      .select(".x-axis")
      .attr(
        "transform",
        // `translate(${(xScale(bins[0].x1) - xScale(bins[0].x0)) / 2}, ${this.innerSize.height})`,
        `translate(0, ${this.innerSize.height})`,
      )
      .call(xAxis);
    const yAxis = d3.axisLeft(yScale).tickValues([1, 10, 100, 1000, 10000]);
    svg
      .select("g.axis-group")
      .select("g.y-axis")
      .attr("transform", `translate(${this.innerSize.x}, 0)`)
      .call(yAxis);
    const rects = d3
      .select("#" + this.svgId)
      .select("g.bar-group")
      .selectAll("rect.bar")
      .data(bins)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d.x0))
      .attr("y", (d) =>
        d.length === 0 ? this.innerSize.height : yScale(d.length),
      )
      .attr("width", (d) => xScale(d.x1) - xScale(d.x0))
      .attr("height", (d) =>
        d.length === 0 ? 0 : this.innerSize.height - yScale(d.length),
      )
      .attr("fill", setOpacity(color, 0.7, "rgbaHex"))
      .attr("stroke", "black");
    const labels = d3
      .select("#" + this.svgId)
      .select("g.bar-group")
      .selectAll("text.label")
      .data(bins)
      .join("text")
      .attr("class", "label")
      .text((d) => d.length)
      .attr("x", (d) => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
      .attr("y", (d) => yScale(d.length) - 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "black");
  }
}
