import type {
  tServerPipelineData,
  LogRecord,
  tVarTypeResult,
  tVarResult,
} from "../types/server";

import type {tLink} from "../types/variables";

export function updatePanelData(
  tmp_data: tServerPipelineData,
  log_record: LogRecord,
  key: string,
): tServerPipelineData {
  const updatedData = { ...tmp_data };
  const logEntries = log_record[key];

  logEntries?.forEach((entry) => {
    const { action, id, value } = entry;

    switch (key) {
      case "identify_var_types":
        updateVarType(updatedData.identify_var_types, id, action, value[0]);
        break;
      case "identify_vars":
        updateVar(updatedData.identify_vars, id, action, value[0]);
        break;
      case "identify_links":
        updateLink(updatedData.identify_links, id, action, value);
        break;
    }
  });

  return updatedData;
}

function updateVarType(
  data: tServerPipelineData["identify_var_types"],
  id: string,
  action: string,
  value: { varType: string; varName: string },
) {
  const item = data.find((item) => item.id === id);
  if (!item) return;

  if (action === "add") {
    const existingResult = item.identify_var_types_result.find(
      (result) => result.var_type === value.varType,
    );
    if (!existingResult) {
      item.identify_var_types_result.push({
        var_type: value.varType,
        evidence: [],
        explanation: "",
      });
    }
  } else if (action === "remove") {
    item.identify_var_types_result = item.identify_var_types_result.filter(
      (result) => result.var_type !== value.varType,
    );
  }
}

function updateVar(
  data: tServerPipelineData["identify_vars"],
  id: string,
  action: string,
  value: { varType: string; varName: string },
) {
  const item = data.find((item) => item.id === id);
  if (!item) return;

  if (action === "add") {
    if (!item.identify_vars_result[value.varType]) {
      item.identify_vars_result[value.varType] = [];
    }
    const existingVar = item.identify_vars_result[value.varType].find(
      (v) => v.var === value.varName,
    );
    if (!existingVar) {
      item.identify_vars_result[value.varType].push({
        var: value.varName,
        evidence: [],
        keywords: [],
        explanation: "",
      });
    }
  } else if (action === "remove") {
    if (item.identify_vars_result[value.varType]) {
      item.identify_vars_result[value.varType] = item.identify_vars_result[
        value.varType
      ].filter((v) => v.var !== value.varName);

      // If the array is empty after removal, delete the attribute
      if (item.identify_vars_result[value.varType].length === 0) {
        delete item.identify_vars_result[value.varType];
      }
    }
  }
}

function updateLink(
  data: tServerPipelineData["identify_links"],
  id: string,
  action: string,
  value: Array<{ varType: string; varName: string }>,
) {
  const item = data.find((item) => item.id === id);
  if (!item) return;

  if (action === "add") {
    const existingLink = item.identify_links_result.find(
      (link) =>
        link.var1 === value[0].varName &&
        link.var2 === value[1].varName &&
        link.indicator1 === value[0].varType &&
        link.indicator2 === value[1].varType,
    );
    if (!existingLink) {
      const newLink: tLink = {
        chunk_id: id,
        var1: value[0].varName,
        var2: value[1].varName,
        indicator1: value[0].varType,
        indicator2: value[1].varType,
        response: {
          relationship: [
            {
              label: "", 
              confidence: 0, 
            },
          ],
          evidence: [],
          explanation: "",
        },
      };
      item.identify_links_result.push(newLink);
    }
  } else if (action === "remove") {
    item.identify_links_result = item.identify_links_result.filter(
      (link) =>
        !(
          link.var1 === value[0].varName &&
          link.var2 === value[1].varName &&
          link.indicator1 === value[0].varType &&
          link.indicator2 === value[1].varType
        ),
    );
  }
}
