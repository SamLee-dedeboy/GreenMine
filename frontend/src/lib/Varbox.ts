import * as d3 from 'd3';
// import {hexbin as Hexbin} from 'd3-hexbin';
import {tick} from 'svelte';
import { scale } from 'svelte/transition';

// import { drivers } from './Varbox.svelte';
import type  {tVariable} from './types/variables';

export const varbox = {
    init(svgId, width,height, paddings, handlers){
        const svg = d3.select("#"+svgId).attr("viewBox", `0 0 ${width} ${height}`)
        .on("click", function(e) {
            if(!e.defaultPrevented) {
                d3.selectAll("rect.box")
                    .classed("box-highlight", false)
                    .classed("box-not-highlight", false)
                d3.selectAll("text.label")
                    .classed("box-label-highlight", false)
                    .classed("box-label-not-highlight", false)
                d3.selectAll("path.link")
                    .classed("link-highlight", false)
                    .classed("link-not-highlight", false)
                handlers.VarSelected(null)
                handlers.LinkSelected(null)
            }
        });
        const driver_region = svg.select("g.driver_region")
        const pressure_region = svg.select("g.pressure_region")
        const state_region = svg.select("g.state_region")
        const impact_region = svg.select("g.impact_region")
        const response_region = svg.select("g.response_region")
        svg.append("g").attr('class', 'link-group');

        driver_region.append("g").attr("class","box-group")
        driver_region.append("g").attr("class","label-group")
        pressure_region.append("g").attr("class","box-group")
        pressure_region.append("g").attr("class","label-group")
        state_region.append("g").attr("class","box-group")
        state_region.append("g").attr("class","label-group")
        impact_region.append("g").attr("class","box-group")
        impact_region.append("g").attr("class","label-group")
        response_region.append("g").attr("class","box-group")
        response_region.append("g").attr("class","label-group")

        this.clicked_hex = null
        this.clicked_link = null
        this.width = width
        this.height = height
        this.svgId = svgId
        this.handlers = handlers
        this.topicName = ['政府運作','環境運作','住屋','交通','公有土地','醫療','整體經濟','能源','災害','貿易','其他']
        this.topicEmotion = ['Resigned','Neutral','Worried','Angry','Proud']
    },

    updateColorScales(drivers, pressures, states, impacts, responses) {
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
        const scaleColor = d3.scaleSequential([minLength, maxLength], d3.interpolateBlues)
        return scaleColor
    },

    updateRadialBoxes(drivers, pressures, states, impacts, responses) {
        let groups = ["Drivers","Pressures","States","Impacts","Responses"]
        const bboxes = radialBboxes(groups,1,1,{width: 1, height: 1})
    },

    update_vars(drivers,pressures,states,impacts,responses,new_links, selected_var_name){
        let variables:any[] = [];
        variables.push(drivers,pressures,states,impacts,responses);
        
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

        const maxFrequency = new_links.reduce((max, link) => Math.max(max, link.frequency), 0);
        const minFrequency = new_links.reduce((min, link) => Math.min(min, link.frequency), Infinity);

        const frequencyList = {
            minLength: minLength,
            maxLength: maxLength,
            minFrequency: minFrequency,
            maxFrequency: maxFrequency
        };
        

        
        let regionWidth = this.width/4;
        let regionHeight = this.height/6;
        let groups = ["Drivers","Pressures","States","Impacts","Responses"]
        const bboxes = radialBboxes(groups,this.width,this.height,{width: regionWidth, height: regionHeight})
        let groupclass = ["driver_region","pressure_region","state_region","impact_region","response_region"]
        for (let i = 0; i < 5; i++) {
            this.drawvars(variables[i],groupclass[i],groups[i],frequencyList,bboxes[groups[i]],regionWidth,regionHeight)
        }
        const svg = d3.select("#"+this.svgId)
        const mergedData = new_links.map(link => {

            const source_block = document.getElementById(`${link.source.var_type}`);
            const target_block = document.getElementById(`${link.target.var_type}`);
            const sourceElement = document.getElementById(`${link.source.variable_name}`);
            const targetElement = document.getElementById(`${link.target.variable_name}`);
            if(sourceElement === null || targetElement === null || target_block === null || source_block === null){
                return null
            }
            const x_s = parseFloat(sourceElement.getAttribute('x')||'0');
            const y_s = parseFloat(sourceElement.getAttribute('y')||'0');
            const width_s = parseFloat(sourceElement.getAttribute('width')||'0');
            const height_s = parseFloat(sourceElement.getAttribute('height')||'0');

            const block_x_s = parseFloat(source_block.getAttribute('x')||'0');
            const block_y_s = parseFloat(source_block.getAttribute('y')||'0');
            const block_width_s = parseFloat(source_block.getAttribute('width')||'0');
            const block_height_s = parseFloat(source_block.getAttribute('height')||'0');

            const x_t = parseFloat(targetElement.getAttribute('x')||'0');
            const y_t = parseFloat(targetElement.getAttribute('y')||'0');
            const width_t = parseFloat(targetElement.getAttribute('width')||'0');
            const height_t = parseFloat(targetElement.getAttribute('height')||'0');

            const block_x_t = parseFloat(target_block.getAttribute('x')||'0');
            const block_y_t = parseFloat(target_block.getAttribute('y')||'0');
            const block_width_t = parseFloat(target_block.getAttribute('width')||'0');
            const block_height_t = parseFloat(target_block.getAttribute('height')||'0');
            // console.log({sourceElement,targetElement,target_block,source_block})

            const sourcePosition = {
                var_type: link.source.var_type,
                var_name: link.source.variable_name,
                x: x_s + width_s / 2, // Center X
                y: y_s + height_s / 2, // Center Y
                x_right: x_s + width_s, // Right edge, 10 units from the right
                x_left: x_s, // Left edge
                y_top: y_s, // Top edge
                y_bottom: y_s + height_s, // Bottom edge
                block_x: block_x_s + block_width_s / 2, // Center X of the block
                block_y: block_y_s + block_height_s / 2, // Center Y of the block
                block_y_top: block_y_s, // Top edge of the block
                block_y_bottom: block_y_s + block_height_s // Bottom edge of the block
            };
        
            const targetPosition = {
                var_type: link.target.var_type,
                var_name: link.target.variable_name,
                x: x_t + width_t / 2, // Center X
                y: y_t + height_t / 2, // Center Y
                x_right: x_t + width_t, // Right edge, 10 units from the right
                x_left: x_t, // Left edge
                y_top: y_t, // Top edge
                y_bottom: y_t + height_t, // Bottom edge
                block_x: block_x_t + block_width_t / 2, // Center X of the block
                block_y: block_y_t + block_height_t / 2, // Center Y of the block
                block_y_top: block_y_t, // Top edge of the block
                block_y_bottom: block_y_t + block_height_t // Bottom edge of the block
            };
        
            return { source: sourcePosition, target: targetPosition,frequency: link.frequency, mentions: link.mentions};
        }).filter(data => data !== null);
        
        // console.log(mergedData);

    // console.log(selected_var_name)
    // // Append a group for the links
    // let linkGroup = svg.select("g.link-group")
    const self = this;
    let spacing = 20
    // Bind data and create paths for each link
    svg.select("g.link-group").selectAll(".link")
        .data(mergedData)
        .join("path")
        .attr("class", "link")
        .attr("id",(d)=>`${d.source.var_name}`+"-"+`${d.target.var_name}`)
        .attr("d", function(d,i) {
            let middleX1 
            let newX_source, newY_source, newX_target, newY_target;
            let middleY1;
            if ((d.source.var_type == "drivers" && d.target.var_type == "pressures")) {
                let threshold;
                threshold = Math.abs((d.source.block_y-d.source.y))*3
                middleX1 = d.source.x+ (d.target.x-d.source.x) / 2; 
                middleY1 = d.source.block_y_top - threshold; // Target is top
                newX_source = d.source.x_right;
                newY_source = d.source.y_top;
                newX_target = d.target.x_left;
                newY_target = d.target.y;
            } 
            if ((d.source.var_type == "pressures" && d.target.var_type == "states")) {
                // console.log("entering drawing p to s")
                let threshold;
                threshold = Math.abs((d.source.block_y-d.source.y))
                middleX1 = d.target.x+2*(d.target.x-d.source.x) / 3; 
                middleY1 = d.source.block_y-(d.source.block_y- d.target.block_y)/4; // Target is top
                newX_source = d.source.x_right;
                newY_source = d.source.y_bottom;
                newX_target = d.target.x_right;
                newY_target = d.target.y;
            } 
            else if ((d.source.var_type == "states" && d.target.var_type == "impacts")) {
                let threshold;
                threshold = Math.abs((d.source.block_y-d.source.y))*2
                middleX1 = d.target.x+ Math.abs(d.target.x-d.source.x); 
                middleY1 = d.source.block_y_bottom + threshold; // Target is top
                newX_source = d.source.x_left;
                newY_source = d.source.y_bottom;
                newX_target = d.target.x_right;
                newY_target = d.target.y;
            } 
            if ((d.source.var_type == "impacts" && d.target.var_type == "responses")) {
                let threshold;
                threshold = Math.abs((d.source.block_y-d.source.y))*2
                middleX1 = d.source.x+ (d.target.x-d.source.x) /1.5; 
                middleY1 = d.source.block_y + threshold; // Target is top
                newX_source = d.source.x_left;
                newY_source = d.source.y_top;
                newX_target = d.target.x_right;
                newY_target = d.target.y;
            } 
            else if ((d.source.var_type == "responses" && d.target.var_type == "drivers")) {
                let threshold;
                threshold = Math.abs((d.source.block_y-d.source.y))
                middleX1 = d.target.x- Math.abs(d.target.x-d.source.x)*1.5; 
                middleY1 = d.source.block_y-(d.source.block_y- d.target.block_y)/2; // Target is top
                newX_source = d.source.x_left;
                newY_source = d.source.y_top;
                newX_target = d.target.x_left;
                newY_target = d.target.y;
            } 
            else if ((d.source.var_type == "responses" && d.target.var_type == "states")){
                let threshold;
                threshold = Math.abs((d.source.block_y-d.source.y))*2
                middleX1 = d.source.x+ (d.target.x-d.source.x) / 2; 
                middleY1 = d.source.block_y_top - threshold; // Target is top
                newX_source = d.source.x_right;
                newY_source = d.source.y_top;
                newX_target = d.target.x_left;
                newY_target = d.target.y_top;
            }
            else if ((d.source.var_type == "responses" && d.target.var_type == "pressures")){
                let threshold;
                threshold = Math.abs((d.source.block_y-d.source.y))*2
                middleX1 = d.source.x+ (d.target.x-d.source.x) / 2; 
                middleY1 = d.source.block_y - threshold; // Target is top
                newX_source = d.source.x_right;
                newY_source = d.source.y_top;
                newX_target = d.target.x_left;
                newY_target = d.target.y;
            }

            const path = d3.path();
            path.moveTo(newX_source, newY_source); // Start at the source

        
            // Curve to (middleX1, middleY1), descending to midPoint1
            path.quadraticCurveTo(
                middleX1, middleY1, // Control point at the first peak
                newX_target, newY_target // End at the first midpoint
            );
        
        
            return path.toString();
        })
        .attr("cursor", "pointer")
        .attr("fill", "none")
        // .attr("stroke", "url(#grad)")
        // .attr("stroke",d=> scaleColor(d.frequency))
        .attr("stroke", "gray")
        .attr("stroke-width", function(d) {
            const widthSacle = d3.scaleLinear().domain([frequencyList.minFrequency, frequencyList.maxFrequency]).range([2, 10])
            return widthSacle(d.frequency);
        })
        .attr("opacity", 0.1)
        .on("mouseover", function(e, d) {
            // console.log(d)
            d3.select(this).classed("line-hover",true).raise()
            d3.select(this.parentNode) // this refers to the path element, and parentNode is the SVG or a <g> element containing it
            .append("text")
            .attr("class", "link-frequency-text") // Add a class for styling if needed
            .attr("x", () => e.clientX +10) // Position the text in the middle of the link
            .attr("y", () => e.clientY - 20)
            .attr("text-anchor", "middle") // Center the text on its coordinates
            .attr("fill", "black") // Set the text color
            .text(d.frequency);
        })
        .on("mouseout", function(e, d) {
            d3.select(this).classed("line-hover",false)
            d3.selectAll(".link-frequency-text").remove();
        })
        .on("click", function(e, d) {
            console.log(d)
            e.preventDefault()
            const links = d3.selectAll("path.link")
            .classed("link-highlight", false)
            .classed("link-not-highlight", true)

            const hexas = d3.selectAll("rect.box")
            .classed("box-highlight", false)
            .classed("box-not-highlight", true)

            const labels = d3.selectAll("text.label")
            .classed("box-label-highlight", false)
            .classed("box-label-not-highlight", true)


            if(self.clicked_link === d){
                self.clicked_link = null
                self.handlers.LinkSelected(null)
            }
            else{
                self.clicked_link = d
                self.handlers.LinkSelected(d)
                // links.classed("link-highlight", false).classed("link-not-highlight", true)
                d3.select(this).classed("link-highlight", true).classed("link-not-highlight", false).raise()

                hexas
                .filter(box_data => box_data.variable_name === d.source.var_name || box_data.variable_name === d.target.var_name)
                .classed("box-highlight", true)
                .classed("box-not-highlight", false).raise()

                labels
                .filter(label_data => label_data.variable_name === d.source.var_name || label_data.variable_name === d.target.var_name)
                .classed("box-label-highlight", true)
                .classed("box-label-not-highlight", false).raise()
            }
        })
    },

    drawvars(vars,class_name,group_name,frequencyList,box_coor,regionWidth,regionHeight,links){
        console.log("Draw vars")
        
        interface VariableMention {
            variable_name: string;
            mentions: any[];
          }

        const rectheight = 30;

        const rectangles = Object.values(vars.variable_mentions as Record<string, VariableMention>)
        .sort((a, b) => b.mentions.length - a.mentions.length) // Sorting in descending order by mentions length
        .map(variable => ({
            name: variable.variable_name,
            width: (variable.variable_name.length) * 20, // Calculate width based on name length
            height: rectheight, // Use the predefined or calculated height
        }));

        const self = this;
        // const xScale = this.xScale_vars
        // const yScale = this.yScale_vars
        // let MapRows = 3;
        // let  MapColumns = (VarsNum/MapRows)+1;

        const bbox_center = box_coor.center
        const bbox_origin = [bbox_center[0] - regionWidth/2, bbox_center[1] - regionHeight/2]
        const rectangleCoordinates = layoutRectangles(regionWidth, regionHeight, 30, rectangles, bbox_origin);
        // Execute the function
        const HexwithVar = combineData(vars,rectangleCoordinates);
        // console.log(HexwithVar)
        let max = Math.max(frequencyList.maxLength, frequencyList.maxFrequency);
        let min = Math.min(frequencyList.minLength, frequencyList.minFrequency);
        const scaleColor = d3.scaleSequential([min, max], d3.interpolateBlues)

        const group = d3.select("#"+this.svgId).select("g."+class_name)
        group.select("g.box-group").append("rect")
        .attr("class", "bbox")
        .attr("id", `${group_name.toLowerCase()}`)
        .attr("x", bbox_center[0] - regionWidth/2)
        .attr("y", bbox_center[1] - regionHeight/2)
        .attr("width", regionWidth)
        .attr("height", regionHeight)
        .attr("fill", "none")
        .attr("stroke", "#cdcdcd")
        .attr("stroke-width", 1)
        .attr("opacity", "1") //do not show the bounding box
        .attr("rx", "5")

        group.select("g.box-group").append("text")
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

        group.select("g.box-group").selectAll("rect.box")
        .data(HexwithVar)
        .join("rect")
        .attr("class", "box")
        .attr("id", (d) => d.variable_name)
        .attr("x", (d) => d.x)
        .attr("y", (d) => d.y)
        .attr("width", function(d) {
            return ((d.variable_name).length)*20; //20px per character
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
        .on("mouseover", function(e, d) { 
            d3.select(this).raise().classed("box-hover", true);
        
        })
        .on("mouseout", function(_, d) { 
            d3.select(this).classed("box-hover", false)

        })
        .on("click", function(e, d) {
            // console.log(d)
            e.preventDefault()
            const hexas = d3.selectAll("rect.box")
            .classed("box-highlight", false)
            .classed("box-not-highlight", true)
            // console.log(hexas.nodes())
            const labels = d3.selectAll("text.label")
            .classed("box-label-highlight", false)
            .classed("box-label-not-highlight", true)
            

            // style changing after select a variable, including the links and labels
            if(self.clicked_hex === d) {
                self.clicked_hex = null
                self.handlers.VarSelected(null)
                d3.selectAll(".link")
                .classed("link-highlight", false)
                .classed("link-not-highlight", true)
                // hexas.classed("box-highlight", false).classed("box-not-highlight", false)
                // labels.classed("box-label-highlight", false).classed("box-label-not-highlight", false)
            }else{
                // console.log(d)
                self.clicked_hex = d
                
                self.handlers.VarSelected(d)
                d3.select(this).classed("box-highlight", true).classed("box-not-highlight", false).raise()
                labels.filter(label_data => d.variable_name === label_data.variable_name).classed("box-label-highlight", true).classed("box-label-not-highlight", false).raise()
                d3.selectAll(".link")
                .classed("link-highlight", false)
                .classed("link-not-highlight", true)
                .filter(link_data => link_data.source.var_name === d.variable_name || link_data.target.var_name === d.variable_name)
                .classed("link-highlight", true)
                .classed("link-not-highlight", false).raise()
                
            }
        })


        group.select("g.label-group").selectAll("text.label")
        .data(HexwithVar)
        .join("text")
        .text(d => d.variable_name)
        .attr("class", "label")
        .attr("x", (d) => d.x+ d.width/2 )
        .attr("y", (d) => d.y+ d.height/2)
        .attr("fill", (d) => {
            // return "black"
            return (d.frequency) > 140? "white":"black"
        })
        .attr("font-size", "0.8rem")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("pointer-events", "none")


        // const updatedData = addPropertiesToVariables(data); //add frequency properties to each variable

    },
}

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
    let xStart = padding; // Start x-coordinate, will be updated for center alignment
    let y = padding;
    let rowMaxHeight = 0;

    const rectangleCoordinates = [];

    // Function to reset for a new row
    function newRow() {
        y += rowMaxHeight + padding;
        rowMaxHeight = 0;
    }

    // Function to calculate row width (helper function)
    function calculateRowWidth(rectangles) {
        return rectangles.reduce((acc, rect) => acc + rect.width + padding, 0) - padding; // Minus padding to adjust for extra padding at the end
    }

    // Temp array to hold rectangles for current row, to calculate total width for centering
    let tempRowRectangles = [];

    rectangles.forEach(rect => {
        if (xStart + calculateRowWidth(tempRowRectangles) + rect.width + padding > regionWidth) {
            // Center align previous row's rectangles before starting a new row
            let rowWidth = calculateRowWidth(tempRowRectangles);
            let startX = (regionWidth - rowWidth) / 2 + bbox_origin[0]; // Calculate starting X for center alignment

            // Assign coordinates with center alignment
            tempRowRectangles.forEach(tempRect => {
                rectangleCoordinates.push([startX, y + bbox_origin[1], tempRect.width, tempRect.height, tempRect.name]);
                startX += tempRect.width + padding;
            });

            // Reset for new row
            newRow();
            tempRowRectangles = [];
            xStart = padding;
        }

        // Add current rectangle to temp row for future processing
        tempRowRectangles.push(rect);
        rowMaxHeight = Math.max(rowMaxHeight, rect.height);
    });

    // Process the last row, if there are any rectangles left
    if (tempRowRectangles.length > 0) {
        let rowWidth = calculateRowWidth(tempRowRectangles);
        let startX = (regionWidth - rowWidth) / 2 + bbox_origin[0]; // Center align

        tempRowRectangles.forEach(tempRect => {
            rectangleCoordinates.push([startX, y + bbox_origin[1], tempRect.width, tempRect.height, tempRect.name]);
            startX += tempRect.width + padding;
        });
    }

    return rectangleCoordinates;
}

// function layoutRectangles(regionWidth, bigRectHeight, rowHeight, rectangles, bbox_origin) {
//         let padding = 10;
//         let x = padding;
//         let y = padding;
//         let row = 0;
//         let rowWidth = 0;

//         // console.log(rectangles)
//         const rectangleCoordinates :any[] = [];
    
//         rectangles.forEach(rect => {
//             if (x + rect.width + padding> regionWidth) {
//                 // Move to the next row
//                 y += rect.height + padding;
//                 x = padding;
//                 row++;
//                 rowWidth = 0;
//             }
//             rectangleCoordinates.push([ x, y, rect.width, rect.height,rect.name]);
    
//             x += rect.width + padding;
//             rowWidth += rect.width;
    
//             if (rowWidth > regionWidth) {
//                 throw new Error('Cannot fit rectangles within the big rectangle.');
//             }
//         });
//         rectangleCoordinates.forEach((coor) => {
//             coor[0] += bbox_origin[0];
//             coor[1] += bbox_origin[1];
//         });
//         // console.log(rectangleCoordinates)
//         return rectangleCoordinates
// }

function combineData(vars,rectangles) {
    return rectangles.map(rect => {
        const [x, y, width, height, variable_name] = rect;
        const mentions = vars.variable_mentions[variable_name]?.mentions || [];
        const frequency = vars.variable_mentions[variable_name]?.mentions?.length || 0;
        return {
            x, y, width, height, variable_name, mentions, frequency
        };
    });
}


//add chunk frequency and node frequency to each variable
function addPropertiesToVariables(data) {
    Object.keys(data).forEach(objectType => {
      const variables = data[objectType].variable_mentions;
      Object.keys(variables).forEach(variableName => {
        const mentions = variables[variableName].mentions;
        const chunkFrequency = mentions.length;
        const uniqueNodeIds = new Set();
        mentions.forEach(mention => {
          const nodeId = mention.chunk_id.split('_')[0];
          uniqueNodeIds.add(nodeId);
        });
        const nodeFrequency = uniqueNodeIds.size;
        variables[variableName].chunk_frequency = chunkFrequency;
        variables[variableName].node_frequency = nodeFrequency;
      });
    });
    return data;
  }
