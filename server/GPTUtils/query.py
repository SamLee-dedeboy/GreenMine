import concurrent 
from tqdm import tqdm
import tiktoken
import json 
import requests
from . import prompts
from openai import RateLimitError, APITimeoutError
import time

def multithread_prompts(client, prompts, model="gpt-3.5-turbo-0125", response_format=None):
    l = len(prompts)
    # results = np.zeros(l)
    with tqdm(total=l) as pbar:
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=100)
        futures = [executor.submit(request_chatgpt, client, prompt, model, response_format) for prompt in prompts]
        for _ in concurrent.futures.as_completed(futures):
            pbar.update(1)
    concurrent.futures.wait(futures)
    return [future.result() for future in futures]

def request_chatgpt(client, messages, model='gpt-3.5-turbo-0125', format=None):
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
        return request_chatgpt(client, messages, model, format)
    except APITimeoutError as e:
        print("APITimeoutError")
        print(messages)
        time.sleep(5)
        return request_chatgpt(client, messages, model, format)

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

def var_extraction(client, node_file_path, link_file_path, chunk_dict, var_name, var_type, var_definition, all_def_dict):
    node_extraction_prompts = []
    chunks = list(chunk_dict.values())
    for chunk in chunks:
        interviewee_messages = [message['content'] for message in chunk['conversation'] if str(message['speaker']) == "0"]
        interviewee_messages_str = "\n".join(interviewee_messages)
        node_extraction_prompts.append(prompts.node_extraction_prompt_factory(interviewee_messages_str, var_name, var_definition))
    # node_extraction_prompts = node_extraction_prompts[:10]
    responses = multithread_prompts(client, node_extraction_prompts, response_format="json")
    mentioned_responses = [json.loads(res)['mentioned'] for res in responses]
    mentioned_chunks = [chunk for chunk, mentioned in zip(chunks, mentioned_responses) if mentioned == "yes"]

    # evidence extraction
    evidence_prompts = []
    for chunk in mentioned_chunks:
        interviewee_messages = [message['content'] for message in chunk['conversation'] if str(message['speaker']) == "0"]
        evidence_prompts.append(prompts.mention_extraction_prompt_factory(interviewee_messages, var_name, var_definition))
    # evidence_prompts = evidence_prompts[:10]
    responses = multithread_prompts(client, evidence_prompts, response_format="json")
    evidence_response = [json.loads(res)['mentions'] for res in responses] 
    final_mentions = []
    for chunk, evidence in zip(mentioned_chunks, evidence_response):
        if len(evidence) == 0: continue
        evidence = list(set(evidence))
        final_mentions.append({
            "chunk_id": chunk['id'],
            "conversation_ids": evidence,
        })
    var_type_nodes = json.load(open(node_file_path))
    var_type_nodes['variable_mentions'][var_name] = {
        "variable_name": var_name,
        "mentions": final_mentions
    }
    save_json(var_type_nodes, node_file_path)

    final_mention_chunks = [chunk_dict[mention['chunk_id']] for mention in final_mentions]
    new_connections = connection_extraction(client, final_mention_chunks, var_name, var_type, var_definition, all_def_dict)
    old_connections = json.load(open(link_file_path))
    save_json(old_connections + new_connections, link_file_path)


def connection_extraction(client, chunks, new_var, new_var_type, new_var_def, def_dict):
    var_types = ['driver', 'pressure', 'state', 'impact', 'response']
    relationships_prompts = []
    metadata_list = []
    for chunk in chunks:
        for indicator2 in var_types:
            indicator1 = new_var_type
            if indicator1 in chunk["var_mentions"] and indicator2 in chunk["var_mentions"]:
                # get chunk content
                chunk_content = messages_to_str(chunk["conversation"])
                vars2 = list(map(lambda m: m['var_name'], chunk["var_mentions"][indicator2]))
                comb_vars1_vars2 = [[new_var, var2] for var2 in vars2]
                for comb in comb_vars1_vars2:
                    var2_def = def_dict[comb[1]]
                    relationships_prompts.append(prompts.find_relationships_chunk_prompts_factory(chunk_content, comb, new_var_def, var2_def))
                    metadata_list.append({"chunk_id": chunk['id'], "var1": comb[0], "var2": comb[1], "indicator1": indicator1, "indicator2": indicator2})
    # relationships_prompts = relationships_prompts[:50]
    # metadata_list = metadata_list[:50]
    connections = multithread_prompts(client, relationships_prompts, model="gpt-3.5-turbo-0125", response_format="json")
    results = []
    for response, metadata in zip(connections, metadata_list):
        try:
            response = json.loads(response)
        except:
            response = "error"
        # filter responses with no connection
        if response["relationship"] == "No": continue
        results.append({
            "chunk_id": metadata["chunk_id"],
            "var1": metadata["var1"],
            "var2": metadata["var2"],
            "indicator1": metadata["indicator1"],
            "indicator2": metadata["indicator2"],
            "response": response
        })
    return results

def save_json(data, filepath):
    with open(filepath, 'w', encoding='utf-8') as fp:
        json.dump(data, fp, indent=4, ensure_ascii=False)

def messages_to_str(messages): 
    result = ""
    for conversation in messages:
        if str(conversation["speaker"]) == "1":
            result += "Interviewer: " 
        else:
            result += "Interviewee: "
        result += conversation["content"] + "\n"
    return result
def combination(vars1, vars2):
    combs = []
    for var1 in vars1:
        for var2 in vars2:
            combs.append([var1, var2])
    return combs
