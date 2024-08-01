import type { tTranscript, tVariableType, tDPSIR, tLink, tChunk } from ".";

export type tServerData = {
  interviews: tTranscript[];
  nodes: tDPSIR;
  links: tLink[];
  variable_definitions: Record<string, tVarDef>;
  v1: tV1ServerData;
  prompts: tServerPromptData;
  pipeline_result: tServerPipelineData;
};

export type tV1ServerData = {
  interviews: tTranscript[];
  chunk_links: any;
  chunk_nodes: any;
  topic_tsnes: any;
  keyword_coordinates: any;
  keyword_statistics: any;
};
export type tServerPromptData = {
  identify_var_types: tIdentifyVarTypeData;
  identify_vars: tIdentifyVarsData;
  identify_links: tIdentifyLinksData;
};
export type tIdentifyVarTypeData = {
  var_type_definitions: tVarTypeData;
} & tPrompt;
export type tIdentifyVarsData = {
  var_definitions: tVarData;
} & tPrompt;
export type tIdentifyLinksData = {
  var_definitions: tVarData;
} & tPrompt;
export type tVarTypeData = Record<string, string>;
export type tVarData = Record<
  string,
  { var_name: string; definition: string; factor_type: string }[]
>;
export type tPrompt = {
  system_prompt_blocks: [string, string][];
  user_prompt_blocks: [string, string][];
};

export type tServerPipelineData = {
  identify_var_types: tIdentifyVarTypes[];
  identify_vars: tIdentifyVars[];
  identify_links: tIdentifyLinks[];
};
export type tIdentifyVarTypes = tChunk & {
  identify_var_types_result: tVarTypeResult;
};
export type tIdentifyVars = tChunk & {
  identify_vars_result: tVarResult;
};
export type tIdentifyLinks = tChunk & {
  identify_links_result: tLink[];
};
export type tVarTypeResult = {
  var_type: string;
  evidence: number[];
  explanation: string;
}[];
export type tVarResult = Record<
  string,
  {
    var: string;
    evidence: number[];
    explanation: string;
  }[]
>;

export type tVarDef = {
  var_name: string;
  definition: string;
  factor_type: string;
};
