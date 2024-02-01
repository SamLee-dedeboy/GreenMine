<script lang="ts">
  import { onMount } from "svelte";
  import InterviewViewer from "./lib/InterviewViewer.svelte";
  // import ReportViewer from "./lib/ReportViewer.svelte";
  // import Search from "./lib/Search.svelte";
  import SimGraph from "./lib/SimGraph.svelte";
  // import ReportTimeline from "./lib/ReportTimeline.svelte";
  // import Legend from "./lib/Legend.svelte";

  const server_address = "http://localhost:5000";

  let interview_data: any = undefined;
  let report_data: any = undefined;
  let keyword_data: any = undefined;
  let relevancy_threshold: number = 0.87;
  let search_threshold: number = 0.8;
  let interview_viewer_component;
  let chunk_graph: any = undefined;
  let link_threshold: number = 0.83;
  let simgraph;
  let chunk_coordinates;
  let timeline_data;

  $: keyword_chunks_dict = ((_) => {
    let res = {};
    if (!chunk_graph) return res;
    chunk_graph.nodes.forEach((node) => {
      node.keywords.forEach((keyword) => {
        if (!res[keyword]) res[keyword] = [];
        res[keyword].push(node);
      });
    });
    return res;
  })(chunk_graph);

  onMount(() => {
    fetchData();
  });

  function fetchData() {
    fetch(`${server_address}/data/`)
      .then((res) => res.json())
      .then((res) => {
        console.log({ res });
        interview_data = res.interviews;
        // report_data = res.reports
        chunk_coordinates = res.topic_tsnes;
        chunk_graph = link_to_graph(res.chunk_links, res.chunk_nodes);
        // console.log({ chunk_graph });
        timeline_data = res.reports;
        keyword_data = {
          keyword_coordinates: res.keyword_coordinates,
          keyword_statistics: res.keyword_statistics,
        };
      });
  }

  async function searchQuery(query) {
    // console.log(query);
    const type = "chunk";
    fetch(`${server_address}/search/`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, type }),
    })
      .then((res) => res.json())
      .then((search_response) => {
        // console.log(search_response);
        search_response = search_response.filter(
          (response) => response[1] > search_threshold
        );
        const chunk_ids = search_response.map((response) => response[0]);
        simgraph.highlight_nodes(chunk_ids);
        // const count_tree = create_count_tree(chunk_ids)
        // interview_viewer_component.highlight_chunks(count_tree)
      });
  }

  function create_count_tree(chunk_ids) {
    let count_tree = {};
    chunk_ids.forEach((chunk_id) => {
      const participant_id =
        chunk_id.split("_")[0] + "_" + chunk_id.split("_")[1];
      const chunk_index = chunk_id.split("_")[2];
      if (!count_tree[participant_id]) count_tree[participant_id] = new Set();
      count_tree[participant_id].add(chunk_index);
    });
    Object.keys(count_tree).forEach((participant_id) => {
      count_tree[participant_id] = Array.from(count_tree[participant_id]);
    });
    return count_tree;
  }

  function count_array(array) {
    let counts = {};
    for (const num of array) {
      counts[num] = counts[num] ? counts[num] + 1 : 1;
    }
    return counts;
  }

  function link_to_graph(links, nodes) {
    let weights = {};
    let degree_dict = {};
    let graph_links: any = [];
    let nodes_dict = {};
    Object.keys(nodes).forEach((node_id) => {
      nodes_dict[node_id] = nodes[node_id];
    });
    // filter links and build weights
    links = links.filter((link) => link[2] > link_threshold);
    let group_links: any = {};
    links.forEach((link) => {
      const source = link[0];
      const target = link[1];
      if (nodes_dict[source].topic === nodes_dict[target].topic) {
        degree_dict[source] = degree_dict[source] ? degree_dict[source] + 1 : 1;
        degree_dict[target] = degree_dict[target] ? degree_dict[target] + 1 : 1;
        if (!weights[source]) weights[source] = {};
        weights[source][target] = link[2];
        graph_links.push({ source, target });
        if (!group_links[nodes_dict[source].topic])
          group_links[nodes_dict[source].topic] = [];
        group_links[nodes_dict[source].topic].push({ source, target });
      }
    });
    let group_ccs = {};
    Object.keys(group_links).forEach(
      (topic) => (group_ccs[topic] = connected_components(group_links[topic]))
    );

    // group nodes by topic
    let group_nodes = {};
    Object.keys(nodes).forEach((node_id: string) => {
      // const participant_id = node.split('_')[0]
      const topic = nodes[node_id].topic;
      const degree = degree_dict[node_id] || 0;
      const coordinate = chunk_coordinates[node_id];
      nodes[node_id].degree = degree;
      nodes[node_id].coordinate = coordinate;
      if (!group_nodes[topic]) group_nodes[topic] = [];
      group_nodes[topic].push(nodes[node_id]);
    });

    const graph = {
      groups: group_nodes,
      group_ccs: group_ccs,
      // topics: Array.from(topics),
      nodes: Object.keys(nodes).map((node: string) => nodes[node]),
      links: graph_links,
      weights: weights,
    };
    // console.log(graph.nodes.length, graph.links.length);
    return graph;
  }

  // function handleReportSelected(e) {
  //   const report = e.detail.file_name;
  //   fetch(`${server_address}/report/relevant_nodes`, {
  //     method: "POST",
  //     headers: {
  //       Accept: "application/json",
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({ report }),
  //   })
  //     .then((res) => res.json())
  //     .then((search_response) => {
  //       console.log(search_response);
  //       const relevant_nodes = search_response
  //         .filter((node) => node[1] > relevancy_threshold)
  //         .map((node) => node[0]);
  //       simgraph.highlight_nodes(relevant_nodes);
  //     });
  // }

  function connected_components(links) {
    const bfs = (v, all_pairs, visited) => {
      let q: any[] = [];
      let current_group: any[] = [];
      let i, nextVertex, pair;
      let length_all_pairs = all_pairs.length;
      q.push(v);
      while (q.length > 0) {
        v = q.shift();
        if (!visited[v]) {
          visited[v] = true;
          current_group.push(v);
          // go through the input array to find vertices that are
          // directly adjacent to the current vertex, and put them
          // onto the queue
          for (i = 0; i < length_all_pairs; i += 1) {
            pair = all_pairs[i];
            if (pair.source === v && !visited[pair.target]) {
              q.push(pair.target);
            } else if (pair.target === v && !visited[pair.source]) {
              q.push(pair.source);
            }
          }
        }
      }
      // return everything in the current "group"
      return current_group;
    };

    let connected_components: any[] = [];
    let i, k, length, u, v, src, current_pair;
    let visited = {};

    // main loop - find any unvisited vertex from the input array and
    // treat it as the source, then perform a breadth first search from
    // it. All vertices visited from this search belong to the same group
    for (i = 0, length = links.length; i < length; i += 1) {
      current_pair = links[i];
      u = current_pair.source;
      v = current_pair.target;
      src = null;
      if (!visited[u]) {
        src = u;
      } else if (!visited[v]) {
        src = v;
      }
      if (src) {
        // there is an unvisited vertex in this pair.
        // perform a breadth first search, and push the resulting
        // group onto the list of all groups
        connected_components.push(bfs(src, links, visited));
      }
    }

    // show groups
    return connected_components;
  }

  function handleChunksSelected(e) {
    if (!interview_viewer_component) return;
    const chunks = e.detail;
    interview_viewer_component.highlight_chunks(chunks);
    // if (chunks === null) interview_viewer_component.dehighlight_chunks();
    // else interview_viewer_component.highlight_chunks(chunks);
  }

  function handleKeywordSelected(e) {
    if (!interview_viewer_component) return;
    const keywords = e.detail;
    // console.log(keywords, keyword_data);
    if (keywords === null) {
      interview_viewer_component.dehighlight_keywords();
    } else {
      const nodes = keywords.map((keyword) => keyword_chunks_dict[keyword]);
      interview_viewer_component.highlight_keywords(nodes, keywords);
    }
  }
</script>

<main class="h-[100vh] px-1">
  <div class="page flex space-x-1 h-full">
    <div
      class="flex flex-col justify-center items-center flex-1 h-full w-full basis-[70%] shrink-0"
    >
      <!-- <Search on:search={(e) => searchQuery(e.detail)}></Search> -->
      <div class="w-full h-full relative">
        <div
          class="title absolute top-1 left-6 w-fit rounded py-4 px-4 text-left text-sky-600"
        >
          <span>Sea of</span> <br />
          <span class="title-hidden absolute h-fit mt-[-25px]">Voices</span>
        </div>
        <SimGraph
          bind:this={simgraph}
          topic_data={chunk_graph}
          {keyword_data}
          on:chunks-selected={handleChunksSelected}
          on:keywords-selected={handleKeywordSelected}
        ></SimGraph>
      </div>
    </div>
    <div class="interview-viewer-container h-full w-full basis-[31%]">
      {#if interview_data != undefined}
        <InterviewViewer
          bind:this={interview_viewer_component}
          data={interview_data}
        ></InterviewViewer>
      {/if}
    </div>
    <!-- <div class="flex-1 h-full">
            <div class='w-full h-full'>
                <ReportTimeline timeline_data={timeline_data}></ReportTimeline>
            </div>
        </div> -->
    <!-- <div class="report-viewer-container basis-[30%]">
            {#if report_data != undefined}<ReportViewer data={report_data} on:selected={handleReportSelected}></ReportViewer>{/if}
        </div> -->
  </div>
</main>

<style>
  .shadow {
    box-shadow: 0 0 2px gray;
  }
  .title {
    text-transform: uppercase;
    filter: blur(0.001em);
    font-family: Fantasy;
    font-weight: bold;
    font-size: 3rem;
  }
  .title-hidden {
    opacity: 0.65;
    filter: blur(0.02em);
  }
</style>
