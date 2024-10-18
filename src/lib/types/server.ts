import type { tTranscript, tVariableType, tDPSIR, tLink, tChunk } from ".";

export type tServerData = {
  interviews: tTranscript[];
  v1: tV1ServerData;
};

export type tServerDataDPSIR = {
  links: tLink[];
  pipeline_links: tLink[];
  DPSIR_data: tDPSIR;
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
  based_on?: string;
};

export type tServerPipelineData = {
  identify_var_types: tIdentifyVarTypes[];
  identify_vars: tIdentifyVars[];
  identify_links: tIdentifyLinks[];
};
export type tUncertainty = {
  identify_var_types: number;
  identify_vars: number;
  identify_links: number;
};
export type tIdentifyVarTypes = tChunk & {
  identify_var_types_result: tVarTypeResult;
  uncertainty: tUncertainty;
};
export type tIdentifyVars = tChunk & {
  identify_vars_result: tVarResult;
  uncertainty: tUncertainty;
};
export type tIdentifyLinks = tChunk & {
  identify_links_result: tLink[];
  uncertainty: tUncertainty;
};
export type tVarTypeResult = {
  var_type: string;
  evidence: number[];
  explanation: string;
  confidence?: number;
  uncertainty?: number;
}[];
export type tVarResult = Record<
  string,
  {
    var: string;
    evidence: number[];
    keywords: string[];
    explanation: string;
  }[]
>;

export type tVarDef = {
  var_name: string;
  definition: string;
  factor_type: string;
};

export type LogEntry = {
  action: string;
  id: string;
  value: Array<{ varType: string; varName: string }>;
};

export type LogRecord = {
  identify_var_types: LogEntry[];
  identify_vars: LogEntry[];
  identify_links: LogEntry[];
};

export type tVersionInfo = {
  // total_versions: number;
  versions: string[];
};
