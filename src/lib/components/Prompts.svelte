<script lang="ts">
  import PromptEntry from "./PromptEntry.svelte";
  import IdentifyVarTypeResults from "./IdentifyVarTypeResults.svelte";
  import IdentifyVarResults from "./IdentifyVarResults.svelte";
  import VarTypeDataEntry from "./VarTypeDataEntry.svelte";
  import VarDataEntry from "./VarDataEntry.svelte";
  import PromptHeader from "./PromptHeader.svelte";
  import { fade, slide, fly, blur, draw, crossfade } from "svelte/transition";
  import { cubicOut } from "svelte/easing";

  import type { tServerPipelineData, tServerPromptData } from "lib/types";
  import { server_address } from "lib/constants";
  import { createEventDispatcher, tick } from "svelte";
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

  function myslide(
    node,
    { delay = 0, duration = 400, easing = cubicOut, axis = "y" } = {},
  ) {
    console.log({ node });
    const style = getComputedStyle(node);
    const opacity = +style.opacity;
    const primary_property = axis === "y" ? "height" : "width";
    const primary_property_value = parseFloat(style[primary_property]);
    console.log(
      { style, primary_property, primary_property_value },
      style["height"],
    );
    const secondary_properties =
      axis === "y" ? ["top", "bottom"] : ["left", "right"];
    const capitalized_secondary_properties = secondary_properties.map(
      (e) => `${e[0].toUpperCase()}${e.slice(1)}`,
    );
    const padding_start_value = parseFloat(
      style[`padding${capitalized_secondary_properties[0]}`],
    );
    const padding_end_value = parseFloat(
      style[`padding${capitalized_secondary_properties[1]}`],
    );
    const margin_start_value = parseFloat(
      style[`margin${capitalized_secondary_properties[0]}`],
    );
    const margin_end_value = parseFloat(
      style[`margin${capitalized_secondary_properties[1]}`],
    );
    const border_width_start_value = parseFloat(
      style[`border${capitalized_secondary_properties[0]}Width`],
    );
    const border_width_end_value = parseFloat(
      style[`border${capitalized_secondary_properties[1]}Width`],
    );
    return {
      delay,
      duration,
      easing,
      css: (t) =>
        "overflow: hidden;" +
        `opacity: ${Math.min(t * 20, 1) * opacity};` +
        `${primary_property}: ${t * primary_property_value}px;` +
        `padding-${secondary_properties[0]}: ${t * padding_start_value}px;` +
        `padding-${secondary_properties[1]}: ${t * padding_end_value}px;` +
        `margin-${secondary_properties[0]}: ${t * margin_start_value}px;` +
        `margin-${secondary_properties[1]}: ${t * margin_end_value}px;` +
        `border-${secondary_properties[0]}-width: ${t * border_width_start_value}px;` +
        `border-${secondary_properties[1]}-width: ${t * border_width_end_value}px;`,
    };
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
          <PromptHeader title="Identify Var Types"></PromptHeader>
          <VarTypeDataEntry data={data.identify_var_types.var_type_definitions}
          ></VarTypeDataEntry>
          <PromptEntry
            data={{
              system_prompt_blocks:
                data.identify_var_types.system_prompt_blocks,
              user_prompt_blocks: data.identify_var_types.user_prompt_blocks,
            }}
            on:fetch_identify_var_types={(e) =>
              fetch_identify_var_types(e.detail)}
            on:save_identify_var_types={(e) =>
              save_identify_var_types(e.detail)}
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
      <div in:slide|global class="step-2 flex">
        <div class="flex min-w-[30rem] flex-col gap-y-1 bg-gray-100">
          <PromptHeader title="Identify Vars"></PromptHeader>
          <VarDataEntry data={data.identify_vars.var_definitions}
          ></VarDataEntry>
          <PromptEntry
            data={{
              system_prompt_blocks: data.identify_vars.system_prompt_blocks,
              user_prompt_blocks: data.identify_vars.user_prompt_blocks,
            }}
            on:fetch_identify_var_types={(e) =>
              fetch_identify_var_types(e.detail)}
            on:save_identify_var_types={(e) =>
              save_identify_var_types(e.detail)}
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
    @apply w-[5rem] bg-gray-300 opacity-100;
  }
  .container {
  }
</style>
