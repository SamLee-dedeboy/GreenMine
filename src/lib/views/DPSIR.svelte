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
    driver: { center: [58, 90], size: [0, 0] },
    pressure: { center: [170, 30], size: [0, 0] },
    state: { center: [270, 75], size: [0, 0] },
    impact: { center: [240, 190], size: [0, 0] },
    response: { center: [70, 210], size: [0, 0] },
  };
  let box_states = {
    driver: { revealed: false },
    pressure: { revealed: false },
    state: { revealed: false },
    impact: { revealed: false },
    response: { revealed: false },
  };
  let varTypeLinks: tLinkObjectOverview[] = [];
  let all_selected_types: SelectedType[] = [];
  let vartypeunselected_flag = true;
  let group_name_clickable = true;
  let rectangleCoordinates = [];
  let container;
  let selectedVar: tVariable | undefined = undefined;
  // let selectedType = { source: "", target: "" };
  // let showLinks = true;
  let enable = false;
  let currentRenderer = "OverviewDPSIR";
  $: isDetailMode = Object.values(box_states).every(state => state.revealed);
  async function update_vars(
    vars: tDPSIR,
    links: tVisLink[],
    // showLinks: boolean,
    all_selected_types,
  ) {

    if (Object.values(box_states).every(state => state.revealed)) {
      group_name_clickable = false;
      // Constants.var_type_names.forEach((var_type) => {
      //   box_states[var_type].revealed = true;
      // });
      DPSIR.update_vars(
        vars,
        links,
        $varTypeColorScale,
        all_selected_types,
        rectangleCoordinates,
        bboxes,
        group_name_clickable,
      );
    }else{
      Constants.var_type_names.forEach((var_type) => {
        box_states[var_type].revealed = false;
      });
      OverviewDPSIR.update_vars(vars, links, $varTypeColorScale, bboxes);
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
    initializeRenderer(all_selected_types);
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
    // console.log("varOrLink", e);
    const variable: tVariable = e;
    selectedVar = variable;
    dispatch("var-selected", selectedVar); // for App.svelte to hightlight the chunks
  }
  function handleVarTypeLinkSelected(varTypeLink: tLinkObjectOverview) {
    // console.log("selected", varTypeLink);
    // vartypeunselected_flag = false;
    if (varTypeLink !== null) {
      const var_type_source = varTypeLink.source;
      const var_type_target = varTypeLink.target;
      
      const linkGroup = d3.select(".overview_link_group");
      linkGroup.select(`path.link#${var_type_source}-${var_type_target}`).remove();
      d3.select("body").selectAll(".tooltip-content").remove();
      Constants.var_type_names.forEach((var_type) => {
        if (var_type === var_type_source || var_type === var_type_target) {          
          d3.select(`rect.bbox#` + `${var_type}`).remove();
          d3.select(`text.bbox-label#` + `${var_type}` + `_label`).remove();
          box_states[var_type].revealed = true;
          // group_name_clickable = false;
          DPSIR.drawVars(
            $varTypeColorScale,
            data[var_type],
            rectangleCoordinates[var_type],
            bboxes[var_type],
            group_name_clickable,
          );

          
        }
      });


      all_selected_types.push(
        { source: varTypeLink.source, target: varTypeLink.target },
        { source: varTypeLink.source, target: varTypeLink.source },
        { source: varTypeLink.target, target: varTypeLink.target },
      );
      DPSIR.drawLinks(links, bboxes, all_selected_types);
    }
  }

  //overview -> detail
  function handleOverviewVarTypeSelected(var_type: string) {
    if (var_type !== null) {
      // d3.select("g.detail-bbox-group").select(`g.${var_type}`).remove();
      box_states[var_type].revealed = true;
      group_name_clickable = true;
      DPSIR.drawVars(
        $varTypeColorScale,
        data[var_type],
        rectangleCoordinates[var_type],
        bboxes[var_type],
        group_name_clickable,
      );
      all_selected_types = [];
      const revealedTypes = Constants.var_type_names.filter(type => box_states[type].revealed);
      const linkGroup = d3.select(".overview_link_group");
      for (let i = 0; i < revealedTypes.length; i++) {
        for (let j = 0; j < revealedTypes.length; j++) {
          all_selected_types.push({
            source: revealedTypes[i],
            target: revealedTypes[j]
          });
          if(revealedTypes[i] !== revealedTypes[j]){            
              linkGroup.select(`path.link#${revealedTypes[i]}-${revealedTypes[j]}`).remove();
          }
        }
      }
      DPSIR.drawLinks(links, bboxes, all_selected_types);
    }
  }

  //detail -> overview
  function handleOverviewVarTypeUnSelected(var_type_name: string | null) {
    function removeVarTypeBbox(_var_type) {
      d3.select("g.detail-bbox-group").selectAll(`g.${_var_type}`).selectAll("*").remove();
      d3.select("g.detail-tag-group").selectAll(`g.${_var_type}`).selectAll("*").remove();
      box_states[_var_type].revealed = false;
      OverviewDPSIR.drawVars(data[_var_type], bboxes[_var_type]);
    }
    function removeVarTypeLinks(_var_type) {
      const detail_link_group = d3.select(".detail-link-group");
      detail_link_group.selectAll(`path.link.${_var_type}-${_var_type}, path.link[class*="${_var_type}-"], path.link[class*="-${_var_type}"]`).remove();
      all_selected_types = all_selected_types.filter(
        (type) => type.source !== _var_type && type.target !== _var_type,
      );
    }

    // console.log("unselected", var_type_name);
    if (var_type_name !== null) {
      removeVarTypeBbox(var_type_name);
      removeVarTypeLinks(var_type_name);
    } else {
      Constants.var_type_names.forEach((_var_type) => {
        if (box_states[_var_type].revealed) {
          console.log("remove", _var_type);
          removeVarTypeBbox(_var_type);
          removeVarTypeLinks(_var_type);
        }
      });
    }
    OverviewDPSIR.drawLinks(links, bboxes);
  }
  function enableLinks(e) {
    enable = e;
  }

  function switchRenderer() {
    // detail mode
    const allRevealed = Object.values(box_states).every(
      (state) => state.revealed,
    );

    // if it is in detail mode, then switch to overview mode
    if (allRevealed) {
      Object.keys(box_states).forEach(key => {
        box_states[key].revealed = false;
      });
      all_selected_types = [];
      vartypeunselected_flag = true;
      console.log("VarTypeUnSelected will be triggered in overview mode");
    } 
    else {
      Object.keys(box_states).forEach(key => {
        box_states[key].revealed = true;
      });
      all_selected_types = OverviewDPSIR.extractUniquePairs(links);
      // all_selected_types = [];
      vartypeunselected_flag = false;
      console.log("VarTypeUnSelected will not be triggered in detail mode");
    }
    initializeRenderer(all_selected_types);
  }

  function initializeRenderer(all_selected_types) {
    d3.select(`#${svgId}`).selectAll("*").remove();
    OverviewDPSIR.init(svgId);
    DPSIR.init(svgId, utilities);

    DPSIR.on("VarOrLinkSelected", handleVarOrLinkSelected);
    DPSIR.on("VarTypeUnSelected", handleOverviewVarTypeUnSelected);
    // Remove tooltip if it exists
    // d3.select("body").selectAll(".tooltip-content").remove();
    OverviewDPSIR.on("VarTypeLinkSelected", handleVarTypeLinkSelected);
    OverviewDPSIR.on("VarTypeSelected", handleOverviewVarTypeSelected);
    document
      .querySelector(`#${svgId}`)
      ?.addEventListener("click", handleEmptySpaceClicked);
    update_vars(data, links, all_selected_types);
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
