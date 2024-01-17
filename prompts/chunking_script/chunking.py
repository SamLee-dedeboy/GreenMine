from openai import OpenAI
import json
from pprint import pprint
import requests
import tiktoken
api_key = open("api_key").read()

# openai.api_key = api_key
client=OpenAI(api_key=api_key)

def save_json(data, filepath=r'new_data.json'):
    with open(filepath, 'w', encoding='utf-8') as fp:
        json.dump(data, fp, indent=4)

def request_chatgpt_gpt4(messages, format=None):
    if format == "json":
        response = client.chat.completions.create(
            model="gpt-4-1106-preview",
            messages=messages,
            response_format={ "type": "json_object" },
            temperature=0
        )
    else:
        response = client.chat.completions.create(
            model="gpt-4-1106-preview",
            messages=messages,
            temperature=0
        )
    return response.choices[0].message.content

def get_embedding(text, model="text-embedding-ada-002"):
    enc = tiktoken.encoding_for_model(model)
    print(len(enc.encode(text)))
    while len(enc.encode(text)) > 8191:
        text = text[:-100]
        print(len(enc.encode(text)))
    url = 'https://api.openai.com/v1/embeddings'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': "Bearer {}".format(api_key)
    }
    data = {
        "input": text,
        "model": model
    }
    res = requests.post(url, headers=headers, json=data)
    res = res.json()
    return res['data'][0]['embedding']

def FormatTheTranscript(transcript):
    merged_transcript = []
    transcript_str = ""
    prev_role = ""
    index = 0
    for conversation in transcript:
        if conversation['speaker'][0] == 'N':
            role = "Interviewee"
        else:
            role = "Interviewer"
        content = conversation['content']
        if role == prev_role:
            transcript_str += f'{content}\n'
            merged_transcript[-1]['content'] += f'\n{content}'
        else:
            transcript_str += f'{index}. {role}: {content}\n'
            merged_transcript.append({
                'speaker': role,
                'content': content
            })
            index += 1

        prev_role = role
        
    return transcript_str, merged_transcript

# 1. chunk directly
def chunk(transcript_str):
    system_prompt = """ You are an chunking interview transcript assistant. 
                            You are given a list of interview content about the Green island in Taiwan. 
                            You are helping an user to split the interview transcript into chunks.
                            Each chunk should have a clear topic that is being discussed, and each chunk should end with interviewee's message.
                            Avoid small chunks that have only one or two conversations.
                            Chunks start and end index should not be more than 30 apart.
                            All the chunks should be consecutive, non-overlapping, and cover the whole interview.
                            
                            Respond in the following JSON format:
                                    {
                                    'result': [[0, end_index], [start_index2, end_index2], ...]
                                    }.   

    """
    messages = [
        {
            'role': 'system',
            'content': system_prompt
        },
        {
            'role': 'user',
            'content': transcript_str
        }
    ]
    # print(transcript_str)
    res = request_chatgpt_gpt4(messages, format="json")
    return res  

def process_chunks(divisions, transcript):
    chunks = []
    for division in divisions:
        start_index = division[0]
        end_index = division[1]+1
        # print("division length", end_index - start_index)
        chunk = transcript[start_index:end_index]
        chunks.append(chunk)
    return chunks


import glob
if __name__ == "__main__":
    for transcript_file in glob.glob("./rerun/*.json"):
        print(transcript_file)
        transcript = json.load(open(transcript_file))
        formatted_data, merged_transcript = FormatTheTranscript(transcript)
        # run three times
        divisions_1 = json.loads(chunk(formatted_data))['result']
        divisions_2 = json.loads(chunk(formatted_data))['result']
        divisions_3 = json.loads(chunk(formatted_data))['result']
        divisions = sorted([divisions_1, divisions_2, divisions_3], key=lambda x: len(x))[1]
        print(len(divisions), len(divisions_1), len(divisions_2), len(divisions_3))
        chunks = process_chunks(divisions, merged_transcript)
        print(transcript_file, len(chunks))
        # for c in chunks:
        #     for m in c:
        #         print(m['speaker'], m['content'], file=open('logs.txt', 'a'))
        #     print("=========================", file=open('logs.txt', 'a'))
        save_json(chunks, transcript_file.replace("rerun", "chunks"))

