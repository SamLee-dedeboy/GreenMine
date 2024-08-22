export type tDPSIR = Record<string, tVariableType>;
export type tVariableType = {
  variable_type: string;
  variable_mentions: { [key: string]: tVariable };
  keyword_data: tKeywordData;
};
export type tKeywordData = {
  keyword_list: string[];
  keyword_statistics: Record<string, { frequency: number; tf_idf: number }>;
  keyword_coordinates: Record<string, [number, number]>;
};

export type tVariable = {
  variable_name: string;
  mentions: tMention[];
  definition: string;
  factor_type: string; // Added factor type
};

export type tMention = {
  chunk_id: string;
  conversation_ids?: number[];
  evidence?: string[];
};

export type tLink = {
  chunk_id: string;
  var1: string;
  var2: string;
  indicator1: string;
  indicator2: string;
  response: {
    relationship: {
      label: string;
      confidence: number;
    }[];
    evidence: string[];
    explanation: string;
  };
};

// for links after reformatting
export type tVisLink = {
  frequency: number;
  mentions: tMention[];
  source: VariableInfo;
  target: VariableInfo;
};

export type Mention = {
  chunk_id: string;
};

export type VariableInfo = {
  var_type: string;
  variable_name: string;
};

//for layout each rect for variables
export type tRectangle = {
  width: number;
  height: number;
  name: string;
  outgroup_degree: number;
};

//for d3 drawing
export type tRectObject = {
  x: number;
  y: number;
  width: number;
  height: number;
  variable_name: string;
  position: string;
  mentions: tMention[];
  factor_type: string;
  frequency: number;
  definition: string;
  boundary: {
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
  };
  degree: number;
};

//for d3 drawing
export type tLinkObject = {
  source: {
    var_type: string;
    var_name: string;
    leftTop: number[];
    width: number;
    height: number;
    position: string;
    boundary: {
      min_x: number;
      max_x: number;
      min_y: number;
      max_y: number;
    };
    newX_source: number;
    newY_source: number;
  };
  target: {
    var_type: string;
    var_name: string;
    leftTop: number[];
    width: number;
    height: number;
    position: string;
    boundary: {
      min_x: number;
      max_x: number;
      min_y: number;
      max_y: number;
    };
    newX_target: number;
    newY_target: number;
  };
  frequency: number;
  mentions: Mention[];
};

export type tLinkObjectOverview = {
  source: string;
  target: string;
  source_center: number[];
  target_center: number[];
  count: number;
}
export type tUtilityHandlers = {
  [key: string]: Function;
};
