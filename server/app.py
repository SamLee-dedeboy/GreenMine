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
openai_client=OpenAI(api_key=openai_api_key)


var_types = ['driver', 'pressure', 'state', 'impact', 'response']
@app.route("/test/")
def test():
    return "Hello Lyudao"

@app.route("/data/")
def get_data():
    nodes = {}
    metadata = {}
    for var_type in var_types:
        nodes[var_type] = clean_up_nodes(json.load(open(node_data_path + f"{var_type}_nodes.json")))
        metadata[var_type] = json.load(open(metadata_path + f'{var_type}_variables_def.json'))
    links = json.load(open(node_data_path + 'connections.json'))

    # links
    for index, link in enumerate(links):
        if link['indicator1'].endswith('s'):
            link['indicator1'] = link['indicator1'][:-1]
        if link['indicator2'].endswith('s'):
            link['indicator2'] = link['indicator2'][:-1]
        links[index] = link


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
    DataUtils.local.add_variable(metadata_path + f'{var_type}_variables_def.json', var_name, var_definition, factor_type)
    GPTUtils.var_extraction(openai_client, node_data_path + f'{var_type}_nodes.json', chunks, var_name, var_definition)
    return "success"

def clean_up_nodes(node):
    if node['variable_type'].endswith('s'):
        node['variable_type'] = node['variable_type'][:-1]
    node['variable_type'] = node['variable_type'].lower()
    return node

def process_interview(filepaths):
    interview_dict = {}
    interviews = []
    data_by_chunk = {}
    for interview_file in filepaths:
        interview_data = json.load(open(interview_file))
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