<script lang="ts">
  import { onMount } from "svelte";
  import { tick } from "svelte";
  import { slide } from "svelte/transition";
  import { emotionColorScale, topicColorScale } from "lib/constants/Colors";
  import { colorBy } from "lib/store";
  import type { tMention, tTranscript } from "lib/types";
  export let data: tTranscript[];
  const speaker_title = {
    1: "Host",
    0: "Guest",
  };
  const speaker_background = {
    1: "bg-gray-100",
    0: "bg-lime-100",
  };
  $: colorScale = $colorBy === "emotion" ? emotionColorScale : topicColorScale;
  let data_changes = 0;
  let show_chunk: any = [];
  let highlight_chunk: any = [];
  let highlight_chunk_ids: any[] = [];
  let highlight_messages = {};
  let external_highlights = false;
  let chunk_indexes = {};
  let original_data;
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
    // data.map((interview) => interview.data.map((_) => false));
  }
  $: highlighting_chunk =
    external_highlights || highlight_chunk.flat().some((showing) => showing);
  $: show_interview = Array.apply(null, Array(data.length)).map(() => false);
  $: show_chunk_title = Array.apply(null, Array(data.length)).map(() => false);
  let selected_chunk = data.map(() => "");
  let highlight_nodes = new Set();

  onMount(() => {
    // console.log(data, show_chunk);
    original_data = JSON.parse(JSON.stringify(data));
    init_highlight_messages();
    //   show_chunk_title.forEach((show, index) => {
    //     console.log({ show,index });
    //     if (show) {
    //         scrollToFirstHighlightedChunk(index);
    //     }
    //     });
  });
  function init_highlight_messages() {
    data.forEach((interview, interview_index) => {
      interview.data.forEach((chunk, chunk_index) => {
        highlight_messages[chunk.id] = chunk.conversation.map(() => false);
      });
    });
  }

  // ////white -> ${chunkColor(chunk)}
  export function highlight_chunks(highlight_chunks: tMention[]) {
    // console.log({ highlight_chunks });
    let temp = new Set();
    dehighlight_chunks();
    init_highlight_messages();
    external_highlights = true;
    if (!highlight_chunks) {
      external_highlights = false;
      highlight_chunks = [];
    }
    highlight_chunk_ids = highlight_chunks.map((chunk) => chunk.chunk_id);
    highlight_chunk_ids.forEach((chunk_id) => {
      const chunk_index = chunk_indexes[chunk_id];
      // console.log(typeof chunk_index[0])
      temp.add(chunk_index[0]); //collect nodes with highlighted chunks
      highlight_chunk[chunk_index[0]][chunk_index[1]] = true;
    });

    highlight_nodes = sort_nodes_by_id(temp); // sort the nodes by index
    // console.log({highlight_nodes});
    if (highlight_chunks.length > 0)
      if (highlight_chunks[0].conversation_ids) {
        highlight_conversations(highlight_chunks);
      } else {
        highlight_evidence(highlight_chunks);
      }
    return;
  }

  function sort_nodes_by_id(nodes) {
    let array = Array.from(nodes);
    array.sort((a, b) => Number(a) - Number(b));
    let sortedSet = new Set(array);
    return sortedSet;
  }
  function highlight_conversations(highlight_chunks: tMention[]) {
    highlight_chunks.forEach((chunk) => {
      const chunk_id = chunk.chunk_id;
      chunk.conversation_ids!.forEach((message_id) => {
        highlight_messages[chunk_id][message_id] = true;
      });
    });
  }

  function highlight_evidence(highlight_chunks: tMention[]) {
    data.forEach((interview) => {
      interview.data.forEach((chunk) => {
        // check if chunk is in highlight_chunks
        const index = highlight_chunks.findIndex(
          (highlight_chunk) => highlight_chunk.chunk_id === chunk.id,
        );
        if (index === -1) return;
        chunk.conversation.forEach((message, message_index) => {
          if (
            highlight_chunks[index].evidence?.some((evidence_message) =>
              message.content.includes(evidence_message),
            )
          )
            highlight_messages[chunk.id][message_index] = true;
        });
      });
    });
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

  // export function highlight_keywords(keyword_chunks, keywords) {
  //   // console.log({ keyword_chunks, keywords });
  //   dehighlight_keywords();
  //   keyword_chunks = JSON.parse(JSON.stringify(keyword_chunks));
  //   keyword_chunks.forEach((chunks, keyword_index) => {
  //     const keyword = keywords[keyword_index];
  //     chunks.forEach((chunk) => {
  //       chunk.conversation.forEach((message) => {
  //         message.content = message.content.replaceAll(
  //           keyword,
  //           `<span class="keyword-highlighted">${keyword}</span>`
  //         );
  //       });
  //       replaceChunk(data, chunk);
  //     });
  //   });
  //   data_changes += 1;
  //   // console.log(keyword_chunks);
  // }

  // export function dehighlight_keywords() {
  //   data = JSON.parse(JSON.stringify(original_data));
  //   return;
  // }

  // function replaceChunk(data, chunk) {
  //   data.forEach((interview) => {
  //     interview.data.forEach((interview_chunk, chunk_index) => {
  //       if (interview_chunk.id === chunk.id) {
  //         interview.data[chunk_index] = chunk;
  //       }
  //     });
  //   });
  // }

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

  function scrollToMessage(messageId, containerId) {
    const messageElement = document.getElementById(`${messageId}` + `-0`);
    const containerElement = document.getElementById(containerId);
    if (messageElement && containerElement) {
      containerElement.scrollTop =
        messageElement.offsetTop - containerElement.offsetTop;
    }
  }

  function handleChunkClick(interview_index, chunk_index) {
    selected_chunk[interview_index] = chunk_index;
    scrollToMessage(
      `${interview_index}-${chunk_index}`,
      `conversation-container-${interview_index}`,
    );
  }

  async function scrollToFirstHighlightedChunk(interview_index) {
    await tick(); //to wait for the DOM to update before attempting to find and scroll to the highlighted chunk
    // console.log(show_chunk_title[interview_index],interview_index);
    const container = document.getElementById(
      `chunk-title-container-` + `${interview_index}`,
    );
    // console.log(container);
    if (container) {
      const highlightedChunk = container.querySelector(".chunk-highlight");
      // console.log(highlightedChunk);
      if (highlightedChunk) {
        highlightedChunk.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        // 500 milliseconds delay delay to allow the first scroll to complete
        setTimeout(() => {
          scrollToMessage(
            `${interview_index}-${highlightedChunk.id}`,
            `conversation-container-${interview_index}`,
          );
        }, 1000);
      }
    }
  }
  $: {
    show_chunk_title.forEach((show, index) => {
      // console.log({ show,index });
      if (show) {
        scrollToFirstHighlightedChunk(index);
      }
    });
  }
</script>

<div>
  <div
    class="title border-gray relative m-1 flex items-center justify-center rounded border bg-gray-100 py-2 text-center"
  >
    <span class="text-lg font-bold"> Interview Contents </span>
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
                on:click={() =>
                  (show_interview[interview_index] =
                    !show_interview[interview_index])}
              >
                <span
                  class:node-highlight={highlight_nodes.has(interview_index)}
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
                            handleChunkClick(interview_index, chunk.id);
                          }}
                        >
                          <div
                            class="w-[1.5rem] shrink-0 border-r border-black text-center text-sm"
                            style={`background:  ${colorScale(chunk[$colorBy])}`}
                          >
                            {chunk_index + 1}.
                          </div>
                          <div class="px-1 text-sm">
                            {chunk.title}
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}
                  <div
                    id={`conversation-container-${interview_index}`}
                    class="max-h-96 flex-grow overflow-y-auto border border-dashed border-black text-xs"
                  >
                    <div class="conversation-container flex">
                      <div class="grow">
                        {#each aggregateMessages(interview) as message, index}
                          <div
                            id={`${interview_index}-${message.chunkIndex}-${message.messageIndex}`}
                            class="interview-message border-r border-dashed border-black p-1 {speaker_background[
                              message.speaker
                            ]}"
                            class:border-t={index !== 0}
                            class:highlighted_message={highlight_messages[
                              message.chunkIndex
                            ][message.messageIndex]}
                          >
                            <div class="interview-message-speaker font-bold">
                              {speaker_title[message.speaker]}:
                            </div>
                            <div class="interview-message-content">
                              {@html message.content}
                            </div>
                          </div>
                        {/each}
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/each}
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
    background: #ff8f00;
    /* font-weight: bold; */
  }
  :global(.node-highlight) {
    color: #ff8f00;
  }
  .title {
    font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  }
  .highlighted_message {
    background: #ff8f00;
  }
</style>
