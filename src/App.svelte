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
  } from "lib/types";
  import DPSIR from "lib/views/DPSIR.svelte";
  import BrowserBlockingPage from "lib/views/BrowserBlockingPage.svelte";
  import * as utils from "lib/utils";
  import { server_address } from "lib/constants";
  import * as d3 from "d3";
  import { varTypeColorScale } from "lib/store";
  import Prompts from "lib/views/Prompts.svelte";
  import KeywordSeaViewer from "lib/views/KeywordSeaViewer.svelte";
  // import { version } from "os";

  let interview_data: tTranscript[];
  let interview_viewer_component;
  let prompt_data: tServerPromptData;
  let pipeline_result: tServerPipelineData;
  let versionedPipelineResults: { [key: string]: tServerPipelineData } = {};
  let var_data: tDPSIR;
  let vis_links: tVisLink[];
  let data_loading: boolean = true;
  let show_dpsir: boolean = true;
  let show_prompts: boolean = false;
  let show_keywordsea: boolean = false;
  // let versions: string[] = [];
  let log_record: any;
  let selectedTitle = "baseline";
  let titleOptions = ["baseline"];
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
      console.log({ res });
      fetch_success = res.ok;
    });
  }

  function fetchData() {
    fetch(`${server_address}/data/`)
      .then((res) => res.json())
      .then((res: tServerData) => {
        console.log({ res });
        interview_data = res.interviews;
        prompt_data = res.prompts;
        versionedPipelineResults["baseline"] = res.pipeline_result;
        pipeline_result = res.pipeline_result; //set the initial pipeline result
        // console.log({pipeline_result})
        data_loading = false;
        var_data = res.DPSIR_data;
        // vis_links = utils.link_to_vis_link(res.links);
        vis_links = utils.link_to_vis_link(res.pipeline_links);
        // console.log(vis_links)
        // console.log(res.pipeline_links)
        const var_types = Object.keys(var_data);
        $varTypeColorScale = d3
          .scaleOrdinal()
          .domain(var_types)
          .range(d3.schemeSet2);

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

  function fetchVersionData(version: string) {
    data_loading = true;
    fetch(`${server_address}/data/${version}/`)
      .then((res) => res.json())
      .then((versionData: tServerData) => {
        versionedPipelineResults[version] = versionData.pipeline_result;
        pipeline_result = versionData.pipeline_result;
        // console.log(`Data fetched for version: ${version}`);
        data_loading = false;
      })
      .catch((error) => {
        console.error(`Error fetching data for version ${version}:`, error);
        data_loading = false;
      });
  }

  function updateVersion(e, key: string) {
    if (key === "version_changed") {
      selectedTitle = e.detail;
      if (versionedPipelineResults[selectedTitle]) {
        pipeline_result = versionedPipelineResults[selectedTitle];
      } else {
        console.warn("no data for this version");
      }
    } else if (key === "new_verison_added") {
      let new_version = e.detail;
      titleOptions = [...titleOptions, new_version];
      // console.log("updated titleOptions is", titleOptions);
      // console.warn(`fetching data for version: ${new_version}`);
      fetchVersionData(new_version);
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
  function handleVarOrLinkSelected(e) {
    if (!interview_data) return;
    //deselect var/link
    if (e.detail === null) {
      interview_viewer_component.highlight_chunks(null); //dehighlight chunks
    } else {
      const chunk_mentions: tMention[] = e.detail.mentions;
      interview_viewer_component.highlight_chunks(chunk_mentions);
    }
  }
  function handleRemoveVarType(e) {
    // console.log("e.detail", e.detail)
    const { id, variable } = e.detail;
    if (pipeline_result === undefined) return;

    pipeline_result.identify_var_types = pipeline_result.identify_var_types.map(
      (item) => {
        if (item.id === id) {
          return {
            ...item,
            identify_var_types_result: item.identify_var_types_result.filter(
              (result) => result.var_type !== variable.var_type,
            ),
          };
        }
        return item;
      },
    );
  }
  function handleAddVarType(e) {
    // console.log("e.detail", e.detail);
    const { id, variable } = e.detail;
    if (pipeline_result === undefined) return;
    pipeline_result.identify_var_types = pipeline_result.identify_var_types.map(
      (item) => {
        if (item.id === id) {
          // console.log(newdata.var_type);
          const updatedNewData = { ...variable, var_type: variable.var_type };
          item.identify_var_types_result.push(updatedNewData);
        }
        return item;
      },
    );
  }

  onMount(async () => {
    await fetchTest();
    await fetchData();
  });

  setContext("fetchData", fetchData);
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
            {selectedTitle}
            {titleOptions}
            on:close={() => (show_prompts = false)}
            on:navigate_evidence={handleEvidenceSelected}
            on:remove_var_type={handleRemoveVarType}
            on:add_var_type={handleAddVarType}
            on:versions_changed={(e) => updateVersion(e, "versions_changed")}
            on:new_verison_added={(e) => updateVersion(e, "new_verison_added")}
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
          {#if data_loading}
            <div>Data Loading...</div>
          {/if}
          {#if show_dpsir}
            {#if data_loading}
              <div></div>
            {:else}
              <DPSIR
                data={var_data}
                links={vis_links}
                on:var-selected={handleVarOrLinkSelected}
              ></DPSIR>
            {/if}
          {:else}
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
