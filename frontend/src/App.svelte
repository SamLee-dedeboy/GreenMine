<script lang="ts">
  import { onMount } from "svelte";
    import InterviewViewer from "./lib/InterviewViewer.svelte";
    import ReportViewer from "./lib/ReportViewer.svelte"

    const server_address = "http://localhost:5000"

    let interview_data: any = undefined;
    let report_data: any = undefined;

    onMount(() => {
        fetchData()
    })

    function fetchData() {
        fetch(`${server_address}/data/`)
            .then(res => res.json())
            .then(res => {
                console.log({res})
                interview_data = res.interviews
                report_data = res.reports
            })
    }

</script>

<main>
    <div class="page flex">
        <div class="interview-viewer-container basis-[30%]">
            {#if interview_data != undefined} <InterviewViewer data={interview_data}></InterviewViewer> {/if}
        </div>

        <div class="report-viewer-container basis-[30%]">
            {#if report_data != undefined}<ReportViewer data={report_data}></ReportViewer>{/if}
        </div>
    </div>
</main>

<style>
</style>
