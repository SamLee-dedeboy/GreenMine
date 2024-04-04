import * as d3 from 'd3';
import {hexbin as Hexbin} from 'd3-hexbin';
import {tick} from 'svelte';
import { scale } from 'svelte/transition';
import { emotionColorScale } from "../Colors";
// import type  {tVaraible} from './types/variables';

export const scattersummary = {
    init(svgId, width,height, paddings){
        const self = this;
        const summary_svg = d3.select("#"+svgId)
                            // .attr("width", width).attr("height", height)
                            // .attr("transform", `translate(500,200)`)

        const Scatter_group = summary_svg.append("g")
            .attr("class", "scatter-plot")


        const Legend_group = summary_svg.append("g")
            .attr("class", "legend")



        this.width = width
        this.height = height
        this.svgId = svgId
        this.node_radius = 7
        // this.handlers = handlers
        this.topicName = ['政府運作','環境生態','住屋','交通','公有土地','醫療','整體經濟','能源','災害','貿易','其他']
        this.emotionName = ['Resigned','Neutral','Worried','Angry','Proud']

       
       
    },
    update_summary(selected_var,attr){
        // console.log({attr})
        // console.log({selected_var})
        // attr: topic/emotion
        const Counts = selected_var.reduce((acc, item) => {
            const property = item[attr];
            acc[property] = (acc[property] || 0) + 1;
            
            return acc;
        }, {});
        const ThisArrayMappings = {
            emotion: this.emotionName,
            topic: this.topicName,
            // Add more options as needed
          };
        const topicColorScale = d3.scaleOrdinal()
          .domain(ThisArrayMappings[attr])
          .range(d3.schemePaired);

        const ColorArrayMappings = {
            emotion: emotionColorScale,
            topic: topicColorScale
            // Add more options as needed
        }
          



        const count_Array = Object.entries(Counts).map(([property_name, count]) => ({ property_name, count }));

        let edge = 10; //buffer zone
        let fix_points = generateFixedPoints(attr, this.width, this.height, edge);
        let attr_coordinates = {}

        ThisArrayMappings[attr].forEach((property_name, index) => (
            attr_coordinates[property_name] = {x: fix_points[index].x, y: fix_points[index].y}
        ));

    
        
        // draw the dots
        const svg = d3.select("#"+this.svgId)
        svg.select("g.scatter-plot").selectAll("*").remove()
        // svg.selectAll("circle.fixPoints")
        //     .data(fix_points)
        //     .join("circle")
        //     .attr("cx", d => d.x)
        //     .attr("cy", d => d.y)
        //     .attr("r", 10)
        //     .attr("fill", "lightgrey")
        //     .attr("class", "fixPoints")

        const nodes = svg.select("g.scatter-plot").selectAll("mydots")
               .data(selected_var)
               .join("circle")
               .attr("r", this.node_radius)
               .attr("fill",d => ColorArrayMappings[attr](d[attr]));
        const self = this
        const simulation = d3.forceSimulation(selected_var)
                            //  .force("x", d3.forceX(d => count_Object[d[attr]].center_position.x))
                            //  .force("y", d3.forceY(d => count_Object[d[attr]].center_position.y))
                            .force("x", d3.forceX(d => attr_coordinates[d[attr]].x))
                            .force("y", d3.forceY(d => attr_coordinates[d[attr]].y))
                             .force("collide", d3.forceCollide(this.node_radius + 1))
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
        // .attr("r",3)
        // .attr("fill", "lightgrey")

        const mentioned_attr = new Set(selected_var.map(d=>d[attr]))
        // console.log("Update legend", selected_var.length, mentioned_attr)
        if(selected_var.length > 0 ) {
        svg.select("g.legend").selectAll("text")
            .data(Object.keys(attr_coordinates).filter(d=>mentioned_attr.has(d)))
            .join("text")
            .attr("x",d=> attr_coordinates[d].x)
            .attr("y",d=> attr_coordinates[d].y)
            .text(d=>d)
            .attr("font-size",10)
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



    },
    // clear_summary() {
    //     console.log("Clear summary")
    //     const svg = d3.select("#"+this.svgId)
    //     svg.select("g.scatter-plot").selectAll("*").remove()
    //     svg.select("g.legend").selectAll("*").remove()
        
    // },

}


function seededRandom(seed) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}


function generateFixedPoints(attr, width, height, buffer) {
    let fixedPoints :any= [];
    const n = attr == "emotion" ? 5 : 11;
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

function clip(x, range) {
    return Math.max(Math.min(x, range[1]), range[0])
}




