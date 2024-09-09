import glob
from flask import Flask, request
from flask_cors import CORS
import json
import os
from openai import OpenAI

# from . import GPTUtils
# from . import DataUtils
from GPTUtils import query, prompts
from DataUtils import local, dr, v1_processing, uncertainty, v2_processing
from collections import defaultdict

# init, do not read data
app = Flask(__name__)
CORS(app)
dirname = os.path.dirname(__file__)
relative_path = lambda dirname, filename: os.path.join(dirname, filename)
node_data_path = relative_path(dirname, "data/v2/user/nodes/")
chunk_data_path = relative_path(dirname, "data/v2/user/chunk/")
keyword_data_path = relative_path(dirname, "data/v2/user/keyword/")
metadata_path = relative_path(dirname, "data/v2/user/variable_definitions/")
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


@app.route("/test/")
def test():
    return "Hello Lyudao"


@app.route("/data/")
@app.route("/data/<version>/")
def get_data(version="baseline"):
    nodes = {}
    for var_type in var_types:
        nodes[var_type] = json.load(
            open(node_data_path + f"{var_type}_nodes.json", encoding="utf-8")
        )

    old_links = json.load(open(node_data_path + "connections.json", encoding="utf-8"))
    interview_data = process_interview(
        glob.glob(chunk_data_path + f"chunk_summaries_w_ktte/*.json")
    )

    v1_data = get_data_v1(v1_data_path)
    if version == "baseline":
        # prompt template data
        var_type_definitions = json.load(
            open(prompt_context_path + "var_type_definitions.json", encoding="utf-8")
        )
        var_definitions = json.load(
            open(prompt_context_path + "variable_definitions.json", encoding="utf-8")
        )
        # var_definitions = {}
        # for var_type in var_type_definitions.keys():
        #     var_definitions_by_type = json.load(open(prompt_context_path + f"variable_definitions/{var_type}_variables_def.json", encoding='utf-8'))
        #     var_definitions[var_type] = var_definitions_by_type

        # prompts
        identify_var_types_prompts = json.load(
            open(prompt_path + "identify_var_types.json", encoding="utf-8")
        )
        identify_vars_prompts = json.load(
            open(prompt_path + "identify_vars.json", encoding="utf-8")
        )
        identify_links_prompts = json.load(
            open(prompt_path + "identify_links.json", encoding="utf-8")
        )

        # pipeline data
        identify_var_types = json.load(
            open(
                pipeline_result_path + "identify_var_types/chunk_w_var_types.json",
                encoding="utf-8",
            )
        )
        identify_vars = json.load(
            open(
                pipeline_result_path + "identify_vars/chunk_w_vars.json",
                encoding="utf-8",
            )
        )
        identify_links = json.load(
            open(
                pipeline_result_path + "identify_links/chunk_w_links.json",
                encoding="utf-8",
            )
        )
        pipeline_links = [
            link for chunk in identify_links for link in chunk["identify_links_result"]
        ]
    else:
        version_number = version.replace("version", "")
        var_type_definitions = json.load(
            open(
                f"{prompt_context_path}v{version_number}_var_type_definitions.json",
                encoding="utf-8",
            )
        )
        var_definitions = json.load(
            open(prompt_context_path + "variable_definitions.json", encoding="utf-8")
        )  # TBM
        # prompts
        identify_var_types_prompts = json.load(
            open(
                f"{prompt_path}v{version_number}_identify_var_types.json",
                encoding="utf-8",
            )
        )
        identify_vars_prompts = json.load(
            open(prompt_path + "identify_vars.json", encoding="utf-8")
        )  # TBM
        identify_links_prompts = json.load(
            open(prompt_path + "identify_links.json", encoding="utf-8")
        )  # TBM
        # pipeline data
        identify_var_types = json.load(
            open(
                f"{pipeline_result_path}identify_var_types/v{version_number}_chunk_w_var_types.json",
                encoding="utf-8",
            )
        )
        identify_vars = json.load(
            open(
                pipeline_result_path + "identify_vars/chunk_w_vars.json",
                encoding="utf-8",
            )
        )  # TBM
        identify_links = json.load(
            open(
                pipeline_result_path + "identify_links/chunk_w_links.json",
                encoding="utf-8",
            )
        )  # TBM
        pipeline_links = [
            link for chunk in identify_links for link in chunk["identify_links_result"]
        ]  # TBM

    keyword_embeddings = json.load(
        open(keyword_data_path + "keywords.json", encoding="utf-8")
    )
    userdict = keyword_data_path + "userdict.txt"
    stopwords = ["綠島"]
    kpca_reducer = dr.init_kpca_reducer(
        list(map(lambda x: x["embedding"], keyword_embeddings))
    )
    DPSIR_data = v2_processing.generate_DPSIR_data(
        identify_var_types,
        nodes,
        var_definitions,
        keyword_embeddings,
        stopwords,
        userdict,
        kpca_reducer,
    )
    return {
        "interviews": interview_data,
        # "nodes": nodes,
        # "variable_definitions": var_definitions,
        "DPSIR_data": DPSIR_data,
        "links": old_links,
        "pipeline_links": pipeline_links,
        "v1": v1_data,
        "prompts": {
            "identify_var_types": {
                "var_type_definitions": var_type_definitions,
                "system_prompt_blocks": identify_var_types_prompts[
                    "system_prompt_blocks"
                ],
                "user_prompt_blocks": identify_var_types_prompts["user_prompt_blocks"],
            },
            "identify_vars": {
                "var_definitions": var_definitions,
                "system_prompt_blocks": identify_vars_prompts["system_prompt_blocks"],
                "user_prompt_blocks": identify_vars_prompts["user_prompt_blocks"],
            },
            "identify_links": {
                "var_definitions": var_definitions,
                "system_prompt_blocks": identify_links_prompts["system_prompt_blocks"],
                "user_prompt_blocks": identify_links_prompts["user_prompt_blocks"],
            },
        },
        "pipeline_result": {
            "identify_var_types": identify_var_types,
            "identify_vars": identify_vars,
            "identify_links": identify_links,
        },
    }


# @app.route("/var_extraction/", methods=["POST"])
# def var_extraction():
#     var_type = request.json["var_type"]
#     var_name = request.json["var_name"]
#     var_definition = request.json["var_definition"]
#     factor_type = request.json["factor_type"]
#     chunks = collect_chunks(
#         glob.glob(chunk_data_path + f"chunk_summaries_w_ktte/*.json")
#     )
#     all_nodes = collect_nodes(
#         [node_data_path + f"{var_type}_nodes.json" for var_type in var_types]
#     )
#     chunk_dict = chunk_w_var_mentions(chunks, all_nodes)
#     all_def_dict = local.all_definitions(
#         file_paths=[
#             metadata_path + f"{var_type}_variables_def.json" for var_type in var_types
#         ]
#     )
#     local.add_variable(
#         metadata_path + f"{var_type}_variables_def.json",
#         var_name,
#         var_definition,
#         factor_type,
#     )
#     query.var_extraction(
#         openai_client,
#         node_data_path + f"{var_type}_nodes.json",
#         node_data_path + "connections.json",
#         chunk_dict,
#         var_name,
#         var_type,
#         var_definition,
#         all_def_dict,
#     )
#     return "success"


# @app.route("/curation/remove/", methods=["POST"])
# def remove_var():
#     var_type = request.json["var_type"]
#     var_names = request.json["var_names"]
#     for var_name in var_names:
#         local.remove_variable(
#             node_file_path=node_data_path + f"{var_type}_nodes.json",
#             def_file_path=metadata_path + f"{var_type}_variables_def.json",
#             link_file_path=node_data_path + "connections.json",
#             var_name=var_name,
#         )
#     return "success"


@app.route("/curation/identify_var_types/", methods=["POST"])
def curate_identify_var_types():
    var_type_definitions = request.json["var_type_definitions"]
    system_prompt_blocks = request.json["system_prompt_blocks"]
    user_prompt_blocks = request.json["user_prompt_blocks"]
    prompt_variables = {
        "var_types": "\n".join(
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
    prompts = {
        "system_prompt_blocks": context["system_prompt_blocks"],
        "user_prompt_blocks": context["user_prompt_blocks"],
    }
    version_number = version.replace("version", "")
    local.save_json(
        all_chunks,
        f"{pipeline_result_path}identify_var_types/v{version_number}_chunk_w_var_types.json",
    )
    local.save_json(
        var_type_definitions,
        f"{prompt_context_path}v{version_number}_var_type_definitions.json",
    )
    local.save_json(prompts, f"{prompt_path}v{version_number}_identify_var_types.json")
    return "success"


@app.route("/curation/identify_vars/", methods=["POST"])
def curate_identify_vars():
    var_definitions = request.json["var_definitions"]
    system_prompt_blocks = request.json["system_prompt_blocks"]
    user_prompt_blocks = request.json["user_prompt_blocks"]
    var_type_definitions = json.load(
        open(prompt_context_path + "var_type_definitions.json", encoding="utf-8")
    )
    var_definitions = json.load(
        open(prompt_context_path + "variable_definitions.json", encoding="utf-8")
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
            pipeline_result_path + "identify_var_types/chunk_w_var_types.json",
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
        return json.dumps(all_chunks, default=vars)
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
    prompts = {
        "system_prompt_blocks": context["system_prompt_blocks"],
        "user_prompt_blocks": context["user_prompt_blocks"],
    }
    var_type_definitions = json.load(
        open(prompt_context_path + "var_type_definitions.json", encoding="utf-8")
    )
    for var_type in var_type_definitions.keys():
        local.save_json(
            var_definitions[var_type],
            prompt_context_path + f"variable_definitions/{var_type}_variables_def.json",
        )
    local.save_json(prompts, prompt_path + "identify_vars.json")
    local.save_json(
        all_chunks, pipeline_result_path + "identify_vars/chunk_w_vars.json"
    )
    return "success"


@app.route("/curation/identify_links/", methods=["POST"])
def curate_identify_links():
    raw_variable_definitions = request.json["var_definitions"]
    system_prompt_blocks = request.json["system_prompt_blocks"]
    user_prompt_blocks = request.json["user_prompt_blocks"]
    all_chunks = json.load(
        open(pipeline_result_path + "identify_vars/chunk_w_vars.json", encoding="utf-8")
    )
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
            pipeline_result_path + "identify_links/chunk_w_links_uncertainty.json",
        )
    return json.dumps(all_chunks, default=vars)


@app.route("/curation/identify_links/save/", methods=["POST"])
def save_identify_links():
    all_chunks = request.json["result"]
    local.save_json(
        all_chunks, pipeline_result_path + "identify_links/chunk_w_links.json"
    )
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
