# Synthetic Data Generation

This directory contains the script for generating synthetic data to be used for reproduction of the system.

## Data Format

The data to be used for reproduction is a dataset of segmented transcripts, i.e., each file is a transcript with conversation between an interviewer and an interviewee. The transcript is segmented into ``snippets'', where each snippet is a back-and-forth conversation on some topic. The segmentation is continuous, i.e., no conversation is discarded.
The generated data is stored in JSON with the following schema: (you can find them under `segmented_transcripts/\*.json`)

```json
// list of snippets
[
  // first snippet, aka a continuous conversation
  [
    {
      "speaker": "interviewer",
      "content": "xxx"
    },
    {
      "speaker": "interviewee",
      "content": "xxx"
    }
    // ...
  ],
  // second snippet
  [
    // ...
  ]
]
```

## Generation Procedure

The script `synthetic_data/script.ipynb` uses OpenAI's `gpt-4o-mini` to generate the synthetic data.

### Defining Context

In the script, I have pre-defined some context, but feel free to make up new contexts.
Here are the contexts that I defined: (based on Arcane)

1. The project background
2. Interviewer goal
3. Interviewee backgrounds (a total of 12)

### Generating transcripts

The transcripts are generated independently for each interviewee.
The above contexts are given and the model is instructed to output the transcript as a list of conversation.

### Segmentation

The generated transcript is segmented into continuous segments using `gpt-4o-mini`. The model is instructed to output start and end index of each segment, then the transcript is programmatically segmented using the indices.

Each transcript is generated as one JSON file and named after the interviewee. You can find the corresponding JSON files under `synthetic_data/transcripts/*.json` and `synthetic_data/segmented_transcripts/*.json`.

## Executing the script

The directories should have contained the generated files. But if you want to generate new data, here's how:

1. save you OpenAI's api key under `synthetic_data/openai_api_key` (no file extension needed)
2. To change the project background and interviewer's goal, go to `synthetic_data/script.ipynb` and edit them directly.
3. To change the interviewee backgrounds, edit this file: `synthetic_data/interviewees.json`. Make sure to follow the JSON schema.
4. Execute the cells in `synthetic_data/script.ipynb`
