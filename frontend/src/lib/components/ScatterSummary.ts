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

    update_summary(selected_var:tChunk[],attr:string){
        this.draw(selected_var,attr)

    }
    draw(selected_var: tChunk[],attr: string){
        console.log({attr})
        console.log(selected_var)
    
        let edge = 10; //buffer zone
        let fix_points = generateFixedPoints(this.categories.length, this.width, this.height, edge);
        console.log(fix_points)

        let attr_coordinates = {}
        this.categories.forEach((property_name, index) => (
            attr_coordinates[property_name] = {x: fix_points[index].x, y: fix_points[index].y}
        ));
        console.log(attr_coordinates)

        // draw the dots
        const svg = d3.select("#"+this.svgId)
        svg.select("g.scatter-plot").selectAll("*").remove()
        // runSimulation(svg,attr,ColorArrayMappings,attr_coordinates,selected_var,this.node_radius,this.width,this.height)
        const nodes = svg.select("g.scatter-plot").selectAll("mydots")
               .data(selected_var)
               .join("circle")
               .attr("r", this.node_radius)
               .attr("fill", d => this.colorScale(d[attr]))
            //    .attr("fill",d => ColorArrayMappings[attr](d[attr]));
        const self = this
        const simulation = d3.forceSimulation(selected_var)
                            //  .force("x", d3.forceX(d => count_Object[d[attr]].center_position.x))
                            //  .force("y", d3.forceY(d => count_Object[d[attr]].center_position.y))
                            .force("x", d3.forceX(d => attr_coordinates[d[attr]].x).strength(0.1))
                            .force("y", d3.forceY(d => attr_coordinates[d[attr]].y).strength(0.1))
                             .force("collide", d3.forceCollide(() => this.node_radius + 1))
                             .on("tick", () => {
                                nodes
                                .attr("cx", d => d.x=clip(d.x, [self.node_radius, self.width - self.node_radius]))
                                .attr("cy", d => d.y=clip(d.y, [self.node_radius, self.height - self.node_radius]))
                             });
    
        // svg.select("g.scatter-plot").selectAll("mydots")
        // .data(fix_points)
        // .join("circle")
        // .attr("cx",d=>d.x)
        // .attr("cy",d=>d.y)
        // .attr("r",10)
        // .attr("fill", "lightgrey")
    
        const mentioned_attr = new Set(selected_var.map(d=>d[attr]))
        console.log("Update legend", selected_var.length, mentioned_attr)
        if(selected_var.length > 0 ) {
        svg.select("g.legend").selectAll("text")
            .data(Object.keys(attr_coordinates).filter(d=>mentioned_attr.has(d)))
            .join("text")
            .attr("x",d=> attr_coordinates[d].x)
            .attr("y",d=> attr_coordinates[d].y)
            .text(d=>d)
            .attr("font-size","1rem")
            .attr("font-weight",600)
            .attr("text-anchor","middle")
            .attr("dominant-baseline","middle")
            .attr("opacity",0)
            .attr("fill", "currentColor")
            .transition().duration(1000)
            .attr("opacity",1)
        } else {
            svg.select("g.legend").selectAll("*").remove()
    
        }
        // //legend
        // pie_legend.selectAll("mydots")
        // .data(this.topicName)
        // .enter()
        // .append("rect")
        // .attr("x", 1700)
        // .attr("y", function(d,i){ return -i*50}) 
        // .attr("width", 50)
        // .attr("height", 50)
        // .style("fill", function(d){ return color(d)})
        
    
        // // Add one dot in the legend for each name.
        // pie_legend.selectAll("mylabels")
        // .data(this.topicName)
        // .enter()
        // .append("text")
        // .attr("x", 1780)
        // .attr("y", function(d,i){ return -i*50+40}) 
        // .style("fill", function(d){ return color(d)})
        // .text(function(d){ return d})
        // .style("font-weight",600)
        // .style("font-size",50)
    }
    // clear_summary() {
    //     console.log("Clear summary")
    //     const svg = d3.select("#"+this.svgId)
    //     svg.select("g.scatter-plot").selectAll("*").remove()
    //     svg.select("g.legend").selectAll("*").remove()
        
    // },

}

function runSimulation(svg,attr,ColorArrayMappings,attr_coordinates,selected_var,node_radius,width,height){
    const nodes = svg.select("g.scatter-plot").selectAll("mydots")
    .data(selected_var)
    .join("circle")
    .attr("r", node_radius)
    .attr("fill",d => ColorArrayMappings[attr](d[attr]));
    // const self = this
    const simulation = d3.forceSimulation(selected_var)
                    //  .force("x", d3.forceX(d => count_Object[d[attr]].center_position.x))
                    //  .force("y", d3.forceY(d => count_Object[d[attr]].center_position.y))
                    .force("x", d3.forceX(d => attr_coordinates[d[attr]].x).strength(0.1))
                    .force("y", d3.forceY(d => attr_coordinates[d[attr]].y).strength(0.1))
                    .force("collide", d3.forceCollide(() => node_radius + 1))
                    .on("tick", () => {
                        nodes
                        .attr("cx", d => d.x=clip(d.x, [node_radius, width - node_radius]))
                        .attr("cy", d => d.y=clip(d.y, [node_radius, height - node_radius]))
                    });
}

function seededRandom(seed) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
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




