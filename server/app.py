import glob
from flask import Flask, request
from flask_cors import CORS
import json
import os
from openai import OpenAI
# from . import GPTUtils
# from . import DataUtils
import GPTUtils
import DataUtils


#init, do not read data
app = Flask(__name__)
CORS(app)
dirname = os.path.dirname(__file__)
relative_path = lambda dirname, filename: os.path.join(dirname, filename)
node_data_path = relative_path(dirname, 'data/v2/tmp/nodes/')
chunk_data_path = relative_path(dirname, 'data/v2/tmp/chunk/')
metadata_path = relative_path(dirname, 'data/v2/tmp/variable_definitions/')

# openai
openai_api_key = open(relative_path(dirname, "openai_api_key")).read()
openai_client=OpenAI(api_key=openai_api_key, timeout=10)

var_types = ['driver', 'pressure', 'state', 'impact', 'response']
@app.route("/test/")
def test():
    return "Hello Lyudao"

@app.route("/data/")
def get_data():
    nodes = {}
    metadata = {}
    for var_type in var_types:
        nodes[var_type] = json.load(open(node_data_path + f"{var_type}_nodes.json", encoding='utf-8'))
        metadata[var_type] = json.load(open(metadata_path + f'{var_type}_variables_def.json', encoding='utf-8'))
    links = json.load(open(node_data_path + 'connections.json', encoding='utf-8'))
    interview_data = process_interview(glob.glob(chunk_data_path + f'chunk_summaries_w_ktte/*.json'))

    return {
        "interviews": interview_data,
        "nodes": nodes,
        "metadata": metadata,
        "links": links,
    }

@app.route("/var_extraction/", methods=['POST'])
def var_extraction():
    var_type = request.json['var_type']
    var_name = request.json['var_name']
    var_definition = request.json['var_definition']
    factor_type = request.json['factor_type']
    chunks = collect_chunks(glob.glob(chunk_data_path + f'chunk_summaries_w_ktte/*.json'))
    all_nodes = collect_nodes([node_data_path + f'{var_type}_nodes.json' for var_type in var_types])
    chunk_dict = chunk_w_var_mentions(chunks, all_nodes)
    all_def_dict = DataUtils.local.all_definitions(file_paths=[metadata_path + f'{var_type}_variables_def.json' for var_type in var_types])
    DataUtils.local.add_variable(metadata_path + f'{var_type}_variables_def.json', var_name, var_definition, factor_type)
    GPTUtils.var_extraction(
        openai_client,
        node_data_path + f'{var_type}_nodes.json',
        node_data_path + "connections.json",
        chunk_dict,
        var_name,
        var_type,
        var_definition,
        all_def_dict
    )
    return "success"

@app.route("/curation/remove/", methods=['POST'])
def remove_var():
    var_type = request.json['var_type']
    var_names = request.json['var_names']
    for var_name in var_names:
        DataUtils.local.remove_variable(
            node_file_path=node_data_path + f'{var_type}_nodes.json',
            def_file_path=metadata_path + f'{var_type}_variables_def.json',
            link_file_path=node_data_path + "connections.json",
            var_name=var_name)
    return "success"


# def clean_up_nodes(node):
#     if node['variable_type'].endswith('s'):
#         node['variable_type'] = node['variable_type'][:-1]
#     node['variable_type'] = node['variable_type'].lower()
#     return node

def process_interview(filepaths):
    interview_dict = {}
    interviews = []
    data_by_chunk = {}
    for interview_file in filepaths:
        interview_data = json.load(open(interview_file, encoding='utf-8'))
        interview_file = interview_file.replace("\\", "/")
        participant = interview_file.split('/')[-1].replace(".json", "")
        interview_dict[participant] = interview_data
        for chunk in interview_data:
            if chunk['topic'] in ['商業', '汙染', '貿易', '農業']:
                chunk['topic'] = '其他'
            data_by_chunk[chunk['id']] = chunk
    interview_dict = dict(sorted(interview_dict.items(), key=lambda x: int(x[0].replace("N", ""))))
    for participant, interview in interview_dict.items():
        interviews.append(
            {
                "file_name": participant,
                "data": interview
            }
        )
    return interviews

def collect_chunks(filepaths):
    interviews = process_interview(filepaths)
    chunks = []
    for interview in interviews:
        for chunk in interview['data']:
            chunks.append(chunk)
    return chunks
def collect_nodes(filepaths):
    from pprint import pprint
    all_nodes = []
    for filepath in filepaths:
        nodes = json.load(open(filepath, encoding='utf-8'))
        all_nodes.append(nodes)
    return all_nodes

def chunk_w_var_mentions(chunks, all_nodes):
    for chunk in chunks:
        chunk['var_mentions'] = {}
    chunk_dict = {chunk['id']: chunk for chunk in chunks}
    for node_data in all_nodes:
        var_type = node_data["variable_type"]
        var_mentions = node_data["variable_mentions"]
        for var_name, mentions in var_mentions.items():
            mentions = mentions['mentions']
            for mention in mentions:
                chunk_id = mention['chunk_id']
                conversation_ids = mention['conversation_ids']
                if var_type not in chunk_dict[chunk_id]['var_mentions']: chunk_dict[chunk_id]['var_mentions'][var_type] = []
                chunk_dict[chunk_id]['var_mentions'][var_type].append({
                    "var_name": var_name,
                    "conversation_ids": conversation_ids
                })
    return chunk_dict