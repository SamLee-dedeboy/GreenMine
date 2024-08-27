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
    tLinkObjectOverview,
    SelectedType,
  } from "../types";
  import { varTypeColorScale } from "lib/store";
  import KeywordSea from "lib/components/KeywordSea.svelte";
  // import { group } from "console";
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
  let box_states = {
    driver: { selected: false },
    pressure: { selected: false },
    state: { selected: false },
    impact: { selected: false },
    response: { selected: false },
  };
  // type SelectedType = { source: string; target: string };
  let all_selected_types:SelectedType[] = [];
  let vartypeunselected_flag = true;
  let group_name_clickable = true;
  let rectangleCoordinates = [];
  let container;
  let selectedVar: tVariable | undefined = undefined;
  // let selectedType = { source: "", target: "" };
  // let showLinks = true;
  let enable = false;
  let currentRenderer = "OverviewDPSIR";
  async function update_vars(
    vars: tDPSIR,
    links: tVisLink[],
    // showLinks: boolean,
    all_selected_types,
  ) {
    if (currentRenderer == "OverviewDPSIR") {
      Constants.var_type_names.forEach((var_type) => {
        box_states[var_type].selected = false;
      })
      OverviewDPSIR.update_vars(vars, links, $varTypeColorScale, bboxes);
    } else {
      group_name_clickable = false;
      Constants.var_type_names.forEach((var_type) => {
        box_states[var_type].selected = true;
      })
      DPSIR.update_vars(
        vars,
        links,
        $varTypeColorScale,
        all_selected_types,
        rectangleCoordinates,
        bboxes,
        group_name_clickable,
      );
    }
  }

  onMount(async () => {
    await tick();

    // calculate box info and small rectangle info
    [rectangleCoordinates, bboxes] = DPSIR.calculateBoxInfo(
      data,
      links,
      Constants.var_type_names,
      bboxes,
    );
    // console.log({rectangleCoordinates,bboxes})
    initializeRenderer(currentRenderer, all_selected_types);
  });
  // function toggleLinks() {
  //   if (enable) {
  //     showLinks = !showLinks;
  //     if (currentRenderer == "DPSIR") {
  //       DPSIR.toggleLinks(showLinks);
  //     }
  //   }
  // }

  function handleEmptySpaceClicked(e) {
    if (!e.defaultPrevented) {
      DPSIR.resetHighlights(vartypeunselected_flag);
      OverviewDPSIR.resetHighlights();
    }
  }

  function handleVarOrLinkSelected(e) {
    console.log("varOrLink", e);
    const variable: tVariable = e;
    selectedVar = variable;
    dispatch("var-selected", selectedVar); // for App.svelte to hightlight the chunks
  }
  function handleVarTypeLinkSelected(varTypeLink: tLinkObjectOverview) {
    // console.log(e)
    vartypeunselected_flag = false;
    if (varTypeLink !== null) {
      const var_type_source = varTypeLink.source;
      const var_type_target = varTypeLink.target;
      currentRenderer = "DPSIR";
      d3.select("body").selectAll(".tooltip-content").remove();
      const linkGroup = d3.select('.overview_link_group');
      // Remove all path elements (links) within the group
      linkGroup.selectAll('path').remove();

      Constants.var_type_names.forEach((var_type) => {
        if (var_type !== var_type_source && var_type !== var_type_target) {
          d3.select(`rect.bbox#` + `${var_type}`).attr("opacity", 0).attr("pointer-events", "none");
          d3.select(`text.bbox-label#` + `${var_type}` + `_label`).attr("opacity", 0);
          box_states[var_type].selected = false;
        }
        else{
          d3.select(`rect.bbox#` + `${var_type}`).remove();
          d3.select(`text.bbox-label#` + `${var_type}` + `_label`).remove();
          box_states[var_type].selected = true;
          group_name_clickable = false;
          DPSIR.drawVars(
            $varTypeColorScale,
            data[var_type],
            rectangleCoordinates[var_type],
            bboxes[var_type],
            group_name_clickable,
          );
        }
      });


      all_selected_types = [];
      all_selected_types.push({ source: varTypeLink.source, target: varTypeLink.target });
      all_selected_types.push({ source: varTypeLink.source, target: varTypeLink.source });
      all_selected_types.push({ source: varTypeLink.target, target: varTypeLink.target });
      // initializeRenderer(currentRenderer, all_selected_types);
      DPSIR.drawLinks(links, bboxes, all_selected_types);
    }
  }
  function handleOverviewVarTypeSelected(varTypeName:string) {
    // console.log("handleOverviewVarTypeSelected", e);
    if (varTypeName !== null) {
      const var_type = varTypeName;
      d3.select(`rect.bbox#` + `${var_type}`).remove();
      d3.select(`text.bbox-label#` + `${var_type}` + `_label`).remove();
      box_states[var_type].selected = true;
      group_name_clickable = true;
      DPSIR.drawVars(
        $varTypeColorScale,
        data[var_type],
        rectangleCoordinates[var_type],
        bboxes[var_type],
        group_name_clickable,
      );
      all_selected_types = [];
      Constants.var_type_names.forEach((var_type) => {
        if (box_states[var_type].selected) {
          all_selected_types.push({ source: var_type, target: var_type });
        }
      });
      DPSIR.drawLinks(links, bboxes, all_selected_types);
    }
  }
  function handleOverviewVarTypeUnSelected(varTypeName:string) {
    // console.log("unselected",e);
    if (varTypeName !== null) {
      const var_type = varTypeName;
      const group = d3.select(`g.${var_type}_region`);
      group.selectAll("g.tag").remove();
      group.selectAll("image").remove();
      d3.select(`text.bbox-label#` + `${var_type}` + `_label`).remove();
      box_states[var_type].selected = false;
      OverviewDPSIR.drawVars(data[var_type], bboxes[var_type]);
    } else {
      Constants.var_type_names.forEach((var_type) => {
        if (box_states[var_type].selected) {
          const group = d3.select(`g.${var_type}_region`);
          group.selectAll("g.tag").remove();
          group.selectAll("image").remove();
          d3.select(`text.bbox-label#` + `${var_type}` + `_label`).remove();
          box_states[var_type].selected = false;
          OverviewDPSIR.drawVars(data[var_type], bboxes[var_type]);
        }
      });
    }
  }
  function enableLinks(e) {
    enable = e;
  }

  function switchRenderer() {
    currentRenderer =
      currentRenderer === "OverviewDPSIR" ? "DPSIR" : "OverviewDPSIR";

    if (currentRenderer === "DPSIR") {
      // all_selected_types = OverviewDPSIR.extractUniquePairs(links);
      all_selected_types = [];
      vartypeunselected_flag = false;
      console.log("VarTypeUnSelected will not be triggered in detail mode");
    } else {
      all_selected_types = [];
      vartypeunselected_flag = true;
      console.log("VarTypeUnSelected will be triggered in overview mode");
    }
    initializeRenderer(currentRenderer, all_selected_types);
  }

  function initializeRenderer(renderer, all_selected_types) {
    d3.select(`#${svgId}`).selectAll("*").remove();
    DPSIR.init(svgId, utilities);
    OverviewDPSIR.init(svgId);

    DPSIR.on("VarOrLinkSelected", handleVarOrLinkSelected);
    DPSIR.on("VarTypeUnSelected", handleOverviewVarTypeUnSelected);
    // Remove tooltip if it exists
    d3.select("body").selectAll(".tooltip-content").remove();
    OverviewDPSIR.on("VarTypeLinkSelected", handleVarTypeLinkSelected);
    // OverviewDPSIR.on("VarTypeHovered", handleOverviewVarTypeHovered);
    OverviewDPSIR.on("VarTypeSelected", handleOverviewVarTypeSelected);
    document
      .querySelector(`#${svgId}`)
      ?.addEventListener("click", handleEmptySpaceClicked);
    update_vars(data, links, all_selected_types);
  }

  function handleOverviewVarTypeHovered(var_type: string) {}
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
    class="absolute right-4 top-4  z-10 rounded-md bg-gray-300 p-2 text-black transition-colors hover:bg-gray-500 hover:text-white"
    on:click={switchRenderer}
  >
    Switch to {currentRenderer === "OverviewDPSIR" ? "DPSIR" : "Overview"}
  </button>
  <svg id={svgId} class="varbox-svg absolute inset-0 h-full w-full">
    <defs></defs>
  </svg>
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
    & .overview-link-highlight {
      opacity: 0.8;
    }
    & .link-not-highlight {
      opacity: 0.1;
    }
    /* & .not-show-link-not-highlight {
      opacity: 0;
    } */
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
