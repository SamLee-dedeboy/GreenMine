export type tTranscript = {
  file_name: string;
  data: tChunk[];
};

export type tChunk = {
  id: string;
  conversation: tConversation[];
  emotion: string;
  title: string;
  topic: string;
  raw_keywords: string[];
  identify_var_types_result?: {
    var_type: string[];
    evidence: number[];
    explanation: string;
  };
};
export type tConversation = {
  speaker: number;
  content: string;
};

export type tChunkNew = {
  id: string;
  conversation: tConversation[];
  emotion: string;
  topic: string;
};
