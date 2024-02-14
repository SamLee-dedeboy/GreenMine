import * as d3 from 'd3';
import {hexbin as Hexbin} from 'd3-hexbin';
import {tick} from 'svelte';
// import type  {tVaraible} from './types/variables';

export const varbox = {
    init(svgId, width,height, paddings,handlers){
        const self = this;
        const svg = d3.select("#"+svgId).attr("viewBox", `0 0 ${width} ${height}`)
                    .on("click", function(e) {
                        if(!e.defaultPrevented) {
                            d3.selectAll("path.hex")
                                .classed("hex-highlight", false)
                                .classed("hex-not-highlight", false)
                            d3.selectAll("text.label")
                                .classed("hex-label-highlight", false)
                                .classed("hex-label-not-highlight", false)
                            handlers.VarSelected(null)
                        }
                    });
        const driver_region = svg.select("g.driver_region")
        const pressure_region = svg.select("g.pressure_region")
        const state_region = svg.select("g.state_region")
        const impact_region = svg.select("g.impact_region")
        const response_region = svg.select("g.response_region")

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

        this.clicked_hex = null
        this.width = width
        this.height = height
        this.svgId = svgId
        this.handlers = handlers


       
       
    },

    update_vars(drivers,pressures,states,impacts,responses){
        let variables:any[] = [];
        variables.push(drivers,pressures,states,impacts,responses);
        // console.log(variables)
        
        // Use reduce to find the min and max lengths of mentions arrays
        let { minLength, maxLength } = variables.reduce((result, item) => {
            if (item.variable_mentions) {
            Object.values(item.variable_mentions).forEach((variable:any) => {
                if (variable.mentions) {
                const mentionsLength = variable.mentions.length;
                result.minLength = Math.min(result.minLength, mentionsLength);
                result.maxLength = Math.max(result.maxLength, mentionsLength);
                }
            });
            }
            return result;
        }, { minLength: Infinity, maxLength: -Infinity });
        
        let regionWidth = this.width/4;
        let regionHeight = this.height/6;
        let groups = ["Drivers","Pressures","States","Impacts","Responses"]
        const bboxes = radialBboxes(groups,this.width,this.height,{width: regionWidth, height: regionHeight})
        let groupclass = ["driver_region","pressure_region","state_region","impact_region","response_region"]
        for (let i = 0; i < 5; i++) {
            this.drawvars(variables[i],groupclass[i],groups[i],minLength,maxLength,bboxes[groups[i]],regionWidth,regionHeight)
        }
        

    },

    drawvars(vars,class_name,group_name,minLength,maxLength,box_coor,regionWidth,regionHeight){
        // let VarsNum = Object.keys(vars.variable_mentions).length;
        const rectheight = 30;
        const rectangles = Object.values(vars.variable_mentions).map((variable:any) => {
            return { name:variable.variable_name, width: (variable.variable_name.length)*20, height: rectheight };
        }
        );

        const self = this;
        // const xScale = this.xScale_vars
        // const yScale = this.yScale_vars
        // let MapRows = 3;
        // let  MapColumns = (VarsNum/MapRows)+1;

        const bbox_center = box_coor.center
        const bbox_origin = [bbox_center[0] - regionWidth/2, bbox_center[1] - regionHeight/2]

        const rectangleCoordinates = layoutRectangles(regionWidth, regionHeight, 30, rectangles, bbox_origin);

        let HexwithVar = rectangleCoordinates.map(([x, y, rectwidth, rectheight], index) => {
            const var_name = Object.keys(vars.variable_mentions)[index] || 'ADD'; // Empty string if index exceeds data length
            const mentions = vars.variable_mentions[var_name]?.mentions || [];
            const frequency = vars.variable_mentions[var_name]?.mentions?.length || 0;
            return { var_name, mentions, frequency, x, y, rectwidth, rectheight };
        });

        const scaleColor = d3.scaleSequential([minLength, maxLength], d3.interpolateBlues)


        const group = d3.select("#"+this.svgId).select("g."+class_name)
        group.select("g.hex-group").append("rect")
        .attr("class", "bbox shadow")
        .attr("x", bbox_center[0] - regionWidth/2)
        .attr("y", bbox_center[1] - regionHeight/2)
        .attr("width", regionWidth)
        .attr("height", regionHeight)
        .attr("fill", "white")
        .attr("stroke", "#cdcdcd")
        .attr("stroke-width", 1)
        .attr("rx", "5")

        group.select("g.hex-group").append("text")
        .attr("class", "bbox-label")
        .attr("x", bbox_center[0])
        .attr("y", bbox_center[1] - regionHeight/2 - 10)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .text(group_name)
        .attr("font-family","serif")
        .attr("font-style", "italic")
        .attr("font-size", "2rem")
        .attr("font-weight", "bold")    
        .attr("fill", "#636363")
        .attr("opacity", "0.8")

        group.select("g.hex-group").selectAll("rect.hex")
        .data(HexwithVar)
        .join("rect")
        .attr("class", "hex")
        .attr("x", (d) => d.x)
        .attr("y", (d) => d.y)
        .attr("width", function(d) {
            return ((d.var_name).length)*20; //20px per character
        })
        .attr("height", rectheight)
        .attr("stroke", "white")
        .attr("stroke-width", "1px")
        .attr("rx", "5")
        .attr("fill", function(d) {
            if (d.frequency !== 0) {
                return scaleColor(d.frequency);
            } else {
                return "#cdcdcd";
            }
        })
        .attr("cursor", "pointer")
        // .on("mousemove", function(e,d) {
        //     // if (d.frequency !== 0) {
        //         d3.select(".tooltip").style("left", (e.clientX + 10) + "px").style("top", (e.clientY - 30) + "px");
        //     // }
        // })
        .on("mouseover", function(e, d) { 
            // if (d.frequency !== 0) {
                d3.select(this).classed("hex-hover", true).raise();
                // d3.select(".tooltip").classed("show-tooltip", true).text(d.var_name);
            // }
        
        })
        .on("mouseout", function(_, d) { 
            d3.select(this).classed("hex-hover", false)
            // d3.select(".tooltip").classed("show-tooltip", false)

        })
        .on("click", function(e, d) {
            // console.log(d)
            e.preventDefault()
            const hexas = d3.selectAll("rect.hex")
            .classed("hex-highlight", false)
            .classed("hex-not-highlight", true)
            const labels = d3.selectAll("text.label")
            .classed("hex-label-highlight", false)
            .classed("hex-label-not-highlight", true)
            if(self.clicked_hex === d) {
                self.clicked_hex = null
                self.handlers.VarSelected(null)
                hexas.classed("hex-highlight", false).classed("hex-not-highlight", false)
                labels.classed("hex-label-highlight", false).classed("hex-label-not-highlight", false)
            }else{
                console.log(d)
                self.clicked_hex = d
                self.handlers.VarSelected(d)
                d3.select(this).classed("hex-highlight", true).classed("hex-not-highlight", false).raise()
                labels.filter(label_data => d.var_name === label_data.var_name).classed("hex-label-highlight", true).classed("hex-label-not-highlight", false).raise()
            }
        })


        group.select("g.label-group").selectAll("text.label")
        .data(HexwithVar)
        .join("text")
        .text(d => d.var_name)
        .attr("class", "label")
        .attr("x", (d) => d.x+ d.rectwidth/2 )
        .attr("y", (d) => d.y+ d.rectheight/2)
        .attr("fill", (d) => {
            // return "black"
            return (d.frequency) > 140? "white":"black"
        })
        .attr("font-size", "0.8rem")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("pointer-events", "none")

    },



}

// function wrapChinese(text) {
//     if(text.length > 2) {
//         text = text.slice(0, 2) + ".."
//     }
//     return text
// }

function radialBboxes(groups, width, height, maxBboxSize) {
    const offset = 234 * Math.PI / 180
    const angleScale = d3.scaleBand().domain(groups).range([offset, offset+Math.PI * 2])
    let bboxes = {}
    const a = width/2 - maxBboxSize.width/2
    const b = height/2 - maxBboxSize.height/2
    groups.forEach((group, index) => {
        const scalefactor = 0.8
        const angle = angleScale(group)
        const r = (a*b)/Math.sqrt(Math.pow(b*Math.cos(angle), 2) + Math.pow(a*Math.sin(angle), 2))*0.8
        const x = width / 2 + r * Math.cos(angle)
        const y = height / 2 + r * Math.sin(angle)
        bboxes[group] = {
            center: [x, y]
        }
    })
    return bboxes
}

function layoutRectangles(regionWidth, bigRectHeight, rowHeight, rectangles, bbox_origin) {
        let padding = 10;
        let x = padding;
        let y = padding;
        let row = 0;
        let rowWidth = 0;

        // console.log(rectangles)
        const rectangleCoordinates :any[] = [];
    
        rectangles.forEach(rect => {
            if (x + rect.width + padding> regionWidth) {
                // Move to the next row
                y += rect.height + padding;
                x = padding;
                row++;
                rowWidth = 0;
            }
            rectangleCoordinates.push([ x, y,rect.width, rect.height]);
    
            x += rect.width + padding;
            rowWidth += rect.width;
    
            if (rowWidth > regionWidth) {
                throw new Error('Cannot fit rectangles within the big rectangle.');
            }
        });
        rectangleCoordinates.forEach((coor) => {
            coor[0] += bbox_origin[0];
            coor[1] += bbox_origin[1];
        });
        return rectangleCoordinates
}
// function shiftCenter(points, bbox_center, hexRadius) {
//     let minX = Infinity;
//     let minY = Infinity;
//     let maxX = -Infinity;
//     let maxY = -Infinity;

//     for (const [x, y] of points) {
//         minX = Math.min(minX, x-hexRadius * Math.sqrt(3)/2);
//         minY = Math.min(minY, y-hexRadius);
//         maxX = Math.max(maxX, x+hexRadius * Math.sqrt(3)/2);
//         maxY = Math.max(maxY, y+hexRadius);
//     }

//     // Calculate the center of the bounding box
//     const centerX = (minX + maxX) / 2;
//     const centerY = (minY + maxY) / 2;

//     // Calculate the shift amounts
//     const shiftX = bbox_center[0] - centerX;
//     const shiftY = bbox_center[1] - centerY;

//     // Shift all points in the array
//     const shiftedPoints = points.map(([x, y]) => [x + shiftX, y + shiftY]);
//     return shiftedPoints
// }