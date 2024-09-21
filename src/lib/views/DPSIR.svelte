<script lang="ts">
  import { onMount, tick } from "svelte";
  import * as d3 from "d3";
  import { DetailDPSIR } from "lib/renderers/DetailDPSIR";
  import { OverviewDPSIR } from "lib/renderers/OverviewDPSIR";
  import * as Constants from "lib/constants";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  import type {
    tDPSIR,
    tVariableType,
    tVariable,
    tLink,
    tVisLink,
    tLinkObjectOverview,
    tMention,
    tBbox,
  } from "../types";
  import { varTypeColorScale } from "lib/store";
  export let data: tDPSIR;
  export let links: tVisLink[];
  const svgId = "model-svg";

  let bboxes: Record<string, tBbox> = {
    driver: { center: [58, 90], size: [0, 0] },
    pressure: { center: [170, 30], size: [0, 0] },
    state: { center: [270, 75], size: [0, 0] },
    impact: { center: [240, 190], size: [0, 0] },
    response: { center: [70, 210], size: [0, 0] },
  };

  let var_type_states = {
    driver: { revealed: false },
    pressure: { revealed: false },
    state: { revealed: false },
    impact: { revealed: false },
    response: { revealed: false },
  };
  $: isDetailMode = Object.values(var_type_states).every(
    (state) => state.revealed,
  );

  function initializeRenderer() {
    d3.select(`#${svgId}`).selectAll("*").remove();
    OverviewDPSIR.init(svgId);
    DetailDPSIR.init(svgId);

    DetailDPSIR.on("VarOrLinkSelected", handleVarOrLinkSelected);
    DetailDPSIR.on("VarTypeUnSelected", handleOverviewVarTypeUnSelected);
    OverviewDPSIR.on("VarTypeLinkSelected", handleVarTypeLinkSelected);
    OverviewDPSIR.on("VarTypeSelected", handleOverviewVarTypeSelected);
    OverviewDPSIR.on("VarTypeUnSelected", handleOverviewVarTypeUnSelected);
    document
      .querySelector(`#${svgId}`)
      ?.addEventListener("click", handleEmptySpaceClicked);
  }

  function switchRenderer() {
    // if it is in detail mode, then switch to overview mode
    if (isDetailMode) {
      Object.keys(var_type_states).forEach((key) => {
        var_type_states[key].revealed = false;
      });
    } else {
      Object.keys(var_type_states).forEach((key) => {
        var_type_states[key].revealed = true;
      });
    }
    render(data, links, var_type_states);
  }

  async function render(
    vars: tDPSIR,
    links: tVisLink[],
    var_type_states: Record<string, { revealed: boolean }>,
  ) {
    OverviewDPSIR.update_vars(
      links,
      $varTypeColorScale,
      bboxes,
      var_type_states,
    );
    DetailDPSIR.update_vars(
      vars,
      links,
      $varTypeColorScale,
      var_type_states,
      bboxes,
    );
  }

  //
  // Event Handlers
  //
  function handleEmptySpaceClicked(e) {
    if (!e.defaultPrevented) {
      // reset detail highlights
      if (DetailDPSIR.highlighting()) {
        DetailDPSIR.resetHighlights();
        dispatch("var-selected", null); // for app.svelte to reset hightlight the chunks
        return;
      }
      // reset all highlights
      console.log("empty space clicked", e);
      DetailDPSIR.resetHighlights();
      OverviewDPSIR.resetHighlights();
      Object.keys(var_type_states).forEach((key) => {
        var_type_states[key].revealed = false;
      });
      dispatch("var-selected", null); // for app.svelte to reset hightlight the chunks
      render(data, links, var_type_states);
    }
  }

  function handleVarOrLinkSelected(mentions: tMention[]) {
    console.log("varOrLink", mentions);
    dispatch("var-selected", mentions); // for App.svelte to hightlight the chunks
  }

  function handleVarTypeLinkSelected(varTypeLink: tLinkObjectOverview) {
    const var_type_source = varTypeLink.source;
    var_type_states[var_type_source].revealed = true;
    var_type_states[varTypeLink.target].revealed = true;
    render(data, links, var_type_states);
    return;
  }

  function handleOverviewVarTypeSelected(var_type: string) {
    console.log("handle overview var type selected", var_type);
    var_type_states[var_type].revealed = true;
    render(data, links, var_type_states);
    return;
  }

  function handleOverviewVarTypeUnSelected(var_type: string | null) {
    console.log("handle overview var type unselected", var_type);
    if (var_type === null) {
      Object.keys(var_type_states).forEach((key) => {
        var_type_states[key].revealed = false;
      });
    } else {
      var_type_states[var_type].revealed = false;
    }
    render(data, links, var_type_states);
    return;
  }

  // life cycle starts
  onMount(async () => {
    await tick();
    initializeRenderer();

    // calculate box size and small rectangle layout
    bboxes = DetailDPSIR.calculateBoxInfo(
      data,
      links,
      Constants.var_type_names,
      bboxes,
    );
    // console.log({ bboxes });
    render(data, links, var_type_states);
  });
</script>

<div class="container relative h-full w-full">
  <svg id={svgId} class="varbox-svg relative h-full w-full">
    <defs></defs>
  </svg>
  <button
    class="absolute right-4 top-4 z-10 rounded-md bg-gray-300 p-2 text-black transition-colors hover:bg-gray-500 hover:text-white"
    on:click={switchRenderer}
  >
    Show {isDetailMode ? "Overview" : "Full Detail"}
  </button>
  <div class="tooltip-content"></div>
</div>

<style lang="postcss">
  .container {
    max-width: 100%; /* make DPSIR full width*/
  }
  .varbox-svg {
    & .link {
      /* transition: all 0.3s; */
    }
    & .link-highlight {
      opacity: 0.8;
      filter: drop-shadow(2px 3px 2px rgba(0, 0, 0, 0.2));
    }
    & .overview-link-highlight {
      opacity: 0.8;
    }
    & .link-not-highlight {
      opacity: 0.1;
    }
    & .detail-link-not-highlight {
      opacity: 0;
      pointer-events: none;
    }
    & .line-hover {
      stroke: black;
      /* stroke-width: 3; */
      opacity: 0.8;
    }
    & .box-hover {
      stroke: black;
      stroke-width: 3;
    }
    & .clicked-box-highlight {
      stroke: black;
      stroke-width: 1;
      filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.7));
    }
    & .box-highlight {
      /* opacity: 1; */
      stroke: black;
      stroke-width: 1;
      /* filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.3)); */
    }
    & .box-not-highlight {
      opacity: 0.2;
    }
    & .box-icon-highlight {
      opacity: 1;
    }
    & .box-icon-not-highlight {
      opacity: 0.2;
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
  .tooltip-content {
    position: absolute;
    background: rgb(249, 250, 251);
    width: fit;
    white-space: nowrap;
    text-align: center;
    border-radius: 6px;
    padding: 5px 5px;
    outline: 1.5px solid gray;
    /* box-shadow: 0px 1px 2px rgba(0, 0, 0, 1); */
    margin-left: 10px;
    font-size: 1rem;
    & span {
      @apply rounded px-1 capitalize text-[#222222];
    }
  }
</style>
