<script lang="ts">
  import PromptEntry from "./PromptEntry.svelte";
  import IdentifyVarTypeResults from "./IdentifyVarTypeResults.svelte";
  import IdentifyVarResults from "./IdentifyVarResults.svelte";
  import VarTypeDataEntry from "./VarTypeDataEntry.svelte";
  import VarDataEntry from "./VarDataEntry.svelte";
  import PromptHeader from "./PromptHeader.svelte";
  import { slide, fly, blur, draw, crossfade } from "svelte/transition";

  import type { tServerPipelineData, tServerPromptData } from "lib/types";
  import { server_address } from "lib/constants";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let data: tServerPromptData;
  export let pipeline_result: tServerPipelineData | undefined = undefined;
  let tmp_data: tServerPipelineData | undefined;
  let show_step = 1;
  function fetch_identify_var_types(data: tServerPromptData) {
    if (!data) return;
    fetch(server_address + "/curation/identify_var_types/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data.identify_var_types),
    })
      .then((res) => res.json())
      .then((chunks_w_var_types) => {
        if (!tmp_data) {
          tmp_data = {
            identify_var_types: chunks_w_var_types,
            identify_vars: [],
          };
        } else {
          tmp_data.identify_var_types = chunks_w_var_types;
        }
        console.log({ chunks_w_var_types });
      });
  }
  function save_identify_var_types(pipeline_tmp_data: tServerPipelineData) {
    if (!pipeline_tmp_data) return;
    fetch(server_address + "/curation/identify_var_types/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        all_chunks: pipeline_tmp_data.identify_var_types,
      }),
    });
  }
</script>

<div class="flex">
  <!-- side panel -->
  <div class="flex w-[5.5rem] flex-col items-end gap-y-0.5 px-0.5 text-sm">
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
  {#if show_step === 1}
    <div in:slide class="flex">
      <div class="flex flex-col gap-y-1 bg-gray-100">
        <PromptHeader></PromptHeader>
        <VarTypeDataEntry data={data.identify_var_types.var_type_definitions}
        ></VarTypeDataEntry>
        <PromptEntry
          data={{
            system_prompt_blocks: data.identify_var_types.system_prompt_blocks,
            user_prompt_blocks: data.identify_var_types.user_prompt_blocks,
          }}
          on:fetch_identify_var_types={(e) =>
            fetch_identify_var_types(e.detail)}
          on:save_identify_var_types={(e) => save_identify_var_types(e.detail)}
          on:close={() => dispatch("close")}
        />
      </div>
      <IdentifyVarTypeResults
        title="baseline"
        data={pipeline_result?.identify_var_types || []}
      />
      <IdentifyVarTypeResults
        title="new"
        data={tmp_data?.identify_var_types || []}
      />
    </div>
  {:else if show_step === 2}
    <div in:slide class="flex">
      <div class="flex flex-col gap-y-1 bg-gray-100">
        <PromptHeader></PromptHeader>
        <VarDataEntry data={data.identify_vars.var_definitions}></VarDataEntry>
        <PromptEntry
          data={{
            system_prompt_blocks: data.identify_vars.system_prompt_blocks,
            user_prompt_blocks: data.identify_vars.user_prompt_blocks,
          }}
          on:fetch_identify_var_types={(e) =>
            fetch_identify_var_types(e.detail)}
          on:save_identify_var_types={(e) => save_identify_var_types(e.detail)}
          on:close={() => dispatch("close")}
        />
      </div>
      <IdentifyVarResults
        title="baseline"
        data={pipeline_result?.identify_vars || []}
      />
      <IdentifyVarResults title="new" data={tmp_data?.identify_vars || []} />
    </div>
  {/if}

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
    @apply w-[5rem] bg-gray-300 opacity-100;
  }
  .container {
  }
</style>
