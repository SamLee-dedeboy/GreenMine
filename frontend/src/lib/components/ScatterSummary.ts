import * as d3 from 'd3';
import {hexbin as Hexbin} from 'd3-hexbin';
import {tick} from 'svelte';
import { scale } from 'svelte/transition';
import { emotionColorScale } from "../constants/Colors";
import type { tChunk } from 'lib/types';
import * as Constants from "lib/constants"
// import type  {tVaraible} from './types/variables';

export class ScatterSummary  {
    width: number;
    height: number;
    svgId: string;
    node_radius: number;
    colorScale: any;
    categories: string[];
    constructor(svgId, width,height, paddings, colorScale, categories ){
        this.svgId = svgId
        this.width = width
        this.height = height
        this.node_radius = 7
        this.colorScale = colorScale
        this.categories = categories    
    }

    init() {
        const svg = d3.select(`#${this.svgId}`)
        svg.append("g")
            .attr("class", "scatter-plot")
        svg.append("g")
            .attr("class", "legend")
    }

    draw(node_data: any[]){
    
        let edge = 10; //buffer zone
        let fix_points = generateFixedPoints(this.categories.length, this.width, this.height, edge);
        // console.log(fix_points)

        let attr_coordinates = {}
        this.categories.forEach((property_name, index) => (
            attr_coordinates[property_name] = {x: fix_points[index].x, y: fix_points[index].y}
        ));
        // console.log({attr_coordinates}, {node_data})
        // draw the dots
        const svg = d3.select("#"+this.svgId)
        
        const nodes = svg.select("g.scatter-plot").selectAll(".node")
               .data(node_data)
               .join("circle")
               .attr("class", "node")
               .attr("r", this.node_radius)
               .attr("cx", d => d.x=attr_coordinates[d.attr].x)
               .attr("cy", d => d.y=attr_coordinates[d.attr].y)
               .attr("fill", d => {
                return this.colorScale(d.attr)
               })
               .attr("stroke","black")
        const self = this
        // console.log(svg.node())
        const simulation = d3.forceSimulation(node_data)
                            //  .force("x", d3.forceX(d => count_Object[d[attr]].center_position.x))
                            //  .force("y", d3.forceY(d => count_Object[d[attr]].center_position.y))
                            .force("x", d3.forceX(d => { return attr_coordinates[d.attr].x }))
                            .force("y", d3.forceY(d => attr_coordinates[d.attr].y))
                            .alphaMin(0.01)
                            .force("collide", d3.forceCollide(self.node_radius))
                            .on("tick", () => {
                                const tick_nodes = svg.selectAll("circle.node")
                                .attr("cx", d => d.x=d.x)
                                .attr("cy", d => d.y=d.y)
                                // .attr("cx", d => d.x=clip(d.x, [self.node_radius, self.width - self.node_radius]))
                                // .attr("cy", d => d.y=clip(d.y, [self.node_radius, self.height - self.node_radius]))
                            });
        // svg.select("g.scatter-plot").selectAll("mydots")
        // .data(fix_points)
        // .join("circle")
        // .attr("cx",d=>d.x)
        // .attr("cy",d=>d.y)
        // .attr("r",10)
        // .attr("fill", "lightgrey")
    
        // if(node_data.length > 0 ) {
        // svg.select("g.legend").selectAll("text")
        //     .data(Object.keys(attr_coordinates).filter(d=>this.categories.includes(d)))
        //     .join("text")
        //     .attr("x",d=> attr_coordinates[d].x)
        //     .attr("y",d=> attr_coordinates[d].y)
        //     .text(d=>d)
        //     .attr("font-size","1rem")
        //     .attr("font-weight",600)
        //     .attr("text-anchor","middle")
        //     .attr("dominant-baseline","middle")
        //     .attr("opacity",0)
        //     .attr("fill", "currentColor")
        //     .transition().duration(1000)
        //     .attr("opacity",1)
        // } else {
        //     svg.select("g.legend").selectAll("*").remove()
        // }
        
        //legend
        const all_attrs = Object.keys(attr_coordinates)
        const appeared_attrs = Array.from(new Set(node_data.map(d=>d.attr)))
        drawLegend(svg,all_attrs,this.colorScale, appeared_attrs)

        if(node_data.length == 0){
            svg.select("g.legend").selectAll("*").remove()
        }
    
    }
    clear_summary() {
        console.log("Clear summary")
        const svg = d3.select("#"+this.svgId)
        svg.select("g.scatter-plot").selectAll("*").remove()
        svg.select("g.legend").selectAll("*").remove()
        
    }

}

function seededRandom(seed) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function drawLegend(svg,name:string[],color, appeared_attrs: string[] ){
    const startX = 400; // Starting X position for the first column
    const startY = 10;  // Starting Y position
    const columnWidth = 70; // Horizontal space between columns
    const rowHeight = 20;  // Vertical space between rows
    const maxPerRow = 1 // Max columns per row
    const textOffsetX = 15; // Horizontal offset for text to align it next to the rectangle
    const textOffsetY = 10; // Vertical offset to align text with the center of the rectangles

    // Rectangles
    svg.select("g.legend").selectAll(".legendrect")
        .data(name)
        .join("rect")
        .attr("class","legendrect")
        .attr("x", (d, i) => startX + (i % maxPerRow) * columnWidth)
        .attr("y", (d, i) => startY + Math.floor(i / maxPerRow) * rowHeight)
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", d => color(d));

    // Text Labels
    svg.select("g.legend").selectAll(".legendtext")
        .data(name)
        .join("text")
        .attr("class","legendtext")
        .attr("x", (d, i) => startX + (i % maxPerRow) * columnWidth + textOffsetX)
        .attr("y", (d, i) => startY + Math.floor(i / maxPerRow) * rowHeight + textOffsetY) // Adjusting y to align text with the center of the rectangles
        .style("fill", "black")
        .text(d => d)
        .style("font-weight", (d)=> appeared_attrs.includes(d) ? 600 : 300)
        .attr("opacity", (d)=> appeared_attrs.includes(d) ? 1 : 0.3)
        .style("font-size", "14px");
}

function generateFixedPoints(n, width, height, buffer) {
    let fixedPoints :any= [];
    // // Adjust the width and height to account for the buffer zone
    const xScale = d3.scaleLinear().domain([0, 1]).range([buffer, width - buffer]);
    const yScale = d3.scaleLinear().domain([0, 1]).range([buffer, height - buffer]);
    const offset = 0.3
    const seedScale = d3.scaleLinear().domain([0, 1]).range([0, 1-2*offset]);
    // const usableWidth = width - 2 * buffer;
    // const usableHeight = height - 2 * buffer;
    
    // Calculate the distance between each point
    // const deltaX = usableWidth / Math.ceil(Math.sqrt(n));
    // const deltaY = usableHeight / Math.ceil(Math.sqrt(n));
    const size = Math.ceil(Math.sqrt(n))
    const deltaX = 1 / size
    const deltaY = 1 / size
    // Generate points uniformly within the box
    for (let i = 0; i < n; i++) {
        // Calculate the x and y coordinates of the point
        // const x = buffer + (i % Math.ceil(Math.sqrt(n))) * deltaX + Math.random() * deltaX;
        // const y = buffer + Math.floor(i / Math.ceil(Math.sqrt(n))) * deltaY + Math.random() * deltaY;
        const dx = (i % size) * deltaX + offset * deltaX + seedScale(Math.random()) * deltaX;
        const dy = Math.ceil(i / size) * deltaY + offset * deltaY+ seedScale(Math.random())* deltaY;
        // const dx = (i % size) * deltaX 
        // const dy = Math.ceil(i / size) * deltaY 
        // console.log(dx,dy)
        const x = xScale(dx);
        const y = yScale(dy);
        // Add the point to the list
        fixedPoints.push({ x, y });
    }

    
    return fixedPoints;
}

function clip(value, [min, max]) {
    if(isNaN(value)){
        return min
    }
    return Math.max(min, Math.min(max, value));
  }




