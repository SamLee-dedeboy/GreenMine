<script lang=ts>
  import { onMount } from "svelte";
    export let data: any[];
    const speaker_title = {
        1: "Host",
        0: "Guest"
    }
    const speaker_background = {
        1: "bg-gray-100",
        0: "bg-lime-100"
    }
    let data_changes = 0
    $: show_chunk = data.map(interview => interview.data.map(_ => false))
    $: show_interview = Array.apply(null, Array(data.length)).map(() => false);
    onMount(() => {
        console.log(data, show_chunk)
    })

    export function highlight_chunks(relevance_count_tree) {
        console.log(relevance_count_tree)
        data.forEach(interview => {
            const interview_id = interview.file_name.replaceAll("chunks_", "")
            if(relevance_count_tree[interview_id]) {
                interview.r_chunks = relevance_count_tree[interview_id].length
                relevance_count_tree[interview_id].forEach(chunk_index => {
                    interview.data[chunk_index].relevancy = 1
                })
            }
        })
        data_changes += 1
    }

</script>
<div class='h-full overflow-scroll'>
    <h1>Interview Viewer</h1>
    {#key data_changes}
        <div class="interview-container flex flex-col text-left space-y-1">
            {#each data as interview, interview_index}
                <div class="interview-item border border-black rounded">
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div class="interview-item-index px-1 cursor-pointer hover:bg-gray-300" on:click={() => show_interview[interview_index] = !show_interview[interview_index]}> { interview.file_name.replaceAll("chunks_", "")} --- {interview.r_chunks? interview.r_chunks + "/" : ""} {interview.data.length} </div>
                    {#if show_interview[interview_index]}
                        <div class="interview-item"> 
                            {#each interview.data as chunk, chunk_index}
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <!-- svelte-ignore a11y-no-static-element-interactions -->
                                <div class="interview-chunk pl-2 border rounded cursor-pointer hover:bg-gray-300" on:click={() => show_chunk[interview_index][chunk_index] = !show_chunk[interview_index][chunk_index]}> {chunk.title} {chunk.relevancy? "--" + chunk.relevancy : ""}  </div>
                                {#if show_chunk[interview_index][chunk_index]}
                                    {#each chunk.conversation as message, message_index}
                                    <div class="interview-message border-b ml-3 p-1 border-l border-black border-dashed {speaker_background[message.speaker]}">
                                        <div class="interview-message-speaker font-bold"> {speaker_title[message.speaker]}: </div>
                                        <div class="interview-message-content"> {message.content} </div>
                                    </div>
                                    {/each}
                                {/if}
                            {/each}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {/key}
</div>