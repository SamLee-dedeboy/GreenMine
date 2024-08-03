<script lang="ts">
  import PromptEntry from "./DataEntry/PromptEntry.svelte";
  import IdentifyVarTypeResults from "lib/components/PipelineResult/IdentifyVarTypeResults.svelte";
  import IdentifyVarResults from "lib/components/PipelineResult/IdentifyVarResults.svelte";
  import IdentifyLinkResults from "lib/components/PipelineResult/IdentifyLinkResults.svelte";
  import VarTypeDataEntry from "lib/components/DataEntry/VarTypeDataEntry.svelte";
  import VarDataEntry from "lib/components/DataEntry/VarDataEntry.svelte";
  import PromptHeader from "./PromptHeader.svelte";
  import { fade, slide, fly, blur, draw, crossfade } from "svelte/transition";
  import { cubicOut } from "svelte/easing";

  import type { tServerPipelineData, tServerPromptData, tVarTypeResult } from "lib/types";
  import { server_address } from "lib/constants";
  import { createEventDispatcher, tick } from "svelte";
  const dispatch = createEventDispatcher();

  export let data: tServerPromptData;
  export let pipeline_result: tServerPipelineData | undefined = undefined;
  let tmp_data: tServerPipelineData = {
    identify_var_types: [],
    identify_vars: [],
    identify_links: [],
  };
  let show_step = 1;
  function fetch_var_types_evidence(data: tServerPromptData) {
    if (!data) return;
    console.log({ data });
    dispatch("var_types_evidence", data); //To App.sevelte
  }
  function execute_prompt(data: tServerPromptData, key: string) {
    if (!data) return;
    fetch(server_address + `/curation/${key}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data[key]),
    })
      .then((res) => res.json())
      .then((res) => {
        tmp_data[key] = res;
        console.log({ res });
      });
  }
  function save_data(
    data: tServerPromptData,
    pipeline_tmp_data: tServerPipelineData,
    key: string,
  ) {
    if (!pipeline_tmp_data) return;
    console.log("saving", pipeline_tmp_data[key], data[key]);
    fetch(server_address + `/curation/${key}/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        result: pipeline_tmp_data[key],
        context: data[key],
      }),
    });
  }
  function remove_var_type(data: tServerPromptData){
    if (!data) return;
    console.log({ data });
    dispatch("remove_var_type", data);
  }
  function add_var_type(data: { id: string; var_type: string }): void {
    if (!data) return;
    console.log(data.var_type.toLowerCase() );

    const newVarTypeResult = {
      var_type: data.var_type.toLowerCase(), // Convert to lowercase
      evidence: [] as number[],
      explanation: ""
    };

    // console.log({ newVarTypeResult });
    dispatch("add_var_type", { id: data.id, newdata: newVarTypeResult });
  }
</script>

<div class="flex">
  <!-- side panel -->
  <div class="flex w-[5.5rem] flex-col items-end gap-y-0.5 px-1 text-sm">
    <div
      tabindex="0"
      role="button"
      class="pipeline-step-button"
      class:active={show_step === 1}
      on:click={() => (show_step = 1)}
      on:keyup={() => {}}
    >
      Var Types
    </div>
    <div
      tabindex="0"
      role="button"
      class="pipeline-step-button"
      class:active={show_step === 2}
      on:click={() => (show_step = 2)}
      on:keyup={() => {}}
    >
      Vars
    </div>
    <div
      tabindex="0"
      role="button"
      class="pipeline-step-button"
      class:active={show_step === 3}
      on:click={() => (show_step = 3)}
      on:keyup={() => {}}
    >
      Links
    </div>
  </div>

  {#key show_step}
    {#if show_step === 1}
      <div in:slide|global class="step-1 flex">
        <div class="flex min-w-[15rem] flex-col gap-y-1 bg-gray-100">
          <PromptHeader
            title="Identify Var Types"
            on:run={() => execute_prompt(data, "identify_var_types")}
            on:save={() => save_data(data, tmp_data, "identify_var_types")}
          ></PromptHeader>
          <VarTypeDataEntry
            bind:data={data.identify_var_types.var_type_definitions}
          ></VarTypeDataEntry>
          <PromptEntry
            data={{
              system_prompt_blocks:
                data.identify_var_types.system_prompt_blocks,
              user_prompt_blocks: data.identify_var_types.user_prompt_blocks,
            }}
          />
        </div>
        <IdentifyVarTypeResults
          title="baseline"
          data={pipeline_result?.identify_var_types || []}
          on:fetch_var_types_evidence={(e) =>
              fetch_var_types_evidence(e.detail)}
          on:remove_var_type={(e)=>remove_var_type(e.detail)}
          on:add_var_type={(e)=>add_var_type(e.detail)}
        />
        <IdentifyVarTypeResults
          title="new"
          data={tmp_data?.identify_var_types || []}
        />
      </div>
    {:else if show_step === 2}
      <div in:slide|global class="step-2 flex">
        <div class="flex min-w-[30rem] flex-col gap-y-1 bg-gray-100">
          <PromptHeader
            title="Identify Vars"
            on:run={() => execute_prompt(data, "identify_vars")}
            on:save={() => save_data(data, tmp_data, "identify_vars")}
          ></PromptHeader>
          <VarDataEntry bind:data={data.identify_vars.var_definitions}
          ></VarDataEntry>
          <PromptEntry
            data={{
              system_prompt_blocks: data.identify_vars.system_prompt_blocks,
              user_prompt_blocks: data.identify_vars.user_prompt_blocks,
            }}
          />
        </div>
        <IdentifyVarResults
          title="baseline"
          data={pipeline_result?.identify_vars || []}
          
        />
        <IdentifyVarResults title="new" data={tmp_data?.identify_vars || []} />
      </div>
    {:else if show_step === 3}
      <div in:slide|global class="step-2 flex">
        <div class="flex min-w-[30rem] flex-col gap-y-1 bg-gray-100">
          <PromptHeader
            title="Identify Links"
            on:run={() => execute_prompt(data, "identify_links")}
            on:save={() => save_data(data, tmp_data, "identify_links")}
          ></PromptHeader>
          <PromptEntry
            data={{
              system_prompt_blocks: data.identify_links.system_prompt_blocks,
              user_prompt_blocks: data.identify_links.user_prompt_blocks,
            }}
          />
        </div>
        <IdentifyLinkResults
          title="baseline"
          data={pipeline_result?.identify_links || []}
        />
        <IdentifyLinkResults
          title="new"
          data={tmp_data?.identify_links || []}
        />
      </div>
    {/if}
  {/key}

  <button
    aria-label="close"
    class="text-magnum-800 focus:shadow-magnum-400 absolute right-1 top-0.5 inline-flex h-5
                w-5 appearance-none items-center justify-center
                rounded-full hover:bg-zinc-300"
    style="cursor: pointer"
    on:click={() => dispatch("close")}
  >
    <img src="X.svg" alt="x" class="pointer-events-none h-4" />
  </button>
</div>

<style lang="postcss">
  .pipeline-step-button {
    @apply w-[4.5rem]  rounded-sm border-gray-400 bg-gray-200 p-1 text-center opacity-50 shadow-[-1px_1px_0_0_black] hover:bg-gray-300;
    transition: all 0.2s;
  }
  .active {
    @apply pointer-events-none w-[5rem] bg-green-300 opacity-100;
  }
  .container {
  }
</style>
