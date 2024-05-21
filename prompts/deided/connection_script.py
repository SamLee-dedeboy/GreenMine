import json
from openai import OpenAI
import concurrent 
from tqdm import tqdm
import glob
from openai import RateLimitError, APITimeoutError
import time

indicator_combinations = [("Drivers", "Pressures"), ("Pressures", "States"), ("States", "Impacts"), ("Impacts", "Responses"), ("Responses", "Drivers"), ("Responses", "Pressures"), ("Responses", "States")]

def combine_chunks(nodes_data, formatted_chunks):
    indicator = nodes_data["variable_type"].lower()[:-1]
    for var in nodes_data["variable_mentions"]:
        for mention in nodes_data["variable_mentions"][var]["mentions"]:
            chunk_id = mention["chunk_id"]
            if chunk_id not in formatted_chunks:
                formatted_chunks[chunk_id] = {}
                formatted_chunks[chunk_id]["var_mentions"]={}
                formatted_chunks[chunk_id]["var_mentions"][indicator]=[]
                formatted_chunks[chunk_id]["var_mentions"][indicator].append(var)
            else:
                if indicator not in formatted_chunks[chunk_id]["var_mentions"]:
                    formatted_chunks[chunk_id]["var_mentions"][indicator]=[]
                formatted_chunks[chunk_id]["var_mentions"][indicator].append(var)
    print(formatted_chunks)

api_key = open("openai_api_key").read()
client=OpenAI(api_key=api_key, timeout=10)

def get_chunk_content(chunk_id, chunk_dict):
    chunk_content = ""
    # chunk_id_parts = chunk_id.split("_")
    # file_name = chunk_id_parts[0]+"_"+chunk_id_parts[1]+".json"
    # chunk_index = int(chunk_id_parts[2])
    # with open('tmp/chunk_nodes_w_mentions/' + file_name, 'r') as file:
    #     chunk = json.load(file)[chunk_index]
    chunk = chunk_dict[chunk_id]
    for conversation in chunk["conversation"]:
        if conversation["speaker"]==1:
            chunk_content += "Interviewer: " 
        else:
            chunk_content += "Interviewee: "
        chunk_content += conversation["content"] + "\n"
    return chunk_content

def combination(vars1, vars2):
    combs = []
    for var1 in vars1:
        for var2 in vars2:
            combs.append([var1, var2])
    return combs

def get_variable_definitions(indicator, var):
    print(indicator, var)
    with open('variable_definitions/'+indicator+'_variables.json', 'r') as file:
        vars_def = json.load(file)
    return vars_def[var]

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

def multithread_prompts(client, prompts, model="gpt-3.5-turbo-0125", response_format=None):
    l = len(prompts)
    # results = np.zeros(l)
    with tqdm(total=l) as pbar:
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=len(prompts))
        futures = [executor.submit(request_chatgpt, client, prompt, model, response_format) for prompt in prompts]
        for _ in concurrent.futures.as_completed(futures):
            pbar.update(1)
    concurrent.futures.wait(futures)
    return [future.result() for future in futures]

def find_relationships_chunk_prompts_factory(chunk_content, comb, var1_def, var2_def):
    messages = [
                        {
                            "role": "system",
                            "content": """You are an expert to find the relationship between {var1}, and {var2}.
                            Some examples of {var1} are: {var1_def}
                            Some examples of {var2} are: {var2_def}

                            You are given a conversation between two people: Interviewer and Interviewee. 
                            Identify and extract any sentences that explicitly or implicitly discuss a relationship between {var1} and {var2}.
                            If the conversation cannot indicate the relationship, please respond "No".
                            Please response in JSON format: 
                            {{"relationship": "Yes" or "No,
                              "evidence": string[] (Sentences extracted from the chunk_content)
                            }} 
                        """.format(var1=comb[0], var1_def=var1_def, var2=comb[1], var2_def=var2_def)
                        },
                        {
                            "role": "user",
                            "content": chunk_content
                        }
                ]
    return messages

def find_vars_relationships(chunks, chunk_dict):
    indicators = ["driver", "pressure", "state", "impact", "response"]
    relationships_prompts = []
    metadata_list = []
    for chunk_id in chunks:
        chunk_content = get_chunk_content(chunk_id, chunk_dict)
        # inner connections
        for indicator in indicators:
            if indicator not in chunks[chunk_id]["var_mentions"]: continue
            vars = chunks[chunk_id]["var_mentions"][indicator]
            var_combinations = [[var1, var2] for var1 in vars for var2 in vars if var1 != var2]
            for comb in var_combinations:
                var1_def = get_variable_definitions(indicator, comb[0])
                var2_def = get_variable_definitions(indicator, comb[1])
                relationships_prompts.append(find_relationships_chunk_prompts_factory(chunk_content, comb, var1_def, var2_def))
                metadata_list.append({"chunk_id": chunk_id, "var1": comb[0], "var2": comb[1], "indicator1": indicator, "indicator2": indicator})
        # outer connections
        # for indicator1, indicator2 in indicator_combinations:
        #     if indicator1 in chunks[chunk_id]["var_mentions"] and indicator2 in chunks[chunk_id]["var_mentions"]:
        #         # get chunk content
        #         chunk_content = get_chunk_content(chunk_id, chunk_dict)
        #         vars1 = chunks[chunk_id]["var_mentions"][indicator1]
        #         vars2 = chunks[chunk_id]["var_mentions"][indicator2]
        #         # get combinations of lists vars1 and vars2
        #         comb_vars1_vars2 = combination(vars1, vars2)          
        #         for comb in comb_vars1_vars2:
                    # var1_def = get_variable_definitions(indicator1, comb[0])
                    # var2_def = get_variable_definitions(indicator2, comb[1])
        #             relationships_prompts.append(find_relationships_chunk_prompts_factory(chunk_content, comb, var1_def, var2_def))
        #             metadata_list.append({"chunk_id": chunk_id, "var1": comb[0], "var2": comb[1], "indicator1": indicator1, "indicator2": indicator2})
    # relationships_prompts = relationships_prompts[:50]
    # metadata_list = metadata_list[:50]
    connections = multithread_prompts(client, relationships_prompts, model="gpt-3.5-turbo-0125", response_format="json")
    results = []
    for response, metadata in zip(connections, metadata_list):
        # print(response)
        # print(metadata)
        try:
            response = json.loads(response)
        except:
            response = "error"
        # filter unuseful responses
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
    # save to json
    # with open('tmp/connections.json', 'w') as outfile:
    #     json.dump(results, outfile, indent=4)
    
# sortedChunks = json.load(open('./data/sorted_chunks.json', 'r'))
# find_vars_relationships(sortedChunks)

def main():
    nodes_files = glob.glob('tmp/nodes/*.json')
    combined_chunks = {}
    for nodes_file in nodes_files:
        nodes_data = json.load(open(nodes_file))
        combine_chunks(nodes_data, combined_chunks)
    chunks = json.load(open("tmp/chunk_nodes_w_mentions_filtered.json", 'r'))
    chunk_dict = { chunk['id']: chunk for chunk in chunks}
    connections = find_vars_relationships(combined_chunks, chunk_dict)
    with open('tmp/inner_connections.json', 'w') as outfile:
        json.dump(connections, outfile, indent=4)

# def main():
#     data = json.load(open("data.json"))
if __name__ == "__main__":
    main()