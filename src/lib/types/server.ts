import type { tTranscript, tVariableType, tDPSIR, tLink, tChunk } from ".";

export type tServerData = {
  interviews: tTranscript[];
  nodes: tDPSIR;
  links: tLink[];
  metadata: tMetadata;
  v1: tV1ServerData;
  prompts: tServerPromptData;
  pipeline_data: tServerPipelineData;
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
  var_type_definitions: Record<string, string>;
  system_prompt_blocks: [string, string][];
  user_prompt_blocks: [string, string][];
};
export type tServerPipelineData = {
  identify_var_types: tChunk[];
};

export type tVarTypeDef = {
  [key: string]: {
    definition: string;
    factor_type: string;
  };
};
export type tMetadata = {
  driver: tVarTypeDef;
  pressure: tVarTypeDef;
  state: tVarTypeDef;
  impact: tVarTypeDef;
  response: tVarTypeDef;
};
