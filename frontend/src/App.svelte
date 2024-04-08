<script lang="ts">
  import { onMount } from "svelte";
  import InterviewViewer from "lib/InterviewViewer.svelte";
  import type {
    tMention,
    tVariableType,
    tTranscript,
    tLink,
    tServerData,
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
        drivers = res.driver_nodes;
        pressures = res.pressure_nodes;
        states = res.state_nodes;
        impacts = res.impact_nodes;
        responses = res.response_nodes;
        links = res.links;
        data_loading = false;
      });
  }

  function handleLinkSelected(e) {
    console.log(e);
    if (e.detail === null) {
      interview_viewer_component.highlight_chunks(null);
    } else {
      const chunks: tMention[] = e.detail.mentions;
      interview_viewer_component.highlight_chunks(chunks);
    }
  }

  function handleVarSelected(e) {
    console.log(e);
    if (e.detail === null) {
      interview_viewer_component.highlight_chunks(null);
    } else {
      const chunks: tMention[] = e.detail.mentions;
      interview_viewer_component.highlight_chunks(chunks);
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
            on:var-selected={handleVarSelected}
            on:link-selected={handleLinkSelected}
            {interview_data}
          ></Varbox>
        {/if}
      </div>
    </div>
    <div class="h-full w-full basis-[30%]">
      <div class="gap-y-1 outline outline-1 outline-gray-300">summary</div>
      <div class="interview-viewer-container w-full h-full">
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
