import concurrent
from tqdm import tqdm
import copy
from pprint import pprint
import tiktoken
from openai import RateLimitError, APITimeoutError
import time


def request_chatgpt(client, messages, model="gpt-4o-mini", format=None):
    try:
        if format == "json":
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": "json_object"},
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
        return request_chatgpt(client, messages, format)
    except APITimeoutError as e:
        print("APITimeoutError")
        print(messages)
        time.sleep(5)
        return request_chatgpt(client, messages, model, format)


def get_embedding(client, text, model="text-embedding-3-small"):
    enc = tiktoken.encoding_for_model(model)
    print(len(enc.encode(text)))
    while len(enc.encode(text)) > 8191:
        text = text[:-100]
        print(len(enc.encode(text)))
    try:
        return client.embeddings.create(input=[text], model=model).data[0].embedding
    except Exception as e:
        print(e)
        return get_embedding(client, text, model)


def multithread_prompts(client, prompts, model=None, format=None):
    l = len(prompts)
    with tqdm(total=l) as pbar:
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=100)
        futures = [
            executor.submit(request_chatgpt, client, prompt, model, format)
            for prompt in prompts
        ]
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
