import glob
from flask import Flask, request
from flask_cors import CORS
import json
import os

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




#init, do not read data
app = Flask(__name__)
CORS(app)
dirname = os.path.dirname(__file__)
relative_path = lambda dirname, filename: os.path.join(dirname, filename)

@app.route("/test/")
def test():
    return "Hello Lyudao"

@app.route("/data/") #read local data0
def get_data():
    driver_defs = json.load(open(relative_path(dirname, 'data/v2/variable_definitions/Drivers_variables_def.json'), encoding='utf-8'))
    pressure_defs = json.load(open(relative_path(dirname, 'data/v2/variable_definitions/Pressures_variables_def.json'), encoding='utf-8')) 
    state_defs = json.load(open(relative_path(dirname, 'data/v2/variable_definitions/States_variables_def.json'), encoding='utf-8'))
    impact_defs = json.load(open(relative_path(dirname, 'data/v2/variable_definitions/Impacts_variables_def.json'), encoding='utf-8'))
    response_defs = json.load(open(relative_path(dirname, 'data/v2/variable_definitions/Responses_variables_def.json'), encoding='utf-8'))
    driver_nodes = json.load(open(relative_path(dirname, 'data/v2/nodes/Drivers_nodes.json')))
    pressure_nodes = json.load(open(relative_path(dirname, 'data/v2/nodes/Pressures_nodes.json')))
    state_nodes = json.load(open(relative_path(dirname, 'data/v2/nodes/States_nodes.json')))
    impact_nodes = json.load(open(relative_path(dirname, 'data/v2/nodes/Impacts_nodes.json')))
    response_nodes = json.load(open(relative_path(dirname, 'data/v2/nodes/Responses_nodes.json')))
    links = json.load(open(relative_path(dirname, 'data/v2/nodes/connections.json')))

    # clean up data keys
    # nodes
    driver_nodes = clean_up_nodes(driver_nodes)
    pressure_nodes = clean_up_nodes(pressure_nodes)
    state_nodes = clean_up_nodes(state_nodes)
    impact_nodes = clean_up_nodes(impact_nodes)
    response_nodes = clean_up_nodes(response_nodes)
    # links
    for index, link in enumerate(links):
        if link['indicator1'].endswith('s'):
            link['indicator1'] = link['indicator1'][:-1]
        if link['indicator2'].endswith('s'):
            link['indicator2'] = link['indicator2'][:-1]
        links[index] = link

    # preprocessing type firt 

    interview_data = process_interview(glob.glob(relative_path(dirname, 'data/v2/chunk/chunk_summaries_w_ktte/*.json')))

    return {
        "interviews": interview_data,
        "nodes": {
            "driver": driver_nodes,
            "pressure": pressure_nodes,
            "state": state_nodes,
            "impact": impact_nodes,
            "response": response_nodes
        },
        "metadata": {
            "driver": driver_defs,
            "pressure": pressure_defs,
            "state": state_defs,
            "impact": impact_defs,
            "response": response_defs
        },
        "links": links,
    }

def clean_up_nodes(node):
    if node['variable_type'].endswith('s'):
        node['variable_type'] = node['variable_type'][:-1]
    node['variable_type'] = node['variable_type'].lower()
    return node