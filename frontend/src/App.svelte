<script lang="ts">
  import { onMount } from "svelte";
  import InterviewViewer from "lib/InterviewViewer.svelte";
  import Summaryview from "lib/components/ScatterSummary.svelte";
  import type {
    tMention,
    tVariableType,
    tTranscript,
    tLink,
    tServerData,
    tVariable,
    tChunk,
  } from "lib/types";
  import Varbox from "lib/Varbox.svelte";

  const server_address = "http://localhost:5000";

  let interview_data: tTranscript[];
  let interview_viewer_component;
  let varbox;
  let drivers: tVariableType;
  let pressures: tVariableType;
  let states: tVariableType;
  let impacts: tVariableType;
  let responses: tVariableType;
  let links: tLink[];
  let summary_interviews: tChunk[] | undefined = undefined;
  let new_d: any;
  let data_loading: boolean = true;

  onMount(() => {
    fetchData();
  });

  function fetchData() {
  fetch(`${server_address}/data/`)
    .then((res) => res.json())
    .then((res: tServerData) => {
      console.log({ res });
      interview_data = res.interviews;
      links = res.links;
      data_loading = false;
      // new_d = res.driver_types;
      // console.log({ new_d });
      // Process each group of variables to add factor_type
      drivers = integrateTypes(res.driver_nodes, res.driver_types);
      pressures = integrateTypes(res.pressure_nodes, res.pressure_types);
      states = integrateTypes(res.state_nodes, res.state_types);
      impacts = integrateTypes(res.impact_nodes, res.impact_types);
      responses = integrateTypes(res.response_nodes, res.response_types);
      // console.log({ drivers, pressures, states, impacts, responses });
    });
}

function integrateTypes(variableTypeData: tVariableType, typesData: { [key: string]: { factor_type: string } }): tVariableType {
  const variable_mentions = Object.keys(variableTypeData.variable_mentions).reduce((acc, key) => {
    const variable = variableTypeData.variable_mentions[key];
    acc[key] = {
      ...variable,
      factor_type: typesData[key]?.factor_type || 'unknown' // Merge factor type into each variable
    };
    return acc;
  }, {} as { [key: string]: tVariable });

  return {
    variable_type: variableTypeData.variable_type,
    variable_mentions
  };
}

  function handleVarOrLinkSelected(e) {
    //deselect var/link
    if (e.detail === null) {
      interview_viewer_component.highlight_chunks(null); //dehighlight chunks
      summary_interviews = [] //clear summary view
    } else {
      const chunks = e.detail.mentions;
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
            bind:this={varbox}
            {drivers}
            {pressures}
            {states}
            {impacts}
            {responses}
            {links}
            on:var-selected={handleVarOrLinkSelected}
            {interview_data}
          ></Varbox>
        {/if}
      </div>
    </div>
    <div class="h-full w-full basis-[30%] flex flex-col">
      <div class="gap-y-1">
        <Summaryview {summary_interviews} id="statistics" />
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
</main>

<style>
  .shadow {
    box-shadow: 0 0 2px gray;
  }
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
