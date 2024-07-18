import type { tTranscript, tVariableType, tDPSIR, tLink } from ".";

export type tServerData = {
  interviews: tTranscript[];
  nodes: tDPSIR;
  links: tLink[];
  metadata: tMetadata;
  v1: tV1ServerData;
};

export type tV1ServerData = {
  interviews: tTranscript[];
  chunk_links: any;
  chunk_nodes: any;
  topic_tsnes: any;
  keyword_coordinates: any;
  keyword_statistics: any;
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
