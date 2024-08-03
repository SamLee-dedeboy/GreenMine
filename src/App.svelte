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
    tVarTypeDef,
    tServerPromptData,
    tServerPipelineData,
  } from "lib/types";
  import DPSIR from "lib/views/DPSIR.svelte";
  import BrowserBlockingPage from "lib/views/BrowserBlockingPage.svelte";
  import * as utils from "lib/utils";
  import { server_address } from "lib/constants";
  import * as d3 from "d3";
  import { varTypeColorScale } from "lib/store";
  import Prompts from "lib/components/Prompts.svelte";

  let interview_data: tTranscript[] | undefined = undefined;
  let interview_viewer_component;
  let dataset: tServerData | undefined = undefined;
  let prompt_data: tServerPromptData | undefined = undefined;
  let pipeline_result: tServerPipelineData | undefined = undefined;
  let var_data: tDPSIR | undefined = undefined;
  let vis_links: tVisLink[] | undefined = undefined;
  let summary_interviews: tChunk[] | undefined = undefined;
  let data_loading: boolean = true;
  let show_dpsir: boolean = true;
  let show_prompts: boolean = false;
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
        dataset = res;
        interview_data = res.interviews;
        prompt_data = res.prompts;
        pipeline_result = res.pipeline_result;
        console.log({pipeline_result})
        data_loading = false;
        // Process each group of variables to add factor_type
        Object.keys(res.nodes).forEach((varType: string) => {
          const nodes: tVariableType = res.nodes[varType];
          const defs: tVarTypeDef = res.variable_definitions[varType];
          if (!var_data) var_data = {};
          var_data[varType] = utils.integrateTypes(nodes, defs);
        });
        var_data = var_data;
        console.log({ var_data });
        // vis_links = utils.link_to_vis_link(res.links);
        vis_links = utils.link_to_vis_link(res.pipeline_links);
        $varTypeColorScale = d3
          .scaleOrdinal()
          .domain(Object.keys(var_data!))
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
        console.log({ chunk_graph });
        // timeline_data = res.reports;
        keyword_data = {
          keyword_coordinates: res.v1.keyword_coordinates,
          keyword_statistics: res.v1.keyword_statistics,
        };
      });
  }
  function handleEvidenceSelected(e) {
    console.log("evidence selected", e.detail);
    interview_viewer_component.handleEvidenceSelected(e.detail);
  }
  function handleVarOrLinkSelected(e) {
    if (!interview_data) return;
    //deselect var/link
    if (e.detail === null) {
      interview_viewer_component.highlight_chunks(null); //dehighlight chunks
      summary_interviews = []; //clear summary view
    } else {
      const chunks: tMention[] = e.detail.mentions;
      console.log({ chunks });
      interview_viewer_component.highlight_chunks(chunks);
      // console.log(interview_data);
      const flattenedInterviewData = interview_data.flatMap(
        (item) => item.data,
      );
      // console.log(chunks);
      const enhanceChunks = (chunks: any[]): any[] => {
        return chunks
          .map((chunk) => {
            const match = flattenedInterviewData.find(
              (item) => item.id === chunk.chunk_id,
            );

            if (match) {
              return {
                id: chunk.chunk_id,
                conversation: chunk.conversation,
                emotion: match.emotion,
                title: match.title,
                topic: match.topic,
                raw_keywords: match.raw_keywords,
              };
            } else {
              console.error(`No match found for chunk_id: ${chunk.chunk_id}`);
              return null;
            }
          })
          .filter((chunk) => chunk !== null);
      };

      summary_interviews = enhanceChunks(chunks);
    }
  }
  function handleRemoveVarType(e){
    console.log("e.detail", e.detail)
    const { id, var_type } = e.detail;
    if(pipeline_result === undefined) return;
  
    pipeline_result.identify_var_types = pipeline_result.identify_var_types.map(item => {
      if (item.id === id) {
        return {
          ...item,
          identify_var_types_result: item.identify_var_types_result.filter(
            result => result.var_type !== var_type
          )
        };
      }
      return item;
    });
    //save to backend

    
  }
  function handleAddVarType(e){
    console.log("e.detail", e.detail);
    const { id, newdata } = e.detail;
    if(pipeline_result === undefined) return;
    let temp;
    pipeline_result.identify_var_types = pipeline_result.identify_var_types.map(item => {
      if (item.id === id) {
        console.log(newdata.var_type);
        
        const existingIndex = item.identify_var_types_result.findIndex(
          result => result.var_type && result.var_type === newdata.var_type
        );

        const updatedNewData = { ...newdata, var_type: newdata.var_type };

        if (existingIndex !== -1) {
          // Replace the existing element
          item.identify_var_types_result[existingIndex] = updatedNewData;
        } else {
          // Add the new element to the array
          item.identify_var_types_result.push(updatedNewData);
        }
      }
      return item;
    });
    //save to backend
  }
  onMount(async () => {
    await fetchTest();
    await fetchData();
  });
  setContext("fetchData", fetchData);
</script>

<main class="h-full px-1">
  {#if !fetch_success}
    <BrowserBlockingPage />
  {:else}
    <div class="page flex h-full space-x-1">
      {#if show_prompts}
        <div
          class="absolute left-1/2 top-1/2 z-10 flex w-fit -translate-x-1/2 -translate-y-1/2 items-stretch rounded-md bg-gray-200 pt-6 shadow-md outline outline-1 outline-gray-300"
          use:draggable
        >
          <Prompts
            data={prompt_data}
            {pipeline_result}
            on:close={() => (show_prompts = false)}
            on:var_types_evidence= {handleEvidenceSelected}
            on:remove_var_type = {handleRemoveVarType}
            on:add_var_type = {handleAddVarType}
            
          ></Prompts>
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
        ></ControlPanel>
      </div>
      <div
        class="flex h-full w-[75%] flex-1 flex-col items-center justify-center"
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
            <DPSIR
              data={var_data}
              links={vis_links}
              on:var-selected={handleVarOrLinkSelected}
            ></DPSIR>
          {:else}
            <SimGraph topic_data={chunk_graph} {keyword_data}></SimGraph>
          {/if}
        </div>
      </div>
      <div class="flex h-full w-full basis-[20%] flex-col">
        <!-- <div class="gap-y-1">
          <SummaryView {summary_interviews} id="statistics" />
        </div> -->
        <div class="interview-viewer-container relative w-full grow">
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
