import type { tLink, tVisLink, tVariableType, tVariable } from "lib/types";
export function link_to_vis_link(data: tLink[]): tVisLink[] {
  const linksMap = new Map();
  data.forEach((item) => {
    const source = {
      var_type: item.indicator1.toLowerCase(),
      variable_name: item.var1,
    };
    const target = {
      var_type: item.indicator2.toLowerCase(),
      variable_name: item.var2,
    };
    const key = JSON.stringify({ source, target });
    if (linksMap.has(key)) {
      // Check if the chunk_id is already in the mentions for this key
      const mapEntry = linksMap.get(key);
      const chunkIdExists = mapEntry.mentions.some(
        (mention) => mention.chunk_id === item.chunk_id,
      );
      if (!chunkIdExists) {
        // If the chunk_id is not already included, add it to the mentions
        mapEntry.mentions.push({
          chunk_id: item.chunk_id,
          evidence: item.response.evidence,
        });
      }
    } else {
      // If the key doesn't exist, initialize it with the current chunk_id in mentions
      linksMap.set(key, {
        source,
        target,
        mentions: [
          { chunk_id: item.chunk_id, evidence: item.response.evidence },
        ],
      });
    }
  });
  console.log("translation done");
  // Convert the map values to an array and adjust structure to include frequency
  const result: tVisLink[] = Array.from(linksMap.values()).map((entry) => ({
    ...entry,
    frequency: entry.mentions.length,
    mentions: entry.mentions,
  }));
  return result;
}

/**
 * Record which chunk mentions each variable
 * @param variableTypeData: dictionary where key is var type and value is another dictionary, where key is variable name and value is the chunks that mention the variable
 * @param defsData: dictionary where key is var type  and value is the definitions of the variables
 * @returns
 */
export function integrateTypes(
  variableTypeData: tVariableType,
  defsData: { [key: string]: { definition: string; factor_type: string } },
): tVariableType {
  const variable_mentions = Object.keys(
    variableTypeData.variable_mentions,
  ).reduce(
    (acc, key) => {
      const variable = variableTypeData.variable_mentions[key];
      acc[key] = {
        ...variable,
        definition: defsData[key]?.definition || "unknown", // Merge definition into each variable
        factor_type: defsData[key]?.factor_type || "unknown", // Merge factor type into each variable
      };
      return acc;
    },
    {} as { [key: string]: tVariable },
  );

  return {
    variable_type: variableTypeData.variable_type,
    variable_mentions,
  };
}
export function link_to_graph(links, nodes, link_threshold, chunk_coordinates) {
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
  console.log({ nodes_dict, links });
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
    (topic) => (group_ccs[topic] = connected_components(group_links[topic])),
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
  console.log(graph.nodes.length, graph.links.length);
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
