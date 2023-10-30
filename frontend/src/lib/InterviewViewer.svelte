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
    $: show_chunk = data.map(interview => interview.data.map(chunk => false))
    $: show_interview = Array.apply(null, Array(data.length)).map(() => false);
    onMount(() => {
        console.log(data, show_chunk)
    })
</script>
<div>
    <h1>Interview Viewer</h1>
    <div class="interview-container flex flex-col text-left space-y-1">
        {#each data as interview, interview_index}
            <div class="interview-item border border-black rounded">
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div class="interview-item-index px-1 cursor-pointer hover:bg-gray-300" on:click={() => show_interview[interview_index] = !show_interview[interview_index]}> { interview.file_name.replaceAll("chunks_", "") }</div>
                {#if show_interview[interview_index]}
                    <div class="interview-item"> 
                        {#each interview.data as chunk, chunk_index}
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                            <div class="interview-chunk pl-2 border rounded cursor-pointer hover:bg-gray-300" on:click={() => show_chunk[interview_index][chunk_index] = !show_chunk[interview_index][chunk_index]}> chunk_{chunk_index} </div>
                            {#if show_chunk[interview_index][chunk_index]}
                                {#each chunk as message, message_index}
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
</div>