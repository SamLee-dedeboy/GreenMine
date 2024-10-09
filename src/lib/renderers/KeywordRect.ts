import * as d3 from "d3";
import { hexbin as Hexbin } from "d3-hexbin";
import type { tKeywordData } from "lib/types";

export class KeyWordRect {
  svgId: string = "";
  width: number = 100;
  height: number = 100;
  paddings: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  } = { left: 0, right: 0, top: 0, bottom: 0 };
  xScale_keywords: any;
  yScale_keywords: any;
  // clicked_rect: string | undefined;
  dispatch: any;
  clickable: boolean = false;
  constructor() {}
  on(event, handler) {
    this.dispatch.on(event, handler);
  }

  // call this when svg is mounted
  init(svgId: string, svgWidth: number, svgHeight: number) {
    console.log("KeywordRect constructor");
    this.svgId = svgId;
    this.dispatch = d3.dispatch("keywordSelected");
    this.width = svgWidth;
    this.height = svgHeight;
    d3.select("#" + this.svgId).attr(
      "viewBox",
      "0 0 " + this.width + " " + this.height,
    );
    this.paddings = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    };
    this.xScale_keywords = d3
      .scaleLinear()
      .domain([0, 1])
      .range([this.paddings.left, this.width - this.paddings.right]);
    this.yScale_keywords = d3
      .scaleLinear()
      .domain([0, 1])
      .range([this.paddings.bottom, this.height - this.paddings.top]);
    // this.clicked_rect = undefined;
    d3.select("#" + this.svgId)
      .append("g")
      .attr("class", "node-group");
    // d3.select("#" + this.svgId)
    //   .append("g")
    //   .attr("class", "label-group");
  }

  // call this when data is updated
  update_keywords(keyword_data: tKeywordData, stat_key: string, color: string) {
    color = "#0d6db1";
    const xScale = this.xScale_keywords;
    const yScale = this.yScale_keywords;
    console.log("update_keywords", keyword_data, stat_key, color);
    const nodes_dict = collect_nodes(keyword_data, stat_key, xScale, yScale);
    const maxStat = Math.max(...Object.values(nodes_dict).map((d) => d.degree));
    // scales
    const scaleColor = d3
      .scaleLinear()
      .domain([0, Math.sqrt(maxStat)])
      .range(["#eeeeee", color]);
    const scaleFontSize = d3
      .scaleLinear()
      .domain([0, Math.sqrt(maxStat)])
      .range([0.7, 1.5]); // rem

    // update keywords
    console.log("update_keywords", nodes_dict);
    const self = this;
    const svg = d3.select("#" + this.svgId);
    const nodes = svg
      .select("g.node-group")
      .selectAll("g.node")
      .data(Object.values(nodes_dict))
      .join("g")
      .attr("class", "node")
      .each(function (d) {
        const group = d3.select(this);
        group.selectAll("*").remove();
        group
          .append("text")
          .text(d.label)
          .attr("x", d.x)
          .attr("y", d.y)
          .attr("fill", (d) => {
            return d.degree / maxStat > 0.5 ? "white" : "black";
          })
          .attr("font-size", (d) => scaleFontSize(d.degree) + "rem")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("pointer-events", "none");
        const bbox = group.select("text").node().getBBox();
        group
          .append("rect")
          .attr("x", d.x - bbox.width / 2)
          .attr("y", d.y - bbox.height / 2)
          .attr("width", (d) => (d.width = bbox.width))
          .attr("height", (d) => (d.height = bbox.height))
          .attr("fill", (d) => scaleColor(d.degree))
          .attr("stroke", "white")
          .attr("stroke-width", 0.5)
          .attr("rx", 5)
          .attr("filter", "drop-shadow(0 1px 1px rgba(0, 0, 0, 0.5))")
          .attr("cursor", "pointer")
          .on("mouseover", function (e, d) {
            d3.select(this.parentNode).raise();
            d3.select(this).classed("rect-hover", true);
            d3.selectAll("text.label")
              .classed("rect-label-hover", false)
              .filter((label) => label[0] === d.label)
              .classed("rect-label-hover", true);
          })
          .on("mouseout", function (_, d) {
            d3.select(this).classed("rect-hover", false);
            d3.selectAll("text.label")
              .filter((label) => label[0] === d.label)
              .classed("rect-label-hover", false);
          })
          .on("click", function (e, d) {
            // console.log("click", d, self.clicked_rect);
            e.preventDefault();
            const hexes = d3
              .selectAll("rect.keyword")
              .classed("rect-selected", false)
              .classed("rect-not-selected", true);
            d3.select(this)
              .classed("rect-selected", true)
              .classed("rect-not-selected", false);
            // .raise();
            self.dispatch.call("keywordSelected", null, d.label);
          })
          .lower();
      });

    const scalePositionForce = d3
      .scaleLinear()
      .domain([0, maxStat])
      .range([0, 0]);
    // update force
    const force_data = Object.values(nodes_dict);
    const simulation = d3
      .forceSimulation(force_data)
      .alphaMin(0.01)
      .force("charge", d3.forceManyBody().strength(-2))
      .force("collide", forceCollide())
      .force(
        "x",
        d3
          .forceX()
          .x((d) => d.x)
          .strength((d) => scalePositionForce(d.degree)),
      )
      .force(
        "y",
        d3
          .forceY()
          .y((d) => d.y)
          .strength((d) => scalePositionForce(d.degree)),
      )
      .on("tick", () => {
        nodes.each(function (d) {
          const bbox = d3.select(this).select("text").node().getBBox();
          d.x = clip(d.x, [
            self.paddings.left + bbox.width / 2,
            self.width - self.paddings.right - bbox.width / 2,
          ]);
          d.y = clip(d.y, [
            self.paddings.top + bbox.height / 2,
            self.height - self.paddings.bottom - bbox.height / 2,
          ]);
          d3.select(this).select("text").attr("x", d.x).attr("y", d.y);
          d3.select(this)
            .select("rect")
            .attr("x", d.x - bbox.width / 2)
            .attr("y", d.y - bbox.height / 2);
        });
      });
  }
}

function wrapChinese(text) {
  if (text.length > 2) {
    text = text.slice(0, 2) + "..";
  }
  return text;
}

function collect_nodes(
  keywords: tKeywordData,
  stat_key: string,
  xScale,
  yScale,
) {
  const node_dict: Record<
    string,
    { label: string; degree: number; x: number; y: number }
  > = {};
  const statistics = keywords.keyword_statistics;
  const coordinates = keywords.keyword_coordinates;
  const degrees = Object.values(statistics)
    .map((d) => d[stat_key])
    .sort((a, b) => b - a);
  keywords.keyword_list.forEach((keyword) => {
    const degree = statistics[keyword][stat_key];
    if (degree < degrees[70]) return;
    const coordinate = coordinates[keyword];
    node_dict[keyword] = {
      label: keyword,
      degree: degree,
      x: xScale(coordinate[0]),
      y: yScale(coordinate[1]),
    };
  });

  return node_dict;
}

function clip(x, range) {
  return Math.max(Math.min(x, range[1]), range[0]);
}
function forceCollide() {
  let nodes;

  function force(alpha) {
    let padding = 0;
    const quad = d3.quadtree(
      nodes,
      (d) => d.x,
      (d) => d.y,
    );
    for (let d of nodes) {
      if (d.degree < 0.2) continue;
      quad.visit((q, x1, y1, x2, y2) => {
        let updated = false;
        if (q.data && q.data !== d) {
          let x = d.x - q.data.x,
            y = d.y - q.data.y,
            xSpacing = padding + (q.data.width + d.width) / 2,
            ySpacing = padding + (q.data.height + d.height) / 2,
            absX = Math.abs(x),
            absY = Math.abs(y),
            l,
            lx,
            ly;

          if (absX < xSpacing && absY < ySpacing) {
            l = Math.sqrt(x * x + y * y);

            lx = (absX - xSpacing) / l;
            ly = (absY - ySpacing) / l;

            // the one that's barely within the bounds probably triggered the collision
            if (Math.abs(lx) > Math.abs(ly)) {
              lx = 0;
            } else {
              ly = 0;
            }
            d.x -= x *= lx;
            d.y -= y *= ly;
            q.data.x += x;
            q.data.y += y;
            updated = true;
          }
        }
        return updated;
      });
    }
  }

  force.initialize = (_) => (nodes = _);

  return force;
}
