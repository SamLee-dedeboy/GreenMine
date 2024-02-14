export type tVariable = {
  variable_name: string;
  mentions: tMention[]
};

export type tVariableType = {
  variable_type: string;
  variable_mentions: { [key: string]: tVariable}
}

export type tMention = {
  chunk_id: string;
  conversation_ids: number[]
}