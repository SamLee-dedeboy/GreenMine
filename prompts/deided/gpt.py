import concurrent
from tqdm import tqdm
import copy
from pprint import pprint
import tiktoken
from openai import RateLimitError
import time
def request_chatgpt_gpt4(client, messages, format=None):
    model = 'gpt-3.5-turbo-0125'
    # model="gpt-4-1106-preview"
    try:
        if format == "json":
            response = client.chat.completions.create(
                # model="gpt-4-1106-preview",
                model = model,
                messages=messages,
                response_format={ "type": "json_object" },
                temperature=0.5,
            )
        else:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.5,
            )
        return response.choices[0].message.content
    except RateLimitError as e:
        print("RateLimitError")
        print(e)
        time.sleep(5)
        return request_chatgpt_gpt4(client, messages, format)

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

def multithread_prompts(client, prompts, format=None):
    l = len(prompts)
    # results = np.zeros(l)
    with tqdm(total=l) as pbar:
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=100)
        futures = [executor.submit(request_chatgpt_gpt4, client, prompt, format) for prompt in prompts]
        for _ in concurrent.futures.as_completed(futures):
            pbar.update(1)
    concurrent.futures.wait(futures)
    return [future.result() for future in futures]

def multithread_embeddings(client, texts):
    l = len(texts)
    # results = np.zeros(l)
    with tqdm(total=l) as pbar:
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=100)
        futures = [executor.submit(get_embedding, client, text) for text in texts]
        for _ in concurrent.futures.as_completed(futures):
            pbar.update(1)
    concurrent.futures.wait(futures)
    return [future.result() for future in futures]

