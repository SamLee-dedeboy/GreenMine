from openai import OpenAI
import glob
import tiktoken
import json
import requests
import concurrent
from tqdm import tqdm
api_key = open("api_key", "r").read()
client = OpenAI(api_key=api_key)

def request_chatgpt_gpt4(client, messages, format=None):
    model = 'gpt-3.5-turbo-0125'
    # model="gpt-4-1106-preview"
    if format == "json":
        response = client.chat.completions.create(
            # model="gpt-4-1106-preview",
            model = model,
            messages=messages,
            response_format={ "type": "json_object" },
            temperature=0,
        )
    else:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0,
        )
    return response.choices[0].message.content

def save_json(data, filepath=r'new_data.json'):
    with open(filepath, 'w', encoding='utf-8') as fp:
        json.dump(data, fp, indent=4)

def get_embedding(client, text, model="text-embedding-3-small"):
    enc = tiktoken.encoding_for_model(model)
    print(len(enc.encode(text)))
    while len(enc.encode(text)) > 8191:
        text = text[:-100]
        print(len(enc.encode(text)))
    try:
        return client.embeddings.create(input = [text], model=model).data[0].embedding
    except Exception as e:
        print(e)
        return get_embedding(client, text, model)

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
    keywords = request_chatgpt_gpt4(messages)
    return keywords

def multithread_prompts(client, prompts):
    l = len(prompts)
    # results = np.zeros(l)
    with tqdm(total=l) as pbar:
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=100)
        futures = [executor.submit(request_chatgpt_gpt4, client, prompt) for prompt in prompts]
        for _ in concurrent.futures.as_completed(futures):
            pbar.update(1)
    concurrent.futures.wait(futures)
    return [future.result() for future in futures]


def chunk_keywords():
    openai_api_key = open("openai_api_key").read()
    client=OpenAI(api_key=openai_api_key)
    # Note: run time very long, consider running on kwon
    for interview_file in glob.glob("chunk_summaries/*.json"):
        interview_data = json.load(open(interview_file))
        print(interview_file)
        prompts = []
        for chunk in interview_data:
            # if 'raw_keywords' in chunk:
            #     continue
            interviewee_messages = "\n".join([message['content'] for message in chunk['conversation'] if message['speaker'] == "0"])
            keyword_prompt = extract_keywords(interviewee_messages)
            prompts.append(keyword_prompt)
            # print(interviewee_messages)
            print(keywords)
            chunk['raw_keywords'] = keywords
        print("===========================================")
        chunk_keywords = multithread_prompts(client, prompts)
        result = []
        for chunk, keywords in zip(interview_data, chunk_keywords):
            chunk['raw_keywords'] = keywords
            result.append(chunk)
        save_json(result, interview_file)

if __name__ == "__main__":
    chunk_keywords()
