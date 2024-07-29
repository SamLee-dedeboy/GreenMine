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
