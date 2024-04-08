from openai import OpenAI
import glob
import tiktoken
import json
import requests
import concurrent
from tqdm import tqdm
import time
from tenacity import (
    retry,
    wait_fixed,
)  
api_key = open("api_key", "r").read()
client = OpenAI(api_key=api_key)

@retry(wait=wait_fixed(1))
def request_gpt4(messages, response_format=None):
    # enc = tiktoken.encoding_for_model("gpt-4-1106-preview")
    enc = tiktoken.encoding_for_model("gpt-3.5-turbo-0125")
    text = json.dumps(messages)
    # print(len(enc.encode(text)))
    kept_index = 0
    if len(enc.encode(text)) > 16385:
        while len(enc.encode(text)) > 16385:
        # while len(enc.encode(text)) > 128000:
            # print(len(enc.encode(text)), " truncating...")
            # find the first user input
            for index, message in enumerate(messages):
                if message['role'] == 'user' and len(message['content']) > 10:
                    messages[index] = {
                        "role": "user",
                        "content": message['content'][:-10]
                    }
                    break
            text = json.dumps(messages)
        # print(len(enc.encode(text)), "truncation done.")
        # print(len(enc.encode(text)))
    if response_format == "json":
        response = client.chat.completions.create(
            model="gpt-3.5-turbo-0125",
            messages=messages,
            response_format={ "type": "json_object" },
            temperature=0.5
        )
        return json.loads(response.choices[0].message.content)
    else:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo-0125",
            messages=messages,
            temperature=0.5
        )
        return response.choices[0].message.content

def multithread_prompts(prompts, response_format=None):
    l = len(prompts)
    # results = np.zeros(l)
    with tqdm(total=l) as pbar:
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=l)
        futures = [executor.submit(request_gpt4, prompt, response_format) for prompt in prompts]
        for _ in concurrent.futures.as_completed(futures):
            pbar.update(1)
    concurrent.futures.wait(futures)
    return [future.result() for future in futures]

def save_json(data, filepath=r'new_data.json'):
    with open(filepath, 'w', encoding='utf-8') as fp:
        json.dump(data, fp, indent=4)

# def get_embedding(text, model="text-embedding-ada-002"):
#     enc = tiktoken.encoding_for_model(model)
#     while len(enc.encode(text)) > 8191:
#         text = text[:-100]
#     url = 'https://api.openai.com/v1/embeddings'
#     headers = {
#         'Content-Type': 'application/json',
#         'Authorization': "Bearer {}".format(api_key)
#     }
#     data = {
#         "input": text,
#         "model": model
#     }
#     res = requests.post(url, headers=headers, json=data)
#     res = res.json()
#     return res['data'][0]['embedding']

def cosine_similarity(a, b):
    from numpy import dot
    from numpy.linalg import norm
    return dot(a, b)/(norm(a)*norm(b))
from pprint import pprint

# def generate_nodes(paragraph, var_type_def, definition_dict, var_type, chunk_id):
def node_extraction_prompt_factory(paragraph, var_type_def, definition_dict, var_type, chunk_id):
    definitions = [f"{index+1}: {var}. Examples: {definition_dict[var]}" for index, var in enumerate(definition_dict.keys())]
    var_list = [var for var in definition_dict.keys()]
    var_definitions = "\n".join(definitions)
    var_num = len(definition_dict.keys())

    # 驅動變數是基本的人為原因，引起環境中的某些影響，以滿足基本的人類需求。
    # 壓力是對環境或生態系統的負面現象或活動，這些是由驅動變數引起的或自然發生的。
    # 狀態指的是特定時間框架和區域內的物理、化學和生物現象的數量和質量。
    # 影響指的是環境條件、生態系統功能或人類福祉方面的不良變化。 
    # 回應指的是保護環境、應對環境問題或友善環境的任何行為、行動或努力。

    messages = [
        {
            "role":"system",
            "content":""" You are a variables identification system.
            The user wants you to identify if there are any {var_type} in the monologue.
            A {var_type} is defined as: {var_type_def}.
            It may include the following objects: {var_definitions}
            The user will give you a monologue in Chinese.
            You will need to identify the objects that are related to the monologue.
            All object names must match one of the {var_num} objects in this list: {var_list}.
            DO NOT MAKE UP OBJECTS NOT IN THE LIST.
            Note that some object might not be mentioned in the monologue.
            If the monologue does not mention any object, reply with an empty list.
            Please provide output in JSON format as follows:
            {{
                "objects": [] (objects from the object list)
            }}
            """.format(var_type=var_type, var_definitions=var_definitions, var_num=var_num, var_type_def=var_type_def, var_list=var_list)
        },
        {
            "role":"user",
            # "content":"Monologue: {paragraph} \n List of definitions:{var_definitions} \n List of variables:{var_list}".format(paragraph=paragraph,var_definitions=var_definitions, var_list=var_list)
            "content":"Monologue: {paragraph}.  ".format(paragraph=paragraph,var_definitions=var_definitions)
        },
    ]
    return messages
   
def mention_extraction_prompt_factory(sentences, extracted_var):
    sentences_str = "" 
    for index, sentence in enumerate(sentences):
        sentences_str += f"{index}: {sentence} \n"
    messages = [
        {
            "role": "system",
            "content": """You are a mention extraction system that extracts mentions from a monologue.
            The user will give you a monologue and a keyword in Chinese.
            You need to extract the sentences that contain the keyword from the monologue.
            Note that the keyword may not be directly matched in the monologue, instead, it could be a synonym or a related word, or if the sentence is talking in relevant context.
            Reply with the following JSON format:
            {
                "mentions": [] (list of sentence indices)
            }
            """
        }, 
        {
            "role": "user",
            "content": "Keyword: {extracted_var} \n Monologue: {sentences_str}".format(extracted_var=extracted_var, sentences_str=sentences_str)
        }
    ]
    return messages
   

def extract_nodes():
    from collections import defaultdict
    variable_types = ["Drivers", "Pressures", "States", "Impacts", "Responses"]
    # variable_types = ["Pressures", "States", "Impacts", "Responses"]
    variable_type_defs = {
        "Drivers": "驅動變數是基本的人為原因，引起環境中的某些影響，以滿足基本的人類需求。",
        "Pressures": "壓力是對環境或生態系統的負面現象或活動，這些是由驅動變數引起的或自然發生的。",
        "States": "狀態指的是特定時間框架和區域內的物理、化學和生物現象的數量和質量。",
        "Impacts": "影響指的是環境條件、生態系統功能或人類福祉方面的不良變化。",
        "Responses": "回應指的是保護環境、應對環境問題或友善環境的任何行為、行動或努力。"
    }
    chunks = []
    for interview_file in glob.glob("chunk_summaries/*.json"):
        # print(variable_type, interview_file)
        interview_data = json.load(open(interview_file))
        for chunk in interview_data:
            chunks.append(chunk)
    for variable_type in variable_types:
        variable_examples = json.load(open("variable_definitions/{}_variables.json".format(variable_type), 'r', encoding='utf-8'))
        variable_list = [var for var in variable_examples.keys()]
        result = {
            "variable_type": variable_type,
            "variable_mentions": defaultdict(list)
        }
        for var in variable_list:
            result["variable_mentions"][var] = {
                "variable_name": var,
                "mentions": []
            }
        node_extraction_prompts = []
        print(variable_type)
        for chunk in chunks:
            interviewee_messages = [message['content'] for message in chunk['conversation'] if message['speaker'] == 0]
            interviewee_messages_str = "\n".join(interviewee_messages)
            node_extraction_prompts.append(node_extraction_prompt_factory(interviewee_messages_str, variable_type_defs[variable_type], variable_examples, variable_type, chunk['id']))
        # node_extraction_prompts = node_extraction_prompts[:10]
        chunk_nodes = multithread_prompts(node_extraction_prompts, response_format="json")
        for chunk, nodes in zip(chunks, chunk_nodes):
            if "nodes" not in chunk:
                chunk['nodes'] = {}
            chunk['nodes'][variable_type] = nodes
            # pprint(result)        
            # save_json(result, "{variable_type}_nodes.json".format(variable_type=variable_type))
    save_json(chunks, "results/tmp/chunk_nodes.json".format(variable_type=variable_type))

def extract_mentions():
    chunks = json.load(open('results/tmp/chunk_nodes.json', 'r', encoding='utf-8'))
    ids = []
    nodes = []
    prompts = []
    for chunk in chunks:
        interviewee_messages = [message['content'] for message in chunk['conversation'] if message['speaker'] == 0]
        for variable_type, value in chunk['nodes'].items():
            variables = value['objects']
            for node in variables:
                nodes.append(node)
                ids.append((chunk['id'], variable_type))
                prompts.append(mention_extraction_prompt_factory(interviewee_messages, node))
        chunk['nodes'] = []
    prompts = prompts[:10]
    node_mentions_list = multithread_prompts(prompts, response_format="json") # list of number

    chunk_dict = { chunk['id']: chunk for chunk in chunks }
    for index, node_mentions in enumerate(node_mentions_list):
        chunk_id, variable_type = ids[index]
        chunk_dict[chunk_id]['nodes'].append({
            "variable_type": variable_type,
            "variable": nodes[index],
            "mentions": node_mentions['mentions']
        })
    save_json(list(chunk_dict.values()), "results/tmp/chunk_nodes_w_mentions.json")
if __name__ == "__main__":
    extract_mentions()