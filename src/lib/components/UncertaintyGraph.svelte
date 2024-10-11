<script lang="ts">
  import { server_address, var_type_names } from "lib/constants";
  import { UncertaintyGraph } from "lib/renderers/UncertaintyGraph";
  import { varTypeColorScale } from "lib/store";
  import type {
    tIdentifyVarTypes,
    tIdentifyVars,
    tIdentifyLinks,
    tVarData,
  } from "lib/types";
  import { onMount } from "svelte";
  //   export let data: (tIdentifyVarTypes | tIdentifyVars | tIdentifyLinks)[];
  export let version: string;
  export let variables: tVarData = {};
  export let key: string; // "identify_var_types" | "identify_vars" | "identify_links"

  let group = "driver"; // "driver" | "pressure" | "state" | "impact" | "response"
  let highlighted_vars: string[] = [];
  let src_group = "driver";
  let dst_group = "driver";
  let src_highlighted_vars: string[] = [];
  let dst_highlighted_vars: string[] = [];
  const svgId = "uncertainty-graph-" + Math.floor(Math.random() * 1000);
  let uncertaintyGraph: UncertaintyGraph = new UncertaintyGraph(svgId);
  let allow_switch_group = true;

  let dr_result = {};
  $: fetchPlotData(version, key);

  function updatePlot(_dr_result, _group, _highlighted_vars) {
    // if (!_dr_result[_group]) return;
    allow_switch_group = false;
    let highlight_ids = [];
    if (key === "identify_vars") {
      highlight_ids = _dr_result[_group]
        .filter(
          (d) =>
            d.vars &&
            d.vars
              .map((v) => v.var_name)
              .some((v_name) => _highlighted_vars.includes(v_name)),
        )
        .map((d) => d.id);
    }
    if (key === "identify_links") {
      console.log({ _dr_result, _group, _highlighted_vars });
      const [_src_group, _dst_group] = _group;
      const [_src_vars, _dst_vars] = _highlighted_vars;
      _group = _src_group + "-" + _dst_group;
      highlight_ids = _dr_result[_group]
        .filter(
          (d) =>
            d.links &&
            (d.links
              .map((l) => l.var1)
              .some((v_name) => src_highlighted_vars.includes(v_name)) ||
              d.links
                .map((l) => l.var2)
                .some((v_name) => dst_highlighted_vars.includes(v_name))),
        )
        .map((d) => d.id);
    }
    uncertaintyGraph.update(_dr_result[_group], highlight_ids);
  }

  async function fetchPlotData(version, key) {
    dr_result = await fetch(`${server_address}/uncertainty_graph/get/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key, version }),
    }).then((res) => res.json());
    if (key === "identify_links") {
      updatePlot(
        dr_result,
        [src_group, dst_group],
        [src_highlighted_vars, dst_highlighted_vars],
      );
    } else {
      updatePlot(dr_result, group, highlighted_vars);
    }
  }

  onMount(() => {
    uncertaintyGraph.init();
    uncertaintyGraph.on("force_end", () => {
      allow_switch_group = true;
    });
    if (key === "identify_vars") {
      //   highlighted_vars = variables[group].map((v) => v.var_name);
      highlighted_vars = [];
    }
  });
</script>

<div class="relative flex h-full w-full flex-col">
  {#if key !== "identify_links"}
    <div class="flex justify-around">
      {#each var_type_names as t}
        <div
          role="button"
          tabindex="0"
          class="flex items-center rounded-md px-1 py-0.5 text-sm capitalize italic opacity-40 outline outline-1 outline-gray-300 hover:bg-gray-400"
          class:active={group === t}
          class:disabled={!allow_switch_group}
          style={`background-color: ${$varTypeColorScale(t)}`}
          on:click={() => {
            uncertaintyGraph.clear();
            group = t;
            if (key === "identify_vars") highlighted_vars = [];
            // highlighted_vars = variables[t].map((v) => v.var_name);
            updatePlot(dr_result, group, highlighted_vars);
          }}
          on:keyup={() => {}}
        >
          {#if !allow_switch_group && group === t}
            <img src="loader.svg" alt="loading" class="h-4 w-4 animate-spin" />
          {/if}
          {t}
        </div>
      {/each}
    </div>
  {/if}
  {#if key === "identify_vars"}
    <div class="flex flex-wrap gap-x-1 gap-y-1 px-1 pt-1">
      {#each variables[group] as var_data}
        <div
          role="button"
          tabindex="0"
          class="h-fit rounded-md px-1 py-0.5 text-xs text-gray-700 opacity-70 outline outline-1 outline-gray-300 hover:opacity-100 hover:outline-2 hover:outline-black"
          class:highlighted_vars={highlighted_vars.includes(var_data.var_name)}
          style={`background-color: ${highlighted_vars.includes(var_data.var_name) ? $varTypeColorScale(group) : "white"}`}
          on:click={() => {
            if (highlighted_vars.includes(var_data.var_name)) {
              highlighted_vars = highlighted_vars.filter(
                (v) => v !== var_data.var_name,
              );
            } else {
              highlighted_vars = [...highlighted_vars, var_data.var_name];
            }
            updatePlot(dr_result, group, highlighted_vars);
          }}
          on:keyup={() => {}}
        >
          {var_data.var_name}
        </div>
      {/each}
    </div>
  {/if}
  {#if key === "identify_links"}
    <div class="mb-2 flex gap-x-1">
      <!-- src -->
      <div class="flex flex-1 border-r border-gray-200">
        <div class="flex flex-col">
          <div class="text-xs italic">From</div>
          <div class="flex">
            <div class="flex flex-col justify-between">
              {#each var_type_names as t}
                <div
                  role="button"
                  tabindex="0"
                  class="flex items-center justify-center rounded-md px-1 text-[0.65rem] capitalize italic opacity-40 outline outline-[0.5px] outline-gray-300 hover:bg-gray-400"
                  class:active={src_group === t}
                  class:disabled={!allow_switch_group}
                  style={`background-color: ${$varTypeColorScale(t)}`}
                  on:click={() => {
                    uncertaintyGraph.clear();
                    src_group = t;
                    src_highlighted_vars = [];
                    updatePlot(
                      dr_result,
                      [src_group, dst_group],
                      [src_highlighted_vars, dst_highlighted_vars],
                    );
                  }}
                  on:keyup={() => {}}
                >
                  {#if !allow_switch_group && src_group === t}
                    <img
                      src="loader.svg"
                      alt="loading"
                      class="h-4 w-4 animate-spin"
                    />
                  {/if}
                  {t}
                </div>
              {/each}
            </div>
            <div
              class="flex h-[6rem] flex-1 flex-wrap gap-x-1 gap-y-1 overflow-y-auto px-1 pt-1"
            >
              {#each variables[src_group] as var_data}
                <div
                  role="button"
                  tabindex="0"
                  class="h-fit rounded-md px-1 py-0.5 text-[0.6rem] text-gray-700 opacity-70 outline outline-1 outline-gray-300 hover:opacity-100 hover:outline-2 hover:outline-black"
                  class:highlighted_vars={src_highlighted_vars.includes(
                    var_data.var_name,
                  )}
                  style={`background-color: ${src_highlighted_vars.includes(var_data.var_name) ? $varTypeColorScale(src_group) : "white"}`}
                  on:click={() => {
                    if (src_highlighted_vars.includes(var_data.var_name)) {
                      src_highlighted_vars = src_highlighted_vars.filter(
                        (v) => v !== var_data.var_name,
                      );
                    } else {
                      src_highlighted_vars = [
                        ...src_highlighted_vars,
                        var_data.var_name,
                      ];
                    }
                    updatePlot(
                      dr_result,
                      [src_group, dst_group],
                      [src_highlighted_vars, dst_highlighted_vars],
                    );
                  }}
                  on:keyup={() => {}}
                >
                  {var_data.var_name}
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
      <!-- dst -->
      <div class="flex flex-1">
        <div class="flex flex-col">
          <div class="text-xs italic">To</div>
          <div class="flex">
            <div class="flex flex-col justify-between">
              {#each var_type_names as t}
                <div
                  role="button"
                  tabindex="0"
                  class="flex items-center justify-center rounded-md px-1 text-[0.65rem] capitalize italic opacity-40 outline outline-[0.5px] outline-gray-300 hover:bg-gray-400"
                  class:active={dst_group === t}
                  class:disabled={!allow_switch_group}
                  style={`background-color: ${$varTypeColorScale(t)}`}
                  on:click={() => {
                    uncertaintyGraph.clear();
                    dst_group = t;
                    dst_highlighted_vars = [];
                    updatePlot(
                      dr_result,
                      [src_group, dst_group],
                      [src_highlighted_vars, dst_highlighted_vars],
                    );
                  }}
                  on:keyup={() => {}}
                >
                  {#if !allow_switch_group && dst_group === t}
                    <img
                      src="loader.svg"
                      alt="loading"
                      class="h-4 w-4 animate-spin"
                    />
                  {/if}
                  {t}
                </div>
              {/each}
            </div>
            <div
              class="flex h-[6rem] flex-1 flex-wrap gap-x-1 gap-y-1 overflow-y-auto px-1 pt-1"
            >
              {#each variables[dst_group] as var_data}
                <div
                  role="button"
                  tabindex="0"
                  class="h-fit rounded-md px-1 py-0.5 text-[0.6rem] text-gray-700 opacity-70 outline outline-1 outline-gray-300 hover:opacity-100 hover:outline-2 hover:outline-black"
                  class:highlighted_vars={dst_highlighted_vars.includes(
                    var_data.var_name,
                  )}
                  style={`background-color: ${dst_highlighted_vars.includes(var_data.var_name) ? $varTypeColorScale(dst_group) : "white"}`}
                  on:click={() => {
                    if (dst_highlighted_vars.includes(var_data.var_name)) {
                      dst_highlighted_vars = dst_highlighted_vars.filter(
                        (v) => v !== var_data.var_name,
                      );
                    } else {
                      dst_highlighted_vars = [
                        ...dst_highlighted_vars,
                        var_data.var_name,
                      ];
                    }
                    updatePlot(
                      dr_result,
                      [src_group, dst_group],
                      [src_highlighted_vars, dst_highlighted_vars],
                    );
                  }}
                  on:keyup={() => {}}
                >
                  {var_data.var_name}
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
  <div class="relative">
    <svg id={svgId} class="uncertainty-graph-container max-h-full max-w-full">
    </svg>
    <svg
      id={svgId + "-legend"}
      class="pointer-events-none absolute right-0 top-0 h-[10rem] w-[10rem]"
      viewBox="0 0 150 150"
    >
      <g class="radius-legend">
        <circle
          cx="115"
          cy="20"
          r="5"
          stroke="black"
          stroke-width="1"
          fill="none"
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
  </div>
  <div
    class="uncertainty-tooltip absolute bottom-0 left-0 right-0 max-h-[10rem] overflow-y-auto rounded px-3 text-xs outline outline-1 outline-gray-300"
  ></div>
</div>

<style lang="postcss">
  .active {
    @apply opacity-100 shadow outline-2;
  }
  .disabled {
    @apply pointer-events-none;
  }
  .highlighted_vars {
    @apply opacity-100;
  }
  .uncertainty-graph-container {
    & .node-highlighted {
    }
    & .node-not-highlighted {
      @apply opacity-20;
    }
  }
</style>
