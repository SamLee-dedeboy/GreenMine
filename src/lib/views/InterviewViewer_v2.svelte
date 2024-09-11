<script lang="ts">
  import { onMount } from "svelte";
  import { tick } from "svelte";
  import { slide } from "svelte/transition";
  import type { tMention, tTranscript } from "lib/types";
  export let data: tTranscript[];
  const speaker_title = {
    1: "Host",
    0: "Guest",
  };
  const speaker_background = {
    1: "bg-lime-200",
    // 1: "bg-stone-200",
    // 0: "bg-lime-100",
    0: "bg-yellow-100",
  };
  let data_changes = 0;
  /**
   * a 2d array of boolean, accessed by show_chunk[interview_index][chunk_index]
   */
  let show_chunk: boolean[][] = [];
  /**
   * a 2d array of boolean, accessed by highlight_chunk[interview_index][chunk_index]
   */
  let highlight_chunk: boolean[][] = [];

  /**
   * a 2d array of boolean, accessed by highlight_evidence[interview_index][chunk_index]
   */
  // let highlight_evidence = {};
  /**
   * a 2d array of string, accessed by highlight_evidence[interview_index][chunk_index]
   */
  let evidence: Record<string, (string | undefined)[]> = {};
  let external_highlights = false;
  /**
   * chunk_indexes is a dictionary that maps chunk ids to [interview_index, chunk_index]
   */
  let chunk_indexes = {};

  let highlight_transcripts = new Set();
  $: {
    data.forEach((interview, interview_index) => {
      highlight_chunk.push([]);
      show_chunk.push([]);
      interview.data.forEach((chunk, chunk_index) => {
        highlight_chunk[interview_index].push(false);
        show_chunk[interview_index].push(false);
        chunk_indexes[chunk.id] = [interview_index, chunk_index];
      });
    });
  }
  $: highlighting_chunk =
    external_highlights || highlight_chunk.flat().some((showing) => showing);
  $: show_interview = Array.apply(null, Array(data.length)).map(() => false);
  $: show_chunk_title = Array.apply(null, Array(data.length)).map(() => false);
  $: {
    show_chunk_title.forEach((show, index) => {
      if (show) {
        scrollToFirstTargetChunk(index);
      }
    });
  }

  function init_highlight_evidence() {
    data.forEach((interview, interview_index) => {
      interview.data.forEach((chunk, chunk_index) => {
        evidence[chunk.id] = chunk.conversation.map(() => undefined);
      });
    });
  }

  export function highlight_chunks(
    highlight_chunk_mentions: tMention[] | null,
  ) {
    resetHighlights();
    external_highlights = true;
    if (!highlight_chunk_mentions) {
      external_highlights = false;
      highlight_chunk_mentions = [];
    }
    highlight_chunk_mentions.forEach((chunk) => {
      const chunk_id = chunk.chunk_id;
      const [interview_index, chunk_index] = chunk_indexes[chunk_id];
      highlight_transcripts.add(interview_index); //collect nodes with highlighted chunks
      highlight_chunk[interview_index][chunk_index] = true;
    });

    highlight_transcripts = highlight_transcripts; // need this to trigger reactivity
    if (highlight_chunk_mentions.length > 0)
      highlight_conversations(highlight_chunk_mentions);
    return;
  }

  export function dehighlight_chunks() {
    highlight_chunk = [];
    show_interview = [];
    data.forEach((interview, interview_index) => {
      show_chunk.push([]);
      interview.data.forEach((chunk, chunk_index) => {
        if (!highlight_chunk[interview_index])
          highlight_chunk[interview_index] = [];
        highlight_chunk[interview_index].push(false);
      });
    });
    return;
  }

  export async function handleEvidenceSelected(
    chunk_id: string,
    evidence_index: number[],
    explanation: string,
  ) {
    resetHighlights();
    show_interview = []; //clear and not show the previous evidence interview index
    const interview_index_match = chunk_id.match(/N(\d+)/);
    if (!interview_index_match) return;
    const interview_index = parseInt(interview_index_match[1], 10) - 1;
    // show transcript
    show_interview[interview_index] = true;
    // highlight evidences
    evidence_index.forEach((message_index) => {
      // highlight_evidence[chunk_id][message_index] = true;
      evidence[chunk_id][message_index] = explanation;
      // evidence[message_index] = explanation;
    });
    await tick();
    const target = document.querySelector(`#${chunk_id}-${evidence_index[0]}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetHighlights() {
    init_highlight_evidence(); //set all evidence to false
    dehighlight_chunks();
    highlight_transcripts = new Set();
  }

  function aggregateMessages(interview) {
    return interview.data.flatMap((chunk) =>
      chunk.conversation.map((message, message_index) => ({
        ...message,
        chunkIndex: chunk.id,
        messageIndex: message_index,
        chunkTitle: chunk.title,
      })),
    );
  }

  function handleChunkClick(chunk_id) {
    document.querySelector(`#${chunk_id}-0`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  async function scrollToFirstTargetChunk(interview_index) {
    await tick(); //to wait for the DOM to update before attempting to find and scroll to the highlighted chunk
    let container = document.getElementById(
      `conversation-container-` + `${interview_index}`,
    );
    let target = container?.querySelector(".highlighted_message");

    if (container && target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  function highlight_conversations(highlight_chunks: tMention[]) {
    highlight_chunks.forEach((chunk_mention) => {
      const chunk_id = chunk_mention.chunk_id;
      const highlight_conversation_ids =
        chunk_mention.conversation_ids || chunk_mention.evidence || [];
      highlight_conversation_ids.forEach((message_id) => {
        evidence[chunk_id][message_id] = chunk_mention.explanation;
      });
    });
    evidence = evidence;
  }

  onMount(() => {
    init_highlight_evidence();
  });
</script>

<div class="flex flex-col">
  <div
    class="title border-gray relative m-1 flex select-none items-center justify-center rounded border bg-amber-100 py-1 text-center text-gray-700"
  >
    <span class="text-lg font-semibold"> Interview Contents </span>
  </div>
  {#key data_changes}
    <div
      class="interview-container flex h-full w-full flex-col space-y-1 text-left"
    >
      <div class="absolute bottom-0 left-0 right-0 top-12 overflow-y-scroll">
        {#each data as interview, interview_index}
          <div class="flex w-full flex-col">
            <div
              class="interview-item mx-1 flex flex-col items-center rounded px-0.5 py-1"
            >
              <div
                role="button"
                tabindex="0"
                class="interview-item-index clickable flex h-6 w-[90%] items-center justify-center rounded-t border-x border-t border-black px-1 text-center"
                style={`border-bottom-width: ${
                  show_interview[interview_index] ? "0px" : "1px"
                }`}
                on:keyup={() => {}}
                on:click={() => {
                  show_interview[interview_index] =
                    !show_interview[interview_index];
                  scrollToFirstTargetChunk(interview_index);
                }}
              >
                <span
                  class:node-highlight={highlight_transcripts.has(
                    interview_index,
                  )}
                >
                  {interview.file_name.replaceAll("chunks_", "")}
                </span>
              </div>
              {#if !show_interview[interview_index]}
                <div class="flex flex-grow flex-col"></div>
              {:else}
                <div transition:slide class="flex flex-grow flex-col">
                  <div class="flex items-center justify-between">
                    <div
                      role="button"
                      tabindex="0"
                      class="clickable mb-1 flex w-full items-center justify-center rounded border border-black px-2 py-1 text-center"
                      on:keyup={() => {
                        show_chunk_title[interview_index] =
                          !show_chunk_title[interview_index];
                      }}
                      on:click={() => {
                        show_chunk_title[interview_index] =
                          !show_chunk_title[interview_index];
                      }}
                    >
                      <span>
                        <span> Snippets</span>
                        <span class="text-gray-500">(Click to Expand)</span>
                      </span>
                    </div>
                  </div>
                  {#if show_chunk_title[interview_index]}
                    <div
                      transition:slide
                      id={`chunk-title-container-${interview_index}`}
                      class="chunk-title mb-1 flex max-h-64 flex-col gap-y-0.5 overflow-y-auto"
                    >
                      {#each interview.data as chunk, chunk_index}
                        <!-- title -->
                        <div
                          role="button"
                          tabindex="0"
                          id={chunk.id}
                          class="chunk clickable flex flex-auto rounded border border-black text-left"
                          class:chunk-highlight={highlight_chunk[
                            interview_index
                          ][chunk_index]}
                          class:chunk-not-highlight={highlighting_chunk &&
                            !highlight_chunk[interview_index][chunk_index]}
                          on:keyup={() =>
                            (show_chunk[interview_index][chunk_index] =
                              !show_chunk[interview_index][chunk_index])}
                          on:click={() => {
                            handleChunkClick(chunk.id);
                          }}
                        >
                          <div
                            class="w-[1.5rem] shrink-0 border-r border-black text-center text-sm"
                          >
                            <!-- style={`background:  ${colorScale(chunk[$colorBy])}`} -->
                            {chunk_index + 1}.
                          </div>
                          <div class="px-1 text-sm">
                            {chunk.title}
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}
                  <div class="conversation-wrapper relative flex-grow">
                    <div
                      id={`conversation-container-${interview_index}`}
                      class="max-h-96 flex-grow overflow-y-auto border border-dashed border-black text-sm"
                    >
                      <div class="conversation-container flex">
                        <div class="grow">
                          {#each aggregateMessages(interview) as message, index}
                            <div
                              id={`${message.chunkIndex}-${message.messageIndex}`}
                              class="interview-message border-r border-dashed border-black p-1 {speaker_background[
                                message.speaker
                              ]}"
                              class:border-t={index !== 0}
                              class:highlighted_message={evidence[
                                message.chunkIndex
                              ][message.messageIndex] !== undefined}
                            >
                              <div class="interview-message-speaker font-bold">
                                {speaker_title[message.speaker]}:
                              </div>
                              <div
                                class="interview-message-content"
                                class:highlighted_message={evidence[
                                  message.chunkIndex
                                ][message.messageIndex] !== undefined}
                              >
                                {@html message.content}
                              </div>
                            </div>
                            {#if evidence[message.chunkIndex][message.messageIndex] !== undefined}
                              <div class="tooltip">
                                <div class="tooltip-content">
                                  <span
                                    >{@html evidence[message.chunkIndex][
                                      message.messageIndex
                                    ]}</span
                                  >
                                </div>
                              </div>
                            {/if}
                          {/each}
                        </div>
                      </div>
                    </div>
                    {#each aggregateMessages(interview) as message, index}
                      {#if evidence[message.chunkIndex][message.messageIndex] !== undefined}
                        <div class="tooltip">
                          <div class="tooltip-content">
                            <span
                              >{@html evidence[message.chunkIndex][
                                message.messageIndex
                              ]}</span
                            >
                          </div>
                        </div>
                      {/if}
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/each}
        <div class="h-[20rem]"></div>
      </div>
    </div>
  {/key}
</div>

<style lang="postcss">
  .selected {
    @apply bg-green-100 outline outline-1 outline-green-200;
  }
  :global(.chunk-highlight) {
    @apply outline-2 outline-black;
    box-shadow: 0px 1px 3px black;
  }
  :global(.chunk-not-highlight) {
    opacity: 0.3;
  }
  :global(.shadow) {
    box-shadow: 0px 0px 3px black;
  }
  :global(.keyword-highlighted) {
    background: #ffb019;
    /* font-weight: bold; */
  }
  :global(.node-highlight) {
    /* color: #ffb019; */
  }
  .interview-item-index:has(.node-highlight) {
    background: #ffb019;
  }
  .title {
    font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  }
  .highlighted_message {
    background: #ffb019;
  }
  .conversation-wrapper {
    position: relative;
  }

  .tooltip {
    position: absolute;
    left: 50%;
    /* z-index: 1000; */
    /* right: 100%; */
    transform: translateX(-50%);
    top: 100%; /* This positions the tooltip just outside the bottom edge of the conversation-container */
    z-index: 9999;
    pointer-events: none;
  }

  .tooltip-content {
    visibility: hidden;
    background: rgb(249 250 251);
    width: 23rem;
    /* text-align: justify; */
    border-radius: 6px;
    padding: 5px 5px;
    border: 2px solid grey;
    margin-left: 10px;
    font-size: 1rem;
  }
  .interview-message:hover + .tooltip .tooltip-content {
    visibility: visible;
  }
</style>
