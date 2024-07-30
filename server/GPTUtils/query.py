import concurrent 
from tqdm import tqdm
import tiktoken
import json 
import requests
# from . import prompts
from GPTUtils import prompts
from openai import RateLimitError, APITimeoutError
import time
from pydantic import BaseModel
from typing import Dict, List


class tMessage(BaseModel):
    speaker: int
    content: str
class tChunk(BaseModel):
    id: str
    conversation: List[tMessage]
    raw_keywords: List[str]
    title: str
    topic: str
    emotion: str
class tVarMention(BaseModel):
    var_name: str
    conversation_ids: List[int]
class tChunkWithVarMentions(tChunk):
    var_mentions: Dict[str, List[tVarMention]]

def multithread_prompts(client, prompts, model="gpt-4o-mini", temperature=0.5, response_format=None):
    l = len(prompts)
    # results = np.zeros(l)
    with tqdm(total=l) as pbar:
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=100)
        futures = [executor.submit(request_gpt, client, prompt, model, temperature, response_format) for prompt in prompts]
        for _ in concurrent.futures.as_completed(futures):
            pbar.update(1)
    concurrent.futures.wait(futures)
    return [future.result() for future in futures]

def request_gpt(client, messages, model='gpt-4o-mini', temperature=0.5, format=None):
    with open("request_log.txt", "a", encoding="utf-8") as f:
        f.write(f"model: {model}, temperature: {temperature}, format: {format}\n")
        f.write(json.dumps(messages, ensure_ascii=False) + "\n")
        f.write("=====================================\n")
    try:
        if format == "json":
            response = client.chat.completions.create(
                model = model,
                messages=messages,
                response_format={ "type": "json_object" },
                temperature=temperature
            )
        else:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature
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

def var_extraction(
        client, 
        node_file_path: str, 
        link_file_path: str, 
        chunk_dict: Dict[str, tChunkWithVarMentions], 
        var_name: str, 
        var_type: str, 
        var_definition: str, 
        all_def_dict: dict):
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
    var_type_nodes = json.load(open(node_file_path, encoding='utf-8'))
    var_type_nodes['variable_mentions'][var_name] = {
        "variable_name": var_name,
        "mentions": final_mentions
    }
    save_json(var_type_nodes, node_file_path)

    final_mention_chunks = [chunk_dict[mention['chunk_id']] for mention in final_mentions]
    new_connections = connection_extraction(client, final_mention_chunks, var_name, var_type, var_definition, all_def_dict)
    old_connections = json.load(open(link_file_path, encoding='utf-8'))
    save_json(old_connections + new_connections, link_file_path)


def connection_extraction(
        client, 
        chunks: List[tChunkWithVarMentions], 
        new_var: str, 
        new_var_type: str, 
        new_var_def: str, 
        def_dict: dict):
    var_types = ['driver', 'pressure', 'state', 'impact', 'response']
    relationships_prompts = []
    metadata_list = []
    for chunk in chunks:
        for indicator2 in var_types:
            indicator1 = new_var_type
            print(chunk)
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

def speaker_to_string(speaker):
    return "Interviewer" if str(speaker) == "1" else "Interviewee"
def conversation_to_string(conversation):
    return "\n".join([
        f"{index}: {speaker_to_string(message['speaker'])}: {message['content']}\n"
        for index, message in enumerate(conversation)
        ]
    )
def identify_var_types(all_chunks, openai_client, system_prompt_blocks, user_prompt_blocks, prompt_variables):
    prompt_list = []
    response_format, extract_response_func = None, None
    for chunk in all_chunks:
        conversation = chunk['conversation']
        prompt_variables['conversation'] = conversation_to_string(conversation)
        prompt, response_format, extract_response_func = prompts.identify_var_type_prompt_factory(system_prompt_blocks, user_prompt_blocks, prompt_variables)
        prompt_list.append(prompt)
    responses = multithread_prompts(openai_client, prompt_list, response_format=response_format, temperature=0.0)
    if response_format == 'json':
        responses = [extract_response_func(i) for i in responses]
    for (chunk_index, extraction_result) in enumerate(responses):
        chunk = all_chunks[chunk_index]
        chunk['identify_var_types_result'] = extraction_result
    return all_chunks

def identify_vars(all_chunks, openai_client, system_prompt_blocks, user_prompt_blocks, prompt_variables):
    prompt_list = []
    response_format, extract_response_func = None, None
    response_index_to_chunk_index = {}
    response_index = 0
    for chunk_index, chunk in enumerate(all_chunks):
        chunk["identify_vars_result"] = {}
        var_types = chunk['identify_var_types_result']
        if len(var_types) == 0:
            continue
        conversation = chunk['conversation']
        prompt_variables['conversation'] = conversation_to_string(conversation)
        for var_type in var_types:
            prompt_variables['var_type'] = var_type['var_type'] + prompt_variables[var_type['var_type']]['definition']
            prompt_variables['explanation'] = var_type['explanation']
            prompt_variables['vars'] = prompt_variables[var_type['var_type']]['vars']
            prompt, response_format, extract_response_func = prompts.identify_var_prompt_factory(system_prompt_blocks, user_prompt_blocks, prompt_variables)
            prompt_list.append(prompt)
            response_index_to_chunk_index[response_index] = (chunk_index, var_type)
            response_index += 1
    responses = multithread_prompts(openai_client, prompt_list, response_format=response_format, temperature=0.0)
    if response_format == 'json':
        responses = [extract_response_func(i) for i in responses]
    for (response_index, extraction_result) in enumerate(responses):
        chunk_index, var_type = response_index_to_chunk_index[response_index]
        chunk = all_chunks[chunk_index]
        chunk["identify_vars_result"][var_type['var_type']] = extraction_result
    return all_chunks

# def chunk_execute_extraction(all_chunks, openai_client, system_prompt_blocks, user_prompt_blocks, prompt_variables, prompt_factory, extraction_result_key):
#     prompt_list = []
#     response_format, extract_response_func = None, None
#     for chunk in all_chunks:
#         conversation = chunk['conversation']
#         prompt_variables['conversation'] = conversation_to_string(conversation)
#         prompt, response_format, extract_response_func = prompt_factory(system_prompt_blocks, user_prompt_blocks, prompt_variables)
#         prompt_list.append(prompt)
#     responses = multithread_prompts(openai_client, prompt_list, response_format=response_format, temperature=0.0)
#     if response_format == 'json':
#         responses = [extract_response_func(i) for i in responses]
#     for (chunk_index, extraction_result) in enumerate(responses):
#         chunk = all_chunks[chunk_index]
#         chunk[extraction_result_key] = extraction_result
#     return all_chunks

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
