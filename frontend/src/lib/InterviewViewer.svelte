<script lang="ts">
  import { onMount } from "svelte";
  import { emotionColorScale } from "./Colors";
  export let data: any[];
  const speaker_title = {
    1: "Host",
    0: "Guest",
  };
  const speaker_background = {
    1: "bg-gray-100",
    0: "bg-lime-100",
  };
  let data_changes = 0;
  let show_chunk: any = [];
  let highlight_chunk: any = [];
  let highlight_chunk_ids: any[] = [];
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
  onMount(() => {
    console.log(data, show_chunk);
    original_data = JSON.parse(JSON.stringify(data));
  });

  //   export function highlight_chunks(relevance_count_tree) {
  //     console.log(relevance_count_tree);
  //     data.forEach((interview) => {
  //       const interview_id = interview.file_name.replaceAll("chunks_", "");
  //       if (relevance_count_tree[interview_id]) {
  //         interview.r_chunks = relevance_count_tree[interview_id].length;
  //         relevance_count_tree[interview_id].forEach((chunk_index) => {
  //           interview.data[chunk_index].relevancy = 1;
  //         });
  //       }
  //     });
  //     data_changes += 1;
  //   }

  function chunkColor(chunk) {
    const emotion = chunk.emotion;
    const color = emotionColorScale(emotion);
    return color;
  }

  export function highlight_chunks(highlight_chunks) {
    console.log({ highlight_chunks });
    dehighlight_chunks();
    external_highlights = true;
    if (!highlight_chunks) {
      external_highlights = false;
      highlight_chunks = [];
    }
    highlight_chunk_ids = highlight_chunks.map((chunk) => chunk.id);
    highlight_chunk_ids.forEach((chunk_id) => {
      const chunk_index = chunk_indexes[chunk_id];
      highlight_chunk[chunk_index[0]][chunk_index[1]] = true;
    });
    return;
  }

  export function dehighlight_chunks() {
    highlight_chunk = [];
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

  export function highlight_keywords(keyword_chunks, keywords) {
    console.log({ keyword_chunks, keywords });
    dehighlight_keywords();
    keyword_chunks = JSON.parse(JSON.stringify(keyword_chunks));
    keyword_chunks.forEach((chunks, keyword_index) => {
      const keyword = keywords[keyword_index];
      chunks.forEach((chunk) => {
        chunk.conversation.forEach((message) => {
          message.content = message.content.replaceAll(
            keyword,
            `<span class="keyword-highlighted">${keyword}</span>`
          );
        });
        replaceChunk(data, chunk);
      });
    });
    data_changes += 1;
    console.log(keyword_chunks);
  }

  export function dehighlight_keywords() {
    data = JSON.parse(JSON.stringify(original_data));
    return;
  }

  function replaceChunk(data, chunk) {
    data.forEach((interview) => {
      interview.data.forEach((interview_chunk, chunk_index) => {
        if (interview_chunk.id === chunk.id) {
          interview.data[chunk_index] = chunk;
        }
      });
    });
  }
</script>

<div class="w-full h-full overflow-y-scroll">
  <div
    class="title border border-gray rounded shadow-lg m-1 py-2 text-xl font-bold text-center flex items-center justify-center"
  >
    Interview Contents
  </div>
  {#key data_changes}
    <div
      class="interview-container flex flex-col text-left space-y-1 w-full h-full"
    >
      {#each data as interview, interview_index}
        <div class="flex flex-col w-full">
          {#if !show_interview[interview_index]}
            <div
              class="interview-item shadow-[0_0_4px_black] rounded flex py-1 px-0.5 mx-1"
            >
              <div
                role="button"
                tabindex={interview_index}
                class="interview-item-index clickable text-center basis-[5%] px-1 border border-black rounded flex items-center justify-center"
                on:keyup={() => {}}
                on:click={() =>
                  (show_interview[interview_index] =
                    !show_interview[interview_index])}
              >
                {interview.file_name.replaceAll("chunks_", "")}
              </div>
              <div class="grow flex flex-wrap ml-1 gap-x-0.5 gap-y-0.5">
                {#each interview.data as chunk, chunk_index}
                  <div
                    role="button"
                    tabindex={chunk_index}
                    id={chunk.id}
                    class={`chunk clickable text-center w-[1.5rem] border border-black rounded`}
                    class:chunk-highlight={highlight_chunk[interview_index][
                      chunk_index
                    ]}
                    class:chunk-not-highlight={highlighting_chunk &&
                      !highlight_chunk[interview_index][chunk_index]}
                    style={`background: ${chunkColor(chunk)}`}
                    on:keyup={() => {
                      show_chunk[interview_index][chunk_index] =
                        !show_chunk[interview_index][chunk_index];
                      if (show_chunk[interview_index][chunk_index])
                        highlight_chunk[interview_index][chunk_index] = true;
                      else
                        highlight_chunk[interview_index][chunk_index] =
                          highlight_chunk_ids.includes(chunk.id);
                    }}
                    on:click={() => {
                      show_chunk[interview_index][chunk_index] =
                        !show_chunk[interview_index][chunk_index];
                      if (show_chunk[interview_index][chunk_index])
                        highlight_chunk[interview_index][chunk_index] = true;
                      else
                        highlight_chunk[interview_index][chunk_index] =
                          highlight_chunk_ids.includes(chunk.id);
                    }}
                  >
                    {chunk_index + 1}
                  </div>
                {/each}
              </div>
            </div>
            <div>
              {#each interview.data as chunk, chunk_index}
                {#if show_chunk[interview_index][chunk_index]}
                  <div class="conversation-container flex">
                    <div class="flex flex-col gap-y-1">
                      <div
                        role="button"
                        tabindex={chunk_index}
                        id={chunk.id}
                        class={`chunk flex clickable mx-1 mt-1 flex-auto rounded shadow text-left`}
                        style={`background: ${chunkColor(chunk)}`}
                        on:keyup={() => {
                          show_chunk[interview_index][chunk_index] =
                            !show_chunk[interview_index][chunk_index];
                          if (show_chunk[interview_index][chunk_index])
                            highlight_chunk[interview_index][chunk_index] =
                              true;
                          else
                            highlight_chunk[interview_index][chunk_index] =
                              highlight_chunk_ids.includes(chunk.id);
                        }}
                        on:click={() => {
                          show_chunk[interview_index][chunk_index] =
                            !show_chunk[interview_index][chunk_index];
                          if (show_chunk[interview_index][chunk_index])
                            highlight_chunk[interview_index][chunk_index] =
                              true;
                          else
                            highlight_chunk[interview_index][chunk_index] =
                              highlight_chunk_ids.includes(chunk.id);
                        }}
                      >
                        <div
                          class="w-[1.5rem] shrink-0 text-center border-r border-black flex items-center justify-center"
                        >
                          {chunk_index + 1}.
                        </div>
                        <div class="px-1 py-1">
                          {chunk.title}
                        </div>
                      </div>

                      <div class="flex">
                        <div
                          role="button"
                          tabindex={chunk_index}
                          class="close-conversation clickable text-center rounded h-full ml-1 mr-0.5 w-[1.375rem] text-[1.5rem] shrink-0 flex flex-col flex-nowrap items-center justify-center bg-gray-100"
                          on:keyup={() =>
                            (show_chunk[interview_index][chunk_index] =
                              !show_chunk[interview_index][chunk_index])}
                          on:click={() =>
                            (show_chunk[interview_index][chunk_index] =
                              !show_chunk[interview_index][chunk_index])}
                        />
                        <div class="grow">
                          {#each chunk.conversation as message, message_index}
                            <div
                              class="interview-message border-b p-1 border-l border-black border-dashed {speaker_background[
                                message.speaker
                              ]}"
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
              {/each}
            </div>
          {:else}
            <div
              class="interview-item shadow-[0_0_4px_black] rounded flex py-1 px-0.5 mx-1"
            >
              <div
                role="button"
                tabindex={interview_index}
                class="interview-item-index clickable text-center basis-[5%] px-1 border border-black rounded flex items-center justify-center"
                on:keyup={() => {}}
                on:click={() =>
                  (show_interview[interview_index] =
                    !show_interview[interview_index])}
              >
                {interview.file_name.replaceAll("chunks_", "")}
              </div>
              <div class="chunk-title grow flex flex-col gap-y-0.5">
                {#each interview.data as chunk, chunk_index}
                  <!-- title -->
                  <div
                    role="button"
                    tabindex={chunk_index}
                    id={chunk.id}
                    class={`chunk clickable text-left flex mx-1 flex-auto border border-black rounded`}
                    style={`background: ${chunkColor(chunk)}`}
                    class:chunk-highlight={highlight_chunk[interview_index][
                      chunk_index
                    ]}
                    class:chunk-not-highlight={highlighting_chunk &&
                      !highlight_chunk[interview_index][chunk_index]}
                    on:keyup={() =>
                      (show_chunk[interview_index][chunk_index] =
                        !show_chunk[interview_index][chunk_index])}
                    on:click={() =>
                      (show_chunk[interview_index][chunk_index] =
                        !show_chunk[interview_index][chunk_index])}
                  >
                    <div
                      class="w-[1.5rem] shrink-0 text-center border-r border-black"
                    >
                      {chunk_index + 1}.
                    </div>
                    <div class="px-1">
                      {chunk.title}
                    </div>
                  </div>
                  <!-- conversation -->
                  {#if show_chunk[interview_index][chunk_index]}
                    <div class="conversation-container flex">
                      <div
                        role="button"
                        tabindex={chunk_index}
                        class="close-conversation clickable text-center rounded h-full ml-1 mr-0.5 w-[1.375rem] text-[1.5rem] shrink-0 flex flex-col flex-nowrap items-center justify-center bg-gray-100"
                        on:keyup={() =>
                          (show_chunk[interview_index][chunk_index] =
                            !show_chunk[interview_index][chunk_index])}
                        on:click={() =>
                          (show_chunk[interview_index][chunk_index] =
                            !show_chunk[interview_index][chunk_index])}
                      ></div>
                      <div class="grow">
                        {#each chunk.conversation as message, message_index}
                          <div
                            class="interview-message border-b p-1 border-l border-black border-dashed {speaker_background[
                              message.speaker
                            ]}"
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
                  {/if}
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/key}
</div>

<style>
  :global(.chunk-highlight) {
    border-width: 2px;
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
  .title {
    font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  }
</style>
