import * as d3 from 'd3';

export const timeline = {
    init(svgId, width, height, handleNodeClick) {
        const svg = d3.select("#" + svgId).attr("viewBox", `0 0 ${width} ${height}`)
        svg.append("g").attr("class", "node-group")
        svg.append("g").attr("class", "axis-group")
        this.handleNodeClick = handleNodeClick
        this.width = width
        this.height = height
    },

    update(svgId, timeline_data) {
        console.log({timeline_data})
        const svg = d3.select("#" + svgId)
        // calculate scale
        const dates = timeline_data.map(d => new Date(`${d.data.time.year}-${d.data.time.month < 10? "0" + d.data.time.month : d.data.time.month}-${d.data.time.day < 10? "0" + d.data.time.day : d.data.time.day }T00:00:00-08:00`))
        const maxDate = new Date(Math.max.apply(null,dates));
        const minDate = new Date(Math.min.apply(null,dates));
        const minYear = minDate.getFullYear()
        const maxYear = maxDate.getFullYear()
        const years = Array.from(Array(maxYear - minYear + 1).keys()).map(d => d + minYear)
        const scaleTime = d3.scaleTime([minDate, maxDate], [50, this.width - 30]).nice()
        this.updateAxis(svg, scaleTime, years)

        // update nodes
        const node_group = svg.select(".node-group")
        node_group.selectAll("circle.node")
            .data(timeline_data, d => d.file_name)
            .join("circle")
            .attr("class", "node")
            .attr("cx", d => scaleTime(new Date(`${d.data.time.year}-${d.data.time.month < 10? "0" + d.data.time.month : d.data.time.month}-${d.data.time.day < 10? "0" + d.data.time.day : d.data.time.day }T00:00:00-08:00`)))
            .attr("cy", () => Math.random() * (this.height-40))
            .attr("r", 5)
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("fill", "white")

        
    },
    updateAxis(svg, scaleTime, years) {
        // x axis
        // const xAxis = d3.scaleTime([minDate, maxDate], [50, this.width - 30]).nice()
        const xAxis = scaleTime
        const axis_group = svg.select(".axis-group")
        axis_group.selectAll("*").remove()
        axis_group.attr("transform", `translate(0,${this.height - 30})`)
            .call(d3.axisBottom(xAxis).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%Y %b")));
        // vertical lines -- year
        console.log({years})
        const yearLines = axis_group.selectAll("line.year-line").data(years)
            .join("line")
            .attr("class", "year-line")
            .attr("x1", d => xAxis(new Date(`${d}-01-01T00:00:00-08:00`)))
            .attr("x2", d => xAxis(new Date(`${d}-01-01T00:00:00-08:00`)))
            .attr("y1", 0)
            .attr("y2", -this.height + 30)
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5")
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