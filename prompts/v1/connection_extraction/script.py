import json
from openai import OpenAI
import concurrent 
from tqdm import tqdm
import glob

indicator_combinations = [("Drivers", "Pressures"), ("Pressures", "States"), ("States", "Impacts"), ("Impacts", "Responses"), ("Responses", "Drivers"), ("Responses", "Pressures"), ("Responses", "States")]

def combine_chunks(nodes_data, formatted_chunks):
    indicator = nodes_data["variable_type"]
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
    # print(formatted_chunks)

api_key = open("api_key").read()
client=OpenAI(api_key=api_key)

def get_chunk_content(chunk_id):
    chunk_content = ""
    chunk_id_parts = chunk_id.split("_")
    file_name = chunk_id_parts[0]+"_"+chunk_id_parts[1]+".json"
    chunk_index = int(chunk_id_parts[2])
    with open('./data/chunk_summaries/' + file_name, 'r') as file:
        chunk = json.load(file)[chunk_index]
    for conversation in chunk["conversation"]:
        if conversation["speaker"]==1:
            chunk_content += "interviewer: " 
        else:
            chunk_content += "interviewee: "
        chunk_content += conversation["content"] + "\n"
    return chunk_content

def combination(vars1, vars2):
    combs = []
    for var1 in vars1:
        for var2 in vars2:
            combs.append([var1, var2])
    return combs

def get_variable_definitions(indicator, var):
    with open('./data/variable_definitions/'+indicator+'_variables.json', 'r') as file:
        vars_def = json.load(file)
    return vars_def[var]

def request_chatgpt(client, messages, model='gpt-3.5-turbo-0125', format=None):
    if format == "json":
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            response_format={ "type": "json_object" },
            temperature=0
        )
    else:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0
        )
    return response.choices[0].message.content

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

def find_relationships_chunk_prompts_factory(chunk_content, comb, indicator1, indicator2):
    var1_def = get_variable_definitions(indicator1, comb[0])
    var2_def = get_variable_definitions(indicator2, comb[1])
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

def find_vars_relationships(chunks):
    relationships_prompts = []
    metadata_list = []
    for chunk_id in chunks:
        for indicator1, indicator2 in indicator_combinations:
            if indicator1 in chunks[chunk_id]["var_mentions"] and indicator2 in chunks[chunk_id]["var_mentions"]:
                # get chunk content
                chunk_content = get_chunk_content(chunk_id)
                vars1 = chunks[chunk_id]["var_mentions"][indicator1]
                vars2 = chunks[chunk_id]["var_mentions"][indicator2]
                # get combinations of lists vars1 and vars2
                comb_vars1_vars2 = combination(vars1, vars2)          
                # relationships_prompts = [find_relationships_chunk_prompts_factory(chunk_content, comb, indicator1, indicator2) for comb in comb_vars1_vars2]
                # relationships_prompts += [find_relationships_chunk_prompts_factory(chunk_content, comb, indicator1, indicator2) for comb in comb_vars1_vars2]
                # metadata_list.append({"chunk_id": chunk_id, "vars1": vars1, "vars2": vars2, "indicator1": indicator1, "indicator2": indicator2})
                for comb in comb_vars1_vars2:
                    relationships_prompts.append(find_relationships_chunk_prompts_factory(chunk_content, comb, indicator1, indicator2))
                    metadata_list.append({"chunk_id": chunk_id, "var1": comb[0], "var2": comb[1], "indicator1": indicator1, "indicator2": indicator2})
                # print(relationships_prompts)
                # connections = multithread_prompts(client, relationships_prompts, model="gpt-3.5-turbo-0125", response_format="json")
                # print(connections) # a list of json objects
                # return 
    # print(len(relationships_prompts))
    relationships_prompts = relationships_prompts[:100]
    metadata_list = metadata_list[:100]
    connections = multithread_prompts(client, relationships_prompts, model="gpt-3.5-turbo-0125", response_format="json")
    results = []
    for response, metadata in zip(connections, metadata_list):
        # print(response)
        # print(metadata)
        response = json.loads(response)
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
    # save to json
    with open('data/connections.json', 'w') as outfile:
        json.dump(results, outfile, indent=4)
    
# sortedChunks = json.load(open('./data/sorted_chunks.json', 'r'))
# find_vars_relationships(sortedChunks)

def main():
    nodes_files = glob.glob('./data/nodes/*.json')
    combined_chunks = {}
    for nodes_file in nodes_files:
        nodes_data = json.load(open(nodes_file))
        combine_chunks(nodes_data, combined_chunks)
    # convert combined_chunks to json
    with open('data/combined_chunks.json', 'w') as outfile:
        json.dump(combined_chunks, outfile, indent=4)
    find_vars_relationships(combined_chunks)

# def main():
#     data = json.load(open("data.json"))
if __name__ == "__main__":
    main()