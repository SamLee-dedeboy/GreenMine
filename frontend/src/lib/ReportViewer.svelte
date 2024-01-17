<script lang=ts>
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();
    export let data: any[];
    let error_files: any[] = []

    const attribute_background = {
        "reason": "bg-cyan-100",
        "description": "bg-cyan-100",
        "solution": "bg-cyan-100",
        "decision": "bg-lime-100",
    }
    $: show_report = Array.apply(null, Array(data.length)).map(() => false);
    const keys = [ "proposal_title", "reason", "description", "solution", "decision", "time", "view_num", "conference_title", "type", "proposer", "seconder"]
    const translation: any = {
        "proposal_title": "提案名",
        "reason": "案由",
        "description": "說明",
        "solution": "辦法",
        "decision": "議決",
        "time": "時間",
        "view_num": "點閱數",
        "conference_title": "會議名",
        "type": "類別",
        "proposer": "提案人",
        "seconder": "附議人",
    } 
    function showConnection(report) {
        dispatch("selected", report)
    }
</script>
<div class='h-full overflow-scroll'>
    <h1>Report Viewer</h1>
    <div>
        {#each error_files as error_file}
            <div> {error_file} </div>
        {/each}
    </div>
    <div class="report-container flex flex-col text-left space-y-1 p-2">
        {#each data as report, report_index}
            <div class="report-item border border-solid border-black rounded">
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div class="report-item-index px-1 cursor-pointer hover:bg-gray-300" on:click={() => show_report[report_index] = !show_report[report_index]}> #{report_index+1}: {report.file_name} </div>
                {#if show_report[report_index]}
                    <div class="report-item"> 
                        {#each Object.keys(report.data).sort((a, b) => keys.indexOf(a) - keys.indexOf(b)) as key}
                            <!-- {#if key !== "embedding"} -->
                            <div class="border rounded {attribute_background[key]}"> {translation[key]} : { report.data[key]} </div>
                            <!-- {/if} -->
                        {/each}
                        <button class="btn" on:click={() => {console.log(report.file_name); error_files = [...error_files, report.file_name]}}> mark as error</button>
                        <button class="btn" on:click={() => {showConnection(report)}}> show connection</button>
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</div>