<script lang="ts">
  import PromptEntry from "../components/DataEntry/PromptEntry.svelte";
  import IdentifyVarTypeResults from "lib/components/PipelineResult/IdentifyVarTypeResults.svelte";
  import IdentifyVarResults from "lib/components/PipelineResult/IdentifyVarResults.svelte";
  import IdentifyLinkResults from "lib/components/PipelineResult/IdentifyLinkResults.svelte";
  import VarTypeDataEntry from "lib/components/DataEntry/VarTypeDataEntry.svelte";
  import VarDataEntry from "lib/components/DataEntry/VarDataEntry.svelte";
  import RuleEntry from "lib/components/DataEntry/RuleEntry.svelte";
  import PromptHeader from "../components/PromptHeader.svelte";
  import { fade, slide, fly, blur, draw, crossfade } from "svelte/transition";
  import { cubicOut } from "svelte/easing";

  import type {
    tServerPipelineData,
    tServerPromptData,
    tVarTypeResult,
    LogRecord,
    tVersionInfo
  } from "lib/types";
  import { updateTmpData } from "lib/utils/update_with_log";
  import { server_address, stepMap } from "lib/constants";
  import { createEventDispatcher, tick, getContext } from "svelte";
    import { Rule } from "postcss";
  const dispatch = createEventDispatcher();
  const fetchPipelineData = getContext("fetchPipelineData");

  export let data: tServerPromptData;
  export let pipeline_result: tServerPipelineData | undefined = undefined;
  export let pipeline_ids: string[];
  export let selectedTitle: string;
  export let titleOptions: string[];
  export let versionsCount: { [key: string]: tVersionInfo };
  export let show_step: number;
  // console.log(pipeline_result)

  let data_loading: boolean = false;
  let tmp_data: {
    [version: string]: {
      identify_var_types: any[],
      identify_vars: any[],
      identify_links: any[]
    }
  } = {};

  let current_version = versionsCount[stepMap[show_step]].versions[versionsCount[stepMap[show_step]].versions.length - 1];
  if (current_version) {
    tmp_data[current_version] = {
      identify_var_types: [],
      identify_vars: [],
      identify_links: []
    };
  }
  // console.log(show_step)

  let log_record: LogRecord = {
    identify_type_results:
      pipeline_result?.identify_var_types.map((item: any) => ({
        id: item.id,
        add_element: [],
        remove_element: [],
      })) || [],
  };

  type VarTypeItem = {
    id: string;
    variable: {
      evidence: number[];
      explanation: string;
      var_type: string;
      confidence: number;
      uncertainty: number;
    };
  };
  let removeVar: VarTypeItem[] = [];
  let addVar: VarTypeItem[] = [];
  let measure_uncertainty = false;
  function changeStep(newStep: number) {
    show_step = newStep;
    dispatch('step_change', newStep);
  }
  

  function navigate_evidence(e) {
    if (!e) return;
    dispatch("navigate_evidence", e); //To App.sevelte
  }
  function update_rules() {
    // To Be Modified
    // need to save tmp data and fetch pipline data again
    // Apply rules to tmp_data
    // tmp_data[current_version] = updateTmpData(tmp_data[current_version], log_record);
    if (log_record) {
      // Update remove_element
      for (const item of removeVar) {
        const logItem = log_record.identify_type_results.find(
          (result: any) => result.id === item.id,
        );
        if (logItem) {
          logItem.remove_element.push(item.variable);
        }
      }

      // Update add_element
      for (const item of addVar) {
        const logItem = log_record.identify_type_results.find(
          (result: any) => result.id === item.id,
        );
        if (logItem) {
          logItem.add_element.push(item.variable);
        }
      }
    }
    console.log({ log_record });
    alert("Rules updated");
    removeVar = [];
    addVar = [];
  }
  function execute_prompt(data: tServerPromptData, key: string, current_version: string) {
    if (!data) return;
    if(current_version === "") {
      alert("Please select a version");
      return;
    }
    data_loading = true;
    fetch(server_address + `/curation/${key}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // body: JSON.stringify(data[key]),
      body: JSON.stringify({
        ...data[key],
        compute_uncertainty: measure_uncertainty,
      }),
    })
    .then((res) => res.json())
    .then((res) => {
      // Update the tmp_data for the current version and key
      console.log(tmp_data);
      tmp_data[current_version][key] = res;
      console.log({ res });
      
      save_data(data, tmp_data[current_version], key, current_version);
      
      
      data_loading = false;
      // compute_uncertainty(data, key);
    });

  }

  function compute_uncertainty(data: tServerPromptData, key: string) {
    if (!data) return;
    fetch(server_address + `/curation/${key}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...data[key], compute_uncertainty: true }),
    })
      .then((res) => res.json())
      .then((res) => {
        console.log("uncertainty: ", { res });
      });
  }

  function handle_version_selected(current_v: string) {
    // console.log("version selected", current_v);
    current_version = current_v;
    dispatch("version_selected", {
              pipe_version:"v" + selectedTitle.replace("version ", ""),
              prompt_version:current_version              
            });//To App.svelte to reload prompt_data

    // if the version has been run before, load the data as tmp
    if (tmp_data[current_v]) {
      console.log(`Loading existing data for version ${current_v}`);
    } else {
      console.log(`Initializing data for new version ${current_v}`);
      tmp_data[current_v] = {
        identify_var_types: [],
        identify_vars: [],
        identify_links: [],
      };
    }
  }
  function handle_title_change(newTitle: string) {
    // console.log("version changed",newTitle);
    selectedTitle = newTitle;
    dispatch("version_changed", {
              pipe_version:selectedTitle, 
              prompt_version:current_version,
            }); //To App.svelte to reload pipeline_data
  }
  function handle_version_added(key:string) {
    // Add the new version to titleOptions if it's not already there
    const nextVersionNumber = versionsCount[key].total_versions; // start from 0
    const newVersion = `v${nextVersionNumber}`;
    current_version = newVersion;
    // Initialize empty execution result data for the new version
    tmp_data[newVersion] = {
      identify_var_types: [],
      identify_vars: [],
      identify_links: [],
    };
    if (!titleOptions.includes(newVersion)) {
      dispatch("new_verison_added", {
        version:newVersion, 
        step:key
      }); //To App.svelte
    }
  }

  function save_data(
    data: tServerPromptData,
    pipeline_tmp_data: tServerPipelineData,
    key: string,
    version: string,
  ) {
    // console.log(version);
    if (!pipeline_tmp_data) return;
    console.log(`saving ${version} tmp data`, pipeline_tmp_data[key], data[key]);
    fetch(server_address + `/curation/${key}/save/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        result: pipeline_tmp_data[key],
        context: data[key],
        version: version,
      }),
    })
      .then((response) => response.text()) // Change this line from response.json() to response.text()
      .then((data) => {
        if (data === "success") {
            const step = key.startsWith("identify_") ? key.slice("identify_".length).replace(/s$/, '') : key;
            // fetchPipelineData(step, current_version,false);
            dispatch('new_version_saved', {step:step, version:version});
            console.log("saved");
        } else {
          console.error("Unexpected response:", data);
        }
      })
      .catch((error) => {
        console.error("Error saving data:", error);
      });
  }
  function remove_var_type(data: { id: string; indicator: string }, key: string): void {
    // add check exists condition for both pipeline and tmp_data    
    // need to update to all the versions
    if (!data) return;
    console.log("remove_var_type", data);
    // add to log
    // TODO: modify log data
    // removeVar.push(data);
    //right side
    if(key === "identify_var_types"){
        dispatch("remove_var_type", { id:data.id, variable: {var_type:data.indicator} }); // to App.svelte
        if (tmp_data === undefined) return;
        tmp_data[current_version].identify_var_types = tmp_data[current_version].identify_var_types.map((item) => {
          if (item.id === data.id) {
            return {
              ...item,
              identify_var_types_result: item.identify_var_types_result.filter(
                (result) => result.var_type !== data.indicator,
              ),
            };
          }
          return item;
        });
    }
    
  }
  function add_var_type(
    data: { id: string; indicator: string },
    key: string
  ): void {    
    // add check exists condition for both pipeline and tmp_data
    // need to update to all the versions
    if (!data) return;
    console.log("add_var_type", data);
    const newVarTypeResult: VarTypeItem = {
      id: data.id,
      variable: {
        var_type: data.indicator, // Convert to lowercase
        evidence: [],
        explanation: "add manually",
        confidence: 1,
        uncertainty: 0,
      },
    };
    // add to log
    // TODO: modify log data
    // addVar.push(newVarTypeResult);

    let pipe_datum
    let tmp_datum
    if(key === "identify_var_types") {
      pipe_datum = pipeline_result?.identify_var_types.find((item) => item.id === data.id);
      tmp_datum = tmp_data[current_version]?.identify_var_types.find((item) => item.id === data.id);
    
      const pipe_alreadyExists = pipe_datum.identify_var_types_result.some(
            (item) => item.var_type === data.indicator,
          );
      const tmp_alreadyExists = tmp_datum.identify_var_types_result.some(
            (item) => item.var_type === data.indicator,
          );
      // console.log(alreadyExists);
      if (!pipe_alreadyExists && !tmp_alreadyExists) {
        dispatch("add_var_type", newVarTypeResult);
        console.log("modify tmp_data");
        console.log(tmp_data[current_version].identify_var_types);
        tmp_data[current_version].identify_var_types = tmp_data[current_version].identify_var_types.map((item) => {
            if (item.id === data.id) {
              const updatedNewData = { ...newVarTypeResult.variable };
              item.identify_var_types_result.push(updatedNewData);
            }
            return item;
        });
      } else {
        alert("Var type already exists");
      }
    }

    
  }


</script>

<div class="flex grow cursor-auto flex-col">
  <!-- side panel -->
  <div class="mt-[-1.4rem] flex w-fit items-end gap-y-0.5 px-0.5 text-sm">
    <div
      tabindex="0"
      role="button"
      class="pipeline-step-button"
      class:active={show_step === 1}
      on:click={() => (changeStep(1))}
      on:keyup={() => {}}
    >
      Indicators
    </div>
    <div
      tabindex="0"
      role="button"
      class="pipeline-step-button"
      class:active={show_step === 2}
      on:click={() => (changeStep(2))}
      on:keyup={() => {}}
    >
      Variables
    </div>
    <div
      tabindex="0"
      role="button"
      class="pipeline-step-button"
      class:active={show_step === 3}
      on:click={() => (changeStep(3))}
      on:keyup={() => {}}
    >
      Links
    </div>
  </div>

  {#key show_step}
    {#if show_step === 1 && data.identify_var_types}
      <div in:slide|global class="step-1 flex grow">
        <div
          class="flex min-w-[25rem] max-w-[30rem] flex-col gap-y-1 overflow-y-auto bg-gray-100"
        >
          <PromptHeader
            title="Identify Indicators"
            versionCount={versionsCount['var_type']}
            {current_version}
            on:run={() => execute_prompt(data, "identify_var_types", current_version)}
            bind:measure_uncertainty
            on:toggle-measure-uncertainty={() =>
              (measure_uncertainty = !measure_uncertainty)}
            on:select-version={(e) => handle_version_selected(e.detail)}
            on:add-version={(e) => handle_version_added("var_type")}
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
          <RuleEntry
            {pipeline_ids}
            on:remove_var_type={(e) => remove_var_type(e.detail,"identify_var_types")}
            on:add_var_type={(e) => add_var_type(e.detail,"identify_var_types")}
            on:base_or_new_button_click={() => update_rules()}
          />
        </div>
        <IdentifyVarTypeResults
          data={tmp_data[current_version]?.identify_var_types || []}
          title={`Running: version ${current_version.slice(1)}`}
          titleOptions = {[]}
          {data_loading}
          on:navigate_evidence={(e) => navigate_evidence(e.detail)}          
        />
        <IdentifyVarTypeResults
          data={pipeline_result?.identify_var_types || []}
          title={selectedTitle}
          {titleOptions}
          data_loading={false}
          on:navigate_evidence={(e) => navigate_evidence(e.detail)}
          on:title_change={(e) => handle_title_change(e.detail)}
        />
      </div>
    {:else if show_step === 2 && data.identify_vars}
      <div in:slide|global class="step-2 flex grow">
        <div class="flex min-w-[25] max-w-[30rem] flex-col gap-y-1 bg-gray-100">
          <PromptHeader
            title="Identify Variables"
            versionCount={versionsCount['var']}
            on:run={() => execute_prompt(data, "identify_vars")}
            bind:measure_uncertainty
            on:toggle-measure-uncertainty={() =>
              (measure_uncertainty = !measure_uncertainty)}
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
          data_loading={false}
          on:navigate_evidence={(e) => navigate_evidence(e.detail)}
        />
        <IdentifyVarResults
          title="new"
          data={tmp_data?.identify_vars || []}
          {data_loading}
          on:navigate_evidence={(e) => navigate_evidence(e.detail)}
        />
      </div>
    {:else if show_step === 3 && data.identify_links}
      <div in:slide|global class="step-2 flex grow">
        <div
          class="flex min-w-[25rem] max-w-[30rem] flex-col gap-y-1 bg-gray-100"
        >
          <PromptHeader
            title="Identify Links"
            versionCount={versionsCount['link']}
            on:run={() => execute_prompt(data, "identify_links")}
            bind:measure_uncertainty
            on:toggle-measure-uncertainty={() =>
              (measure_uncertainty = !measure_uncertainty)}
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
          data_loading={false}
          on:navigate_evidence={(e) => navigate_evidence(e.detail)}
        />
        <IdentifyLinkResults
          title="new"
          data={tmp_data?.identify_links || []}
          {data_loading}
          on:navigate_evidence={(e) => navigate_evidence(e.detail)}
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
    @apply w-[5.5rem]  rounded-sm border-r  border-gray-600 bg-gray-200 p-1 text-center opacity-50 hover:bg-gray-300;
    transition: all 0.2s;
  }
  .active {
    @apply pointer-events-none w-[5rem] bg-green-300 opacity-100;
  }
  .container {
  }
</style>
