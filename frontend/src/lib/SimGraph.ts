import * as d3 from 'd3';
import {hexbin as Hexbin} from "d3-hexbin";
import { scale } from 'svelte/transition';

const group_bboxes = (() => {
    let bboxes: any = []
    const width = 1000/5
    const height = 1000/7
    // first row
    for(let i = 0; i < 5; i++) {
        bboxes.push({
            x1: i * width,
            y1: 0,
            x2: (i+1) * width,
            y2: height
        })
    }
    // next three rows
    for(let i = 1; i < 4; i++) {
        // left
        bboxes.push({
            x1: 0,
            y1: i * height,
            x2: width,
            y2: (i+1)*height
        })
        // right
        bboxes.push({
            x1: 4 * width,
            y1: i * height,
            x2: 5 * width,
            y2: (i+1)*height
        })
    }
    // for(let i = 0; i < 5; i++) {
    //     if(i === 2) continue
    //     bboxes.push({
    //         x1: i * width,
    //         y1: 6 * height,
    //         x2: (i+1) * width,
    //         y2: 7 * height
    //     })
    // }

    // last row

    // =====================
    // 5x5 grid
    // for(let i = 0; i < 25; i++) {
    //     const x = (i % 5) * width
    //     const y = Math.floor(i / 5) * height
    //     bboxes.push({
    //         x1: x,
    //         y1: y,
    //         x2: x + width,
    //         y2: y + height
    //     }) 
    // }
    console.log(bboxes)
    return bboxes
})()

export const simgraph = {
    init(svgId, width, height, paddings, handlers) {
        const svg = d3.select("#" + svgId).attr("viewBox", `0 0 ${width} ${height}`)
        const topic_region = svg.select("g.topic_region")
        const keyword_region = svg.select("g.keyword_region").attr("transform", `translate(${paddings.left}, ${paddings.top})`)
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
    },

    update_keywords(keyword_data, _) {
        const xScale = this.xScale_keywords
        const yScale = this.yScale_keywords
        const hexbin = Hexbin().x(d => xScale(keyword_data.keyword_coordinates[d][0])).y(d => yScale(keyword_data.keyword_coordinates[d][1]))
            .radius(20)
            .extent([[0, 0], [this.keyword_region_size.width, this.keyword_region_size.height]])
        const data_bins = hexbin(Object.keys(keyword_data.keyword_coordinates))
        const scaleRadius = d3.scaleLinear()
            .domain([0, d3.max(data_bins, d => d.length)])
            .range([0, hexbin.radius() * Math.SQRT2]);
        const scaleOpacity = d3.scalePow().exponent(2)
            .domain([0, d3.max(data_bins, d => d.length)])
            .range([0, 1]);
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
        group.selectAll("path.hex")
        .data(data_bins)
        .join("path")
        .attr("class", "hex")
            // .attr("d", d => `M${d.x},${d.y}${hexbin.hexagon(scaleRadius(d.length))}`)
            .attr("d", d => `M${d.x},${d.y}${hexbin.hexagon()}`)
            .attr("fill", "lightskyblue")
            // .attr("stroke", "white")
            // .attr("stroke-width", 1)
            .attr("opacity", (d) => scaleOpacity(d.length))
            .attr("filter", (d) => d.length > 3? "url(#drop-shadow-hex)": "none")
        let hex_labels = new Array(hex_centers.length).fill(null)
        Object.keys(keyword_coordinates)
        // .filter(keyword => keyword_statistics[keyword].frequency > 5)
            .forEach(keyword => {
                const coordinate = keyword_coordinates[keyword]
                const closest_hex_index = find_closest_hex_index(xScale(coordinate[0]), yScale(coordinate[1]))
                console.log(keyword, closest_hex_index)
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
        console.log(hex_labels)
        group.selectAll("text.label")
            .data(hex_labels)
            .join("text")
            .text(d => d || "")
            .attr("class", "label")
            .attr("x", (_, i) => hex_centers[i][0])
            .attr("y", (_, i) => hex_centers[i][1])
            .attr("opacity", (d) => (d === null? 0 : (keyword_statistics[d].frequency > 5 ? 1 : 0)))
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
    // highlight_links(svgId, link_ids) {
    //     console.log("highligh links", link_ids)
    //     const svg = d3.select("#" + svgId)
    //     const links = svg.selectAll("line")
    //         .attr("opacity", 0.2)
    //         .attr("stroke", "gray")
    //         .attr("stroke-width", 1)
    //         .filter(d => { return link_ids.includes((d.source.id || d.source) + "_" + (d.target.id || d.target))})
    //         .attr("stroke", "black")
    //         .attr("stroke-width", 1.5)
    //         .attr("opacity", 1)
    // },

    highlight_nodes(svgId, node_ids) {
        console.log("highlighting nodes")
        const svg = d3.select("#" + svgId)
        const nodes = svg.selectAll("circle.node")
            .attr("opacity", 0.2)
            .filter(d => node_ids.includes(d.id))
            .attr("stroke", "black")
            .attr("stroke-width", 3)
            .attr("opacity", 1)
    }
}

function force_layout(group_nodes, group_links, group_center, group_bbox, nodes, links, nodes_dict, node_radius) {
    console.log({group_nodes})
    const forceNode = d3.forceManyBody();
    const forceLink = d3.forceLink(group_links).id(d => d.id).strength(d => d.weight);
    const simulation = d3.forceSimulation(group_nodes)
        .force("link", forceLink)
        .force("charge", forceNode)
        .force("center",  d3.forceCenter(group_center[0], group_center[1]).strength(0.05))
        .force("collide", d3.forceCollide(node_radius))
        .on("tick", () => {
            nodes.attr("cx", d => d.x=clip(d.x, [d.bbox.x1, d.bbox.x2]))
            .attr("cy", d => d.y=clip(d.y, [d.bbox.y1, d.bbox.y2]));
            links.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x).attr("y2", d => d.target.y)
            // d3.selectAll("line.outer_link")
            //     .attr("x1", d => nodes_dict[d.source].x).attr("y1", d => nodes_dict[d.source].y)
            //     .attr("x2", d => nodes_dict[d.target].x).attr("y2", d => nodes_dict[d.target].y)
        })
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
            else
                force_links.push({source: nodes[i].id, target: nodes[j].id, weight: 0.002, type:"fake"})
        }
    }
    return force_links
}
function clip(x, range) {
    return Math.max(Math.min(x, range[1]), range[0])
}