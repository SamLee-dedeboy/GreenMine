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
    LogRecord,
    LogEntry,
    tVersionInfo,
  } from "lib/types";
  import { updatePanelData } from "lib/utils/update_with_log";
  import { server_address } from "lib/constants";
  import { createEventDispatcher, tick, getContext, onMount } from "svelte";
    import { sort_by_id } from "lib/utils";
  export let versionsCount: { [key: string]: tVersionInfo };
  const stepMap = {
    1: "var_type",
    2: "var",
    3: "link",
  };
  const step_to_numbers = {
    identify_var_types: 1,
    identify_vars: 2,
    identify_links: 3,
  };
  const dispatch = createEventDispatcher();
  let prompt_data: tServerPromptData;
  let pipeline_result: tServerPipelineData;
  let right_panel_result: tServerPipelineData;
  let interview_ids: string[];
  let menu_data:any;
  let show_step: number = 1;
  let right_panel_version: string = "v0";
  let step: string = stepMap[show_step];
  let data_loading: boolean = false;
  let last_execute_prompt_step_number: number = 0;
  let log: LogRecord = {
    identify_var_types: [],
    identify_vars: [],
    identify_links: [],
  };
  let measure_uncertainty = false;
  let current_versions = {
    var_type: "v0",
    var: "v0",
    link: "v0",
  };


  function extractValuesOfMenu(prompt_data, step) {
    let result = {}
      if (step === 'var_type') {
        const categories = Object.keys(prompt_data.identify_var_types.var_type_definitions);
        categories.forEach(category => {
          result[category] = [];
        })
      } else {
          // step: var/link
          const categories = Object.keys(prompt_data.identify_vars.var_definitions);
          
          categories.forEach(category => {
              if (prompt_data.identify_vars.var_definitions[category]) {
                  result[category] = prompt_data.identify_vars.var_definitions[category].map(item => item.var_name);
              } else {
                  result[category] = [];
              }
          });
      }
      return result;
  }
  function sort_id_asc(ids){
    const sortedArray = ids.sort((a, b) => {
        // Extract the numeric parts
        const [prefixA, numA] = a.split('_');
        const [prefixB, numB] = b.split('_');
        
        // Extract the numeric part of the prefix
        const prefixNumA = parseInt(prefixA.slice(1));
        const prefixNumB = parseInt(prefixB.slice(1));
        
        // Compare the prefix numbers first
        if (prefixNumA !== prefixNumB) {
            return prefixNumA - prefixNumB;
        }
        
        // If prefix numbers are the same, compare the second numbers
        return parseInt(numA) - parseInt(numB);
    });
    return sortedArray;
  }
  function changeStep(newStep: number) {
    show_step = newStep;
    step = stepMap[show_step]; //string
    right_panel_version = "v0";
    if (step) {
      fetchVersionsCount(step)
        .then(() => fetchPipelineData(step, current_versions[step]))
        .then(() => fetchMenuData(step, right_panel_version))
    }
  }

  function fetchVersionsCount(step: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fetch(`${server_address}/pipeline/${step}/all_versions`)
        .then((res) => res.json())
        .then((data) => {
          versionsCount = {
            ...versionsCount,
            [step]: {
              total_versions: data.total_versions,
              versions: data.versions,
            },
          };
          const versions = versionsCount[step].versions;
          current_versions[step] = versions[versions.length - 1];
          resolve();
        })
        .catch((error) => {
          console.error(`Error fetching versions count for ${step}:`, error);
          reject(error);
        });
    });
  }
  function fetchPipelineData(step: string, version: string) {
    const key = `identify_${step}s`;
    return fetch(`${server_address}/pipeline/${step}/${version}/`)
      .then((res) => res.json())
      .then((res) => {
        prompt_data = {
          ...prompt_data,
          [key]: res.prompts,
        };
        pipeline_result = {
          ...pipeline_result,
          [key]: res.pipeline_result,
        };
        pipeline_result = updatePanelData(pipeline_result, log, key);
        if (pipeline_result[key].length === 0) {
          interview_ids = [];
          menu_data = [];
        } else {
          interview_ids = pipeline_result[key].map((item) => item.id);
          interview_ids = sort_id_asc(interview_ids);
          menu_data = extractValuesOfMenu(prompt_data, step);
        }
        console.log({interview_ids})
        console.log(
          `Fetched pipeline data for step: ${step}, version: ${version}`,
        );
        console.log("interview_ids", interview_ids);
      })
      .catch((error) => {
        console.error(
          `Error fetching pipeline data for step ${step}, version ${version}:`,
          error,
        );
      });
  }
  function fetchMenuData(step: string, version: string) {
    const key = `identify_${step}s`;
    return fetch(`${server_address}/pipeline/${step}/${version}/`)
      .then((res) => res.json())
      .then((res) => {
        
        right_panel_result = {
          ...right_panel_result,
          [key]: res.pipeline_result,
        };
        right_panel_result = updatePanelData(right_panel_result, log, key);
      })
      .catch((error) => {
        console.error(
          `Error fetching right panel data for step ${step}, version ${version}:`,
          error,
        );
      });
  }
  function navigate_evidence(e) {
    if (!e) return;
    dispatch("navigate_evidence", e); //To App.sevelte
  }
  
  function execute_prompt(data: tServerPromptData, key: string) {
    if (!data) return;
    data_loading = true;
    last_execute_prompt_step_number = step_to_numbers[key];

    fetch(server_address + `/curation/${key}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data[key],
        compute_uncertainty: measure_uncertainty,
        current_versions: current_versions,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        pipeline_result = {
          ...pipeline_result,
          [key]: res,
        };
        if (right_panel_version === current_versions[step]) {
          right_panel_result = {
            ...right_panel_result,
            [key]: res,
          };
        }
        save_data(data, pipeline_result, key);
        data_loading = false;
      });
  }

  function handle_version_selected(current_v: string) {
    current_versions[step] = current_v;
    fetchPipelineData(step, current_v);
  }
  function handle_version_change(new_v: string) {
    right_panel_version = new_v;
    let version = new_v;
    fetchMenuData(step, version);
  }
  function handle_version_added(key: string) {
    const nextVersionNumber = versionsCount[key].total_versions; // start from 0
    const newVersion = `v${nextVersionNumber}`;
    current_versions[step] = newVersion;
    if (!versionsCount[key].versions.includes(newVersion)) {
      fetch(server_address + `/pipeline/${step}/create_and_save_new/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: newVersion,
        }),
      })
        .then((response) => response.text()) // Change this line from response.json() to response.text()
        .then((data) => {
          if (data === "success") {
            fetchVersionsCount(step);
            fetchPipelineData(step, newVersion);
          } else {
            console.error("Unexpected response:", data);
          }
        })
        .catch((error) => {
          console.error("Error saving data:", error);
        });
    }
  }

  function save_data(
    data: tServerPromptData,
    pipeline_tmp_data: tServerPipelineData,
    key: string,
  ) {
    if (!pipeline_tmp_data) return;
    fetch(server_address + `/curation/${key}/save/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        result: pipeline_tmp_data[key],
        context: data[key],
        version: current_versions[step],
      }),
    })
      .then((response) => response.text()) // Change this line from response.json() to response.text()
      .then((data) => {
        if (data === "success") {
          console.log("saved");
        } else {
          console.error("Unexpected response:", data);
        }
      })
      .catch((error) => {
        console.error("Error saving data:", error);
      })
  }
  function isEqual(arr1, arr2) {
    return JSON.stringify(arr1) === JSON.stringify(arr2);
  }
  function update_rules(e) {
    let record: LogEntry = e.detail;
    const key = `identify_${stepMap[show_step]}s`
    // TODO: check if doing dif action on the same snippet and value record
    if (key in log) {
      const exactMatch = log[key].find(entry =>
        entry.id === record.id && 
        entry.action === record.action && 
        isEqual(entry.value, record.value)
      );

      if (exactMatch) {
        alert("A rule with the same snippet, value, and action already exists.");
        return; // Exit the function without adding the duplicate
      }

      const similarRecord = log[key].find(entry =>
        entry.id === record.id && isEqual(entry.value, record.value)
      );

      if (similarRecord) {
        const actionVerb = similarRecord.action === 'add' ? 'added' : 'removed';
        const userChoice = confirm(`There is a rule ${actionVerb} with the same content. Do you want to update it?`);
        if (!userChoice) {
          return;
        }
      }

      log[key].push(record);
      log = log; // Trigger reactivity
    }
    console.log("update log", log);

    pipeline_result = updatePanelData(pipeline_result, log, key);
    right_panel_result = updatePanelData(right_panel_result, log, key);
  }


  onMount(async () => {
    await fetchVersionsCount(step);
    await fetchPipelineData(step, current_versions[step]);
    await fetchMenuData(step, right_panel_version);
  });
</script>

<div class="flex grow cursor-auto flex-col">
  <!-- side panel -->
  <div
    class="mt-[-1.4rem] flex w-fit items-end gap-x-1 gap-y-0.5 px-0.5 text-sm"
  >
    <div
      tabindex="0"
      role="button"
      class="pipeline-step-button"
      class:active={show_step === 1}
      on:click={() => changeStep(1)}
      on:keyup={() => {}}
    >
      Indicators
    </div>
    <div class="flex h-full items-center p-0.5">
      <img
        src={last_execute_prompt_step_number >= 2
          ? "arrow-right-filled-green.svg"
          : "arrow-right-empty.svg"}
        alt="->"
      />
    </div>

    <div
      tabindex="0"
      role="button"
      class="pipeline-step-button"
      class:active={show_step === 2}
      on:click={() => changeStep(2)}
      on:keyup={() => {}}
    >
      Variables
    </div>
    <div class="flex h-full items-center p-0.5">
      <img
        src={last_execute_prompt_step_number >= 3
          ? "arrow-right-filled-green.svg"
          : "arrow-right-empty.svg"}
        alt="->"
      />
    </div>
    <div
      tabindex="0"
      role="button"
      class="pipeline-step-button"
      class:active={show_step === 3}
      on:click={() => changeStep(3)}
      on:keyup={() => {}}
    >
      Links
    </div>
  </div>

  {#key show_step}
    {#if show_step === 1 && prompt_data?.identify_var_types}
      <div in:slide|global class="step-1 flex grow">
        <div
          class="flex min-w-[25rem] max-w-[30rem] flex-col gap-y-1 overflow-y-auto bg-gray-100"
        >
          <PromptHeader
            title="Identify Indicators"
            versionCount={versionsCount["var_type"]}
            current_version={current_versions["var_type"]}
            on:run={() => execute_prompt(prompt_data, "identify_var_types")}
            bind:measure_uncertainty
            on:toggle-measure-uncertainty={() =>
              (measure_uncertainty = !measure_uncertainty)}
            on:select-version={(e) => handle_version_selected(e.detail)}
            on:add-version={() => handle_version_added("var_type")}
          ></PromptHeader>
          <VarTypeDataEntry
            bind:data={prompt_data.identify_var_types.var_type_definitions}
          ></VarTypeDataEntry>
          <PromptEntry
            data={{
              system_prompt_blocks:
                prompt_data.identify_var_types.system_prompt_blocks,
              user_prompt_blocks:
                prompt_data.identify_var_types.user_prompt_blocks,
            }}
          />
          <RuleEntry
            {interview_ids}
            {menu_data}
            {step}
            logData = {log["identify_var_types"]}
            on:rule_change={(e) => update_rules(e)}
          />
        </div>
        <IdentifyVarTypeResults
          data={pipeline_result?.identify_var_types || []}
          title={`Results: Version ${+current_versions[step].slice(1) + 1}`}
          current_version={current_versions["var_type"]}
          versions={[]}
          {data_loading}
          on:navigate_evidence={(e) => navigate_evidence(e.detail)}
        />
        <IdentifyVarTypeResults
          data={right_panel_result?.identify_var_types || []}
          title={right_panel_version}
          current_version={right_panel_version}
          versions={versionsCount["var_type"].versions}
          data_loading={false}
          on:navigate_evidence={(e) => navigate_evidence(e.detail)}
          on:version_changed={(e) => handle_version_change(e.detail)}
        />
      </div>
    {:else if show_step === 2 && prompt_data.identify_vars}
      <div in:slide|global class="step-2 flex grow">
        <div class="flex min-w-[25] max-w-[30rem] flex-col gap-y-1 bg-gray-100">
          <PromptHeader
            title="Identify Variables"
            versionCount={versionsCount["var"]}
            current_version={current_versions["var"]}
            on:run={() => execute_prompt(prompt_data, "identify_vars")}
            bind:measure_uncertainty
            on:toggle-measure-uncertainty={() =>
              (measure_uncertainty = !measure_uncertainty)}
            on:select-version={(e) => handle_version_selected(e.detail)}
            on:add-version={() => handle_version_added("var")}
          ></PromptHeader>
          <VarDataEntry bind:data={prompt_data.identify_vars.var_definitions}
          ></VarDataEntry>
          <PromptEntry
            data={{
              system_prompt_blocks:
                prompt_data.identify_vars.system_prompt_blocks,
              user_prompt_blocks: prompt_data.identify_vars.user_prompt_blocks,
            }}
          />
          <RuleEntry
            {interview_ids}
            {menu_data}
            {step}
            logData = {log["identify_vars"]}
            on:rule_change={(e) => update_rules(e)}
          />
        </div>
        <IdentifyVarResults
          data={pipeline_result?.identify_vars || []}
          title={`Results: Version ${+current_versions[step].slice(1) + 1}`}
          versions={[]}
          current_version={right_panel_version}
          {data_loading}
          on:navigate_evidence={(e) => navigate_evidence(e.detail)}
        />
        <IdentifyVarResults
          data={right_panel_result?.identify_vars || []}
          title={right_panel_version}
          versions={versionsCount["var"].versions}
          current_version={right_panel_version}
          data_loading={false}
          on:navigate_evidence={(e) => navigate_evidence(e.detail)}
          on:version_changed={(e) => handle_version_change(e.detail)}
        />
      </div>
    {:else if show_step === 3 && prompt_data.identify_links}
      <div in:slide|global class="step-2 flex grow">
        <div
          class="flex min-w-[25rem] max-w-[30rem] flex-col gap-y-1 bg-gray-100"
        >
          <PromptHeader
            title="Identify Links"
            versionCount={versionsCount["link"]}
            current_version={current_versions["link"]}
            on:run={() => execute_prompt(prompt_data, "identify_links")}
            bind:measure_uncertainty
            on:toggle-measure-uncertainty={() =>
              (measure_uncertainty = !measure_uncertainty)}
            on:select-version={(e) => handle_version_selected(e.detail)}
            on:add-version={() => handle_version_added("link")}
          ></PromptHeader>
          <PromptEntry
            data={{
              system_prompt_blocks:
                prompt_data.identify_links.system_prompt_blocks,
              user_prompt_blocks: prompt_data.identify_links.user_prompt_blocks,
            }}
          />
          <RuleEntry
            {interview_ids}
            {menu_data}
            {step}
            logData = {log["identify_links"]}
            on:rule_change={(e) => update_rules(e)}
          />
        </div>
        <IdentifyLinkResults
          data={pipeline_result?.identify_links || []}
          title={`Results: Version ${+current_versions[step].slice(1) + 1}`}
          versions={[]}
          current_version={right_panel_version}
          {data_loading}
          on:navigate_evidence={(e) => navigate_evidence(e.detail)}
        />
        <IdentifyLinkResults
          data={right_panel_result?.identify_links || []}
          title={right_panel_version}
          versions={versionsCount["link"].versions}
          current_version={right_panel_version}
          data_loading={false}
          on:navigate_evidence={(e) => navigate_evidence(e.detail)}
          on:version_changed={(e) => handle_version_change(e.detail)}
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
    @apply w-[5.5rem]  rounded-sm  border-gray-600 bg-gray-200 p-1 text-center opacity-50 hover:bg-gray-300;
    transition: all 0.2s;
  }
  .active {
    @apply pointer-events-none w-[5rem] bg-yellow-100 opacity-100;
  }
  .dashed-arrow {
    width: 20px;
    height: 2px;
    border-top: 2px dashed #888;
    position: relative;
    margin: 0 5px;
  }
  .dashed-arrow::after {
    content: '';
    position: absolute;
    right: -5px;
    top: -6px;
    width: 0;
    height: 0;
    border-left: 6px solid #888;
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
  }
</style>
