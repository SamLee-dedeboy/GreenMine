<script lang="ts">
  import { onMount, setContext } from "svelte";
  import InterviewViewer from "lib/views/InterviewViewer_v2.svelte";
  import SummaryView from "lib/components/ScatterSummary.svelte";
  import SimGraph from "lib/v1/SimGraph.svelte";
  import ControlPanel from "lib/components/ControlPanel.svelte";
  import { draggable } from "lib/utils/draggable";
  import type {
    tMention,
    tTranscript,
    tVisLink,
    tServerData,
    tServerDataDPSIR,
    tDPSIR,
    tVersionInfo,
  } from "lib/types";
  import DPSIR from "lib/views/DPSIR.svelte";
  import BrowserBlockingPage from "lib/views/BrowserBlockingPage.svelte";
  import * as utils from "lib/utils";
  import { server_address } from "lib/constants";
  import * as d3 from "d3";
  import { varTypeColorScale } from "lib/store";
  import Prompts from "lib/views/Prompts.svelte";
  import KeywordSeaViewer from "lib/views/KeywordSeaViewer.svelte";

  let interview_data: tTranscript[];
  let interview_ids: string[];
  let interview_viewer_component;

  let var_data: tDPSIR;
  let vis_links: tVisLink[];
  let data_loading: boolean = true;
  let show_dpsir: boolean = true;
  let show_prompts: boolean = false;
  let show_keywordsea: boolean = false;
  // let selectedTitle: string;
  let versionsCount: { [key: string]: tVersionInfo } = {};

  // pipeline
  // v1
  let keyword_data: any;
  let chunk_graph: any;
  let chunk_coordinates: any;
  // let timeline_data: any;

  let fetch_success = false;

  function fetchTest() {
    // fetch data from backend
    fetch(server_address + "/test/").then((res) => {
      // console.log({ res });
      fetch_success = res.ok;
    });
  }
  function fetchData() {
    fetch(`${server_address}/v1_data/`)
      .then((res) => res.json())
      .then((res: tServerData) => {
        // console.log({ res });
        interview_data = res.interviews;
        interview_ids = interview_data.flatMap(file => 
          file.data.map(interview => interview.id)
        );
        interview_ids.sort((a, b) => {
          const [fileA, numA] = a.split('_');
          const [fileB, numB] = b.split('_');
          
          // First, compare the file names (N1, N2, etc.)
          const fileComparison = fileA.localeCompare(fileB, undefined, {numeric: true});
          if (fileComparison !== 0) {
            return fileComparison;
          }
          // If file names are the same, compare the numbers after the underscore
          return Number(numA) - Number(numB);
        });
        // data_loading = false;
        // v1
        // report_data = res.reports
        chunk_coordinates = res.v1.topic_tsnes;
        chunk_graph = utils.link_to_graph(
          res.v1.chunk_links,
          res.v1.chunk_nodes,
          0.91,
          chunk_coordinates,
        );
        // timeline_data = res.reports;
        keyword_data = {
          keyword_coordinates: res.v1.keyword_coordinates,
          keyword_statistics: res.v1.keyword_statistics,
        };
      });
  }

  function fetchDPSIRData(link_version: string = "v0") {
    data_loading = true;
    fetch(`${server_address}/dpsir/${link_version}/`)
      .then((res) => res.json())
      .then((res: tServerDataDPSIR) => {
        var_data = res.DPSIR_data;
        vis_links = utils.link_to_vis_link(res.pipeline_links);
        const var_types = Object.keys(var_data);
        $varTypeColorScale = d3
          .scaleOrdinal()
          .domain(var_types)
          .range(d3.schemeSet2);
        data_loading = false;
      });
  }

  function handleEvidenceSelected(e) {
    // interview_viewer_component.handleEvidenceSelected(e.detail);
    const { chunk_id, evidence, explanation } = e.detail;
    interview_viewer_component.handleEvidenceSelected(
      chunk_id,
      evidence,
      explanation,
    );
  }
  function handleHighlightChunks(mentions: tMention | null) {
    console.log("handle highlight chunks", mentions);
    if (!interview_data) return;
    interview_viewer_component.highlight_chunks(mentions); //dehighlight chunks
    // if (mentions === null) {
    //   interview_viewer_component.highlight_chunks(null); //dehighlight chunks
    // } else {
    //   interview_viewer_component.highlight_chunks(e.detail as tMention[]);
    // }
  }

  onMount(async () => {
    await fetchTest();
    await fetchData();
    await fetchDPSIRData();
  });

  setContext("fetchData", fetchData);
  setContext("handleHighlightChunks", handleHighlightChunks);
</script>

<main class="h-full w-full px-1">
  {#if !fetch_success}
    <BrowserBlockingPage />
  {:else}
    <div class="page flex h-full space-x-1">
      {#if show_prompts}
        <div
          class="absolute left-1/4 top-1/2 z-10 flex h-[80vh] w-[70vw] min-w-[85rem] -translate-x-1/4 -translate-y-1/2 items-stretch rounded-md bg-gray-200 pt-6 shadow-md outline outline-1 outline-gray-300"
          use:draggable
        >
          <Prompts
            {interview_ids}
            {versionsCount}
            on:close={() => (show_prompts = false)}
            on:navigate_evidence={handleEvidenceSelected}
          ></Prompts>
        </div>
      {/if}
      {#if show_keywordsea}
        <div
          class="absolute left-1/4 top-1/2 z-10 flex h-[80vh] w-[70vw] min-w-[85rem] -translate-x-1/4 -translate-y-1/2 items-stretch overflow-hidden rounded-md bg-gray-200 pt-[3rem] shadow-md outline outline-1 outline-gray-300"
          use:draggable
        >
          <KeywordSeaViewer
            data={var_data}
            on:close={() => (show_keywordsea = false)}
          ></KeywordSeaViewer>
        </div>
      {/if}
      <div
        class="ml-1 mt-2 flex flex-col bg-gray-200 pt-2 outline-double outline-2 outline-gray-300"
        use:draggable
      >
        <ControlPanel
          on:toggle-viz={() => (show_dpsir = !show_dpsir)}
          on:toggle-prompt={() => {
            show_prompts = !show_prompts;
          }}
          on:toggle-keywordsea={() => {
            show_keywordsea = !show_keywordsea;
          }}
        ></ControlPanel>
      </div>
      <div
        class="z-10 flex h-full w-[75%] flex-col items-center justify-center"
      >
        <div class="relative h-full w-full">
          <!-- <div
            class="title absolute left-6 top-1 w-fit rounded px-4 py-4 text-left text-sky-600"
          >
            <span>Sea of</span> <br />
            <span class="title-hidden absolute mt-[-25px] h-fit">Voices</span>
          </div> -->

          <!-- these cases are mutual, but writing it this way has less nesting -->
          {#if data_loading}
            <div>Data Loading...</div>
          {/if}
          {#if !data_loading && show_dpsir}
            <DPSIR data={var_data} links={vis_links}></DPSIR>
          {/if}
          {#if !data_loading && !show_dpsir}
            <SimGraph topic_data={chunk_graph} {keyword_data}></SimGraph>
          {/if}
        </div>
      </div>
      <div class="flex h-full grow flex-col">
        <div
          class="interview-viewer-container relative w-full grow bg-[#fefbf1]"
        >
          {#if data_loading}
            <div>Data Loading...</div>
          {:else}
            <InterviewViewer
              bind:this={interview_viewer_component}
              data={interview_data}
            ></InterviewViewer>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</main>

<style lang="postcss">
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
  /* .box{
    display: flex;
    flex-direction: column;
    gap: 1rem;
  } */
</style>
