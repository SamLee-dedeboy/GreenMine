from openai import OpenAI
api_key = open("api_key").readline()
client = OpenAI(api_key=api_key)
import json
import requests
import tiktoken
def save_json(data, filepath=r'new_data.json'):
    with open(filepath, 'w', encoding='utf-8') as fp:
        json.dump(data, fp, indent=4)

def request_gpt4(messages, response_format=None):
    if response_format == "json":
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
    while len(enc.encode(text)) > 8191:
        text = text[:-100]
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

import glob
import json
# emotion_definitions = open("emotion_definitions.txt").readlines()
# emotions = list(map(lambda x: x.lower(), ["Happiness", "Sadness", "Fear", "Disgust", "Anger", "Surprise", "Neutral"]))
emotions = list(map(lambda x: x.lower(), ["Proud", "Resigned", "Angry", "Worried", "Neutral"]))

def emotion_analysis(text):
    messages = [
        {
            "role": "system",
            "content": """You are a emotion analysis system. 
            You are given a conversation between two people: Interviewer and Interviewee. 
            What is the overall emotion of the Interviewee?
            Reply with exactly only one of the following emotions: Proud, Resigned, Angry, Worried, Neutral
        """
        },
        {
            "role": "user",
            "content": text
        }
    ]
    emotion = request_gpt4(messages)
    while emotion.lower() not in emotions:
        emotion = request_gpt4(messages)
        print(emotion)
    return emotion

def conversation_to_string(conversation):
    res = ""
    for content in conversation:
        # if content['speaker'] == '1':
        #     res += "Interviewer: "
        # else:
        #     res += "Interviewee: "
        res += content['speaker'] + ": " + content['content'] + "\n"
    return res

if __name__ == "__main__":
    interview_data_files = glob.glob('chunk_summaries/*.json')
    for interview_data_file in interview_data_files:
        interview_data = json.load(open(interview_data_file))
        print(interview_data_file)
        for chunk in interview_data:
            if "emotion" in chunk: continue
            conversation = chunk['conversation']
            conversation_str = conversation_to_string(conversation)
            chunk['emotion'] = emotion_analysis(conversation_str)
            print(chunk['emotion'])
            print(conversation)
            print("=====================================")
        save_json(interview_data, interview_data_file)