<script lang="ts">
  import { onMount, setContext } from "svelte";
  import InterviewViewer from "lib/views/InterviewViewer_v2.svelte";
  import SummaryView from "lib/components/ScatterSummary.svelte";
  import SimGraph from "lib/v1/SimGraph.svelte";
  import ControlPanel from "lib/components/ControlPanel.svelte";
  import { draggable } from "lib/utils/draggable";
  import type {
    tMention,
    tVariableType,
    tTranscript,
    tLink,
    tVisLink,
    tServerData,
    tVariable,
    tChunk,
    tDPSIR,
    tServerPromptData,
    tServerPipelineData,
    tVersionInfo,
  } from "lib/types";
  import DPSIR from "lib/views/DPSIR.svelte";
  import BrowserBlockingPage from "lib/views/BrowserBlockingPage.svelte";
  import * as utils from "lib/utils";
  import { server_address, stepMap } from "lib/constants";
  import * as d3 from "d3";
  import { varTypeColorScale } from "lib/store";
  import Prompts from "lib/views/Prompts.svelte";
  import KeywordSeaViewer from "lib/views/KeywordSeaViewer.svelte";

  let interview_data: tTranscript[];
  let interview_viewer_component;
  let prompt_data: tServerPromptData;
  let pipeline_result: tServerPipelineData;
  let pipeline_ids: string[] = [];
  let var_data: tDPSIR;
  let vis_links: tVisLink[];
  let data_loading: boolean = true;
  let show_dpsir: boolean = true;
  let show_prompts: boolean = false;
  let show_keywordsea: boolean = false;
  let show_step: number = 1;
  let current_prompt_data:any;
  // let versions: string[] = [];
  let log_record: any;
  let selectedTitle :string;
  let titleOptions:string[] = [];

  let versionsCount: { [key: string]: tVersionInfo } = {};
  let step: string = "var_type";
  // let new_version = "";
  let unsaved_versions: Set<string> = new Set();

  // pipeline
  // v1
  let keyword_data: any;
  let chunk_graph: any;
  let chunk_coordinates: any;
  // let timeline_data: any;

  let fetch_success = false;
  $: latestVersion = versionsCount[step] 
                    ? versionsCount[step].versions[versionsCount[step].versions.length - 1]
                    : "v0";

  function fetchTest() {
    // fetch data from backend
    fetch(server_address + "/test/").then((res) => {
      console.log({ res });
      fetch_success = res.ok;
    });
  }
  function fetchData(){
    fetch(`${server_address}/v1_data/`)
      .then((res) => res.json())
      .then((res: tServerData) => {
        console.log({ res });
        interview_data = res.interviews;
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
      })
  }
  function fetchVersionsCount(step: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fetch(`${server_address}/pipeline/${step}/all_versions`)
        .then(res => res.json())
        .then(data => {
          versionsCount = { 
            ...versionsCount, 
            [step]: {
              total_versions: data.total_versions,
              versions: data.versions
            }
          };
          titleOptions = data.versions.map(version => "version " + version.slice(1));
          console.log("Versions count:", versionsCount);
          resolve();
        })
        .catch(error => {
          console.error(`Error fetching versions count for ${step}:`, error);
          reject(error);
        });
    });
  }
  function fetchPipelineData(step: string, version: string) {
  if (!versionsCount[step]) {
    console.error(`No version information available for step: ${step}`);
    return Promise.reject(`No version information available for step: ${step}`);
  }

  if (!versionsCount[step].versions.includes(version) && version !== "v0") {
    console.error(`Version ${version} not found for step: ${step}`);
    return Promise.reject(`Version ${version} not found for step: ${step}`);
  }

  return fetch(`${server_address}/pipeline/${step}/${version}/`)
    .then(res => res.json())
    .then((res: tServerData) => {
      // For saved versions, update both prompt_data and pipeline_result
      prompt_data = res.prompts;
      pipeline_result = res.pipeline_result;
      updateCurrentData(step);
      console.log(`Fetched data for step: ${step}, version: ${version}`);
    })
    .catch(error => {
      console.error(`Error fetching pipeline data for step ${step}, version ${version}:`, error);
    });
}
  function updateCurrentData(step: string) {
    if (step === 'var_type' && show_step === 1) {      
      pipeline_ids = pipeline_result.identify_var_types.map(item => item.id);
    } else if (step === 'var' && show_step === 2) {
      pipeline_ids = pipeline_result.identify_vars.map(item => item.id);
    } else if (step === 'link' && show_step === 3) {
      pipeline_ids = pipeline_result.identify_links.map(item => item.id);
    }
  }

  function fetchDPSIRData(link_version:string = "v0"){
    data_loading = true;
    fetch(`${server_address}/dpsir/${link_version}/`)
      .then((res) => res.json())
      .then((res) => {
          var_data = res.DPSIR_data;
          vis_links = utils.link_to_vis_link(res.pipeline_links);
          console.log(vis_links)
          console.log(res.pipeline_links)
          const var_types = Object.keys(var_data);
          $varTypeColorScale = d3
            .scaleOrdinal()
            .domain(var_types)
            .range(d3.schemeSet2);
          data_loading = false;
      })
  }

  function updateVersion(e, key: string) {
    if (key === "version_selected") {
      let v = e.detail.version;   
        if(!unsaved_versions.has(v)){
          fetchPipelineData(step, v)
        } else {
          console.log("This version is not saved yet")
          fetchPipelineData(step, "v0")
          .then(() => {
            // Ensure pipeline_result is empty after fetching
            pipeline_result = {
              identify_var_types: [],
              identify_vars: [],
              identify_links: []
            };
            console.log("New version added with v0 prompt and empty pipeline result");
          });
        }
    } else if (key === "new_verison_added") {  
      versionsCount[step].versions.push(e.detail.version);
      versionsCount[step].total_versions += 1;
      console.log(versionsCount)
      unsaved_versions.add(e.detail.version);
      // assign the v0 prompt and empty pipeline data to the new version
      fetchPipelineData(step, "v0")
      .then(() => {
        // Ensure pipeline_result is empty after fetching
        pipeline_result = {
          identify_var_types: [],
          identify_vars: [],
          identify_links: []
        };
        console.log("New version added with v0 prompt and empty pipeline result");
      });
      
    } else if (key === "new_version_saved") {
      console.log("saved new version");
      unsaved_versions.delete(e.detail.version);
      let new_version_title = "version "+(e.detail.version).slice(1);
      if (!titleOptions.includes(new_version_title)) {
          titleOptions = [...titleOptions, new_version_title];          
          console.log(titleOptions)
      }
    }
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
  function handleHighlightChunks(e) {
    console.log("handle highlight chunks", e.detail);
    if (!interview_data) return;
    if (e.detail === null) {
      interview_viewer_component.highlight_chunks(null); //dehighlight chunks
    } else {
      interview_viewer_component.highlight_chunks(e.detail as tMention[]);
    }
  }
  function handleStepChange(newStep: number) {
    // step change
    // fetch versions count and fetchpipeline data based on the latest version
    show_step = newStep; // number
    step = stepMap[show_step];//string
    if (step) {
      // data_loading = true;
      fetchVersionsCount(step)
        .then(() => fetchPipelineData(step, latestVersion))
        .then(() => {
          updateCurrentData(step);
        })
        .finally(() => {
          data_loading = false;
        });
    }
  }

  onMount(async () => {
    await fetchTest();
    await fetchData();
    await fetchDPSIRData();
    await fetchVersionsCount(step);    
    await fetchPipelineData(step, latestVersion);
    updateCurrentData(step)
    // data_loading = false;
  });

  setContext("fetchData", fetchData);
  setContext('fetchPipelineData', fetchPipelineData);
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
            data={prompt_data}
            {pipeline_result}
            {pipeline_ids}
            {selectedTitle}
            {titleOptions}
            {show_step}
            {versionsCount}
            on:step_change={(e) => handleStepChange(e.detail)}
            on:close={() => (show_prompts = false)}
            on:navigate_evidence={handleEvidenceSelected}
            on:version_selected={(e) => updateVersion(e, "version_selected")}
            on:version_changed={(e) => updateVersion(e, "version_changed")} 
            on:new_verison_added={(e) => updateVersion(e, "new_verison_added")}
            on:new_version_saved={(e) => {
              updateVersion(e, "new_version_saved");
              fetchVersionsCount(step);
            }}
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
            on:keywordSelected={handleHighlightChunks}
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
            <DPSIR
              data={var_data}
              links={vis_links}
              on:var-selected={handleHighlightChunks}
            ></DPSIR>
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
