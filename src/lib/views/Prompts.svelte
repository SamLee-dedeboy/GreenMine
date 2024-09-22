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
  import { updateTmpData } from "lib/utils/update_with_log";
  import { server_address } from "lib/constants";
  import { createEventDispatcher, tick, getContext, onMount } from "svelte";
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
  export let interview_ids: string[];
  export let versionsCount: { [key: string]: tVersionInfo };
  let show_step: number = 1;
  let right_panel_version: string = "v0";
  // console.log(pipeline_result)

  let data_loading: boolean = false;
  let last_execute_prompt_step_number: number = 0;

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
  let log: LogRecord = {
    identify_var_type_results: [],
    identify_var_results: [],
    identify_link_results: [],
  };

  let removeVar: VarTypeItem[] = [];
  let addVar: VarTypeItem[] = [];
  let measure_uncertainty = false;
  let current_versions = {
    var_type: "v0",
    var: "v0",
    link: "v0",
  };

  $: step = stepMap[show_step];
  $: {
    if (versionsCount[step]) {
      const versions = versionsCount[step].versions;
      current_versions[step] = versions[versions.length - 1];
    }
  }

  function changeStep(newStep: number) {
    show_step = newStep;
    step = stepMap[show_step]; //string
    right_panel_version = "v0";
    if (step) {
      // data_loading = true;
      // fetchVersionsCount(step)
      //   .then(() => fetchPipelineData(step, current_versions[step]))
      //   .then(() => fetchMenuData(step, right_panel_version))
      //   .finally(() => {
      //     data_loading = false;
      //   });
      fetchVersionsCount(step);
      fetchPipelineData(step, current_versions[step]);
      fetchMenuData(step, right_panel_version);
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
          console.log("Versions count:", versionsCount);
          resolve();
        })
        .catch((error) => {
          console.error(`Error fetching versions count for ${step}:`, error);
          reject(error);
        });
    });
  }
  function fetchPipelineData(step: string, version: string) {
    return fetch(`${server_address}/pipeline/${step}/${version}/`)
      .then((res) => res.json())
      .then((res) => {
        const key = `identify_${step}s`;
        // console.log(res)
        prompt_data = {
          ...prompt_data,
          [key]: res.prompts,
        };
        pipeline_result = {
          ...pipeline_result,
          [key]: res.pipeline_result,
        };
        // console.log(prompt_data)
        // console.log({pipeline_result})
        if (pipeline_result[key].length === 0) {
          interview_ids = ["none"];
        } else {
          interview_ids = pipeline_result[key].map((item) => item.id);
        }
        console.log(
          `Fetched pipeline data for step: ${step}, version: ${version}`,
        );
      })
      .catch((error) => {
        console.error(
          `Error fetching pipeline data for step ${step}, version ${version}:`,
          error,
        );
      });
  }
  function fetchMenuData(step: string, version: string) {
    return fetch(`${server_address}/pipeline/${step}/${version}/`)
      .then((res) => res.json())
      .then((res) => {
        const key = `identify_${step}s`;
        right_panel_result = {
          ...right_panel_result,
          [key]: res.pipeline_result,
        };
        // check the data for right panel
        console.log("right panel result: ", right_panel_result);
        console.log(`Fetched menu data for step: ${step}, version: ${version}`);
      })
      .catch((error) => {
        console.error(
          `Error fetching pipeline data for step ${step}, version ${version}:`,
          error,
        );
      });
  }
  function navigate_evidence(e) {
    if (!e) return;
    dispatch("navigate_evidence", e); //To App.sevelte
  }
  function update_rules(e) {
    let record: LogEntry = e.detail;
    const key = `identify_${stepMap[show_step]}_results` as keyof LogRecord;
    if (key in log) {
      log[key].push(record);
      log = log; // Trigger reactivity
    }
    console.log("update log", log);
    // To Be Modified
    // Apply rules to pipeline_result and pipeline_result_right
    // pipeline_result = updateTmpData(pipeline_result, log_record);
    // pipeline_result_right = updateTmpData(pipeline_result_right, log_record);
    // if (log_record) {
    //   // Update remove_element
    //   for (const item of removeVar) {
    //     const logItem = log_record.identify_type_results.find(
    //       (result: any) => result.id === item.id,
    //     );
    //     if (logItem) {
    //       logItem.remove_element.push(item.variable);
    //     }
    //   }

    //   // Update add_element
    //   for (const item of addVar) {
    //     const logItem = log_record.identify_type_results.find(
    //       (result: any) => result.id === item.id,
    //     );
    //     if (logItem) {
    //       logItem.add_element.push(item.variable);
    //     }
    //   }
    // }
    // console.log({ log_record });
    // alert("Rules updated");
    // removeVar = [];
    // addVar = [];
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
        console.log("pipeline_result", pipeline_result);
        save_data(data, pipeline_result, key);
        data_loading = false;
      });
  }

  function handle_version_selected(current_v: string) {
    current_versions[step] = current_v;
    fetchPipelineData(step, current_v);
  }
  function handle_title_change(newTitle: string) {
    right_panel_version = newTitle;
    let version = newTitle;
    console.log("fetch pipeline data for db", version);
    fetchMenuData(step, version);
  }
  function handle_version_added(key: string) {
    console.log(`adding ${step} version`);
    const nextVersionNumber = versionsCount[key].total_versions; // start from 0
    const newVersion = `v${nextVersionNumber}`;
    current_versions[step] = newVersion;
    console.log("current_versions", current_versions);
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
    // console.log(version);
    if (!pipeline_tmp_data) return;
    console.log(
      `saving ${current_versions[step]} data`,
      pipeline_tmp_data[key],
      data[key],
    );
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
      });
  }
  function remove_var_type(
    data: { id: string; indicator: string },
    key: string,
  ): void {
    if (!data) return;
    console.log("remove_var_type", data);
    // add to log
    // TODO: modify log data
    // removeVar.push(data);
    //right side
    if (key === "identify_var_types") {
      if (pipeline_result === undefined) return;
      pipeline_result.identify_var_types =
        pipeline_result.identify_var_types.map((item) => {
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
    key: string,
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

    let pipe_datum;
    if (key === "identify_var_types") {
      pipe_datum = pipeline_result?.identify_var_types.find(
        (item) => item.id === data.id,
      );
      const pipe_alreadyExists = pipe_datum.identify_var_types_result.some(
        (item) => item.var_type === data.indicator,
      );
      if (!pipe_alreadyExists) {
        if (pipeline_result === undefined) return;
        pipeline_result.identify_var_types =
          pipeline_result.identify_var_types.map((item) => {
            if (item.id === newVarTypeResult.id) {
              const updatedNewData = {
                ...newVarTypeResult.variable,
                var_type: newVarTypeResult.variable.var_type,
              };
              item.identify_var_types_result.push(updatedNewData);
            }
            return item;
          });
      } else {
        alert("Var type already exists");
      }
    }
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
            on:remove_var_type={(e) =>
              remove_var_type(e.detail, "identify_var_types")}
            on:add_var_type={(e) =>
              add_var_type(e.detail, "identify_var_types")}
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
          on:version_changed={(e) => handle_title_change(e.detail)}
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
          on:version_changed={(e) => handle_title_change(e.detail)}
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
          on:version_changed={(e) => handle_title_change(e.detail)}
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
  .container {
  }
</style>
