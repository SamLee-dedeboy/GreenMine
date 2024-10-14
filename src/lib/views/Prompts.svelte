<script lang="ts">
  import PromptEntry from "../components/DataEntry/PromptEntry.svelte";
  import IdentifyVarTypeResults from "lib/components/PipelineResult/IdentifyVarTypeResults.svelte";
  import IdentifyVarResults from "lib/components/PipelineResult/IdentifyVarResults.svelte";
  import IdentifyLinkResults from "lib/components/PipelineResult/IdentifyLinkResults.svelte";
  import VarTypeDataEntry from "lib/components/DataEntry/VarTypeDataEntry.svelte";
  import VarDataEntry from "lib/components/DataEntry/VarDataEntry.svelte";
  import RuleEntry from "lib/components/DataEntry/RuleEntry.svelte";
  import PromptHeader from "../components/PromptHeader.svelte";
  import { slide } from "svelte/transition";

  import type {
    tServerPipelineData,
    tServerPromptData,
    LogRecord,
    LogEntry,
    tVersionInfo,
    tIdentifyVarTypes,
    tIdentifyVars,
    tIdentifyLinks,
  } from "lib/types";
  import { updatePanelData } from "lib/utils/update_with_log";
  import { server_address } from "lib/constants";
  import { createEventDispatcher, tick, getContext, onMount } from "svelte";
  export let versionsCount: { [key: string]: tVersionInfo };
  export let interview_ids: string[] = [];
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
  let right_prompt_data: tServerPromptData;
  let pipeline_result: tServerPipelineData;
  let right_panel_result: tServerPipelineData;
  let rule_prompt_data: tServerPromptData; //for selection of Rule menu

  let menu_data: any;
  let show_step: number = 1;
  let right_panel_version: string = "v0";
  let step: string = stepMap[show_step];
  let data_loading: boolean = false;
  let uncertainty_graph_loading: boolean = false;
  let estimated_time: number = 0;
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
    let result = {};
    if (step === "var_type") {
      const categories = Object.keys(
        prompt_data.identify_var_types.var_type_definitions,
      );
      categories.forEach((category) => {
        result[category] = [];
      });
    } else {
      // step: var/link
      const categories = Object.keys(prompt_data.identify_vars.var_definitions);

      categories.forEach((category) => {
        if (prompt_data.identify_vars.var_definitions[category]) {
          result[category] = prompt_data.identify_vars.var_definitions[
            category
          ].map((item) => item.var_name);
        } else {
          result[category] = [];
        }
      });
    }
    return result;
  }
  function changeStep(newStepNumber: number) {
    console.log("change step", newStepNumber);
    if (newStepNumber) {
      const newStep = stepMap[newStepNumber];
      current_versions[newStep] =
        `v${versionsCount[newStep].versions.length - 1}`;
      fetchPipelineData(newStep, current_versions[newStep])
        .then(() => fetchMenuData(newStep, right_panel_version))
        .then(() => {
          if (newStep === "var_type") {
            fetchRuleMenu(newStep, current_versions[newStep]);
          } else if (newStep === "var") {
            fetchRuleMenu(newStep, current_versions[newStep]);
          } else if (newStep === "link") {
            fetchRuleMenu("var", current_versions["var"]);
            if (!prompt_data.identify_vars) {
              fetchPipelineData("var", current_versions["var"]);
              fetchMenuData("var", right_panel_version);
            }
          }
        })
        .then(() => {
          show_step = newStepNumber; //number
          step = stepMap[show_step]; //string
          right_panel_version = "v0";
        });
    }
  }

  function fetchVersionsCount(): Promise<void> {
    return new Promise((resolve, reject) => {
      fetch(`${server_address}/pipeline/all_versions`)
        .then((res) => res.json())
        .then((res) => {
          versionsCount = res;
          const versions = versionsCount[step].versions;
          current_versions[step] = versions[versions.length - 1];
          resolve();
          console.log(current_versions);
        })
        .catch((error) => {
          console.error(`Error fetching versions count for ${step}:`, error);
          reject(error);
        });
    });
  }

  function fetchRuleMenu(step: string, version: string) {
    const key = `identify_${step}s`;
    return fetch(`${server_address}/pipeline/${step}/${version}/`)
      .then((res) => res.json())
      .then((res) => {
        rule_prompt_data = {
          ...rule_prompt_data,
          [key]: res.prompts,
        };
        menu_data = extractValuesOfMenu(rule_prompt_data, step);
        console.log({ menu_data });
      })
      .catch((error) => {
        console.error(
          `Error fetching pipeline data for step ${step}, version ${version}:`,
          error,
        );
      });
  }
  function fetchPipelineData(step: string, version: string) {
    const key = `identify_${step}s`;
    return fetch(`${server_address}/pipeline/${step}/${version}/`)
      .then((res) => res.json())
      .then((res) => {
        console.log("Fetched pipeline data", res);
        prompt_data = {
          ...prompt_data,
          [key]: res.prompts,
        };
        pipeline_result = {
          ...pipeline_result,
          [key]: res.pipeline_result,
        };
        pipeline_result = updatePanelData(pipeline_result, log, key);
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
        console.log("Fetched right panel data", res);
        right_prompt_data = {
          ...right_prompt_data,
          [key]: res.prompts,
        };
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

  async function execute_prompt(
    data: tServerPromptData,
    key: string,
    version: string,
  ) {
    if (!data) return;
    data_loading = true;
    const estimated_times = {
      identify_var_types: 30 * 1000, // ms
      identify_vars: 100,
      identify_links: 100,
    };
    estimated_time = estimated_times[key] * (measure_uncertainty ? 5 : 1);
    last_execute_prompt_step_number = step_to_numbers[key];

    await fetch(server_address + `/curation/${key}/`, {
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
    if (measure_uncertainty) {
      uncertainty_graph_loading = true;
      const uncertainty_graph_data = await fetchDR(pipeline_result[key], key);
      uncertainty_graph_loading = false;
      save_uncertainty_graph_data(uncertainty_graph_data, key, version);
    }
  }

  async function fetchDR(
    data: (tIdentifyVarTypes | tIdentifyVars | tIdentifyLinks)[],
    key: string,
  ) {
    const dr_data = prepare_dr_data(data, key);
    if (key === "identify_var_types") {
      const dr_data_grouped = group_by_var_type(dr_data!);
      let uncertainty_graph_grouped = {};
      const dr_promises = Object.entries(dr_data_grouped).map(
        ([var_type, dr_data_by_var_type]) => {
          return new Promise((resolve) => {
            fetch(`${server_address}/dr/`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ data: dr_data_by_var_type }),
            })
              .then((res) => res.json())
              .then((dr_result) => {
                uncertainty_graph_grouped[var_type] = dr_result;
                resolve("success");
              });
          });
        },
      );
      await Promise.all(dr_promises);
      return uncertainty_graph_grouped;
    } else if (key === "identify_vars") {
      const uncertainty_graph_grouped_var_type = await fetch(
        `${server_address}/uncertainty_graph/get/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: "identify_var_types",
            version: prompt_data[key].based_on,
          }),
        },
      ).then((res) => res.json());
      const uncertainty_graph_grouped = add_vars_to_var_type_uncertainty_graph(
        uncertainty_graph_grouped_var_type,
        dr_data as any,
      );
      return uncertainty_graph_grouped;
    } else if (key === "identify_links") {
      const dr_data_grouped = group_by_links(dr_data!);
      let uncertainty_graph_grouped = {};
      const dr_promises = Object.entries(dr_data_grouped).map(
        ([var_type, dr_data_by_var_type]) => {
          return new Promise((resolve) => {
            fetch(`${server_address}/dr/`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ data: dr_data_by_var_type }),
            })
              .then((res) => res.json())
              .then((dr_result) => {
                uncertainty_graph_grouped[var_type] = dr_result;
                resolve("success");
              });
          });
        },
      );
      await Promise.all(dr_promises);
      return uncertainty_graph_grouped;
    }
  }

  function save_uncertainty_graph_data(
    data: any,
    key: string,
    version: string,
  ) {
    fetch(`${server_address}/uncertainty_graph/save/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data,
        key,
        version,
      }),
    }).then((res) => {
      console.log("saved uncertainty graph data", res);
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
            fetchVersionsCount();
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

  function handleSave(event) {
    const { type, data } = event.detail;
    const key = `identify_${stepMap[show_step]}s`;

    if (type === "var_definitions") {
      prompt_data[key].var_definitions = data;
    } else if (type === "var_type_definitions") {
      prompt_data[key].var_type_definitions = data;
    } else if (type === "prompt") {
      prompt_data[key].system_prompt_blocks = data.system_prompt_blocks;
      prompt_data[key].user_prompt_blocks = data.user_prompt_blocks;
      const based_on =
        show_step === 1 ? "init" : current_versions[stepMap[show_step - 1]];
      prompt_data[key].based_on = based_on;
    }
    save_data(prompt_data, pipeline_result, key);
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
      });
  }
  function isEqual(arr1, arr2) {
    return JSON.stringify(arr1) === JSON.stringify(arr2);
  }
  function update_rules(e) {
    let record: LogEntry = e.detail;
    const key = `identify_${stepMap[show_step]}s`;
    // TODO: check if doing dif action on the same snippet and value record
    if (key in log) {
      const exactMatch = log[key].find(
        (entry) =>
          entry.id === record.id &&
          entry.action === record.action &&
          isEqual(entry.value, record.value),
      );

      if (exactMatch) {
        alert(
          "A rule with the same snippet, value, and action already exists.",
        );
        return; // Exit the function without adding the duplicate
      }

      const similarRecord = log[key].find(
        (entry) => entry.id === record.id && isEqual(entry.value, record.value),
      );

      if (similarRecord) {
        const actionVerb = similarRecord.action === "add" ? "added" : "removed";
        const userChoice = confirm(
          `There is a rule ${actionVerb} with the same content. Do you want to update it?`,
        );
        if (userChoice) {
          log[key].splice(similarRecord, 1);
          log[key].push(record);
          log = log;
          return;
        } else {
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

  function evidenceToString(evidence: number[], conversation: string[]) {
    return evidence.map((e) => `${conversation[e]}`).join("\n");
  }

  function prepare_dr_data(
    data: (tIdentifyVarTypes | tIdentifyVars | tIdentifyLinks)[],
    key: string,
  ) {
    if (key === "identify_var_types") {
      const target_chunks = data
        .filter((chunk) => chunk["identify_var_types_result"].length > 0)
        .map((chunk) => {
          return chunk["identify_var_types_result"].map((mention) => {
            const conversations = chunk.conversation.map((c) => c.content);
            return {
              id: chunk.id,
              var_type: mention.var_type,
              uncertainty: mention.uncertainty,
              evidence: mention.evidence,
              evidence_conversation: mention.evidence.map(
                (e) => conversations[e],
              ),
              explanation: mention.explanation,
              text:
                evidenceToString(
                  mention.evidence,
                  chunk.conversation.map((c) => c.content),
                ) +
                "\n" +
                mention.explanation,
            };
          });
        })
        .flat();
      return target_chunks;
    } else if (key === "identify_vars") {
      const target_chunks = data
        .filter(
          (chunk) => Object.keys(chunk["identify_vars_result"]).length > 0,
        )
        .map((chunk) => {
          return Object.entries(chunk["identify_vars_result"]).map(
            ([var_type, mentions]) => {
              return (mentions as any[]).map((mention) => {
                return {
                  id: chunk.id,
                  var_type: var_type,
                  var: mention.var,
                  uncertainty: mention.uncertainty,
                  evidence: mention.evidence,
                  text:
                    evidenceToString(
                      mention.evidence,
                      chunk.conversation.map((c) => c.content),
                    ) +
                    "\n" +
                    mention.explanation,
                };
              });
            },
          );
        })
        .flat(Infinity);
      return target_chunks;
    } else if (key === "identify_links") {
      const target_chunks = data
        .filter((chunk) => chunk["identify_links_result"].length > 0)
        .map((chunk) => {
          return chunk["identify_links_result"].map((link_mention) => {
            return {
              id: link_mention.chunk_id,
              indicator1: link_mention.indicator1,
              indicator2: link_mention.indicator2,
              var1: link_mention.var1,
              var2: link_mention.var2,
              relationship: link_mention.response.relationship
                .map((r) => r.label)
                .join("/"),
              uncertainty: link_mention.uncertainty,
              evidence: link_mention.response.evidence,
              text:
                evidenceToString(
                  link_mention.response.evidence,
                  chunk.conversation.map((c) => c.content),
                ) +
                "\n" +
                link_mention.response.explanation,
            };
          });
        })
        .flat(Infinity);
      return target_chunks;
    }
  }
  function group_by_var_type(data: any[]) {
    console.log("grouping by var type", data);
    return Object.groupBy(data, (d) => d.var_type);
  }

  function group_by_links(data: any[]) {
    console.log("grouping by links", data);
    return Object.groupBy(data, (d) => d.indicator1 + "-" + d.indicator2);
  }

  function add_vars_to_var_type_uncertainty_graph(
    data: Record<string, any[]>,
    var_dr_data: any[],
  ) {
    console.log("adding vars to var type uncertainty graph", data, var_dr_data);
    var_dr_data.forEach((var_mention) => {
      const var_type = var_mention.var_type;
      const var_name = var_mention.var;
      const chunk_id = var_mention.id;
      const var_origin_index = data[var_type].findIndex(
        (d) => d.id === chunk_id,
      );
      if (var_origin_index !== -1) {
        if (!data[var_type][var_origin_index]["vars"]) {
          data[var_type][var_origin_index]["vars"] = [];
        }
        data[var_type][var_origin_index]["vars"].push({
          var_name: var_name,
          uncertainty: var_mention.uncertainty,
          text: var_mention.text,
        });
      }
    });
    return data;
  }

  function add_links_to_var_type_uncertainty_graph(
    data: Record<string, any[]>,
    link_dr_data: any[],
  ) {
    console.log(
      "adding vars to var type uncertainty graph",
      data,
      link_dr_data,
    );
    link_dr_data.forEach((link_mention) => {
      const indicator1 = link_mention.indicator1;
      const indicator2 = link_mention.indicator2;
      const var1 = link_mention.var1;
      const var2 = link_mention.var2;
      const chunk_id = link_mention.id;
      // src
      const link_src_origin_index = data[indicator1].findIndex(
        (d) => d.id === chunk_id,
      );
      if (link_src_origin_index !== -1) {
        if (!data[indicator1][link_src_origin_index]["links"]) {
          data[indicator1][link_src_origin_index]["links"] = [];
        }
        data[indicator1][link_src_origin_index]["links"].push({
          indicator1: indicator1,
          indicator2: indicator2,
          var1: var1,
          var2: var2,
          uncertainty: link_mention.uncertainty,
          text: link_mention.text,
        });
      }
      if (indicator1 === indicator2) return;
      // dst
      const link_dst_origin_index = data[indicator2].findIndex(
        (d) => d.id === chunk_id,
      );
      if (link_dst_origin_index !== -1) {
        if (!data[indicator2][link_dst_origin_index]["links"]) {
          data[indicator2][link_dst_origin_index]["links"] = [];
        }
        data[indicator2][link_dst_origin_index]["links"].push({
          indicator1: indicator1,
          indicator2: indicator2,
          var1: var1,
          var2: var2,
          uncertainty: link_mention.uncertainty,
          text: link_mention.text,
        });
      }
    });
    return data;
  }

  onMount(async () => {
    console.log("on mount");
    await fetchVersionsCount();
    await fetchPipelineData(step, current_versions[step]);
    await fetchMenuData(step, right_panel_version);
    await fetchRuleMenu(step, current_versions[step]);
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
      class="pipeline-step-button flex items-center justify-center"
      class:active={show_step === 1}
      on:click={() => changeStep(1)}
      on:keyup={() => {}}
    >
      <span>Indicators</span>
      <span
        class="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-xs"
      >
        {`v${+current_versions["var_type"].slice(1) + 1}`}
      </span>
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
      class="pipeline-step-button flex items-center justify-center"
      class:active={show_step === 2}
      on:click={() => changeStep(2)}
      on:keyup={() => {}}
    >
      <span>Variables</span>
      <span
        class="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-xs"
      >
        {`v${+current_versions["var"].slice(1) + 1}`}
      </span>
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
      class="pipeline-step-button flex items-center justify-center"
      class:active={show_step === 3}
      on:click={() => changeStep(3)}
      on:keyup={() => {}}
    >
      <span>Links</span>
      <span
        class="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-xs"
      >
        {`v${+current_versions["link"].slice(1) + 1}`}
      </span>
    </div>
  </div>

  {#if show_step === 1 && prompt_data?.identify_var_types}
    <div in:slide|global class="step-1 flex h-1 grow">
      <div
        class="flex min-w-[25rem] max-w-[30rem] flex-col gap-y-1 overflow-y-auto bg-gray-100"
      >
        <PromptHeader
          title="Identify Indicators"
          versionCount={versionsCount["var_type"]}
          current_version={current_versions["var_type"]}
          on:run={() =>
            execute_prompt(
              prompt_data,
              "identify_var_types",
              current_versions["var_type"],
            )}
          bind:measure_uncertainty
          on:toggle-measure-uncertainty={() =>
            (measure_uncertainty = !measure_uncertainty)}
          on:select-version={(e) => handle_version_selected(e.detail)}
          on:add-version={() => handle_version_added("var_type")}
        ></PromptHeader>
        <VarTypeDataEntry
          bind:data={prompt_data.identify_var_types.var_type_definitions}
          on:save={handleSave}
        ></VarTypeDataEntry>
        <PromptEntry
          data={{
            system_prompt_blocks:
              prompt_data.identify_var_types.system_prompt_blocks,
            user_prompt_blocks:
              prompt_data.identify_var_types.user_prompt_blocks,
          }}
          on:save={handleSave}
        />
        <RuleEntry
          {interview_ids}
          {menu_data}
          {step}
          logData={log["identify_var_types"]}
          on:rule_change={(e) => update_rules(e)}
        />
      </div>
      <IdentifyVarTypeResults
        data={pipeline_result?.identify_var_types || []}
        title={`Results: Version ${+current_versions[step].slice(1) + 1}`}
        current_version={current_versions["var_type"]}
        versions={[]}
        {data_loading}
        {uncertainty_graph_loading}
        {estimated_time}
        on:navigate_evidence={(e) => navigate_evidence(e.detail)}
      />
      <IdentifyVarTypeResults
        data={right_panel_result?.identify_var_types || []}
        title={right_panel_version}
        current_version={right_panel_version}
        versions={versionsCount["var_type"].versions}
        data_loading={false}
        uncertainty_graph_loading={false}
        on:navigate_evidence={(e) => navigate_evidence(e.detail)}
        on:version_changed={(e) => handle_version_change(e.detail)}
      />
    </div>
  {:else if show_step === 2 && prompt_data.identify_vars}
    <div in:slide|global class="step-2 flex h-1 grow">
      <div
        class="flex min-w-[25] max-w-[30rem] flex-col gap-y-1 overflow-y-auto bg-gray-100"
      >
        <PromptHeader
          title="Identify Variables"
          versionCount={versionsCount["var"]}
          current_version={current_versions["var"]}
          on:run={() =>
            execute_prompt(
              prompt_data,
              "identify_vars",
              current_versions["var"],
            )}
          bind:measure_uncertainty
          on:toggle-measure-uncertainty={() =>
            (measure_uncertainty = !measure_uncertainty)}
          on:select-version={(e) => handle_version_selected(e.detail)}
          on:add-version={() => handle_version_added("var")}
        ></PromptHeader>
        <VarDataEntry
          bind:data={prompt_data.identify_vars.var_definitions}
          on:save={handleSave}
        ></VarDataEntry>
        <PromptEntry
          data={{
            system_prompt_blocks:
              prompt_data.identify_vars.system_prompt_blocks,
            user_prompt_blocks: prompt_data.identify_vars.user_prompt_blocks,
          }}
          on:save={handleSave}
        />
        <RuleEntry
          {interview_ids}
          {menu_data}
          {step}
          logData={log["identify_vars"]}
          on:rule_change={(e) => update_rules(e)}
        />
      </div>
      <IdentifyVarResults
        data={pipeline_result?.identify_vars || []}
        title={`Results: Version ${+current_versions[step].slice(1) + 1}`}
        versions={[]}
        current_version={right_panel_version}
        {data_loading}
        {uncertainty_graph_loading}
        variable_definitions={prompt_data.identify_vars.var_definitions}
        on:navigate_evidence={(e) => navigate_evidence(e.detail)}
      />
      <IdentifyVarResults
        data={right_panel_result?.identify_vars || []}
        title={right_panel_version}
        versions={versionsCount["var"].versions}
        current_version={right_panel_version}
        data_loading={false}
        uncertainty_graph_loading={false}
        variable_definitions={right_prompt_data.identify_vars.var_definitions}
        on:navigate_evidence={(e) => navigate_evidence(e.detail)}
        on:version_changed={(e) => handle_version_change(e.detail)}
      />
    </div>
  {:else if show_step === 3 && prompt_data.identify_links}
    <div in:slide|global class="step-2 flex h-1 grow">
      <div
        class="flex min-w-[25rem] max-w-[30rem] flex-col gap-y-1 overflow-y-auto bg-gray-100"
      >
        <PromptHeader
          title="Identify Links"
          versionCount={versionsCount["link"]}
          current_version={current_versions["link"]}
          on:run={() =>
            execute_prompt(
              prompt_data,
              "identify_links",
              current_versions["link"],
            )}
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
          on:save={handleSave}
        />
        <RuleEntry
          {interview_ids}
          {menu_data}
          {step}
          logData={log["identify_links"]}
          on:rule_change={(e) => update_rules(e)}
        />
      </div>
      <IdentifyLinkResults
        data={pipeline_result?.identify_links || []}
        title={`Results: Version ${+current_versions[step].slice(1) + 1}`}
        versions={[]}
        current_version={right_panel_version}
        {data_loading}
        {uncertainty_graph_loading}
        variable_definitions={prompt_data.identify_vars?.var_definitions}
        on:navigate_evidence={(e) => navigate_evidence(e.detail)}
      />
      <IdentifyLinkResults
        data={right_panel_result?.identify_links || []}
        title={right_panel_version}
        versions={versionsCount["link"].versions}
        current_version={right_panel_version}
        data_loading={false}
        uncertainty_graph_loading={false}
        variable_definitions={right_prompt_data.identify_vars?.var_definitions}
        on:navigate_evidence={(e) => navigate_evidence(e.detail)}
        on:version_changed={(e) => handle_version_change(e.detail)}
      />
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
    @apply inline-flex  rounded-sm  border-gray-600 bg-gray-200 p-1 px-3 text-center opacity-50 hover:bg-gray-400;
    transition: all 0.2s;
    min-width: 5.5rem;
  }
  .active {
    @apply pointer-events-none bg-yellow-100 opacity-100;
  }
  .dashed-arrow {
    width: 20px;
    height: 2px;
    border-top: 2px dashed #888;
    position: relative;
    margin: 0 5px;
  }
  .dashed-arrow::after {
    content: "";
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
