import * as d3 from "d3";
import { hexbin as Hexbin } from "d3-hexbin";
import type { tKeywordData } from "lib/types";

export class KeyWordSea {
  svgId: string = "";
  width: number = 100;
  height: number = 100;
  binRadius: number = 20;
  paddings: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  } = { left: 0, right: 0, top: 0, bottom: 0 };
  xScale_keywords: any;
  yScale_keywords: any;
  clicked_hex: string | undefined;
  dispatch: any;
  constructor() {}
  on(event, handler) {
    this.dispatch.on(event, handler);
  }

  // call this when svg is mounted
  init(svgId: string, svgWidth: number, svgHeight: number) {
    console.log("KeywordSea constructor");
    this.svgId = svgId;
    this.dispatch = d3.dispatch("keywordsSelected");
    this.width = svgWidth;
    this.height = svgHeight;
    d3.select("#" + this.svgId).attr(
      "viewBox",
      "0 0 " + this.width + " " + this.height,
    );
    // bin radius is the distance from the center to the vertex of a hexagon, so vertical and horizontal distances are different
    // the width of each hexagon is radius × 2 × sin(π / 3) and the height of each hexagon is radius × 3 / 2.
    this.paddings = {
      left: 2 * this.binRadius * Math.sin(Math.PI / 3),
      right: 2 * this.binRadius * Math.sin(Math.PI / 3),
      top: (this.binRadius * 3) / 2,
      bottom: (this.binRadius * 3) / 2,
    };
    this.xScale_keywords = d3
      .scaleLinear()
      .domain([0, 1])
      .range([this.paddings.left, this.width - this.paddings.right]);
    this.yScale_keywords = d3
      .scaleLinear()
      .domain([0, 1])
      .range([this.paddings.bottom, this.height - this.paddings.top]);
    this.clicked_hex = undefined;
    d3.select("#" + this.svgId)
      .append("g")
      .attr("class", "hex-group");
    d3.select("#" + this.svgId)
      .append("g")
      .attr("class", "label-group");
  }

  // call this when data is updated
  update_keywords(
    keyword_data: tKeywordData,
    stat_key: string,
    filter_min_stat: number,
    color: string,
  ) {
    const xScale = this.xScale_keywords;
    const yScale = this.yScale_keywords;
    // console.log(this.keyword_region_size.width)
    const hexbin = Hexbin()
      .x((d) => xScale(keyword_data.keyword_coordinates[d][0]))
      .y((d) => yScale(keyword_data.keyword_coordinates[d][1]))
      .radius(this.binRadius)
      .extent([
        [0, 0],
        [this.width, this.height],
      ]);

    const data_bins = hexbin(Object.keys(keyword_data.keyword_coordinates));
    // const scaleRadius = d3.scaleLinear()
    //     .domain([0, d3.max(data_bins, d => d.length)])
    //     .range([0, hexbin.radius() * Math.SQRT2]);
    // const scaleOpacity = d3.scalePow().exponent(2)
    //     .domain([0, d3.max(data_bins, d => d.length)])
    //     .range([0, 1]);
    const binSumStat = (bins) =>
      d3.sum(
        bins,
        (keyword) => keyword_data.keyword_statistics[keyword][stat_key],
      );
    const binMaxStat = d3.max(data_bins, binSumStat);
    // const scaleColor = d3.scaleSequential(
    //   [0, Math.sqrt(binMaxStat)],
    //   d3.interpolateBlues,
    // );
    const scaleColor = d3
      .scaleLinear()
      .domain([0, Math.sqrt(binMaxStat)])
      .range(["#f7f7f7", color]);
    const hex_centers = hexbin.centers();
    const find_closest_hex_index = (x, y) => {
      let min_dist = 100000;
      let closest_hex_index = 0;
      hex_centers.forEach((hex, index) => {
        const dist = Math.pow(hex[0] - x, 2) + Math.pow(hex[1] - y, 2);
        if (dist < min_dist) {
          min_dist = dist;
          closest_hex_index = index;
        }
      });
      return closest_hex_index;
    };
    const keyword_coordinates = keyword_data.keyword_coordinates;
    const keyword_statistics = keyword_data.keyword_statistics;
    const self = this;
    console.log(data_bins);
    const svg = d3.select("#" + this.svgId);
    svg
      .select("g.hex-group")
      .selectAll("path.hex")
      .data(data_bins)
      .join("path")
      .attr("class", "hex")
      // .attr("d", d => `M${d.x},${d.y}${hexbin.hexagon(scaleRadius(d.length))}`)
      .attr("d", (d) => `M${d.x},${d.y}${hexbin.hexagon()}`)
      // .attr("fill", "lightskyblue")
      .attr("fill", (d) => scaleColor(Math.sqrt(binSumStat(d))))
      //   .attr("opacity", 0.8)
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      // .attr("opacity", (d) => scaleOpacity(d.length))
      // .attr("filter", (d) => d.length > 5? "url(#drop-shadow-hex)": "none")
      .attr("cursor", "pointer")
      .on("mousemove", function (e) {
        d3.select(".tooltip")
          .style("left", e.layerX + 10 + "px")
          .style("top", e.layerY - 30 + "px");
      })
      .on("mouseover", function (e, d) {
        d3.select(this).classed("hex-hover", true).raise();
        d3.selectAll("text.label")
          .classed("hex-label-hover", false)
          .filter((label) => label[0] === d[0])
          .classed("hex-label-hover", true);
        // self.hoveredHexKeywords = d
        d3.select(".tooltip").classed("show-tooltip", true).text(d);
      })
      .on("mouseout", function (_, d) {
        d3.select(this).classed("hex-hover", false);
        d3.selectAll("text.label")
          .filter((label) => label[0] === d[0])
          .classed("hex-label-hover", false);
        // self.hoveredHexKeywords = null
        d3.select(".tooltip").classed("show-tooltip", false);
      })
      .on("click", function (e, d) {
        e.preventDefault();
        const hexes = d3
          .selectAll("path.hex")
          .classed("hex-selected", false)
          .classed("hex-not-selected", true);
        if (self.clicked_hex === d[0]) {
          self.clicked_hex = undefined;
          self.dispatch.call("keywordsSelected", null, null);
          hexes
            .classed("hex-selected", false)
            .classed("hex-not-selected", false);
        } else {
          self.clicked_hex = d[0];
          self.dispatch.call("keywordsSelected", null, d);
          d3.select(this)
            .classed("hex-selected", true)
            .classed("hex-not-selected", false)
            .raise();
        }
      });
    // let hex_labels = new Array(hex_centers.length).fill(null);
    // Object.keys(keyword_coordinates)
    //   .filter(
    //     (keyword) => keyword_statistics[keyword][stat_key] > filter_min_stat,
    //   )
    //   .forEach((keyword) => {
    //     const coordinate = keyword_coordinates[keyword];
    //     const closest_hex_index = find_closest_hex_index(
    //       xScale(coordinate[0]),
    //       yScale(coordinate[1]),
    //     );
    //     if (hex_labels[closest_hex_index] != null) {
    //       const previous_label_freq =
    //         keyword_statistics[hex_labels[closest_hex_index]][stat_key];
    //       const current_label_freq = keyword_statistics[keyword][stat_key];
    //       if (current_label_freq > previous_label_freq) {
    //         hex_labels[closest_hex_index] = keyword;
    //       }
    //     } else {
    //       hex_labels[closest_hex_index] = keyword;
    //     }
    //   });
    svg
      .select("g.label-group")
      .selectAll("text.label")
      // .data(hex_labels)
      .data(data_bins)
      .join("text")
      .text((d) => wrapChinese(d[0]) || "")
      .attr("class", "label")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("fill", (d) => {
        // return "black";
        return Math.sqrt(binSumStat(d) / binMaxStat) > 0.65 ? "white" : "black";
      })
      .attr("font-size", "0.8rem")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("pointer-events", "none");
  }
}

function wrapChinese(text) {
  if (text.length > 2) {
    text = text.slice(0, 2) + "..";
  }
  return text;
}
