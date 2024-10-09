import glob
from flask import Flask, request
from flask_cors import CORS
import json
import os
from openai import OpenAI
import statistics


# from . import GPTUtils
# from . import DataUtils
from GPTUtils import query, prompts
from DataUtils import local, dr, v1_processing, uncertainty, v2_processing, cluster
from collections import defaultdict
from sklearn.metrics.pairwise import pairwise_distances
import numpy as np

# init, do not read data
app = Flask(__name__)
CORS(app)
dirname = os.path.dirname(__file__)
relative_path = lambda dirname, filename: os.path.join(dirname, filename)
# node_data_path = relative_path(dirname, "data/v2/user/nodes/")
chunk_data_path = relative_path(dirname, "data/v2/user/chunk/")
keyword_data_path = relative_path(dirname, "data/v2/user/keyword/")
v1_data_path = relative_path(dirname, "data/v1/")
# pipeline result path
pipeline_result_path = relative_path(dirname, "data/v2/user/pipeline/")
# prompt path
prompt_path = relative_path(dirname, "GPTUtils/prompts/")
# prompt context data path
prompt_context_path = relative_path(dirname, "GPTUtils/contexts/")
# openai
openai_api_key = open(relative_path(dirname, "openai_api_key")).read()
openai_client = OpenAI(api_key=openai_api_key, timeout=10)

var_types = ["driver", "pressure", "state", "impact", "response"]
keyword_embeddings = json.load(
    open(keyword_data_path + "keywords.json", encoding="utf-8")
)
userdict = keyword_data_path + "userdict.txt"
stopwords = ["綠島"]
kpca_reducer = dr.init_kpca_reducer(
    list(map(lambda x: x["embedding"], keyword_embeddings))
)


@app.route("/test/")
def test():
    return "Hello Lyudao"


@app.route("/v1_data/")
def get_data():
    interview_data = process_interview(
        glob.glob(chunk_data_path + f"chunk_summaries_w_ktte/*.json")
    )
    v1_data = get_data_v1(v1_data_path)
    return {"interviews": interview_data, "v1": v1_data}


@app.route("/pipeline/<step>/all_versions/")
def get_pipeline_versions(step):
    versions = set()

    # Check prompts
    prompt_files = os.listdir(prompt_path)
    for file in prompt_files:
        if file.endswith(f"_identify_{step}s.json"):
            version = file.split("_")[0]
            versions.add(version)

    # Check pipeline results
    result_files = os.listdir(os.path.join(pipeline_result_path, f"identify_{step}s"))
    for file in result_files:
        if file.startswith("v") and file.endswith(f"_chunk_w_{step}s.json"):
            version = file.split("_")[0]
            versions.add(version)

    # Check definitions (only for var_type and var)
    if step in ["var_type", "var"]:
        definition_files = os.listdir(prompt_context_path)
        for file in definition_files:
            if file.endswith(f"_{step}_definitions.json"):
                version = file.split("_")[0]
                versions.add(version)

    # Convert versions to a sorted list of integers
    version_numbers = sorted([int(v.replace("v", "")) for v in versions])

    return {
        "step": step,
        "total_versions": len(version_numbers),
        "versions": [f"v{v}" for v in version_numbers],
    }


@app.route("/pipeline/<step>/<version>/")
def get_pipeline(step, version):
    # step = var_type, var, link
    # version_number = version.replace("v", "")
    # print(version_number)

    definitions = {}
    if step in ["var_type", "var"]:
        definitions = json.load(
            open(
                f"{prompt_context_path}{version}_{step}_definitions.json",
                encoding="utf-8",
            )
        )
    # prompts
    identify_prompts = json.load(
        open(
            f"{prompt_path}{version}_identify_{step}s.json",
            encoding="utf-8",
        )
    )
    # pipeline data
    identify_data = json.load(
        open(
            f"{pipeline_result_path}identify_{step}s/{version}_chunk_w_{step}s.json",
            encoding="utf-8",
        )
    )

    return {
        "prompts": {
            f"{step}_definitions": definitions,
            "system_prompt_blocks": identify_prompts["system_prompt_blocks"],
            "user_prompt_blocks": identify_prompts["user_prompt_blocks"],
        },
        "pipeline_result": identify_data,
    }


@app.route("/pipeline/<step>/create_and_save_new/", methods=["POST"])
def create_and_save_new_pipeline(step):
    version = request.json["version"]
    definitions = {}
    if step in ["var_type", "var"]:
        definitions = json.load(
            open(
                f"{prompt_context_path}v0_{step}_definitions.json",
                encoding="utf-8",
            )
        )
    prompts = json.load(
        open(
            f"{prompt_path}v0_identify_{step}s.json",
            encoding="utf-8",
        )
    )
    pipeline_result = []
    if step in ["var_type", "var"]:
        local.save_json(
            definitions,
            f"{prompt_context_path}{version}_{step}_definitions.json",
        )
    local.save_json(
        prompts,
        f"{prompt_path}{version}_identify_{step}s.json",
    )
    local.save_json(
        pipeline_result,
        f"{pipeline_result_path}identify_{step}s/{version}_chunk_w_{step}s.json",
    )
    return "success"


@app.route("/dpsir/<link_version>/")
def getDPSIR(link_version):
    link_version_number = link_version.replace("v", "")

    # old_links = json.load(open(node_data_path + "connections.json", encoding="utf-8"))
    identify_links = json.load(
        open(
            f"{pipeline_result_path}identify_links/v{link_version_number}_chunk_w_links.json",
            encoding="utf-8",
        )
    )
    pipeline_links = [
        link for chunk in identify_links for link in chunk["identify_links_result"]
    ]

    var_definitions = json.load(open(f"{prompt_context_path}v0_var_definitions.json"))

    nodes = v2_processing.collect_nodes(identify_links, var_types, var_definitions)
    DPSIR_data = v2_processing.generate_DPSIR_data(
        identify_links,
        nodes,
        keyword_embeddings,
        stopwords,
        userdict,
        kpca_reducer,
    )
    # filter out variables named '其他'
    for var_type, var_data in DPSIR_data.items():
        variable_mentions = var_data["variable_mentions"]
        filtered_variable_mentions = {
            var_name: mentions
            for var_name, mentions in variable_mentions.items()
            if var_name != "其他"
        }
        DPSIR_data[var_type]["variable_mentions"] = filtered_variable_mentions

    return {
        "DPSIR_data": DPSIR_data,
        "pipeline_links": pipeline_links,
    }


@app.route("/curation/identify_var_types/", methods=["POST"])
def curate_identify_var_types():
    var_type_definitions = request.json["var_type_definitions"]
    system_prompt_blocks = request.json["system_prompt_blocks"]
    user_prompt_blocks = request.json["user_prompt_blocks"]
    prompt_variables = {
        "indicators": "\n".join(
            [
                f"{var_type}: {var_type_def}"
                for var_type, var_type_def in var_type_definitions.items()
            ]
        ),
    }
    all_chunks = json.load(
        open(pipeline_result_path + "init/chunks.json", encoding="utf-8")
    )
    system_prompt_blocks = [prompt_block[1] for prompt_block in system_prompt_blocks]
    user_prompt_blocks = [prompt_block[1] for prompt_block in user_prompt_blocks]

    compute_uncertainty = (
        request.json["compute_uncertainty"]
        if "compute_uncertainty" in request.json
        else False
    )
    if not compute_uncertainty:
        all_chunks = query.identify_var_types(
            all_chunks,
            openai_client,
            system_prompt_blocks,
            user_prompt_blocks,
            prompt_variables,
        )
        return json.dumps(all_chunks, default=vars)
    else:
        all_chunks = uncertainty.identify_var_types_uncertainty(
            all_chunks,
            openai_client,
            system_prompt_blocks,
            user_prompt_blocks,
            prompt_variables,
        )
        # local.save_json(
        #     all_chunks,
        #     pipeline_result_path + "identify_var_types/chunk_w_var_types.json",
        # )
        return json.dumps(all_chunks, default=vars)


@app.route("/curation/identify_var_types/save/", methods=["POST"])
def save_identify_var_types():
    all_chunks = request.json["result"]
    context = request.json["context"]
    var_type_definitions = context["var_type_definitions"]
    version = request.json["version"]
    print(version)
    prompts = {
        "system_prompt_blocks": context["system_prompt_blocks"],
        "user_prompt_blocks": context["user_prompt_blocks"],
    }
    local.save_json(
        all_chunks,
        f"{pipeline_result_path}identify_var_types/{version}_chunk_w_var_types.json",
    )
    local.save_json(
        var_type_definitions,
        f"{prompt_context_path}{version}_var_type_definitions.json",
    )
    local.save_json(prompts, f"{prompt_path}{version}_identify_var_types.json")
    return "success"


@app.route("/curation/identify_vars/", methods=["POST"])
def curate_identify_vars():
    var_definitions = request.json["var_definitions"]
    system_prompt_blocks = request.json["system_prompt_blocks"]
    user_prompt_blocks = request.json["user_prompt_blocks"]
    current_versions = request.json["current_versions"]
    # get var type version
    var_type_version = current_versions["var_type"]
    var_type_definitions = json.load(
        open(
            f"{prompt_context_path}{var_type_version}_var_type_definitions.json",
            encoding="utf-8",
        )
    )
    # get var version
    var_version = current_versions["var"]
    var_definitions = json.load(
        open(
            f"{prompt_context_path}{var_version}_var_definitions.json", encoding="utf-8"
        )
    )
    prompt_variables = {}
    for var_type, var_type_def in var_type_definitions.items():
        prompt_variables[var_type] = {
            "definition": var_type_def,
            "vars": "\n".join(
                [
                    f"{var_datum['var_name']}: {var_datum['definition']}"
                    for var_datum in var_definitions[var_type]
                ]
            ),
            "var_checklist": [
                var_datum["var_name"] for var_datum in var_definitions[var_type]
            ],
        }
    all_chunks = json.load(
        open(
            f"{pipeline_result_path}identify_var_types/{var_type_version}_chunk_w_var_types.json",
            encoding="utf-8",
        )
    )
    system_prompt_blocks = [prompt_block[1] for prompt_block in system_prompt_blocks]
    user_prompt_blocks = [prompt_block[1] for prompt_block in user_prompt_blocks]
    compute_uncertainty = (
        request.json["compute_uncertainty"]
        if "compute_uncertainty" in request.json
        else False
    )
    if not compute_uncertainty:
        all_chunks = query.identify_vars(
            all_chunks,
            openai_client,
            system_prompt_blocks,
            user_prompt_blocks,
            prompt_variables,
        )
        # local.save_json(
        #     all_chunks,
        #     f"{pipeline_result_path}identify_vars/{var_version}_chunk_w_vars_keywords.json",
        # )
    else:
        all_chunks = uncertainty.identify_vars_uncertainty(
            all_chunks,
            openai_client,
            system_prompt_blocks,
            user_prompt_blocks,
            prompt_variables,
        )
        # local.save_json(
        #     all_chunks, pipeline_result_path + "identify_vars/chunk_w_vars.json"
        # )
    return json.dumps(all_chunks, default=vars)


@app.route("/curation/identify_vars/save/", methods=["POST"])
def save_identify_vars():
    all_chunks = request.json["result"]
    context = request.json["context"]
    var_definitions = context["var_definitions"]
    version = request.json["version"]
    prompts = {
        "system_prompt_blocks": context["system_prompt_blocks"],
        "user_prompt_blocks": context["user_prompt_blocks"],
    }

    local.save_json(
        var_definitions,
        f"{prompt_context_path}{version}_var_definitions.json",
    )
    local.save_json(prompts, f"{prompt_path}{version}_identify_vars.json")
    local.save_json(
        all_chunks, f"{pipeline_result_path}identify_vars/{version}_chunk_w_vars.json"
    )
    return "success"


@app.route("/curation/identify_links/", methods=["POST"])
def curate_identify_links():
    # raw_variable_definitions = request.json["var_def"]
    system_prompt_blocks = request.json["system_prompt_blocks"]
    user_prompt_blocks = request.json["user_prompt_blocks"]
    current_versions = request.json["current_versions"]
    # get var version
    var_version = current_versions["var"]
    all_chunks = json.load(
        open(
            f"{pipeline_result_path}identify_vars/{var_version}_chunk_w_vars.json",
            encoding="utf-8",
        )
    )
    raw_variable_definitions = json.load(
        open(
            f"{prompt_context_path}{var_version}_var_definitions.json", encoding="utf-8"
        )
    )
    # get link version
    link_version = current_versions["link"]
    candidate_links = query.filter_candidate_links(all_chunks)

    variable_definitions = {
        var_data["var_name"]: var_data["definition"]
        for var_list in raw_variable_definitions.values()
        for var_data in var_list
    }

    system_prompt_blocks = [prompt_block[1] for prompt_block in system_prompt_blocks]
    user_prompt_blocks = [prompt_block[1] for prompt_block in user_prompt_blocks]
    prompt_variables = {
        "links": candidate_links,
        "variable_definitions": variable_definitions,
    }

    compute_uncertainty = (
        request.json["compute_uncertainty"]
        if "compute_uncertainty" in request.json
        else False
    )
    if not compute_uncertainty:
        all_chunks = query.identify_links(
            all_chunks,
            candidate_links,
            openai_client,
            system_prompt_blocks,
            user_prompt_blocks,
            prompt_variables,
        )
        # local.save_json(
        #     all_chunks,
        #     pipeline_result_path + "identify_links/chunk_w_links_new_prompt_3.json",
        # )
    else:
        all_chunks = uncertainty.identify_links_uncertainty(
            all_chunks,
            candidate_links,
            openai_client,
            system_prompt_blocks,
            user_prompt_blocks,
            prompt_variables,
        )
        local.save_json(
            all_chunks,
            f"{pipeline_result_path}identify_links/{link_version}_chunk_w_links_uncertainty.json",
        )
    return json.dumps(all_chunks, default=vars)


@app.route("/curation/identify_links/save/", methods=["POST"])
def save_identify_links():
    all_chunks = request.json["result"]
    context = request.json["context"]
    # no link definitions
    version = request.json["version"]
    prompts = {
        "system_prompt_blocks": context["system_prompt_blocks"],
        "user_prompt_blocks": context["user_prompt_blocks"],
    }
    local.save_json(
        all_chunks, f"{pipeline_result_path}identify_links/{version}_chunk_w_links.json"
    )
    local.save_json(prompts, f"{prompt_path}{version}_identify_links.json")
    return "success"


# def clean_up_nodes(node):
#     if node['variable_type'].endswith('s'):
#         node['variable_type'] = node['variable_type'][:-1]
#     node['variable_type'] = node['variable_type'].lower()
#     return node


@app.route("/compute/identify_vars_keywords/others/", methods=["POST"])
def compute_identify_vars_keywords_others():
    identify_vars_result = request.json["data"]
    others_mentioned_chunks_by_var_type = defaultdict(lambda: defaultdict(list))
    for chunk in identify_vars_result:
        for var_type, variables in chunk["identify_vars_result"].items():
            other_variables = [var for var in variables if var["var"] == "其他"]
            for occurrence in other_variables:
                for keyword in occurrence["keywords"]:
                    others_mentioned_chunks_by_var_type[var_type][keyword].append(
                        {
                            "chunk_id": chunk["id"],
                            "evidence": occurrence["evidence"],
                            "explanation": occurrence["explanation"],
                        }
                    )
    res = {}
    for var_type, keywords_mentions in others_mentioned_chunks_by_var_type.items():
        keyword_list, keyword_statistics, keyword_coordinates = (
            v2_processing.generate_keyword_data(
                keywords_mentions,
                keyword_embeddings,
                stopwords,
                kpca_reducer,
            )
        )
        res[var_type] = {
            "keyword_list": keyword_list,
            "keyword_statistics": keyword_statistics,
            "keyword_coordinates": keyword_coordinates,
        }

    return json.dumps(res, default=vars)


def get_dr():
    data_by_var_type = request.json["data"]
    res = {}
    flatten_data = []
    for var_type, data in data_by_var_type.items():
        flatten_data += data

    texts = list(map(lambda x: x["text"], flatten_data))
    embeddings = query.multithread_embeddings(openai_client, texts)
    clusters = cluster.optics(embeddings)

    all_angles = dr.circular_dr(embeddings)
    cluster_angles = defaultdict(list)
    for cluster_label, angle in zip(clusters, all_angles):
        cluster_angles[cluster_label].append(angle)
    cluster_mean_angles = [
        (cluster_label, statistics.mean(angles))
        for cluster_label, angles in cluster_angles.items()
    ]
    cluster_orders = sorted(cluster_mean_angles, key=lambda x: x[1])
    # create a dict such that the key is the cluster label and the value is the index in the cluster_orders
    cluster_orders = {
        cluster_label: i for i, (cluster_label, _) in enumerate(cluster_orders)
    }
    for i, datum in enumerate(flatten_data):
        # if isNoise[i] != -1:
        #     flatten_data[i]["coordinates"] = coordinates[isNoise[i]].tolist()
        flatten_data[i]["cluster"] = cluster_orders[clusters[i]]
        flatten_data[i]["angle"] = all_angles[i]

    noise_cluster_index = cluster_orders[-1]
    res["noise_cluster"] = noise_cluster_index
    res["dr"] = {}
    offset = 0
    for var_type, data in data_by_var_type.items():
        res["dr"][var_type] = flatten_data[offset : offset + len(data)]
        offset += len(data)
    return json.dumps(res, default=vars)


def process_interview(filepaths):
    interview_dict = {}
    interviews = []
    data_by_chunk = {}
    for interview_file in filepaths:
        interview_data = json.load(open(interview_file, encoding="utf-8"))
        interview_file = interview_file.replace("\\", "/")
        participant = interview_file.split("/")[-1].replace(".json", "")
        interview_dict[participant] = interview_data
        for chunk in interview_data:
            if chunk["topic"] in ["商業", "汙染", "貿易", "農業"]:
                chunk["topic"] = "其他"
            data_by_chunk[chunk["id"]] = chunk
    interview_dict = dict(
        sorted(interview_dict.items(), key=lambda x: int(x[0].replace("N", "")))
    )
    for participant, interview in interview_dict.items():
        interviews.append({"file_name": participant, "data": interview})
    return interviews


def collect_chunks(filepaths):
    interviews = process_interview(filepaths)
    chunks = []
    for interview in interviews:
        for chunk in interview["data"]:
            chunks.append(chunk)
    return chunks


def collect_nodes(filepaths):
    from pprint import pprint

    all_nodes = []
    for filepath in filepaths:
        nodes = json.load(open(filepath, encoding="utf-8"))
        all_nodes.append(nodes)
    return all_nodes


def chunk_w_var_mentions(chunks, all_nodes):
    for chunk in chunks:
        chunk["var_mentions"] = {}
    chunk_dict = {chunk["id"]: chunk for chunk in chunks}
    for node_data in all_nodes:
        var_type = node_data["variable_type"]
        var_mentions = node_data["variable_mentions"]
        for var_name, mentions in var_mentions.items():
            mentions = mentions["mentions"]
            for mention in mentions:
                chunk_id = mention["chunk_id"]
                conversation_ids = mention["conversation_ids"]
                if var_type not in chunk_dict[chunk_id]["var_mentions"]:
                    chunk_dict[chunk_id]["var_mentions"][var_type] = []
                chunk_dict[chunk_id]["var_mentions"][var_type].append(
                    {"var_name": var_name, "conversation_ids": conversation_ids}
                )
    return chunk_dict


def get_data_v1(data_path=v1_data_path):
    (
        interviews,
        reports,
        report_embeddings,
        chunk_links,
        chunk_nodes,
        topic_tsnes,
        keyword_coordinates,
        keyword_statistics,
    ) = processData(data_path)
    res = {
        "interviews": interviews,
        # 'reports': reports,
        "chunk_links": chunk_links,
        "chunk_nodes": chunk_nodes,
        "topic_tsnes": topic_tsnes,
        "keyword_coordinates": keyword_coordinates,
        "keyword_statistics": keyword_statistics,
    }
    return res
    # return json.dumps(res, default=vars)


def processData(data_path, reload=False):
    # interview
    interview_dict = defaultdict(dict)
    interviews = []
    data_by_chunk = {}
    for interview_file in glob.glob(data_path + "chunk_summaries/*.json"):
        interview_data = json.load(open(interview_file))
        interview_file = interview_file.replace("\\", "/")
        file_name = interview_file.split("/")[-1].replace(".json", "")
        participant = file_name.split("_")[0]
        background_topics = file_name.split("_")[1]
        interview_dict[participant][background_topics] = interview_data
        # interview_dict[participant] = interview_data
        for chunk in interview_data:
            if chunk["topic"] in ["商業", "汙染", "貿易", "農業"]:
                chunk["topic"] = "其他"
            data_by_chunk[chunk["id"]] = chunk
    interview_dict = dict(
        sorted(interview_dict.items(), key=lambda x: int(x[0].replace("N", "")))
    )
    for participant, interview in interview_dict.items():
        background = interview["background"]
        topics = interview["topics"]
        whole_interview = background + topics
        interviews.append({"file_name": participant, "data": whole_interview})

    # reports
    reports = []
    report_embeddings = {}

    # chunk_graph
    chunk_links = json.load(open(data_path + "chunk_similarities.json"))
    chunk_embeddings = json.load(open(data_path + "chunk_embeddings.json"))
    chunk_nodes = {}
    for interview in interviews:
        for chunk in interview["data"]:
            # chunk['keywords'] = chunk['raw_keywords']
            chunk_nodes[chunk["id"]] = chunk
    # topic tsnes
    topic_tsnes = json.load(open(data_path + "chunk_coordinates.json"))
    # keywords
    keyword_coordinates = json.load(open(data_path + "keyword_coordinates.json"))
    keyword_statistics = json.load(open(data_path + "keyword_statistics.json"))
    # keyword_statistics = {k['keyword']: k for k in keyword_statistics}

    if reload:
        # chunk graph
        chunk_links = v1_processing.chunk_cosine_similarity(chunk_embeddings)
        chunk_links = v1_processing.normalize_weight(chunk_links)
        # topic tsnes
        for chunk in chunk_embeddings:
            chunk["topic"] = data_by_chunk[chunk["id"]]["topic"]
        chunks_by_topic = v1_processing.group_by_key(chunk_embeddings, "topic")
        topic_tsnes = v1_processing.tsne_by_topic(chunks_by_topic)
        # keyword
        keywords = json.load(open(data_path + "keywords.json"))
        keyword_embeddings = [keyword["embedding"] for keyword in keywords]
        coordinates = dr.scatter_plot(keyword_embeddings, method="tsne")
        keyword_coordinates = {
            k["keyword"]: c.tolist() for k, c in zip(keywords, coordinates)
        }
    return (
        interviews,
        reports,
        report_embeddings,
        chunk_links,
        chunk_nodes,
        topic_tsnes,
        keyword_coordinates,
        keyword_statistics,
    )
