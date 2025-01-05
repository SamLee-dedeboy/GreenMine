# Preprocessing 
This directory contains the script for preprocessing the generated and segmented transcripts ([Synthetic Data Generation](../synthetic_data/README.md)). The preprocessing step extracts keywords and generate a title for each snippet (a snippet is a segment of the transcript). It also transforms the data into a format compatible with the back-end. 


## Executing the script
### Preparation
**Data**:
Copy and paste the data from `synthetic_data/segmented_transcripts/`. The result should look like this: `preprocessing/segmented_transcripts/*.json`.

**OpenAI API key**:
Save you OpenAI's api key under `synthetic_data/openai_api_key` (no file extension needed)

### Script Breakdown
The script does three things:
1. Transform the data format. The transformed files are temporarily saved under `preprocessing/tmp/segments_formatted/*.json`
2. Extract keywords and generate a title for each segment. The results are saved under `preprocessing/tmp/extracted/*.json`
3. Generate embeddings for each keyword and calculate frequency. The results are saved under `preprocessing/keyword/keywords.json` and `preprocessing/keyword/keyword_statistics.json`. 
4. Aggregate all the segments into one JSON file. The result is saved under `reprocessing/result/chunks.json`.

## After Execution: Moving Result to the back-end
The server needs three files: `preprocessing/result/chunks.json`, `preprocessing/keyword/keywords.json` and `preprocessing/keyword/keyword_statistics.json`.

Copy and Paste them respectively under:

1. `chunks.json` --> `server/data/v2/user/pipeline/init/chunks.json`

2. `keywords.json` --> `server/data/v2/user/keyword/keywords.json`

3. `keyword_statistics.json` --> `server/data/v2/user/keyword/keyword_statistics.json`
