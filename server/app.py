import glob
from flask import Flask, request
from flask_cors import CORS
import json
from DataUtils import DocumentController
from functools import cmp_to_key

app = Flask(__name__)
CORS(app)
openai_api_key = open("api_key").read()
document_controller = DocumentController(r'../data/result/chunk_embeddings/1103/all_chunks.json', openai_api_key)
def processData():
    # interview
    interviews = []
    for interview_file in glob.glob("../data/result/chunk_summaries/*.json"):
        interview_data = json.load(open(interview_file))
        file_name = interview_file.split('/')[-1].replace(".json", "")
        interviews.append(
            {
                "file_name": file_name,
                "data": interview_data
            }
        )
    def fcmp(x1, x2):
        p1 = int(x1['file_name'].replace("N", "").replace("_background", "").replace("_topics", ""))
        p2 = int(x2['file_name'].replace("N", "").replace("_background", "").replace("_topics", ""))
        if p1 != p2:
            return p1 - p2
        else:
            if x1['file_name'].find("background") != -1:
                return -1
            else:
                return 0 
    # interviews = sorted(interviews, key=lambda x: int(x['file_name'].replace("N", "").replace("_background", "").replace("_topics", "")), )
    interviews.sort(key=cmp_to_key(fcmp))
    # reports
    reports = []
    report_embeddings = {}
    for report_file in glob.glob('../data/result/proposal_embeddings/*.json'):
        report_data = json.load(open(report_file))
        file_name = report_file.split('/')[-1].replace(".json", "")
        report_embeddings[file_name] = report_data['embedding']
        del report_data['embedding']
        reports.append({
            "file_name": file_name,
            "data": report_data
        })

    # chunk_graph
    chunk_links = json.load(open("../data/result/chunk_embeddings/1103/chunk_similarities.json"))
    chunk_nodes = {}
    for interview in interviews:
        for chunk in interview['data']:
            chunk_nodes[chunk['id']] = chunk
    return interviews, reports, report_embeddings, chunk_links, chunk_nodes

interviews, reports, report_embeddings, chunk_links, chunk_nodes = processData()
    

@app.route("/data/")
def get_data():
    print("get_data")
    res = {
        'interviews': interviews,
        'reports': reports,
        'chunk_links': chunk_links,
        'chunk_nodes': chunk_nodes,
    }
    return json.dumps(res, default=vars)
@app.route("/report/relevant_nodes", methods=['POST'])
def get_relevant_nodes():
    report = request.json['report']
    report_embedding = report_embeddings[report]
    relevant_nodes = document_controller.search_by_embeddings(report_embedding)
    return json.dumps(relevant_nodes)

@app.route("/search/", methods=['POST'])
def search():
    query = request.json['query']
    type = request.json['type']
    doc_id_relevance = document_controller.search(query=query)
    if type == 'chunk':
        chunk_id_relevances = [("_".join(doc[0].split("_")[:3]), doc[1]) for doc in doc_id_relevance]
        existing_chunk_id = []
        cleaned_chunk_id_relevances = []
        for chunk_id_relevance in chunk_id_relevances:
            if chunk_id_relevance[0] not in existing_chunk_id:
                existing_chunk_id.append(chunk_id_relevance[0])
                cleaned_chunk_id_relevances.append(chunk_id_relevance)
            else:
                continue
        doc_id_relevance = cleaned_chunk_id_relevances
    return json.dumps(doc_id_relevance)

