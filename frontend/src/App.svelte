<script lang="ts">
    import { onMount } from "svelte";
    import InterviewViewer from "./lib/InterviewViewer.svelte";
    import ReportViewer from "./lib/ReportViewer.svelte"
    import Search from "./lib/Search.svelte";
    import SimGraph from "./lib/SimGraph.svelte";

    const server_address = "http://localhost:5000"

    let interview_data: any = undefined;
    let report_data: any = undefined;
    let relevancy_threshold: number = 0.87;
    let search_threshold: number = 0.8;
    let interview_viewer_component;
    let chunk_graph: any;
    let link_threshold: number = 0.92;
    let simgraph;

    onMount(() => {
        fetchData()
    })

    function fetchData() {
        fetch(`${server_address}/data/`)
            .then(res => res.json())
            .then(res => {
                console.log({res})
                interview_data = res.interviews
                report_data = res.reports
                chunk_graph = link_to_graph(res.chunk_links, res.chunk_nodes)
            })
    }
    
    async function searchQuery(query) {
        console.log(query)
        const type = 'chunk'
        fetch(`${server_address}/search/`, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ query, type })
        })
        .then(res => res.json())
        .then(search_response => {
            console.log(search_response)
            search_response = search_response.filter(response => response[1] > search_threshold)
            const chunk_ids = search_response.map(response => response[0])
            simgraph.highlight_nodes(chunk_ids)
            // const count_tree = create_count_tree(chunk_ids)
            // interview_viewer_component.highlight_chunks(count_tree)

        })
    }

    function create_count_tree(chunk_ids) {
        let count_tree = {}
        chunk_ids.forEach(chunk_id => {
            const participant_id = chunk_id.split('_')[0] + "_" + chunk_id.split("_")[1]
            const chunk_index = chunk_id.split("_")[2]
            if(!count_tree[participant_id]) count_tree[participant_id] = new Set()
            count_tree[participant_id].add(chunk_index)
        })
        Object.keys(count_tree).forEach(participant_id => {
            count_tree[participant_id] = Array.from(count_tree[participant_id])
        })
        return count_tree
    }

    function count_array(array) {
        let counts = {}
        for (const num of array) {
            counts[num] = counts[num] ? counts[num] + 1 : 1;
        }
        return counts
    }

    function link_to_graph(links, nodes) {
        let weights = {}
        let node_set: Set<string> = new Set()
        let degree_dict = {}
        let graph_links: any = []
        // collect nodes
        links.forEach(link => {
            node_set.add(link[0])
            node_set.add(link[1])
        })
        // filter links and build weights
        links = links.filter(link => link[2] > link_threshold)
        links.forEach(link => {
            const source = link[0]
            const target = link[1]
            degree_dict[source] = degree_dict[source] ? degree_dict[source] + 1 : 1
            degree_dict[target] = degree_dict[target] ? degree_dict[target] + 1 : 1
            if(!weights[source]) weights[source] = {}
            weights[source][target] = link[2]
            graph_links.push({ source, target })
        })
        // add inner links 

        // group nodes by topic
        let groups = new Set()
        let topics = new Set()
        node_set.forEach((node: any) => {
            const participant_id = node.split('_')[0]
            // const topic = node.topic
            // groups.add(topic)
            groups.add(participant_id)
            topics.add(node.topic)
            if(!degree_dict[node]) degree_dict[node] = 0
        })
        const graph = {
            groups: Array.from(groups),
            topics: Array.from(topics),
            nodes: Array.from(node_set).map((node: string) => {return {id: node, degree: degree_dict[node], topic: nodes[node].topic}}),
            links: graph_links,
            weights: weights,
        }
        console.log(graph.nodes.length, graph.links.length)
        return graph
    }

    function handleReportSelected(e) {
        const report = e.detail.file_name
        fetch(`${server_address}/report/relevant_nodes`, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ report })
        })
        .then(res => res.json())
        .then(search_response => {
            console.log(search_response)
            const relevant_nodes = search_response.filter(node => node[1] > relevancy_threshold).map(node => node[0])
            simgraph.highlight_nodes(relevant_nodes)
        })
    }

</script>

<main class='h-[100vh]'>
    <div class="page flex space-x-4 h-full overflow-scroll">
        <div class="interview-viewer-container basis-[30%]">
            {#if interview_data != undefined} <InterviewViewer bind:this={interview_viewer_component} data={interview_data}></InterviewViewer> {/if}
        </div>
        <div class="flex flex-col justify-center items-center basis-[50%]">
            <Search on:search={(e) => searchQuery(e.detail)}></Search>
            <div class='w-full h-full'>
                <SimGraph bind:this={simgraph} graph={chunk_graph} data={interview_data}></SimGraph>   
            </div>
        </div>
        <div class="report-viewer-container basis-[30%]">
            {#if report_data != undefined}<ReportViewer data={report_data} on:selected={handleReportSelected}></ReportViewer>{/if}
        </div>
    </div>
</main>

<style>
</style>
