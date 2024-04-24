<script lang="ts">
  import { onMount } from "svelte";
  import InterviewViewer from "lib/views/InterviewViewer.svelte";
  import SummaryView from "lib/components/ScatterSumMary.svelte";
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
  } from "lib/types";
  import Varbox from "lib/views/Varbox.svelte";
  import BrowserBlockingPage from "lib/views/BrowserBlockingPage.svelte";
  import * as utils from "lib/utils";

  const server_address = "http://localhost:5000";
  // export const server_address = "http://infovis.cs.ucdavis.edu/lyudao/api";

  let interview_data: tTranscript[];
  let interview_viewer_component;
  let dataset: tServerData;
  let var_data: tDPSIR = {};
  let vis_links: tVisLink[];
  let summary_interviews: tChunk[] | undefined = undefined;
  let data_loading: boolean = true;

  let fetch_success = false;
  onMount(async () => {
    await fetchTest();
    fetchData();
  });
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
        data_loading = false;
        // Process each group of variables to add factor_type
        Object.keys(res.nodes).forEach((varType: string) => {
          const nodes: tVariableType = res.nodes[varType];
          const defs: tVarTypeDef = res.metadata[varType];
          var_data[varType] = utils.integrateTypes(nodes, defs);
        });
        vis_links = utils.link_to_vis_link(res.links);
      });
  }

  function handleVarOrLinkSelected(e) {
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
        (item) => item.data
      );
      // console.log(chunks);
      const enhanceChunks = (chunks: any[]): any[] => {
        return chunks
          .map((chunk) => {
            const match = flattenedInterviewData.find(
              (item) => item.id === chunk.chunk_id
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
</script>

<main class="h-full px-1">
  {#if !fetch_success}
    <BrowserBlockingPage />
  {:else}
    <div class="page flex space-x-1 h-full">
      <div
        class="flex flex-col justify-center items-center flex-1 h-full w-[70%]"
      >
        <div class="w-full h-full relative">
          <div
            class="title absolute top-1 left-6 w-fit rounded py-4 px-4 text-left text-sky-600"
          >
            <span>Sea of</span> <br />
            <span class="title-hidden absolute h-fit mt-[-25px]">Voices</span>
          </div>
          {#if data_loading}
            <div>Data Loading...</div>
          {:else}
            <Varbox
              data={var_data}
              links={vis_links}
              on:var-selected={handleVarOrLinkSelected}
            ></Varbox>
          {/if}
        </div>
      </div>
      <div class="h-full w-full basis-[30%] flex flex-col">
        <div class="gap-y-1">
          <SummaryView {summary_interviews} id="statistics" />
        </div>
        <div class="interview-viewer-container w-full grow relative">
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
