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
            # model="gpt-4-1106-preview",
            model="gpt-3.5-turbo-1106",
            messages=messages,
            response_format={ "type": "json_object" },
        )
    else:
        response = client.chat.completions.create(
            # model="gpt-4-1106-preview",
            model="gpt-3.5-turbo-1106",
            messages=messages,
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
topics = ['交通','整體經濟','能源','災害','貿易','政府運作','住屋','醫療','公有土地', '其他']
# '環境生態'

def topic_analysis(text):
    messages = [
        {
            "role": "system",
            "content": """You are a topic analysis system. 
            You are given a conversation between two people: Interviewer and Interviewee. 
            The conversation is mostly about the environment, but the user cares more about a specific aspect.
            What is the focus aspect of the conversation?
            Reply with exactly only one of the following choices: {}
            Reply with the following JSON format in Traditional Chinese:
            {{ "result": aspect (from one of the provided choices) }}
        """.format(", ".join(topics))
        },
        {
            "role": "user",
            "content": text
        }
    ]
    while True:
        try:
            response = request_gpt4(messages, response_format="json")
            topic = json.loads(response)['result']
            print(topic)
            if topic in topics:
                break
        except:
            continue
    return topic

def conversation_to_string(conversation):
    res = ""
    for content in conversation:
        res += content['speaker'] + ": " + content['content'] + "\n"
    return res

if __name__ == "__main__":
    interview_data_files = glob.glob('chunk_summaries/*.json')
    for interview_data_file in interview_data_files:
        interview_data = json.load(open(interview_data_file))
        # print(interview_data_file)
        print(interview_data_file, len(interview_data))
        for chunk in interview_data:
            conversation = chunk['conversation']
            conversation_str = conversation_to_string(conversation)
            topic = topic_analysis(conversation_str)
            chunk['topic'] = topic
            print(topic)
            # print(conversation)
            print("=====================================")
        save_json(interview_data, interview_data_file)

        # save_json(chunk_summaries, interview_data_file)