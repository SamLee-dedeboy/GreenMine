export type tVariableType = {
  variable_type: string;
  variable_mentions: { [key: string]: tVariable}
}

export type tVariable = {
  variable_name: string;
  mentions: tMention[]
};

export type tMention = {
  chunk_id: string;
  conversation_ids?: number[]
  evidence?: string[]
}

export type tLink = {
  chunk_id: string;
  var1: string;
  var2: string;
  indicator1: string;
  indicator2: string;
  response: {
    relationship: string;
    evidence: string[];
  }
}

// for links after reformatting
export type tNewLink = {
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
}


//for d3 drawing
export type tRectObject = {
  x: number;
  y: number;
  width: number;
  height: number;
  variable_name: string;
  mentions: tMention[];
  frequency: number;
};

//for d3 drawing
export type tLinkObject = {
  source: {
    var_type: string;
    var_name: string;
    x: number;
    y: number;
    x_right: number;
    x_left: number;
    y_top: number;
    y_bottom: number;
    block_x: number;
    block_y: number;
    block_y_top: number;
    block_y_bottom: number;
    newX_source: number;
    newY_source: number;
  };
  target: {
    var_type: string;
    var_name: string;
    x: number;
    y: number;
    x_right: number;
    x_left: number;
    y_top: number;
    y_bottom: number;
    block_x: number;
    block_y: number;
    block_y_top: number;
    block_y_bottom: number;
    newX_target: number;
    newY_target: number;
  };
  frequency: number;
  mentions: Mention[];
}
