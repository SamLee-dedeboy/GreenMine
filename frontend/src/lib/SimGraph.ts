import * as d3 from 'd3';
import { scale } from 'svelte/transition';
let padding = {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10
}



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
    // next five rows
    for(let i = 1; i < 6; i++) {
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
    for(let i = 0; i < 5; i++) {
        if(i === 2) continue
        bboxes.push({
            x1: i * width,
            y1: 6 * height,
            x2: (i+1) * width,
            y2: 7 * height
        })
    }

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
    init(svgId, width, height, handleNodeClick) {
        const svg = d3.select("#" + svgId).attr("viewBox", `0 0 ${width} ${height}`)
        // const innerGroup = svg.append("g").attr("class", "inner-canvas")
        //     .attr("overflow", "visible")
        svg.append("g").attr("class", "outer-link-group")
        // svg.append("g").attr("class", "node-group")
        this.handleNodeClick = handleNodeClick
    },

    update(svgId, groups, nodes, links, weights, scaleRadius, topicColors) {
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
        addOuterLinks(svg, links, nodes_dict)
        // groups
        const group = svg.selectAll("g.group")
            .data(groups)
            .join("g")
            .attr("class", "group")
            .each(function(group_id) {
                // prepare dom
                d3.select(this).selectAll("g.node-group").remove()
                d3.select(this).selectAll("g.link-group").remove()
                const link_group = d3.select(this).append("g").attr("class", "link-group")
                const node_group = d3.select(this).append("g").attr("class", "node-group")
                // process data
                let group_nodes = nodes.filter(node => node.id.split("_")[0] === group_id)
                let group_links = links.filter(link => {
                    let source, target;
                    if(link.source.id) source = link.source.id
                    else source = link.source
                    if(link.target.id) target = link.target.id
                    else target = link.target
                    const source_group = source.split("_")[0]
                    const target_group = target.split("_")[0]
                    // inner outer
                    if(source_group === group_id && target_group === group_id) link.inner_outer = "inner"
                    return source_group === group_id && target_group === group_id
                })
                // add fake force links
                group_links = createForceLink(group_nodes, weights)
                // create bbox
                const group_bbox = group_bboxes[+group_id.replace("N", "")-1]
                const group_bbox_width = group_bbox.x2 - group_bbox.x1
                const group_bbox_height = group_bbox.y2 - group_bbox.y1
                const group_center = [(group_bbox.x1 + group_bbox.x2)/2, (group_bbox.y1 + group_bbox.y2)/2]

                // add nodes
                const node_radius = 5
                const node = node_group.selectAll("circle")
                    .data(group_nodes)
                    .join("circle")
                    .attr("class", "node")
                    // .attr("r", node_radius)
                    .attr("r", (d) => {return scaleRadius(d.degree)})
                    // .attr("fill", categoricalColors[+group_id.replace("N", "")])
                    .attr("fill", (d) => topicColors(d.topic))
                    .attr("stroke", "black")
                    .attr("stroke-width", 1)
                    .attr("cursor", "pointer")
                    .attr("cx", d => d.x = Math.random() * (group_bbox.x1 + group_bbox_width))
                    .attr("cy", d => d.y = Math.random() * (group_bbox.y1 + group_bbox_height))
                    .on("mouseover", function() { 
                        d3.select(this).attr("stroke-width", 2)
                    })
                    .on("mouseout", function() {
                        d3.select(this).attr("stroke-width", 1)
                    })
                    .on("click", (event, d) => self.handleNodeClick(event, d))
                group_nodes.forEach(node => {
                    node.bbox = group_bbox
                })
                // add links
                const link = link_group.selectAll("line.link")
                    .data(group_links.filter(link => link.type==="real"))
                    .join("line")
                    .attr("class", "link")
                    .attr("opacity", 0.2)
                    .attr("stroke", "gray")
                    .attr("stroke-width", 1)
                // add bbox
                d3.select(this).append("rect")
                    .attr("x", group_nodes[0].bbox.x1)
                    .attr("y", group_nodes[0].bbox.y1)
                    .attr("width", group_nodes[0].bbox.x2 - group_nodes[0].bbox.x1)
                    .attr("height", group_nodes[0].bbox.y2 - group_nodes[0].bbox.y1)
                    .attr("fill", "none")
                    .attr("stroke", "black")
                    .attr("stroke-width", 1)
                // force
                force_layout(group_nodes, group_links, group_center, group_bbox, node, link, nodes_dict, node_radius)

                // grid 
                // grid_layout(group_nodes, group_links, group_center, group_bbox, node, link, nodes_dict, node_radius)
            })
    },
    highlight_links(svgId, link_ids) {
        console.log("highligh links", link_ids)
        const svg = d3.select("#" + svgId)
        const links = svg.selectAll("line")
            .attr("opacity", 0.2)
            .attr("stroke", "gray")
            .attr("stroke-width", 1)
            .filter(d => {console.log((d.source.id || d.source) + "_" + (d.target.id || d.target)); return link_ids.includes((d.source.id || d.source) + "_" + (d.target.id || d.target))})
            .attr("stroke", "black")
            .attr("stroke-width", 1.5)
            .attr("opacity", 1)
    },

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

function grid_layout(group_nodes, group_links, group_center, group_bbox, node, link, nodes_dict, node_radius) {

}

function force_layout(group_nodes, group_links, group_center, group_bbox, node, link, nodes_dict, node_radius) {
    const forceNode = d3.forceManyBody();
    const forceLink = d3.forceLink(group_links).id(d => d.id).strength(d => d.weight);
    const simulation = d3.forceSimulation(group_nodes)
        .force("link", forceLink)
        .force("charge", forceNode)
        .force("center",  d3.forceCenter(group_center[0], group_center[1]).strength(0.05))
        .force("collide", d3.forceCollide(node_radius))
        .on("tick", () => {
            node.attr("cx", d => d.x=clip(d.x, [d.bbox.x1, d.bbox.x2])).attr("cy", d => d.y=clip(d.y, [d.bbox.y1, d.bbox.y2]));
            link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x).attr("y2", d => d.target.y)
            d3.selectAll("line.outer_link")
                .attr("x1", d => nodes_dict[d.source].x).attr("y1", d => nodes_dict[d.source].y)
                .attr("x2", d => nodes_dict[d.target].x).attr("y2", d => nodes_dict[d.target].y)
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
                force_links.push({source: nodes[i].id, target: nodes[j].id, weight: 0.01, type:"fake"})
        }
    }
    return force_links
}
function clip(x, range) {
    return Math.max(Math.min(x, range[1]), range[0])
}