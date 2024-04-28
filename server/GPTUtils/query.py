import concurrent 
from tqdm import tqdm
import tiktoken
import json 
import requests
from . import prompts

def multithread_prompts(client, prompts, model="gpt-3.5-turbo-0125", response_format=None):
    l = len(prompts)
    # results = np.zeros(l)
    with tqdm(total=l) as pbar:
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=len(prompts))
        futures = [executor.submit(request_chatgpt_gpt4, client, prompt, model, response_format) for prompt in prompts]
        for _ in concurrent.futures.as_completed(futures):
            pbar.update(1)
    concurrent.futures.wait(futures)
    return [future.result() for future in futures]

def request_chatgpt_gpt4(client, messages, model='gpt-3.5-turbo-0125', response_format=None):
    # model="gpt-4-1106-preview"
    if response_format == "json":
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

# def get_embedding(client, text, model="text-embedding-ada-002"):
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

def var_extraction(client, file_path, chunks, var_name, var_definition):
    node_extraction_prompts = []
    for chunk in chunks:
        interviewee_messages = [message['content'] for message in chunk['conversation'] if str(message['speaker']) == "0"]
        interviewee_messages_str = "\n".join(interviewee_messages)
        node_extraction_prompts.append(prompts.node_extraction_prompt_factory(interviewee_messages_str, var_name, var_definition))
    # node_extraction_prompts = node_extraction_prompts[:10]
    responses = multithread_prompts(client, node_extraction_prompts, format="json")
    mentioned_responses = [json.loads(res)['mentioned'] for res in responses]
    mentioned_chunks = [chunk for chunk, mentioned in zip(chunks, mentioned_responses) if mentioned == "yes"]
    evidence_prompts = []
    for chunk in mentioned_chunks:
        evidence_prompts.append(prompts.mention_extraction_prompt_factory(interviewee_messages, var_name, var_definition))
    # TODO: add evidence extraction
    responses = multithread_prompts(client, evidence_prompts, format="json")
    evidence_response = [json.loads(res)['mentions'] for res in responses] 
    final_mentions = []
    for chunk, evidence in zip(mentioned_chunks, evidence_response):
        if len(evidence) == 0: continue
        final_mentions.append({
            "chunk_id": chunk['id'],
            "conversation_ids": evidence,
        })
    var_type_nodes = json.load(open(file_path))
    var_type_nodes['variable_mentions'][var_name] = final_mentions
    save_json(var_type_nodes, file_path)

import json
def save_json(data, filepath):
    with open(filepath, 'w', encoding='utf-8') as fp:
        json.dump(data, fp, indent=4)
