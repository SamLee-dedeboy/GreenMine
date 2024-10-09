<script lang="ts">
  import { server_address, var_type_names } from "lib/constants";
  import { UncertaintyGraph } from "lib/renderers/UncertaintyGraph";
  import { varTypeColorScale } from "lib/store";
  import type {
    tIdentifyVarTypes,
    tIdentifyVars,
    tIdentifyLinks,
  } from "lib/types";
  import { onMount } from "svelte";
  //   export let data: (tIdentifyVarTypes | tIdentifyVars | tIdentifyLinks)[];
  export let version: string;
  export let key: string; // "identify_var_types" | "identify_vars" | "identify_links"

  let group = "driver"; // "driver" | "pressure" | "state" | "impact" | "response"
  const svgId = "uncertainty-graph-" + Math.floor(Math.random() * 1000);
  let uncertaintyGraph: UncertaintyGraph = new UncertaintyGraph(svgId);
  let dr_result = {};

  //   $: uncertaintyGraph.update(data, key);
  $: updatePlotData(version, key);
  $: updatePlot(dr_result["dr"] || {}, dr_result["noise_cluster"], group);

  async function updatePlotData(data, key) {
    return;
    if (data.length === 0) return;
    let dr_data = {};
    var_type_names.forEach((t) => {
      const var_type_dr_data = data
        .filter(
          (d) => d[key + "_result"].filter((r) => r.var_type === t).length > 0,
        )
        .map((d) => {
          const group_mention = d[key + "_result"].filter(
            (r) => r.var_type === t,
          )[0];
          return {
            id: d.id,
            uncertainty: group_mention.uncertainty,
            text:
              evidenceToString(
                group_mention.evidence,
                d.conversation.map((c) => c.content),
              ) +
              "\n" +
              group_mention.explanation,
          };
        });
      dr_data[t] = var_type_dr_data;
    });
    dr_result = await fetchDR(dr_data);
  }

  function updatePlot(dr_w_coordinates, noise_cluster_index, group) {
    if (!dr_w_coordinates[group]) return;
    uncertaintyGraph.update(dr_w_coordinates[group], noise_cluster_index);
  }

  function fetchDR(data) {
    console.log("fetching DR data", data);
    return fetch(`${server_address}/dr/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
    }).then((res) => res.json());
  }

  function evidenceToString(evidence: number[], conversation: string[]) {
    return evidence.map((e) => `${conversation[e]}`).join("\n");
  }
  onMount(() => {
    uncertaintyGraph.init();
    // updatePlotData(data, key);
    // uncertaintyGraph.update(data, key);
  });
</script>

<div class="relative flex h-full w-full flex-col justify-center">
  <div class="flex justify-around">
    {#each var_type_names as t}
      <div
        role="button"
        tabindex="0"
        class="rounded-md px-1 py-0.5 text-sm capitalize italic opacity-40 outline outline-1 outline-gray-300 hover:bg-gray-400"
        class:active={group === t}
        style={`background-color: ${$varTypeColorScale(t)}`}
        on:click={() => (group = t)}
        on:keyup={() => {}}
      >
        {t}
      </div>
    {/each}
  </div>
  <svg id={svgId} class="max-h-full max-w-full"> </svg>
  <svg
    id={svgId + "-legend"}
    class="absolute right-0 top-10 h-[10rem] w-[10rem]"
    viewBox="0 0 150 150"
  >
    <g class="radius-legend">
      <circle cx="115" cy="20" r="5" stroke="black" stroke-width="1" fill="none"
      ></circle>
      <circle
        cx="115"
        cy="20"
        r="10"
        stroke="black"
        stroke-width="1"
        fill="none"
      ></circle>
      <circle
        cx="115"
        cy="20"
        r="15"
        stroke="black"
        stroke-width="1"
        fill="none"
      ></circle>
      <text
        x="115"
        y="45"
        font-size="8"
        fill="#3c3c3c"
        dominant-baseline="middle"
        text-anchor="middle"
      >
        Uncertainty</text
      >
      <circle
        cx="115"
        cy="75"
        r="15"
        stroke="gray"
        stroke-width="1"
        fill="#f4cae4"
      ></circle>
      <path
        d={`M 115,75 L 130,75 A 15 15 1 1 1 ${115 + 15 * Math.cos((Math.PI * 4) / 3)} ${75 + 15 * Math.sin((Math.PI * 4) / 3)} L 115,75`}
        fill="#cbd5e8"
        stroke="gray"
      />
      <path
        d={`M 115,75 L 130,75 A 15 15 0 0 1 ${115 + 15 * Math.cos((Math.PI * 2) / 3)} ${75 + 15 * Math.sin((Math.PI * 2) / 3)} L 115,75`}
        fill="#fdcdac"
        stroke="gray"
      />

      <circle
        cx="115"
        cy="75"
        r="15"
        stroke="#888888"
        stroke-width="1"
        fill="none"
      ></circle>
      <text
        x="115"
        y="100"
        font-size="8"
        fill="#3c3c3c"
        dominant-baseline="middle"
        text-anchor="middle"
      >
        Topics</text
      >
    </g>
  </svg>
  <div
    class="uncertainty-tooltip absolute bottom-0 left-0 top-7 max-w-[30%] overflow-y-auto text-xs"
  >
    tooltip
  </div>
</div>

<style lang="postcss">
  .active {
    @apply opacity-100 shadow outline-2;
  }
</style>
