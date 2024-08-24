<script lang="ts">
  import { onMount, tick } from "svelte";
  import * as d3 from "d3";
  import { DPSIR } from "lib/renderers/DetailDPSIR";
  import { OverviewDPSIR } from "lib/renderers/OverviewDPSIR";
  import * as Constants from "lib/constants";
  import Curation from "lib/components/Curation.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  import type {
    tDPSIR,
    tVariableType,
    tVariable,
    tLink,
    tVisLink,
  } from "../types";
  import { varTypeColorScale } from "lib/store";
  import KeywordSea from "lib/components/KeywordSea.svelte";
  export let data: tDPSIR;
  export let links: tVisLink[];
  const svgId = "model-svg";

  const utilities = ["add", "remove", "edit"];
  let bboxes = {
    driver: { center: [58, 100], size: [0, 0] },
    pressure: { center: [170, 50], size: [0, 0] },
    state: { center: [260, 100], size: [0, 0] },
    impact: { center: [210, 190], size: [0, 0] },
    response: { center: [90, 190], size: [0, 0] },
  };
  let rectangleCoordinates = [];
  let container;
  let selectedVar: tVariable | undefined = undefined;
  let selectedType = { source: "", target: "" };
  let showLinks = true;
  let enable = false;
  let currentRenderer = "OverviewDPSIR";
  let dpsirSvg, overviewSvg;
  let keywordsea_var_type: string | undefined = undefined;
  // let trigger_times = 0;
  async function update_vars(
    vars: tDPSIR,
    links: tVisLink[],
    showLinks: boolean,
    selectedType: { source: string; target: string },
  ) {
    if (currentRenderer == "OverviewDPSIR") {
      OverviewDPSIR.update_vars(vars, links, $varTypeColorScale, bboxes);
    } else {
      DPSIR.update_vars(
        vars,
        links,
        $varTypeColorScale,
        selectedType,
        rectangleCoordinates,
        bboxes,
        false,
      );
    }
  }

  onMount(async () => {
    await tick();
    // const handlers = {
    //   // ["VarOrLinkSelected"]: handleVarOrLinkSelected,
    //   ["EnableLinks"]: enableLinks,
    // };

    // calculate box info and small rectangle info
    [rectangleCoordinates, bboxes] = DPSIR.calculateBoxInfo(
      data,
      links,
      Constants.var_type_names,
      bboxes,
    );
    // console.log({rectangleCoordinates,bboxes})
    initializeRenderer(currentRenderer, selectedType);
  });
  function toggleLinks() {
    if (enable) {
      showLinks = !showLinks;
      if (currentRenderer == "DPSIR") {
        DPSIR.toggleLinks(showLinks);
      }
    }
  }

  function handleEmptySpaceClicked(e) {
    if (!e.defaultPrevented) {
      DPSIR.resetHighlights();
      OverviewDPSIR.resetHighlights();
    }
  }

  function handleVarOrLinkSelected(e) {
    console.log(e);
    const variable: tVariable = e;
    selectedVar = variable;
    dispatch("var-selected", selectedVar); // for App.svelte to hightlight the chunks
  }
  function handleVarTypeLinkSelected(e) {
    // console.log(e)

    if (e !== null) {
      currentRenderer = "DPSIR";
      initializeRenderer(currentRenderer, {
        source: e.source,
        target: e.target,
      });
    }
  }
  function handleOverviewVarTypeSelected(e) {
    console.log("handleOverviewVarTypeSelected", e);
    if (e !== null) {
      const var_type = e;
      d3.select(`rect.bbox#` + `${var_type}`).remove();
      d3.select(`text.bbox-label#` + `${var_type}` + `_label`).remove();
      DPSIR.drawVars(
        $varTypeColorScale,
        data[var_type],
        rectangleCoordinates[var_type],
        bboxes[var_type],
        true,
      );
    }
  }
  function handleOverviewVarTypeUnSelected(e) {
    console.log(e);
    if (e !== null) {
      const var_type = e;
      const group = d3.select(`g.${var_type}_region`);
      group.selectAll("g.tag").remove();
      group.selectAll("image").remove();
      d3.select(`text.bbox-label#` + `${var_type}` + `_label`).remove();
      OverviewDPSIR.drawVars(data[var_type], bboxes[var_type]);
    } else {
      Constants.var_type_names.forEach((var_type) => {
        const group = d3.select(`g.${var_type}_region`);
        group.selectAll("g.tag").remove();
        group.selectAll("image").remove();
        d3.select(`text.bbox-label#` + `${var_type}` + `_label`).remove();
        OverviewDPSIR.drawVars(data[var_type], bboxes[var_type]);
      });
    }
  }
  function enableLinks(e) {
    enable = e;
  }

  function switchRenderer() {
    currentRenderer =
      currentRenderer === "OverviewDPSIR" ? "DPSIR" : "OverviewDPSIR";
    initializeRenderer(currentRenderer, selectedType);
  }

  function initializeRenderer(renderer, selectedType) {
    d3.select(`#${svgId}`).selectAll("*").remove();
    DPSIR.init(svgId, utilities);
    OverviewDPSIR.init(svgId);

    DPSIR.on("VarOrLinkSelected", handleVarOrLinkSelected);
    DPSIR.on("VarTypeUnSelected", handleOverviewVarTypeUnSelected);
    // Remove tooltip if it exists
    d3.select("body").selectAll(".tooltip-content").remove();
    OverviewDPSIR.on("VarTypeLinkSelected", handleVarTypeLinkSelected);
    OverviewDPSIR.on("VarTypeHovered", handleOverviewVarTypeHovered);
    OverviewDPSIR.on("VarTypeSelected", handleOverviewVarTypeSelected);
    document
      .querySelector(`#${svgId}`)
      ?.addEventListener("click", handleEmptySpaceClicked);
    update_vars(data, links, showLinks, selectedType);
  }

  function handleOverviewVarTypeHovered(var_type: string) {
    keywordsea_var_type = var_type;
  }
</script>

<div bind:this={container} class="container relative h-full w-full">
  <!-- <div class="absolute right-0 top-1">
    <Curation bind:this={curation} {metadata} />
  </div> -->
  <!-- <button
      class="absolute top-20 right-20 bg-gray-200 p-1 rounded-sm"
      on:click={() => {
        toggleLinks();
      }}
      >{showLinks ? 'Hide Other Links' : 'Show Other Links'}</button
    > -->
  <button
    class="absolute right-4 top-4 rounded-md bg-gray-300 p-2 text-black transition-colors hover:bg-gray-500 hover:text-white"
    on:click={switchRenderer}
  >
    Switch to {currentRenderer === "OverviewDPSIR" ? "DPSIR" : "Overview"}
  </button>
  <svg id={svgId} class="varbox-svg h-full w-full">
    <defs></defs>
  </svg>
  {#if keywordsea_var_type}
    <div
      class="absolute left-1/2 top-1/2 flex h-[33rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 flex-wrap bg-white outline-double outline-2 outline-gray-200"
    >
      <KeywordSea
        data={data[keywordsea_var_type].keyword_data}
        key={keywordsea_var_type}
      />
      <!-- <KeywordSea data={data["pressure"].keyword_data} key="pressure" />
    <KeywordSea data={data["state"].keyword_data} key="state" />
    <KeywordSea data={data["impact"].keyword_data} key="impact" />
    <KeywordSea data={data["response"].keyword_data} key="response" /> -->
    </div>
  {/if}
</div>

<style lang="postcss">
  .container {
    max-width: 100%; /* make DPSIR full width*/
  }
  .varbox-svg {
    & .link-highlight {
      opacity: 1;
      /* filter: drop-shadow(2px 3px 2px rgba(0, 0, 0, 0.3)); */
    }
    & .link-not-highlight {
      opacity: 0.1;
    }
    & .not-show-link-not-highlight {
      opacity: 0;
    }
    & .line-hover {
      stroke: black;
      /* stroke-width: 3; */
      opacity: 1;
    }
    & .box-hover {
      stroke: black;
      stroke-width: 3;
    }
    & .box-highlight {
      opacity: 1;
      /* stroke: black; */
      /* stroke-width: 3; */
    }
    & .box-not-highlight {
      opacity: 0.5;
    }
    & .box-label-highlight {
      opacity: 1;
    }
    & .box-label-not-highlight {
      opacity: 0.5;
    }
    & .bbox-label-hover {
      opacity: 0.2;
    }
    & .overview-var-type-hover {
      stroke: gray;
      stroke-width: 1;
      filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.7));
    }
  }
</style>
