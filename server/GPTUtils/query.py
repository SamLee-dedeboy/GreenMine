import concurrent
from tqdm import tqdm
import tiktoken
import json
import requests
from collections import defaultdict

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
                request_gpt, client, prompt, model, temperature, response_format, seed
            )
            for prompt in prompts
        ]
        for _ in concurrent.futures.as_completed(futures):
            pbar.update(1)
    concurrent.futures.wait(futures)
    return [future.result() for future in futures]


def multithread_embeddings(client, texts):
    l = len(texts)
    with tqdm(total=l) as pbar:
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=100)
        futures = [executor.submit(get_embedding, client, text) for text in texts]
        for _ in concurrent.futures.as_completed(futures):
            pbar.update(1)
    concurrent.futures.wait(futures)
    return [future.result() for future in futures]


def request_gpt(
    client, messages, model="gpt-4o-mini", temperature=0.5, format=None, seed=None
):
    with open("request_log.txt", "a", encoding="utf-8") as f:
        f.write(f"model: {model}, temperature: {temperature}, format: {format}\n")
        f.write(json.dumps(messages, ensure_ascii=False) + "\n")
        f.write("=====================================\n")
    try:
        if format == "json":
            response = (
                client.chat.completions.create(
                    model=model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=temperature,
                    seed=seed,
                ),
            )

        else:
            response = client.chat.completions.create(
                model=model, messages=messages, temperature=temperature, seed=seed
            )
        return response[0].choices[0].message.content
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
    # print("tokens: ", len(enc.encode(text)), len(enc.encode(text)) > 8191)
    while len(enc.encode(text)) > 8191:
        text = text[:-100]
        print("truncated: ", len(enc.encode(text)))
    try:
        return client.embeddings.create(input=[text], model=model).data[0].embedding
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
    all_def_dict: dict,
):
    node_extraction_prompts = []
    chunks = list(chunk_dict.values())
    for chunk in chunks:
        interviewee_messages = [
            message["content"]
            for message in chunk["conversation"]
            if str(message["speaker"]) == "0"
        ]
        interviewee_messages_str = "\n".join(interviewee_messages)
        node_extraction_prompts.append(
            prompts.node_extraction_prompt_factory(
                interviewee_messages_str, var_name, var_definition
            )
        )
    # node_extraction_prompts = node_extraction_prompts[:10]
    responses = multithread_prompts(
        client, node_extraction_prompts, response_format="json"
    )
    mentioned_responses = [json.loads(res)["mentioned"] for res in responses]
    mentioned_chunks = [
        chunk
        for chunk, mentioned in zip(chunks, mentioned_responses)
        if mentioned == "yes"
    ]

    # evidence extraction
    evidence_prompts = []
    for chunk in mentioned_chunks:
        interviewee_messages = [
            message["content"]
            for message in chunk["conversation"]
            if str(message["speaker"]) == "0"
        ]
        evidence_prompts.append(
            prompts.mention_extraction_prompt_factory(
                interviewee_messages, var_name, var_definition
            )
        )
    # evidence_prompts = evidence_prompts[:10]
    responses = multithread_prompts(client, evidence_prompts, response_format="json")
    evidence_response = [json.loads(res)["mentions"] for res in responses]
    final_mentions = []
    for chunk, evidence in zip(mentioned_chunks, evidence_response):
        if len(evidence) == 0:
            continue
        evidence = list(set(evidence))
        final_mentions.append(
            {
                "chunk_id": chunk["id"],
                "conversation_ids": evidence,
            }
        )
    var_type_nodes = json.load(open(node_file_path, encoding="utf-8"))
    var_type_nodes["variable_mentions"][var_name] = {
        "variable_name": var_name,
        "mentions": final_mentions,
    }
    save_json(var_type_nodes, node_file_path)

    final_mention_chunks = [
        chunk_dict[mention["chunk_id"]] for mention in final_mentions
    ]
    new_connections = connection_extraction(
        client, final_mention_chunks, var_name, var_type, var_definition, all_def_dict
    )
    old_connections = json.load(open(link_file_path, encoding="utf-8"))
    save_json(old_connections + new_connections, link_file_path)


def connection_extraction(
    client,
    chunks: List[tChunkWithVarMentions],
    new_var: str,
    new_var_type: str,
    new_var_def: str,
    def_dict: dict,
):
    var_types = ["driver", "pressure", "state", "impact", "response"]
    relationships_prompts = []
    metadata_list = []
    for chunk in chunks:
        for indicator2 in var_types:
            indicator1 = new_var_type
            print(chunk)
            if (
                indicator1 in chunk["var_mentions"]
                and indicator2 in chunk["var_mentions"]
            ):
                # get chunk content
                chunk_content = messages_to_str(chunk["conversation"])
                vars2 = list(
                    map(lambda m: m["var_name"], chunk["var_mentions"][indicator2])
                )
                comb_vars1_vars2 = [[new_var, var2] for var2 in vars2]
                for comb in comb_vars1_vars2:
                    var2_def = def_dict[comb[1]]
                    relationships_prompts.append(
                        prompts.find_relationships_chunk_prompts_factory(
                            chunk_content, comb, new_var_def, var2_def
                        )
                    )
                    metadata_list.append(
                        {
                            "chunk_id": chunk["id"],
                            "var1": comb[0],
                            "var2": comb[1],
                            "indicator1": indicator1,
                            "indicator2": indicator2,
                        }
                    )
    # relationships_prompts = relationships_prompts[:50]
    # metadata_list = metadata_list[:50]
    connections = multithread_prompts(
        client,
        relationships_prompts,
        model="gpt-3.5-turbo-0125",
        response_format="json",
    )
    results = []
    for response, metadata in zip(connections, metadata_list):
        try:
            response = json.loads(response)
        except:
            response = "error"
        # filter responses with no connection
        if response["relationship"] == "No":
            continue
        results.append(
            {
                "chunk_id": metadata["chunk_id"],
                "var1": metadata["var1"],
                "var2": metadata["var2"],
                "indicator1": metadata["indicator1"],
                "indicator2": metadata["indicator2"],
                "response": response,
            }
        )
    return results


def identify_var_types(
    all_chunks,
    openai_client,
    system_prompt_blocks,
    user_prompt_blocks,
    prompt_variables,
):
    prompt_list = []
    response_format, extract_response_func = None, None
    for chunk in all_chunks:
        conversation = chunk["conversation"]
        prompt_variables["conversation"] = conversation_to_string(conversation)
        prompt, response_format, extract_response_func = (
            prompts.identify_var_type_prompt_factory(
                system_prompt_blocks, user_prompt_blocks, prompt_variables
            )
        )
        prompt_list.append(prompt)

    def post_process(all_chunks, responses):
        for chunk_index, extraction_result in enumerate(responses):
            chunk = all_chunks[chunk_index]
            var_type_checklist = ["driver", "pressure", "state", "impact", "response"]
            extraction_result = list(
                filter(lambda x: x["var_type"] in var_type_checklist, extraction_result)
            )
            extraction_result = filter_evidences(
                extraction_result, len(chunk["conversation"])
            )
            chunk["identify_var_types_result"] = extraction_result
            all_chunks[chunk_index] = chunk
        return all_chunks

    return prompt_list, post_process, response_format, extract_response_func


def identify_vars(
    all_chunks,
    openai_client,
    system_prompt_blocks,
    user_prompt_blocks,
    prompt_variables,
):
    prompt_list = []
    response_format, extract_response_func = None, None
    response_index_to_chunk_index = {}
    response_index = 0
    for chunk_index, chunk in enumerate(all_chunks):
        chunk["identify_vars_result"] = {}
        var_types = chunk["identify_var_types_result"]
        if len(var_types) == 0:
            continue
        conversation = chunk["conversation"]
        prompt_variables["conversation"] = conversation_to_string(conversation)
        for var_type in var_types:
            prompt_variables["indicator"] = (
                var_type["var_type"]
                + prompt_variables[var_type["var_type"]]["definition"]
            )
            prompt_variables["explanation"] = var_type["explanation"]
            prompt_variables["variables"] = prompt_variables[var_type["var_type"]][
                "vars"
            ]
            prompt, response_format, extract_response_func = (
                prompts.identify_var_prompt_factory(
                    system_prompt_blocks, user_prompt_blocks, prompt_variables
                )
            )
            prompt_list.append(prompt)
            response_index_to_chunk_index[response_index] = (chunk_index, var_type)
            response_index += 1

    def post_process(
        all_chunks, responses, response_index_to_chunk_index, prompt_variables
    ):
        for response_index, extraction_result in enumerate(responses):
            chunk_index, var_type = response_index_to_chunk_index[response_index]
            chunk = all_chunks[chunk_index]
            var_checklist = prompt_variables[var_type["var_type"]]["var_checklist"]
            extraction_result = list(
                filter(lambda x: x["var"] in var_checklist, extraction_result)
            )
            extraction_result = filter_evidences(
                extraction_result, len(chunk["conversation"])
            )
            chunk["identify_vars_result"][var_type["var_type"]] = extraction_result
            all_chunks[chunk_index] = chunk
        return all_chunks

    return (
        prompt_list,
        post_process,
        response_format,
        extract_response_func,
        response_index_to_chunk_index,
        prompt_variables,
    )


def identify_links(
    all_chunks,
    links,
    openai_client,
    system_prompt_blocks,
    user_prompt_blocks,
    prompt_variables,
):
    chunk_dict = {
        chunk["id"]: dict(chunk, **{"identify_links_result": []})
        for chunk in all_chunks
    }
    prompt_list = []
    chunk_id_list = []
    link_metadata_list = []
    variable_definitions = prompt_variables["variable_definitions"]
    for link in links:
        if link["var1"] == "其他" or link["var2"] == "其他":
            continue
        conversation = chunk_dict[link["chunk_id"]]["conversation"]
        prompt_variables["conversation"] = conversation_to_string(conversation)
        prompt_variables["variable1"] = (
            f"{link['var1']}, {variable_definitions[link['var1']]}"
        )
        prompt_variables["variable2"] = (
            f"{link['var2']}, {variable_definitions[link['var2']]}"
        )
        prompt, response_format, extract_response_func = (
            prompts.identify_link_prompt_factory(
                system_prompt_blocks, user_prompt_blocks, prompt_variables
            )
        )
        prompt_list.append(prompt)
        chunk_id_list.append(link["chunk_id"])
        link_metadata_list.append(link)
    responses = multithread_prompts(
        openai_client, prompt_list, response_format=response_format, temperature=0.0
    )
    if response_format == "json":
        responses = [extract_response_func(i) for i in responses]

    for response_index, extraction_result in enumerate(responses):
        if extraction_result is None:
            continue
        chunk_id = chunk_id_list[response_index]
        chunk = chunk_dict[chunk_id]
        extraction_result = filter_evidences(
            [extraction_result], len(chunk["conversation"])
        )[0]
        link_metadata = link_metadata_list[response_index]
        # check if the source and target variables are valid
        if (
            extraction_result["source"] != link_metadata["var1"]
            and extraction_result["source"] != link_metadata["var2"]
        ):
            continue
        if (
            extraction_result["target"] != link_metadata["var1"]
            and extraction_result["target"] != link_metadata["var2"]
        ):
            continue
        if extraction_result["source"] == link_metadata["var1"]:
            source_var, source_indicator = (
                link_metadata["var1"],
                link_metadata["indicator1"],
            )
            target_var, target_indicator = (
                link_metadata["var2"],
                link_metadata["indicator2"],
            )
        else:
            source_var, source_indicator = (
                link_metadata["var2"],
                link_metadata["indicator2"],
            )
            target_var, target_indicator = (
                link_metadata["var1"],
                link_metadata["indicator1"],
            )
        chunk["identify_links_result"].append(
            {
                "chunk_id": link_metadata["chunk_id"],
                # "var1": link_metadata["var1"],
                # "var2": link_metadata["var2"],
                "var1": source_var,
                "var2": target_var,
                "indicator1": source_indicator,
                "indicator2": target_indicator,
                "response": extraction_result,
            }
        )
    all_chunks = list(chunk_dict.values())
    return all_chunks


def filter_candidate_links(chunk_w_vars):
    links = []
    for chunk in chunk_w_vars:
        chunk_id = chunk["id"]
        all_vars_in_chunk = [
            (var_type, var_mention)
            for var_type, var_mentions in chunk["identify_vars_result"].items()
            for var_mention in var_mentions
        ]
        if len(all_vars_in_chunk) == 0:
            continue
        for i in range(len(all_vars_in_chunk)):
            for j in range(i + 1, len(all_vars_in_chunk)):
                indicator1, var1 = all_vars_in_chunk[i]
                indicator2, var2 = all_vars_in_chunk[j]
                links.append(
                    {
                        "chunk_id": chunk_id,
                        "var1": var1["var"],
                        "var2": var2["var"],
                        "indicator1": indicator1,
                        "indicator2": indicator2,
                        "response": {"relationship": "", "evidence": ""},
                    }
                )
    return links


def cluster_topic_assignments(client, clusters, texts):
    cluster_texts = defaultdict(list)
    for cluster, text in zip(clusters, texts):
        cluster_texts[cluster].append(text)
    prompt_list = []
    cluster_list = []
    for cluster, texts in cluster_texts.items():
        prompt, response_format, extract_response_func = (
            prompts.topic_assignment_prompt_factory(texts)
        )
        prompt_list.append(prompt)
        cluster_list.append(cluster)
    responses = multithread_prompts(client, prompt_list, response_format="json")
    if response_format == "json":
        responses = [extract_response_func(i) for i in responses]

    cluster_topics = {
        cluster: response for cluster, response in zip(cluster_list, responses)
    }
    return cluster_topics


def filter_evidences(extraction_result, max_index):
    for index, var_type in enumerate(extraction_result):
        var_type["evidence"] = list(
            filter(lambda evidence: evidence < max_index, var_type["evidence"])
        )
        extraction_result[index] = var_type
    return extraction_result


def save_json(data, filepath):
    with open(filepath, "w", encoding="utf-8") as fp:
        json.dump(data, fp, indent=4, ensure_ascii=False)


def speaker_to_string(speaker):
    return "Interviewer" if str(speaker) == "1" else "Interviewee"


def conversation_to_string(conversation):
    return "\n".join(
        [
            f"{index}: {speaker_to_string(message['speaker'])}: {message['content']}\n"
            for index, message in enumerate(conversation)
        ]
    )


# def messages_to_str(messages):
#     result = ""
#     for conversation in messages:
#         if str(conversation["speaker"]) == "1":
#             result += "Interviewer: "
#         else:
#             result += "Interviewee: "
#         result += conversation["content"] + "\n"
#     return result
# def combination(vars1, vars2):
#     combs = []
#     for var1 in vars1:
#         for var2 in vars2:
#             combs.append([var1, var2])
#     return combs
