import * as d3 from 'd3';
import {hexbin as Hexbin} from 'd3-hexbin';
import {tick} from 'svelte';


export const varbox = {
    init(svgId, width,height, paddings){
        const self = this;
        const svg = d3.select("#"+svgId).attr("viewBox", `0 0 ${width} ${height}`);
        const driver_region = svg.select("g.driver_region").attr("transform", `translate(${paddings.left}, ${paddings.top})`);
        const pressure_region = svg.select("g.pressure_region").attr("transform", "translate(" + 1200+ "," + paddings.top + ")");
        const state_region = svg.select("g.state_region").attr("transform", "translate(" + 2000+ "," + paddings.top + ")");
        const impact_region = svg.select("g.impact_region").attr("transform", "translate(" + 1500+ "," + 800 + ")");
        const response_region = svg.select("g.response_region").attr("transform", "translate(" + 800+ "," + 800 + ")");

        driver_region.append("g").attr("class","hex-group")
        driver_region.append("g").attr("class","label-group")

        pressure_region.append("g").attr("class","hex-group")
        pressure_region.append("g").attr("class","label-group")

        state_region.append("g").attr("class","hex-group")
        state_region.append("g").attr("class","label-group")

        impact_region.append("g").attr("class","hex-group")
        impact_region.append("g").attr("class","label-group")

        response_region.append("g").attr("class","hex-group")
        response_region.append("g").attr("class","label-group")

        this.driver_region_size = {
            width: width - paddings.left - paddings.right,
            height: height - paddings.top - paddings.bottom
        }

        // this.xScale_vars = d3.scaleLinear().domain([0,1]).range([0, this.var_region_size.width])
        // this.yScale_vars = d3.scaleLinear().domain([0,1]).range([0, this.var_region_size.height])
        // console.log(this)

        this.width = width
        this.height = height
        this.svgId = svgId


       
       
    },

    update_vars(drivers,pressures,states,impacts,responses){
        let variables = [];
        variables.push(drivers,pressures,states,impacts,responses);
        console.log(variables)
        // Use reduce to find the min and max lengths of mentions arrays
        let { minLength, maxLength } = variables.reduce((result, item) => {
            if (item.variable_mentions) {
            Object.values(item.variable_mentions).forEach(variable => {
                if (variable.mentions) {
                const mentionsLength = variable.mentions.length;
                result.minLength = Math.min(result.minLength, mentionsLength);
                result.maxLength = Math.max(result.maxLength, mentionsLength);
                }
            });
            }
            return result;
        }, { minLength: Infinity, maxLength: -Infinity });
        

        let groupclass = ["driver_region","pressure_region","state_region","impact_region","response_region"]
        for (let i = 0; i < 5; i++) {
            this.drawvars(variables[i],groupclass[i],minLength,maxLength)
        }
        

    },

    drawvars(vars,class_name,minLength,maxLength){
        let VarsNum = Object.keys(vars.variable_mentions).length;


        const self = this;
        // const xScale = this.xScale_vars
        // const yScale = this.yScale_vars
        let MapRows = 3;
        let  MapColumns = (VarsNum/MapRows)+1;

        // let regionWidth = this.driver_region_size.width;
        // let regionHeight = this.driver_region_size.height;

        //TODO: set the width and height to the rect of each variable
        let regionWidth = MapColumns*95;
        let regionHeight = 200;

        let hexRadius = Math.min(
            (2 / 3) * regionHeight / (MapRows + 1/3),
            regionWidth / (MapColumns + 1/2) / Math.sqrt(3)
        );

        // console.log("Best-fit Hexagon Radius:", hexRadius);

        //Calculate the center position of each hexagon
        let points: [number, number][] = [];
        for (let i = 0; i < MapRows; i++) {
            for (let j = 0; j < MapColumns; j++) {
                let x = hexRadius * j * Math.sqrt(3)
                //Offset each uneven row by half of a "hex-width" to the right
                if(i%2 === 1) x += (hexRadius * Math.sqrt(3))/2
                let y = hexRadius * i * 1.5
                points.push([x,y])
            }//for j
        }//for i


        let HexwithVar = points.map(([x, y], index) => {
            const var_name = Object.keys(vars.variable_mentions)[index] || 'ADD'; // Empty string if index exceeds data length
            const frequency = vars.variable_mentions[var_name]?.mentions?.length || 0;
        
            return { var_name, frequency, x, y };
        });

        const scaleColor = d3.scaleSequential([minLength, maxLength], d3.interpolateBlues)
        console.log(HexwithVar);

        //Set the hexagon radius
        const hexbin = Hexbin().radius(hexRadius)
                               .extent([[0,0],[regionWidth,regionHeight]]);

        const group = d3.select("#model-svg").select("g."+class_name)
        group.select("g.hex-group").append("rect")
        .attr("class", "bbox shadow")
        .attr("x", 0-hexRadius*3)
        .attr("y", 0-hexRadius*2)
        .attr("width", regionWidth+hexRadius*3)
        .attr("height", regionHeight+hexRadius*2)
        .attr("fill", "white")
        .attr("stroke", "#cdcdcd")
        .attr("stroke-width", 1)
        .attr("rx", "5")

        //Draw the hexagons
        group.select("g.hex-group").selectAll("path.hex")
        .data(HexwithVar)
        .join("path")
        .attr("class", "hex")
        .attr("d", d => `M${d.x},${d.y}${hexbin.hexagon()}`)
        .attr("stroke", "white")
        .attr("stroke-width", "1px")
        .attr("fill", function(d) {
            if(d.var_name!== 'ADD'){
                return scaleColor(d.frequency)
            }
            else return "#cdcdcd"
        })
        .attr("cursor", "pointer")
        .on("mousemove", function(e,d) {
            if (d.frequency !== 0) {
                d3.select(".tooltip").style("left", (e.clientX + 10) + "px").style("top", (e.clientY - 30) + "px");
            }
        })
        .on("mouseover", function(e, d) { 
            if (d.frequency !== 0) {
                d3.select(this).classed("hex-hover", true).raise();
                d3.select(".tooltip").classed("show-tooltip", true).text(d.var_name);
            }
        
        })
        .on("mouseout", function(_, d) { 
            d3.select(this).classed("hex-hover", false)
            d3.select(".tooltip").classed("show-tooltip", false)

        });


        group.select("g.label-group").selectAll("text.label")
        .data(HexwithVar)
        .join("text")
        .text(d => (d.var_name!== 'ADD')? wrapChinese(d.var_name) : d.var_name)
        .attr("class", "label")
        .attr("x", (d) => d.x)
        .attr("y", (d) => d.y)
        .attr("fill", (d) => {
            return (d.frequency) > 140? "white":"black"
        })
        .attr("font-size", "0.8rem")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("pointer-events", "none")

    }


}

function wrapChinese(text) {
    if(text.length > 4) {
        text = text.slice(0, 4) + ".."
    }
    return text
}