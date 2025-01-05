import concurrent
from tqdm import tqdm
import copy
from pprint import pprint
import tiktoken
from openai import RateLimitError, APITimeoutError
import time
import json


def request_gpt(
    client, messages, model="gpt-4o-mini", temperature=0.5, format=None, seed=None
):
    with open("request_log.txt", "a", encoding="utf-8") as f:
        f.write(f"model: {model}, temperature: {temperature}, format: {format}\n")
        f.write(json.dumps(messages, ensure_ascii=False) + "\n")
        f.write("=====================================\n")
    try:
        if format == "json":
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=temperature,
                seed=seed,
            )

        else:
            response = client.chat.completions.create(
                model=model, messages=messages, temperature=temperature, seed=seed
            )
        return response.choices[0].message.content
    except RateLimitError as e:
        print("RateLimitError")
        print(e)
        time.sleep(5)
        return request_gpt(client, messages, model, temperature, format)
    except APITimeoutError as e:
        print("APITimeoutError")
        print(messages)
        time.sleep(5)
        return request_gpt(client, messages, model, temperature, format)


def get_embedding(client, text, model="text-embedding-3-small"):
    enc = tiktoken.encoding_for_model(model)
    # print(len(enc.encode(text)))
    while len(enc.encode(text)) > 8191:
        text = text[:-100]
        print(len(enc.encode(text)))
    try:
        return client.embeddings.create(input=[text], model=model).data[0].embedding
    except Exception as e:
        print(e)
        return get_embedding(client, text, model)


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


def multithread_prompts(
    client,
    prompts,
    model="gpt-4o-mini",
    temperature=0.5,
    response_format=None,
    seed=None,
):
    l = len(prompts)
    # results = np.zeros(l)
    with tqdm(total=l) as pbar:
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=100)
        futures = [
            executor.submit(
                request_gpt,
                client,
                prompt,
                model,
                temperature,
                response_format,
                seed,
            )
            for prompt in prompts
        ]
        for _ in concurrent.futures.as_completed(futures):
            pbar.update(1)
    concurrent.futures.wait(futures)
    return [future.result() for future in futures]
