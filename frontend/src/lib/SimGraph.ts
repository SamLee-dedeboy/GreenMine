import * as d3 from 'd3';
import {hexbin as Hexbin} from "d3-hexbin";
import { tick } from 'svelte';
import concaveman from "concaveman"
import  Vector from "./Vector"

export const simgraph = {
    hoveredHexKeywords: "",
    init(svgId, width, height, paddings, handlers) {
        const self = this
        const svg = d3.select("#" + svgId).attr("viewBox", `0 0 ${width} ${height}`)
            .on("click", function(e) {
                if(!e.defaultPrevented) {
                    d3.selectAll("path.border").classed("border-highlight", false)
                    d3.selectAll("circle.node")
                        .classed("node-highlight", false)
                        .classed("node-not-highlight", false)
                    d3.selectAll("path.hex")
                        .classed("hex-highlight", false)
                        .classed("hex-not-highlight", false)
                        .classed("hex-selected", false)
                        .classed("hex-not-selected", false)
                    d3.selectAll("path.hex-label")
                        .classed("hex-label-highlight", false)
                        .classed("hex-label-not-highlight", false)
                    d3.selectAll("text.topic-label").classed("topic-label-highlight", false)
                    handlers.nodesSelected(null, null)
                    handlers.keywordsSelected(null, null)
                    handlers.emotionSelected(null, null)  
                    self.highlighted_nodes = null
                }
            })
        const topic_region = svg.select("g.topic_region")
        const keyword_region = svg.select("g.keyword_region").attr("transform", `translate(${paddings.left}, ${paddings.top})`)
        keyword_region.append("g").attr("class", "hex-group")
        keyword_region.append("g").attr("class", "label-group")
        this.keyword_region_size = {
            width: width - paddings.left - paddings.right,
            height: height - paddings.top - paddings.bottom
        }

        this.xScale_keywords = d3.scaleLinear().domain([0,1]).range([0, this.keyword_region_size.width])
        this.yScale_keywords = d3.scaleLinear().domain([0,1]).range([0, this.keyword_region_size.height])
        this.handlers = handlers
        this.width = width
        this.height = height
        this.svgId = svgId
        this.clicked_topic = null
        this.clicked_cc = [null, null]
        this.clicked_hex = null
        this.highlighted_nodes = null
        this.hoveredHexKeywords = ""
    },

    _update_chunks(groups, group_statistics, emotionColorScale) {
        console.log(groups)
        const group_node_sizes = Object.keys(groups).map(group_id => groups[group_id].length)
        const bbox_min_max_size = [d3.min(group_node_sizes), d3.max(group_node_sizes)]
        const bboxRadiusScale = d3.scaleLinear().domain(bbox_min_max_size).range([150, 280])
        const bboxes = radialBboxes(Object.keys(groups), this.width, this.height, {width: 200, height: 200})
        const chunk_region = d3.select("#" + this.svgId).select("g.chunk_region")
        chunk_region.selectAll("g.topic")
            .data(Object.keys(groups))
            .join("g")
            .attr("class", "topic")
            .each(async function(d, i) {
                const group = d3.select(this)
                group.selectAll("*").remove()
                const bbox_size = bboxRadiusScale(groups[d].length)
                const bbox_center = bboxes[d].center
                const bbox_origin = [bbox_center[0] - bbox_size/2, bbox_center[1] - bbox_size/2]
                const bboxCoordinateScaleX = d3.scaleLinear().domain([0, 1]).range([bbox_origin[0], bbox_origin[0] + bbox_size])
                const bboxCoordinateScaleY = d3.scaleLinear().domain([0, 1]).range([bbox_origin[1], bbox_origin[1] + bbox_size])
                const defs = group.append("defs")
                const clipPath = defs.append("clipPath").attr("id", `clip-${i}`)
                // clip path
                const bbox = clipPath.append("rect")
                    .attr("x", -bbox_size/2)
                    .attr("y", -bbox_size/2)
                    .attr("width", bbox_size)
                    .attr("height", bbox_size)
                    .attr("rx", "5")
                // label
                const label = group.append("text")
                    .attr("x", bbox_center[0])
                    .attr("y", bbox_center[1])
                    .text(d)
                    .attr("font-size", "0.7rem")
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle")
                await tick();
                // emotions
                console.log({group_statistics}, d)
                const emotion_counts = group_statistics[d].emotion_counts
                const total_counts = group_statistics[d].total
                let angle_offset = 0
                let emotion_paths: any[] = []
                Object.keys(emotion_counts).forEach(emotion => {
                    const counts = emotion_counts[emotion]
                    const angle = counts/total_counts * Math.PI * 2
                    const path = d3.arc()({
                        innerRadius: 45,
                        outerRadius: (bbox_size/2)*Math.sqrt(2),
                        startAngle: angle_offset,
                        endAngle: angle_offset + angle
                    })
                    angle_offset += angle;
                    emotion_paths.push(path)
                })
                group.selectAll("path.emotion")
                    .data(emotion_paths)
                    .join("path")
                    .attr("class", "emotion")
                    .attr("d", d => d)
                    .attr("transform", `translate(${bbox_center[0]}, ${bbox_center[1]})`)
                    .attr("fill", (d, i) => emotionColorScale(Object.keys(emotion_counts)[i]))
                    .attr('opacity', 0.8)
                    .attr("clip-path", `url(#clip-${i})`)
            })
    },

    // using tsne as chunk content
    update_chunks(groups, group_ccs, emotionColorScale) {
        const group_node_sizes = Object.keys(groups).map(group_id => groups[group_id].length)
        const bbox_min_max_size = [d3.min(group_node_sizes), d3.max(group_node_sizes)]
        const bboxRadiusScale = d3.scaleLinear().domain(bbox_min_max_size).range([150, 280])
        const bboxes = radialBboxes(Object.keys(groups), this.width, this.height, {width: 200, height: 200})
        const chunk_region = d3.select("#" + this.svgId).select("g.chunk_region")
        const self = this
        chunk_region.selectAll("g.topic")
            .data(Object.keys(groups))
            .join("g")
            .attr("class", "topic")
            .each(function(d) {
                const group = d3.select(this)
                group.selectAll("*").remove()
                const bbox_size = bboxRadiusScale(groups[d].length)
                const bbox_center = bboxes[d].center
                const bbox_origin = [bbox_center[0] - bbox_size/2, bbox_center[1] - bbox_size/2]
                const bboxCoordinateScaleX = d3.scaleLinear().domain([0, 1]).range([bbox_origin[0], bbox_origin[0] + bbox_size])
                const bboxCoordinateScaleY = d3.scaleLinear().domain([0, 1]).range([bbox_origin[1], bbox_origin[1] + bbox_size])
                const bbox = group.append("rect")
                    .attr("class", "bbox shadow")
                    .attr("x", bbox_center[0] - bbox_size/2)
                    .attr("y", bbox_center[1] - bbox_size/2)
                    .attr("width", bbox_size)
                    .attr("height", bbox_size)
                    .attr("fill", "white")
                    // .attr("stroke", "#ececec")
                    .attr("stroke", "#cdcdcd")
                    .attr("stroke-width", 1)
                    // .attr("cursor", "pointer")
                    .attr("rx", "5")
                const node_group = group.append("g").attr("class", "node-group")
                const nodes = node_group.selectAll("circle.node")
                    .data(groups[d])
                    .join("circle")
                    .attr("class", "node")
                    .attr("r", (d) => {return 5})
                    // .attr("r", (d) => {return scaleRadius(d.degree)})
                    // .attr("fill", (d) => topicColors(d.topic))
                    .attr("fill", (d) => {return emotionColorScale(d.emotion)})
                    .attr("stroke", "black")
                    .attr("stroke-width", 1)
                    .attr("pointer-events", "none")
                    .attr("cx", (d) => bboxCoordinateScaleX(d.coordinate[0]))
                    .attr("cy", (d) => bboxCoordinateScaleY(d.coordinate[1]))
                group.append("text")
                    .attr("class", "topic-label")
                    .attr("x", bbox_center[0] - bbox_size/2 + 5)
                    .attr("y", bbox_center[1] - bbox_size/2 - 10)
                    .text(d)
                    .attr("cursor", "pointer")
                    .on("click", function(e, d) {
                        e.preventDefault()
                        d3.selectAll("text.topic-label").classed("topic-label-highlight", false)
                        if(self.clicked_topic !== d) {
                            d3.select(this).classed("topic-label-highlight", true)
                            self.clicked_nodes = groups[d]
                            const node_ids = self.clicked_nodes.map(node => node.id)
                            const nodes = node_ids.map(node_id => nodes_dict[node_id])
                            self.clicked_topic = d
                            self.clicked_cc = [null, null]
                            d3.selectAll("path.border").classed("border-highlight", false)
                            self.handlers.nodesSelected(nodes, d)
                            self.highlighted_nodes = nodes
                            d3.selectAll("circle.node")
                                .classed("node-highlight", false)
                                .classed("node-not-highlight", true)
                                .filter(node => node_ids.includes(node.id))
                                .classed("node-not-highlight", false)
                                .classed("node-highlight", true)
                        } else {
                            self.clicked_topic = null
                            d3.selectAll("circle.node")
                                .classed("node-highlight", false)
                                .classed("node-not-highlight", false)
                            self.handlers.nodesSelected(null, null)
                            self.highlighted_nodes = null
                        }
                    })
                const node_radius = 5
                let nodes_dict = {}
                groups[d].forEach(node => {
                    nodes_dict[node.id] = node
                })
                const collisionForce = d3.forceSimulation(groups[d])
                    .alphaMin(0.1)
                    .force("collide", d3.forceCollide(node_radius))
                    .force("x_force", d3.forceX(d => bboxCoordinateScaleX(d.coordinate[0])))
                    .force("y_force", d3.forceY(d => bboxCoordinateScaleY(d.coordinate[1])))
                    .on("tick", () => {
                        nodes.attr("cx", d => d.x=clip(d.x, [bbox_center[0] - bbox_size/2 + node_radius, bbox_center[0] + bbox_size/2 - node_radius]))
                        .attr("cy", d => d.y=clip(d.y, [bbox_center[1] - bbox_size/2 + node_radius, bbox_center[1] + bbox_size/2 - node_radius]));
                        let cc_paths: any[] = []
                        group_ccs[d].forEach((cc, index) => {
                            const cc_nodes = cc.map(node_id => nodes_dict[node_id])
                            cc_paths.push(
                                {
                                    topic: d,
                                    index: index,
                                    path: generate_border(group, cc_nodes, node_radius)
                                }
                        )
                        })
                        group.selectAll("path.border")
                            .data(cc_paths)
                            .join(
                                enter => enter.append("path")
                                    .attr("class", "border")
                                    .attr("d", d => d.path)
                                    .attr("fill", "#ebebeb")
                                    .attr("stroke", "gray")
                                    .attr("stroke-width", 1)
                                    .attr("filter", "url(#drop-shadow-border)")
                                    .attr("cursor", "pointer"),
                                    // .raise(),
                                update => update.transition().duration(0).attr("d", d => d.path)
                            )
                            .selection()
                            .on("click", function(e, d) {
                                e.preventDefault()
                                d3.selectAll("path.border").classed("border-highlight", false)
                                const nodes = d3.selectAll("circle.node")
                                    .classed("node-highlight", false)
                                    .classed("node-not-highlight", true)
                                if(self.clicked_cc[0] === d.topic && self.clicked_cc[1] === d.index) {
                                    self.clicked_cc = [null, null]
                                    self.handlers.nodesSelected(null, null)
                                    nodes.classed("node-highlight", false)
                                    .classed("node-not-highlight", false)
                                }
                                else {
                                    self.clicked_cc = [d.topic, d.index]
                                    self.clicked_topic = null
                                    d3.selectAll("text.topic-label").classed("topic-label-highlight", false)
                                    d3.select(this).classed("border-highlight", true)
                                    const cc_node_ids = group_ccs[d.topic][d.index]
                                    const cc_nodes = cc_node_ids.map(node_id => nodes_dict[node_id])
                                    self.handlers.nodesSelected(cc_nodes, d.topic + "(部分)")
                                    self.highlighted_nodes = cc_nodes
                                    nodes.filter(node => cc_node_ids.includes(node.id))
                                        .classed("node-not-highlight", false)
                                        .classed("node-highlight", true)
                                }
                            })
                        node_group.raise()

                    })
            })
    },

    update_keywords(keyword_data, _) {
        const xScale = this.xScale_keywords
        const yScale = this.yScale_keywords
        const hexbin = Hexbin().x(d => xScale(keyword_data.keyword_coordinates[d][0])).y(d => yScale(keyword_data.keyword_coordinates[d][1]))
            .radius(20)
            .extent([[0, 0], [this.keyword_region_size.width, this.keyword_region_size.height]])
        const data_bins = hexbin(Object.keys(keyword_data.keyword_coordinates))
        // const scaleRadius = d3.scaleLinear()
        //     .domain([0, d3.max(data_bins, d => d.length)])
        //     .range([0, hexbin.radius() * Math.SQRT2]);
        // const scaleOpacity = d3.scalePow().exponent(2)
        //     .domain([0, d3.max(data_bins, d => d.length)])
        //     .range([0, 1]);
        const binSumFrequency = (bins) => d3.sum(bins, keyword => keyword_data.keyword_statistics[keyword].frequency)
        const binMaxFrequency = d3.max(data_bins, binSumFrequency)
        const scaleColor = d3.scaleSequential([0, Math.sqrt(binMaxFrequency)], d3.interpolateBlues)
        const hex_centers = hexbin.centers()
        const find_closest_hex_index = (x, y) => {
            let min_dist = 100000
            let closest_hex_index = 0
            hex_centers.forEach((hex, index) => {
                const dist = Math.pow(hex[0] - x, 2) + Math.pow(hex[1] - y, 2)
                if(dist < min_dist) {
                    min_dist = dist
                    closest_hex_index = index
                }
            })
            return closest_hex_index
        }
        const group = d3.select("#" + this.svgId).select("g.keyword_region")
        const keyword_coordinates = keyword_data.keyword_coordinates
        const keyword_statistics = keyword_data.keyword_statistics
        const self = this
        group.select("g.hex-group").selectAll("path.hex")
        .data(data_bins)
        .join("path")
        .attr("class", "hex")
            // .attr("d", d => `M${d.x},${d.y}${hexbin.hexagon(scaleRadius(d.length))}`)
            .attr("d", d => `M${d.x},${d.y}${hexbin.hexagon()}`)
            // .attr("fill", "lightskyblue")
            .attr("fill", d => scaleColor(Math.sqrt(binSumFrequency(d))))
            .attr("opacity", 0.8)
            .attr("stroke", "white")
            .attr("stroke-width", 0.5)
            // .attr("opacity", (d) => scaleOpacity(d.length))
            // .attr("filter", (d) => d.length > 5? "url(#drop-shadow-hex)": "none")
            .attr("cursor", "pointer")
            .on("mousemove", function(e) {
                d3.select(".tooltip").style("left", (e.clientX + 10) + "px").style("top", (e.clientY - 30) + "px")
            })
            .on("mouseover", function(e, d) { 
                d3.select(this).classed("hex-hover", true).raise()
                d3.selectAll("text.label").classed("hex-label-hover", false)
                    .filter(label => label[0] === d[0])
                    .classed("hex-label-hover", true)
                // self.hoveredHexKeywords = d
                d3.select(".tooltip").classed("show-tooltip", true).text(d)
            })
            .on("mouseout", function(_, d) { 
                d3.select(this).classed("hex-hover", false)
                d3.selectAll("text.label")
                    .filter(label => label[0] === d[0])
                    .classed("hex-label-hover", false)
                // self.hoveredHexKeywords = null
                d3.select(".tooltip").classed("show-tooltip", false)

            })
            .on("click", function(e, d) {
                e.preventDefault()
                const hexes = d3.selectAll("path.hex")
                    .classed("hex-selected", false)
                    .classed("hex-not-selected", true)
                if(self.clicked_hex === d[0]) {
                    self.clicked_hex = null
                    self.handlers.keywordsSelected(null, null)
                    hexes.classed("hex-selected", false)
                    .classed("hex-not-selected", false)
                } else {
                    self.clicked_hex = d[0]
                    self.handlers.keywordsSelected(d, d)
                    d3.select(this).classed("hex-selected", true).classed("hex-not-selected", false).raise()
                }
                // if(self.highlighted_nodes) {
                //     const nodes = d3.selectAll("circle.node-highlight")
                //         .classed("node-not-highlight", true)
                //         .filter(node => node.keywords.some(keyword => keywords.includes(keyword)))
                //         .classed("node-not-highlight", false)
                //         .classed("node-highlight", true)
                //         .data()
                //     console.log(nodes)
                //     self.handlers.nodesSelected(nodes)

                // } else {
                // const nodes = d3.selectAll("circle.node")
                //     .classed("node-not-highlight", true)
                //     .classed("node-highlight", false)
                //     .filter(node => node.keywords.some(keyword => keywords.includes(keyword)))
                //     .classed("node-not-highlight", false)
                //     .classed("node-highlight", true)
                //     .data()
                //     console.log(nodes)
                //     self.handlers.nodesSelected(nodes)
                // }
            })
        let hex_labels = new Array(hex_centers.length).fill(null)
        Object.keys(keyword_coordinates)
        // .filter(keyword => keyword_statistics[keyword].frequency > 5)
            .forEach(keyword => {
                const coordinate = keyword_coordinates[keyword]
                const closest_hex_index = find_closest_hex_index(xScale(coordinate[0]), yScale(coordinate[1]))
                if(hex_labels[closest_hex_index] != null) {
                    const previous_label_freq = keyword_statistics[hex_labels[closest_hex_index]].frequency
                    const current_label_freq = keyword_statistics[keyword].frequency
                    if(current_label_freq > previous_label_freq) {
                        hex_labels[closest_hex_index] = keyword
                    }
                } else {
                    hex_labels[closest_hex_index] = keyword
                }
            })
        console.log(data_bins)
        group.select("g.label-group").selectAll("text.label")
            // .data(hex_labels)
            .data(data_bins)
            .join("text")
            .text(d => wrapChinese(d[0]) || "")
            .attr("class", "label")
            .attr("x", (d) => d.x)
            .attr("y", (d) => d.y)
            .attr("fill", (d) => {
                return (Math.sqrt(binSumFrequency(d) / binMaxFrequency)) > 0.65? "white":"black"
            })
            // .attr("x", (_, i) => hex_centers[i][0])
            // .attr("y", (_, i) => hex_centers[i][1])
            .attr("opacity", (d) => (d[0] === null? 0 : (binSumFrequency(d) > 15  ? 1 : 0)))
            .attr("font-size", "0.8rem")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("pointer-events", "none")
    },

    _update_keywords(keyword_data, scaleRadius) { // deprecated: uses scatterplot
        console.log(keyword_data)
        const xScale = this.xScale_keywords
        const yScale = this.yScale_keywords
        const group = d3.select("#" + this.svgId).select("g.keyword_region")
        const keyword_coordinates = keyword_data.keyword_coordinates
        const keyword_statistics = keyword_data.keyword_statistics
        group.selectAll("circle.keyword")
            .data(Object.keys(keyword_coordinates))
            .join("circle")
            .attr("class", "keyword")
            .attr("r", (d) => {console.log(d); return scaleRadius(keyword_statistics[d].frequency)})
            .attr("cx", d => xScale(keyword_coordinates[d][0]))
            .attr("cy", d => yScale(keyword_coordinates[d][1]))
            .attr("fill", "white")
            .attr("stroke", "black")
            .attr("stroke-width", 1)
        group.selectAll("text.label")
            .data(Object.keys(keyword_coordinates))
            .join("text")
            .text(d => d)
            .attr("class", "label")
            .attr("x", d => xScale(keyword_coordinates[d][0]))
            .attr("y", d => yScale(keyword_coordinates[d][1]))
            .attr("opacity", (d) => keyword_statistics[d].frequency > 10 ? 1 : 0)
            .attr("font-size", "0.8rem")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
    },

    update_treemap(svgId, groups, nodes, links, weights, scaleRadius, topicColors) {
        const tile = d3.treemapSquarify
        const treemap_data = {
            name: "root",
            children: Object.keys(groups).map(group_id => {
                return {
                    name: group_id,
                    value: Math.sqrt(groups[group_id].length),
                    total: groups[group_id].length
                }
            })
        }
        const root = d3.treemap()
            .tile(tile) // e.g., d3.treemapSquarify
            .size([this.width, this.height])
            .padding(1)
            .round(true)
            (d3.hierarchy(treemap_data)
                .sum(d => d.value)
                .sort((a, b) => b.value - a.value));

        let nodes_dict = {}
        nodes.forEach(node => {
            nodes_dict[node.id] = node
        })

        console.log(svgId, {groups}, {nodes}, {links}, {weights})
        const svg = d3.select("#" + svgId)
        console.log(svg)
        const svgWidth = svg.attr("viewBox").split(" ")[2]
        const svgHeight = svg.attr("viewBox").split(" ")[3]
        const self = this
        // addOuterLinks(svg, links, nodes_dict)
        // groups
        const leaf = svg.selectAll("g.group")
        .data(root.leaves())
        .join("g")
            .attr("class", "group")
            // .attr("transform", d => `translate(${d.x0},${d.y0})`)
            .each(function(d) {
                const group = d3.select(this)
                const group_id = d.data.name
                console.log(group_id, topicColors(group_id))
                // prepare dom
                group.selectAll("*").remove()
                const link_group = d3.select(this).append("g").attr("class", "link-group")
                const node_group = d3.select(this).append("g").attr("class", "node-group")
                // add bboxes
                const group_bbox = {
                    x1: d.x0,
                    y1: d.y0,
                    x2: d.x1,
                    y2: d.y1,
                    width: d.x1 - d.x0,
                    height: d.y1 - d.y0,
                    center: [d.x0 + (d.x1 - d.x0) / 2, d.y0 + (d.y1 - d.y0) / 2]
                }
                group.append("rect")
                    .attr("id", d => (d.name))
                    // .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
                    .attr("x", group_bbox.x1)
                    .attr("y", group_bbox.y1)
                    .attr("fill", "none")
                    .attr("width", group_bbox.width)
                    .attr("height", group_bbox.height)
                    .attr("stroke", "black")
                    .attr("stroke-width", 1)
                group.append("text")
                    .attr("x", group_bbox.x1 + 5)
                    .attr("y", group_bbox.y1 + 15)
                    .text(() => d.data.name + " - " + d.data.total)
                // process data
                let group_nodes = groups[group_id]
                group_nodes.forEach(node => {
                    node.bbox = group_bbox
                })
                let group_links = links.filter(link => {
                    let source, target;
                    if(link.source.id) source = link.source.id
                    else source = link.source
                    if(link.target.id) target = link.target.id
                    else target = link.target
                    const source_group = nodes_dict[source].topic
                    const target_group = nodes_dict[target].topic
                    // inner outer
                    if(source_group === group_id && target_group === group_id) link.inner_outer = "inner"
                    return source_group === group_id && target_group === group_id
                })

                // add fake force links
                group_links = createForceLink(group_nodes, weights)
                // add nodes
                const node_radius = 5
                const nodes_dom = node_group.selectAll("circle")
                .data(group_nodes)
                .join("circle")
                    .attr("class", "node")
                    .attr("r", node_radius)
                    // .attr("r", (d) => {return scaleRadius(d.degree)})
                    .attr("fill", (d) => topicColors(d.topic))
                    .attr("stroke", "black")
                    .attr("stroke-width", 1)
                    .attr("cursor", "pointer")
                    .attr("cx", d => d.x = d.coordinate[0] * group_bbox.width + group_bbox.x1)
                    .attr("cy", d => d.y = d.coordinate[1] * group_bbox.height + group_bbox.y1)
                    // .attr("cx", d => d.x = Math.random() * (group_bbox.x1 + group_bbox.width))
                    // .attr("cy", d => d.y = Math.random() * (group_bbox.y1 + group_bbox.height))
                    .on("mouseover", function() { 
                        d3.select(this).attr("stroke-width", 2)
                    })
                    .on("mouseout", function() {
                        d3.select(this).attr("stroke-width", 1)
                    })
                    .on("click", (event, d) => self.handleNodeClick(event, d))
                    .selection()
                // add links
                // const links_dom = link_group.selectAll("line.link")
                //     .data(group_links.filter(link => link.type==="real"))
                //     .join("line")
                //     .attr("class", "link")
                //     .attr("opacity", 0.5)
                //     .attr("stroke", "gray")
                //     .attr("stroke-width", 1)
                //     .selection()

                // force
                // force_layout(group_nodes, group_links, group_bbox.center, group_bbox, nodes_dom, links_dom, nodes_dict, node_radius)

            })
    },

    update_force(groups, nodes, links, weights, scaleRadius, topicColors, emotionColors) {
        console.log("update force", {groups}, {nodes}, {links}, {weights})
        const chunk_region = d3.select("#" + this.svgId).select("g.chunk_region")
        const group_node_sizes = Object.keys(groups).map(group_id => groups[group_id].length)
        const bbox_min_max_size = [d3.min(group_node_sizes), d3.max(group_node_sizes)]
        const bboxRadiusScale = d3.scaleLinear().domain(bbox_min_max_size).range([150, 280])
        const bboxes = radialBboxes(Object.keys(groups), this.width, this.height, {width: 200, height: 200})
        let nodes_dict = {}
        nodes.forEach(node => {
            nodes_dict[node.id] = node
        })
        // groups
        const topic_groups = chunk_region.selectAll("g.group")
        .data(Object.keys(groups))
        .join("g")
            .attr("class", "group")
            // .attr("transform", d => `translate(${d.x0},${d.y0})`)
            .each(function(d) {
                const group = d3.select(this)
                const group_id = d
                // prepare dom
                group.selectAll("*").remove()
                const link_group = d3.select(this).append("g").attr("class", "link-group")
                const node_group = d3.select(this).append("g").attr("class", "node-group")
                const bbox_size = bboxRadiusScale(groups[d].length)
                const bbox_center = bboxes[d].center
                const bbox_origin = [bbox_center[0] - bbox_size/2, bbox_center[1] - bbox_size/2]
                const bboxCoordinateScaleX = d3.scaleLinear().domain([0, 1]).range([bbox_origin[0], bbox_origin[0] + bbox_size])
                const bboxCoordinateScaleY = d3.scaleLinear().domain([0, 1]).range([bbox_origin[1], bbox_origin[1] + bbox_size])
                const bbox = group.append("rect")
                    .attr("x", bbox_center[0] - bbox_size/2)
                    .attr("y", bbox_center[1] - bbox_size/2)
                    .attr("width", bbox_size)
                    .attr("height", bbox_size)
                    .attr("fill", "none")
                    .attr("filter", "url(#drop-shadow-border)")
                    .attr("stroke", "#c3c3c3")
                    .attr("stroke-width", 1)
                    .attr("cursor", "pointer")
                    .attr("opacity", 0.4)
                    .attr("rx", "5")
                group.append("text")
                    .attr("x", bbox_center[0] - bbox_size/2 + 5)
                    .attr("y", bbox_center[1] - bbox_size/2 - 10)
                    .text(d)
                // process data
                let group_links = links.filter(link => {
                    let source, target;
                    if(link.source.id) source = link.source.id
                    else source = link.source
                    if(link.target.id) target = link.target.id
                    else target = link.target
                    const source_group = nodes_dict[source].topic
                    const target_group = nodes_dict[target].topic
                    // inner outer
                    if(source_group === group_id && target_group === group_id) link.inner_outer = "inner"
                    return source_group === group_id && target_group === group_id
                })

                const group_nodes = groups[group_id]
                // add fake force links
                group_links = createForceLink(group_nodes, weights)
                // add nodes
                const node_radius = 5
                const nodes_dom = node_group.selectAll("circle")
                .data(group_nodes)
                .join("circle")
                    .attr("class", "node")
                    .attr("r", node_radius)
                    // .attr("r", (d) => {return scaleRadius(d.degree)})
                    // .attr("fill", (d) => topicColors(d.topic))
                    .attr("fill", (d) => emotionColors(d.emotion))
                    .attr("stroke", "black")
                    .attr("stroke-width", 1)
                    .attr("cursor", "pointer")
                    .attr("cx", d => d.x = d.coordinate[0] * bbox_size + bbox_origin[0])
                    .attr("cy", d => d.y = d.coordinate[1] * bbox_size + bbox_origin[1])
                    // .attr("cx", d => d.x = Math.random() * (group_bbox.x1 + group_bbox.width))
                    // .attr("cy", d => d.y = Math.random() * (group_bbox.y1 + group_bbox.height))
                    .on("mouseover", function() { 
                        d3.select(this).attr("stroke-width", 2)
                    })
                    .on("mouseout", function() {
                        d3.select(this).attr("stroke-width", 1)
                    })
                    // .on("click", (event, d) => self.handleNodeClick(event, d))
                    // .selection()
                // add links
                console.log(group_links)
                const links_dom = link_group.selectAll("line.link")
                    .data(group_links.filter(link => link.type==="real"))
                    .join("line")
                    .attr("class", "link")
                    .attr("opacity", 0.5)
                    .attr("stroke", "gray")
                    .attr("stroke-width", 1)
                    .selection()

                const group_bbox = {
                    x1: bbox_origin[0],
                    y1: bbox_origin[1],
                    x2: bbox_origin[0] + bbox_size,
                    y2: bbox_origin[1] + bbox_size,
                }
                // force
                const group_connected_nodes = group_nodes.filter(node => node.degree > 0)
                force_layout(group, group_connected_nodes, group_links, bbox_center, group_bbox, nodes_dom, links_dom, nodes_dict, node_radius)

            }) 
    },

    // highlight_nodes(svgId, node_ids) {
    //     console.log("highlighting nodes")
    //     const svg = d3.select("#" + svgId)
    //     const nodes = svg.selectAll("circle.node")
    //         .attr("opacity", 0.2)
    //         .filter(d => node_ids.includes(d.id))
    //         .attr("stroke", "black")
    //         .attr("stroke-width", 3)
    //         .attr("opacity", 1)
    // },

    highlight_keywords(keywords, keyword_data) {
        const keyword_statistics = keyword_data.keyword_statistics
        const keyword_region = d3.select("#" + this.svgId).select("g.keyword_region")
        keyword_region.selectAll("path.hex")
            // .attr("opacity", 0.1)
            .classed("hex-highlight", false)
            .classed("hex-not-highlight", true)
            .filter(d => d.some(keyword => keywords.includes(keyword)))
            .classed("hex-not-highlight", false)
            .classed("hex-highlight", true)
            // .attr("opacity", 1)
        keyword_region.selectAll("text.label")
            .classed("hex-label-highlight", false)
            .classed("hex-label-not-highlight", true)
            .filter(d => d.some(keyword => keywords.includes(keyword)))
            .classed("hex-label-not-highlight", false)
            .classed("hex-label-highlight", true)
    },

    dehighlight_keywords() {
        const keyword_region = d3.select("#" + this.svgId).select("g.keyword_region")
        keyword_region.selectAll("path.hex")
            .classed("hex-highlight", false)
            .classed("hex-not-highlight", false)
        keyword_region.selectAll("text.label")
            .classed("hex-label-highlight", false)
            .classed("hex-label-not-highlight", false)

    },

    highlight_nodes(nodes) {
        const chunk_region = d3.select("#" + this.svgId).select("g.chunk_region")
        chunk_region.selectAll("circle.node")
            .classed("node-highlight", false)
            .classed("node-not-highlight", true)
            .filter(node => nodes?.includes(node))
            .classed("node-not-highlight", false)
            .classed("node-highlight", true)
        this.highlighted_nodes = nodes
    },

    dehighlight_nodes() {
        const chunk_region = d3.select("#" + this.svgId).select("g.chunk_region")
        chunk_region.selectAll("circle.node")
            .classed("node-highlight", false)
            .classed("node-not-highlight", false)
        this.highlighted_nodes = null
    }
}


function wrapChinese(text) {
    if(text.length > 2) {
        text = text.slice(0, 2) + ".."
    }
    return text
}

function force_layout(group, group_nodes, group_links, group_center, group_bbox, nodes, links, nodes_dict, node_radius) {
    console.log({group_nodes}, {group_links}, nodes)
    const forceNode = d3.forceManyBody();
    const forceLink = d3.forceLink(group_links).id(d => d.id).distance((d) => d.weight)
    const simulation = d3.forceSimulation(group_nodes)
        .force("link", forceLink)
        .force("charge", forceNode.distanceMin(10))
        .force("center",  d3.forceCenter(group_center[0], group_center[1]).strength(0.1))
        .force("collide", d3.forceCollide(node_radius))
        .alphaMin(0.01)
        .on("tick", () => {
            nodes.attr("cx", d => d.x=clip(d.x, [group_bbox.x1+node_radius+1, group_bbox.x2-node_radius-1]))
            .attr("cy", d => d.y=clip(d.y, [group_bbox.y1+node_radius+1, group_bbox.y2-node_radius-1]));
            // nodes.attr("cx", d => d.x=clip(d.x, [d.bbox.x1, d.bbox.x2]))
            // .attr("cy", d => d.y=clip(d.y, [d.bbox.y1, d.bbox.y2]));
            links.attr("x1", d => {return d.source.x}).attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x).attr("y2", d => d.target.y)
            // d3.selectAll("line.outer_link")
            //     .attr("x1", d => nodes_dict[d.source].x).attr("y1", d => nodes_dict[d.source].y)
            //     .attr("x2", d => nodes_dict[d.target].x).attr("y2", d => nodes_dict[d.target].y)
            generate_border(group, group_nodes, node_radius)
        })
        // .on("end", () => generate_border(group, group_nodes, node_radius))
}

function generate_border(group, group_nodes, node_radius) {
    // generate contour
    const offset_x = 1.5*node_radius
    const offset_y = 1.5*node_radius
    const offsets = [
        [-offset_x, -offset_y], // 1
        [0, -offset_y], // 2
        [offset_x, -offset_y], // 3
        [-offset_x, 0], // 4
        [offset_x, 0], // 6
        [-offset_x, offset_y], // 7
        [0, offset_y], // 8
        [offset_x, offset_y] // 9
    ]
    // add concave hull 
    let points: any[] = []
    group_nodes.forEach((node: any) => {
        offsets.forEach(offset => {
            points.push([node.x + offset[0], node.y + offset[1]])
        })
    })
    let polygon = concaveman(points, 4, 0)
    polygon.splice(polygon.length-1, 1)
    const controlPoints = smoothControlPoints(polygon)
    // group.selectAll("circle.test")
    //     .data(polygon)
    //     .join("circle")
    //     .attr("class", "test")
    //     .attr("r", 2)
    //     .attr("cx", d => d[0])
    //     .attr("cy", d => d[1])
    //     .attr("fill", "steelblue")

    const path = createSmoothPath(controlPoints) 
    return path
    // group.select("path.border").remove()
    group.selectAll("path.border")
        .data([path])
        .join("path")
        .attr("class", "border")
        .transition().duration(50)
        .attr("d", d => d)
        .attr("fill", "none")
        .attr("stroke", "gray")
        .attr("stroke-width", 1)
}

function smoothControlPoints(_points, edgeRatio = 0.333) {
    const points = _points.map(point => new Vector(point[0], point[1]))
    let cp: any[] = [];
    let n = points.length;
    if (n > 1) {
      let eprev = points[0].sub(points[n - 1]);
      let lenprev = eprev.mag();
      console.assert(lenprev != 0)
      eprev = eprev.scale(1 / lenprev);
      for (let i = 0; i < n; i++) {
        let inext = (i + 1) % n;
        let enext = points[inext].sub(points[i]);
        let lennext = enext.mag();
        enext = enext.scale(1 / lennext);
        let tangent = eprev.add(enext).normalize();
        if (tangent.dot(enext) < 0) tangent = new Vector(0, 0).sub(tangent);
        if (points[i].notsmooth) {
          cp.push(points[i], points[i], points[i]);
        } else {
          cp.push(
            points[i].sub(tangent.scale(lenprev * edgeRatio)),
            points[i],
            points[i].add(tangent.scale(lennext * edgeRatio))
          );
        }
        eprev = enext;
        lenprev = lennext;
      }
    }
    return cp;
  }

function createSmoothPath(controlPoints: Vector[]) {
    const m = controlPoints.length
    let path = d3.path()
    let a = controlPoints[1];
      path.moveTo(a.x, a.y);
      for (let i = 0; i < m; i += 3) {
        let b = controlPoints[(i + 2) % m];
        let c = controlPoints[(i + 3) % m];
        let d = controlPoints[(i + 4) % m];
        path.bezierCurveTo(b.x, b.y, c.x, c.y, d.x, d.y);
      }
    return path
}

function _createSmoothPath(points: [number, number][]) {
    const path_generator = d3.line()
        .x((p) => p[0])
        .y((p) => p[1])
        // .curve(d3.curveLinear);
        .curve(d3.curveBasis);
    return path_generator(points)
}


function addOuterLinks(svg, links, nodes_dict) {
    const outer_link_group = svg.select("g.outer-link-group")
    const outer_links = links.filter(link => {
        let source, target;
        if(link.source.id) source = link.source.id
        else source = link.source
        if(link.target.id) target = link.target.id
        else target = link.target
        const source_group = source.split("_")[0]
        const target_group = target.split("_")[0]
        return source_group !== target_group
    })
    outer_link_group.selectAll("line.outer_link")
        .data(outer_links)
        .join("line")
        .attr("class", "outer_link")
        .attr("stroke", "gray")
        .attr("stroke-width", 1)
        .attr("x1", d => nodes_dict[d.source].x)
        .attr("y1", d => nodes_dict[d.source].y)
        .attr("x2", d => nodes_dict[d.target].x)
        .attr("y2", d => nodes_dict[d.target].y)
        .attr("opacity", 0.2)
}

function createForceLink(nodes, weights) {
    let force_links: any[] = []
    for(let i = 0; i < nodes.length; i++) {
        for(let j = 0; j < nodes.length; j++) {
            if(i === j) continue
            if(weights[nodes[i].id] && weights[nodes[i].id][nodes[j].id]) 
                force_links.push({source: nodes[i].id, target: nodes[j].id, weight: weights[nodes[i].id][nodes[j].id], type:"real"})
            // else
            //     force_links.push({source: nodes[i].id, target: nodes[j].id, weight: 0.002, type:"fake"})
        }
    }
    return force_links
}

function clip(x, range) {
    return Math.max(Math.min(x, range[1]), range[0])
}

function radialBboxes(groups, width, height, maxBboxSize) {
    console.log(groups)
    groups[0] = "環境生態"
    groups[7] = "整體經濟"
    const angleScale = d3.scaleBand().domain(groups).range([0, 0+Math.PI * 2])
    let bboxes = {}
    const a = width/2 - maxBboxSize.width/2 - 38
    const b = height/2 - maxBboxSize.height/2
    groups.forEach((group, index) => {
        const angle = angleScale(group)
        const r = (a*b)/Math.sqrt(Math.pow(b*Math.cos(angle), 2) + Math.pow(a*Math.sin(angle), 2))
        const x = width / 2 + r * Math.cos(angle)
        const y = height / 2 + r * Math.sin(angle)
        bboxes[group] = {
            center: [x, y]
        }
    })
    return bboxes
}

function collision_detection(nodes, nodes_dom, bbox_center, bbox_size, node_radius, bboxCoordinateScaleX, bboxCoordinateScaleY) {
    const collisionForce = d3.forceSimulation(nodes)
        .force("collide", d3.forceCollide(node_radius))
        .force("x_force", d3.forceX(d => bboxCoordinateScaleX(d.coordinate[0])))
        .force("y_force", d3.forceY(d => bboxCoordinateScaleY(d.coordinate[1])))
        .on("tick", () => {
            nodes_dom.attr("cx", d => d.x=clip(d.x, [bbox_center[0] - bbox_size/2 + node_radius, bbox_center[0] + bbox_size/2 - node_radius]))
            .attr("cy", d => d.y=clip(d.y, [bbox_center[1] - bbox_size/2 + node_radius, bbox_center[1] + bbox_size/2 - node_radius]));
        })
}
