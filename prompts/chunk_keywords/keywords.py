from openai import OpenAI
import glob
import tiktoken
import json
import requests
api_key = open("api_key", "r").read()
client = OpenAI(api_key=api_key)

def request_gpt4(messages):
    enc = tiktoken.encoding_for_model("gpt-4-1106-preview")
    # enc = tiktoken.encoding_for_model("gpt-3.5-turbo-1106")
    text = json.dumps(messages)
    print(len(enc.encode(text)))
    kept_index = 0
    while len(enc.encode(text)) > 16385:
    # while len(enc.encode(text)) > 128000:
        print("truncating...")
        # find the first user input
        for index, message in enumerate(messages):
            if message['role'] == 'user' and len(message['content']) > 1000:
                messages[index] = {
                    "role": "user",
                    "content": message['content'][:-1000]
                }
                break
        text = json.dumps(messages)
        print(len(enc.encode(text)))
    try:
        response = client.chat.completions.create(
            model="gpt-4-1106-preview",
            # model="gpt-3.5-turbo-1106",
            messages=messages,
            temperature=0
        )
    except Exception as e:
        print(e)
        print("retrying...")
        return request_gpt4(messages)
    return response.choices[0].message.content

def save_json(data, filepath=r'new_data.json'):
    with open(filepath, 'w', encoding='utf-8') as fp:
        json.dump(data, fp, indent=4)

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

def cosine_similarity(a, b):
    from numpy import dot
    from numpy.linalg import norm
    return dot(a, b)/(norm(a)*norm(b))

def extract_keywords(paragraph):
    messages = [
        {
            "role": "system",
            "content": """You are a keyword extraction system that extracts keywords from a monologue. 
            The monologue is about a person who is talking about their life.
            The keywords should be the most important words in the monologue.
            Use the exact words that the person uses in the monologue.
            Replay with a list of keywords in Traditional Chinese in the following format:
            ["keyword1", "keyword2", "keyword3", ...]
            """
       },
       {
           "role": "user",
           "content": paragraph
       }
    ]
    keywords = request_gpt4(messages)
    return keywords


def chunk_keywords():
    # Note: run time very long, consider running on kwon
    for interview_file in glob.glob("chunk_summaries/*.json"):
        interview_data = json.load(open(interview_file))
        print(interview_file)
        for chunk in interview_data:
            # if 'raw_keywords' in chunk:
            #     continue
            interviewee_messages = "\n".join([message['content'] for message in chunk['conversation'] if message['speaker'] == "Interviewee"])
            keywords = extract_keywords(interviewee_messages)
            # print(interviewee_messages)
            print(keywords)
            chunk['raw_keywords'] = keywords
        print("===========================================")
        save_json(interview_data, interview_file)

if __name__ == "__main__":
    chunk_keywords()
