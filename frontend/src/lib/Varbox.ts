import * as d3 from 'd3';
// import {hexbin as Hexbin} from 'd3-hexbin';
import {tick} from 'svelte';
import { scale } from 'svelte/transition';

// import { drivers } from './Varbox.svelte';
// import type  {tVaraible} from './types/variables';

export const varbox = {
    init(svgId, width,height, paddings,handlers){
        this.width = width
        this.height = height
        this.svgId = svgId
        this.handlers = handlers
        this.topicName = ['政府運作','環境運作','住屋','交通','公有土地','醫療','整體經濟','能源','災害','貿易','其他']
        this.topicEmotion = ['Resigned','Neutral','Worried','Angry','Proud']
    },
    update_summary(selected_var){
        console.log(selected_var)
        // Use reduce to count occurrences of each unique topic
        const topicCounts = selected_var.reduce((acc, item) => {
            // Extract the topic value
            const topic = item.topic;
            
            // If the topic already exists in the accumulator, increment its count, otherwise set its count to 1
            acc[topic] = (acc[topic] || 0) + 1;
            
            return acc;
        }, {});


        const topicEmotion = selected_var.reduce((acc, item) => {

            const emotion = item.emotion;
            // If the topic already exists in the accumulator, increment its count, otherwise set its count to 1
            acc[emotion] = (acc[emotion] || 0) + 1;
            
            return acc;
        }, {});


        const topicsArray = Object.entries(topicCounts).map(([topic_name, count]) => ({ topic_name, count }));

        const topicsArrayEmotion = Object.entries(topicEmotion).map(([emotion_name, count]) => ({ emotion_name, count }));

        // Output the topicsArray
        console.log(topicsArrayEmotion);

        const group = d3.select("#statistics-model-svg")
        group.select("g.pie-chart").selectAll("*").remove()
        const pie_legend = group.append("g").attr("class","pie-legend")

        var margin = 10

        var radius = Math.min(this.width, this.height) / 2 - margin

        var color = d3.scaleOrdinal()
        .domain(this.topicName)
        .range(d3.schemeSet3);

        var pie = d3.pie()
        .value(function(d) {return d.count; })

        var arcGenerator = d3.arc()
        .innerRadius(0)
        .outerRadius(radius)

        // // Build the pie chart: Basically, each part of the pie is a path that we build using the arc function.
        group.select("g.pie-chart")
        .selectAll('path')
        .data(pie(topicsArray))
        .join('path')
        .attr('d', arcGenerator)
        .attr('fill', function(d){ console.log(d);return(color(d.data.topic_name)) })
        .attr("stroke", "black")
        .style("stroke-width", "2px")
        .style("opacity", 0.7)

        // Now add the annotation. Use the centroid method to get the best coordinates
        group.select("g.pie-chart")
        .selectAll('text')
        .data(pie(topicsArray))
        .enter()
        .append('text')
        .text(function(d){ return d.data.count})
        .attr("transform", function(d) { return "translate(" + arcGenerator.centroid(d) + ")";  })
        .style("text-anchor", "middle")
        .style("font-size", 50)

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



        // //bar chart
         // X axis
        var x = d3.scaleBand()
        .range([ this.width/2, this.width])
        .domain(this.topicEmotion)
        .padding(0.2);
        
        group.select("g.bar-chart").selectAll("*").remove()
        const X = group.select("g.bar-chart").data(topicsArrayEmotion).append("g")
        .attr("transform", `translate(0,${this.height/1.2 })`)
        .call(d3.axisBottom(x))
        .selectAll("text")
            .attr("transform", "translate(0,0)rotate(-45)")
            .style("text-anchor", "end")
            .style("font-size", 50)
            ;

        // // Add Y axis
        var y = d3.scaleLinear()
        .domain([0, d3.max(topicsArrayEmotion, (d) => d.count)])
        .range([ this.height/1.2, 100]);

        const Y = group.select("g.bar-chart").data(topicsArrayEmotion).append("g")
        .attr("transform", `translate(${this.width/2},0)`)
        .call(d3.axisLeft(y).tickFormat(d3.format(",.0f")))
        .selectAll("text")
            .style("text-anchor", "end")
            .style("font-size", 50);

        // // Bars
        group.select("g.bar-chart").selectAll("mybar")
        .data(topicsArrayEmotion)
        .enter()
        .append("rect")
            .attr("x", function(d) { return x(d.emotion_name); })
            .attr("y", function(d) { return y(d.count); })
            .attr("width", x.bandwidth())
            .attr("height", function(d) { return y(0)-y(d.count); })
            .attr("fill", "lightgrey")
    },

    updateColorScales(drivers, pressures, states, impacts, responses) {
        let variables:any[] = [];
        variables.push(drivers,pressures,states,impacts,responses);
        console.log(variables)
        
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

    calculatePositions(links,drivers,pressures,states,impacts,responses){
        // console.log({drivers,pressures,states,impacts,responses})
        const data = {drivers,pressures,states,impacts,responses}
        const updatedData = addPropertiesToVariables(data); //add frequency properties to each variable

        let maxChunkFrequency = 0;
        Object.keys(updatedData).forEach(objectType => {
            const variables = updatedData[objectType].variable_mentions;
            Object.keys(variables).forEach(variableName => {
                maxChunkFrequency = Math.max(maxChunkFrequency, variables[variableName].chunk_frequency);
            });
        });
        console.log(updatedData)
        const svg = d3.select('#line-container');
        const mergedData = links.map(link => {
            const source_block = document.getElementById(`${link.source.var_type}-container`);
            const target_block = document.getElementById(`${link.target.var_type}-container`);
            const sourceElement = document.getElementById(`${link.source.variable_name}`);
            const targetElement = document.getElementById(`${link.target.variable_name}`);
            if(sourceElement === null || targetElement === null || target_block === null || source_block === null){
                return null
            }
            const sourcePosition = {
                var_type: link.source.var_type,
                var_name: link.source.variable_name,
                x: sourceElement.getBoundingClientRect().left + sourceElement.getBoundingClientRect().width / 2,
                y: sourceElement.getBoundingClientRect().top + sourceElement.getBoundingClientRect().height / 2,
                // x_right: sourceElement.getBoundingClientRect().left + sourceElement.getBoundingClientRect().width -10,
                // x_left: sourceElement.getBoundingClientRect().left,
                y_top: sourceElement.getBoundingClientRect().top,
                y_bottom: sourceElement.getBoundingClientRect().top + sourceElement.getBoundingClientRect().height,
                block_x: source_block.getBoundingClientRect().left + source_block.getBoundingClientRect().width / 2,
                block_y: source_block.getBoundingClientRect().top + source_block.getBoundingClientRect().height / 2,
                block_y_top: source_block.getBoundingClientRect().top,
                block_y_bottom: source_block.getBoundingClientRect().top + source_block.getBoundingClientRect().height
            };
        
            const targetPosition = {
                var_type: link.target.var_type,
                var_name: link.target.variable_name,
                x: targetElement.getBoundingClientRect().left + targetElement.getBoundingClientRect().width / 2,
                y: targetElement.getBoundingClientRect().top + targetElement.getBoundingClientRect().height / 2,
                // x_right: targetElement.getBoundingClientRect().left + sourceElement.getBoundingClientRect().width,
                x_left: targetElement.getBoundingClientRect().left,
                y_top: targetElement.getBoundingClientRect().top,
                y_bottom: targetElement.getBoundingClientRect().top + sourceElement.getBoundingClientRect().height,
                block_x: target_block.getBoundingClientRect().left + target_block.getBoundingClientRect().width / 2,
                block_y: source_block.getBoundingClientRect().top + source_block.getBoundingClientRect().height / 2,
                block_y_top: source_block.getBoundingClientRect().top,
                block_y_bottom: source_block.getBoundingClientRect().top + source_block.getBoundingClientRect().height
            };
        
            return { source: sourcePosition, target: targetPosition };
        }).filter(data => data !== null);
        
        // console.log(mergedData);

    
    // Append a group for the links
    let linkGroup = svg.append("g")
        .attr("class", "links");
    
    // add arrow markers
    svg.append('defs').append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', '0 -5 10 10') // Example viewBox, adjust as necessary
            .attr('refX', 5) // Adjust refX and refY to position the arrow correctly relative to the path end
            .attr('refY', 0)
            .attr('markerWidth', 5) // Adjust marker size as needed
            .attr('markerHeight', 5)
            .attr('orient', 'auto-start-reverse')
        .append('path')
            .attr('d', 'M0,-5L10,0L0,5') // Example path for the arrow shape
            .attr('stroke', 'gray')
            .attr('fill', 'gray');

    let spacing = 20
    // Bind data and create paths for each link
    links = linkGroup.selectAll(".link")
        .data(mergedData)
        .enter().append("path")
        .attr("class", "link")
        .attr("id",(d)=>`${d.source.var_name}`+"-"+`${d.target.var_name}`)
        .attr("d", function(d,i) {
            let middleX1 = d.source.x+ (d.target.x-d.source.x) / 4; // First third
            let middleX2 = ((d.source.block_x+ d.target.block_x) / 2) ; // Second third
            let middleX3 = d.target.x- (d.target.x-d.source.x) / 4;  // Third third (same as second for now)
            let newX_source, newY_source, newX_target, newY_target;
            // Determine y position for the first point based on source category
            let middleY1;
            if (d.source.block_y-d.source.y > 1) {
                let threshold;
                if(Math.abs(d.source.y-d.target.y)> spacing){
                    threshold = (d.source.block_y-d.source.y)*2
                }
                else{
                    threshold = (d.source.block_y-d.source.y)*5
                }
                middleY1 = d.source.block_y_top - threshold; // Target is top
                newX_source = d.source.x;
                newY_source = d.source.y_top;
            } else  {
                let threshold;
                if(Math.abs(d.source.y-d.target.y)> spacing){
                    threshold = (d.source.y - d.source.block_y)
                }
                else{
                    threshold = (d.source.y - d.source.block_y)*2.5
                }
                middleY1 = d.source.block_y_bottom + threshold; // Target is top
                newX_source = d.source.x;
                newY_source = d.source.y_bottom;
            }
    
            // Determine y position for the third point based on target category
            let middleY3;
            if (d.target.block_y-d.target.y > 2) {
                let threshold;
                if(Math.abs(d.source.y-d.target.y)> spacing){
                    threshold = (d.target.block_y-d.target.y)*2
                }
                else{
                    threshold = (d.target.block_y-d.target.y)*5
                }
                middleY3 = d.target.block_y_top - threshold; // Target is top
                newX_target = d.target.x_left;
                newY_target = d.target.y_top;
            } else  {
                let threshold;
                if(Math.abs(d.source.y-d.target.y)> spacing){
                    threshold = (d.target.y-d.target.block_y)
                }
                else{
                    threshold = (d.target.y-d.target.block_y)*2.5
                }
                middleY3 = d.target.block_y_bottom + threshold; // Target is bottom
                newX_target = d.target.x_left;
                newY_target = d.target.y_bottom;
            } 
    
            // Calculate y position for the second point (between source and target block_y)
            let middleY2 = (d.source.block_y + d.target.block_y) / 2 + ((d.target.y>d.target.block_y)? 5*(i):-(5*(i)));
    

            const path = d3.path();
            path.moveTo(newX_source, newY_source); // Start at the source

            // Calculate midpoints between the vertex points
            const midPoint1 = {
                x: (middleX1 + middleX2) / 2,
                y: (middleY1 + middleY2) / 2
            };
        
            const midPoint2 = {
                x: (middleX2 + middleX3) / 2,
                y: (middleY2 + middleY3) / 2
            };
        
            // Curve to (middleX1, middleY1), descending to midPoint1
            path.quadraticCurveTo(
                middleX1, middleY1, // Control point at the first peak
                midPoint1.x, midPoint1.y // End at the first midpoint
            );
        
            // Curve up to (middleX2, middleY2), then down to midPoint2
            path.quadraticCurveTo(
                middleX2, middleY2, // Control point at the valley
                midPoint2.x, midPoint2.y // End at the second midpoint
            );
        
            // Final curve from midPoint2 to target, peaking at (middleX3, middleY3)
            path.quadraticCurveTo(
                middleX3, middleY3, // Control point at the final peak
                newX_target, newY_target // End at the target
            );
        
            return path.toString();
        })
        .attr("cursor", "pointer")
        .attr("fill", "none")
        .attr("stroke", "gray")
        .attr("stroke-width", function(d) {
            // Find chunk_frequency for source and target
            const sourceChunkFrequency = updatedData[d.source.var_type].variable_mentions[d.source.var_name].chunk_frequency;
            const targetChunkFrequency = updatedData[d.target.var_type].variable_mentions[d.target.var_name].chunk_frequency;
            
            // Calculate the sum of chunk frequencies
            const sumChunkFrequencies = sourceChunkFrequency + targetChunkFrequency;
            
            // Normalize this sum to get a value suitable for stroke width
            const normalizedStrokeWidth = 2+(sumChunkFrequencies / (2 * maxChunkFrequency)) * 10; // max width=10
            
            return normalizedStrokeWidth;
        })
        .attr("opacity", 0.1)
        .on("mouseover", function(e, d) {
            d3.select(this).classed("line-hover",true).raise()
                           .attr("marker-end", "url(#arrow)");
        })
        .on("mouseout", function(e, d) {
            d3.select(this).classed("line-hover",false)
                            .attr("marker-end", null);
        })



    }



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



function addPropertiesToVariables(data) {
    Object.keys(data).forEach(objectType => {
      const variables = data[objectType].variable_mentions;
      Object.keys(variables).forEach(variableName => {
        const mentions = variables[variableName].mentions;
        // Calculate chunk_frequency
        const chunkFrequency = mentions.length;
        // Calculate node_frequency
        const uniqueNodeIds = new Set();
        mentions.forEach(mention => {
          const nodeId = mention.chunk_id.split('_')[0];
          uniqueNodeIds.add(nodeId);
        });
        const nodeFrequency = uniqueNodeIds.size;
        // Add the new properties
        variables[variableName].chunk_frequency = chunkFrequency;
        variables[variableName].node_frequency = nodeFrequency;
      });
    });
    return data;
  }
