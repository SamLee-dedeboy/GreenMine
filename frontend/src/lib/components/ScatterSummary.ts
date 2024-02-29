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
        // this.handlers = handlers
        this.topicName = ['政府運作','環境生態','住屋','交通','公有土地','醫療','整體經濟','能源','災害','貿易','其他']
        this.emotionName = ['Resigned','Neutral','Worried','Angry','Proud']

       
       
    },
    update_summary(selected_var,attr){
        console.log({attr})
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

        let edge = 50; //buffer zone
        let fix_points = generateFixedPoints(attr, this.width, this.height, edge);
        // console.log({fix_points})
        const points = ThisArrayMappings[attr].map((property_name, index) => ({
            property_name: property_name,
            x: fix_points[index].x,
            y: fix_points[index].y
        }));

        const coordinatesMap = new Map(points.map(coord => [coord.property_name, { x: coord.x, y: coord.y }]));

        // Add the center position property to each object in emotionArray
        count_Array.forEach(Obj => {
            const coordinates = coordinatesMap.get(Obj.property_name);
            if (coordinates) {
                Obj["center_position"] = coordinates;
            }
        });


        const count_Object = count_Array.reduce((acc, element) => {
            acc[element.property_name] = element;
            return acc;
        }, {});

    
        
        // draw the dots
        const svg = d3.select("#"+this.svgId)
        svg.select("g.scatter-plot").selectAll("*").remove()

        const simulation = d3.forceSimulation(selected_var)
                             .force("x", d3.forceX(d => count_Object[d[attr]].center_position.x))
                             .force("y", d3.forceY(d => count_Object[d[attr]].center_position.y))
                             .force("collide", d3.forceCollide(5))
                             .on("tick", ticked);


        function ticked() {
            svg.select("g.scatter-plot").selectAll("*").remove()
            svg.select("g.scatter-plot").selectAll("mydots")
               .data(selected_var)
               .join("circle")
               .attr("r", 3)
               .attr("cx", d => d.x)
               .attr("cy", d => d.y)
               .attr("fill", d => ColorArrayMappings[attr](d[attr]));
        }

        // svg.select("g.scatter-plot").selectAll("mydots")
        // .data(fix_points)
        // .join("circle")
        // .attr("cx",d=>d.x)
        // .attr("cy",d=>d.y)
        // .attr("r",3)
        // .attr("fill", "lightgrey")


        svg.select("g.legend").selectAll("text")
        .data(count_Array)
        .join("text")
        .attr("x",d=>d.center_position.x)
        .attr("y",d=>d.center_position.y)
        .text(d=>d.property_name)
        .style("font-size",10)
        .attr("opacity",0)
        .transition(10000)
        .style("opacity",1)

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
    clear_summary() {
        const svg = d3.select("#"+this.svgId)
        svg.select("g.scatter-plot").selectAll("*").remove()
        // svg.select("g.legend").selectAll("*").remove()
        
    },

}


function seededRandom(seed) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}


function generateFixedPoints(attr, width, height, buffer) {
    let fixedPoints :any= [];
    
    // // Adjust the width and height to account for the buffer zone
    // const usableWidth = width - 2 * buffer;
    // const usableHeight = height - 2 * buffer;
    
    // // Calculate the distance between each point
    // const deltaX = usableWidth / Math.ceil(Math.sqrt(n));
    // const deltaY = usableHeight / Math.ceil(Math.sqrt(n));
    
    // // Generate points uniformly within the box
    // for (let i = 0; i < n; i++) {
    //     // Calculate the x and y coordinates of the point
    //     const x = buffer + (i % Math.ceil(Math.sqrt(n))) * deltaX + Math.random() * deltaX;
    //     const y = buffer + Math.floor(i / Math.ceil(Math.sqrt(n))) * deltaY + Math.random() * deltaY;
        
    //     // Add the point to the list
    //     fixedPoints.push({ x, y });
    // }
    if (attr == "emotion"){
        fixedPoints = [
            {x: 251.99277296426192, y: 58.76458708259028},
            {x: 422.32119162316826, y: 91.8026542912294},
            {x: 125.38013484631982, y: 134.07778153023523},
            {x: 335.27233387544004, y: 146.61749055597437},
            {x: 246.88226198278753, y: 228.49659671479748}
        ]
    }
    if (attr == "topic"){   
        fixedPoints = [
            {x: 95.22135189869896, y: 57.83654123027867},
            {x: 309.79252882756487, y: 71.21495555742831},
            {x: 449.8715408679984, y: 84.7620667337842},
            {x: 500.85863252178075, y: 210.71227744231683},
            {x: 208.08947716142768, y: 128.9392060948348},
            {x: 55.50182164971436, y: 105.83512564322257},
            {x: 390.37901925454497, y: 136.7627789238275},
            {x: 122.71974147982374, y: 200.35052189271838},
            {x: 198.99945688608588, y: 270.16691673685997},
            {x: 281.67826814431413, y: 193.96118000686022},
            {x: 354.37901925454497, y: 230.4473932662158},
        ]
    }

    
    return fixedPoints;
}





