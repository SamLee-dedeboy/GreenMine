<script lang="ts">
  import { UncertaintyChart } from "lib/renderers/UncertaintyChart";
  import { varTypeColorScale } from "lib/store";
  import { onMount } from "svelte";
  import type {
    tIdentifyVarTypes,
    tIdentifyVars,
    tIdentifyLinks,
  } from "lib/types";
  export let data: (tIdentifyVarTypes | tIdentifyVars | tIdentifyLinks)[];
  export let key: string;

  const svgId = "uncertainty-chart-" + Math.floor(Math.random() * 10) + 1;
  let uncertaintyChart: UncertaintyChart = new UncertaintyChart(svgId);
  let target = "overall";
  let result_key_dict = {
    identify_var_types: "var_type",
    identify_vars: "var",
    identify_links: "link",
  };

  $: updateChartData(data, target, key);
  /**
   *
   * @param data
   * @param target: "overall" | "driver" | "pressure" | "state" | "impact" | "response"
   * @param key: "identify_var_types" | "identify_vars" | "identify_links"
   */
  function updateChartData(
    data: (tIdentifyVarTypes | tIdentifyVars | tIdentifyLinks)[],
    target: string,
    key: string,
  ) {
    console.log({ data, target, key });
    let chart_data: number[] = [];
    if (target === "overall") {
      chart_data = data.map((d) => d.uncertainty[key] || 0);
    } else {
      chart_data = data
        .map((d) => d[key + "_result"])
        .filter(
          (results) => results.filter((r) => r.var_type === target).length > 0,
        )
        .flat()
        .map((r) => 1 - r.confidence);
      // .map((d) => d.confidence || 0);
    }
    console.log({ chart_data });

    uncertaintyChart.update(chart_data, $varTypeColorScale(target));
  }
  onMount(() => {
    uncertaintyChart.init();
    updateChartData(data, target, key);
  });
</script>

<div class="flex h-full w-full flex-col">
  <div class="flex items-center justify-around py-1">
    {#each ["overall", "driver", "pressure", "state", "impact", "response"] as t}
      <div
        role="button"
        tabindex="0"
        class="rounded-md px-1 py-0.5 text-sm capitalize italic opacity-40 outline outline-1 outline-gray-300 hover:bg-gray-400"
        class:active={target === t}
        style={`background-color: ${$varTypeColorScale(t)}`}
        on:click={() => (target = t)}
        on:keyup={() => {}}
      >
        {t}
      </div>
    {/each}
  </div>
  <div class="flex h-1 grow items-center justify-center">
    <svg id={svgId} class="max-h-full max-w-full"></svg>
  </div>
</div>

<style lang="postcss">
  .active {
    @apply opacity-100 shadow outline-2;
  }
</style>
