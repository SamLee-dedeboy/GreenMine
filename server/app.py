from flask import Flask, request
from flask_cors import CORS
import json
import os
from openai import OpenAI
import statistics

# from . import GPTUtils
# from . import DataUtils
from GPTUtils import query
from DataUtils import local, dr, uncertainty, v2_processing, cluster
from collections import defaultdict

# init, do not read data
app = Flask(__name__)
CORS(app)
dirname = os.path.dirname(__file__)
relative_path = lambda dirname, filename: os.path.join(dirname, filename)
keyword_data_path = relative_path(dirname, "data/v2/user/keyword/")
# pipeline result path
pipeline_result_path = relative_path(dirname, "data/v2/user/pipeline/")
# prompt path
prompt_path = relative_path(dirname, "GPTUtils/prompts/")
# prompt context data path
prompt_context_path = relative_path(dirname, "GPTUtils/contexts/")
# rule path
rule_path = relative_path(dirname, "data/v2/user/rule/")
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

testing = False


@app.route("/test/")
def test():
    return "Hello Lyudao"


@app.route("/pipeline/all_versions/")
@app.route("/pipeline/all_versions/<empty_flag>/")
def get_pipeline_versions(empty_flag="allow_empty"):
    res = {}
    for step in ["var_type", "var", "link"]:
        versions = []
        # Check pipeline results
        result_files = os.listdir(
            os.path.join(pipeline_result_path, f"identify_{step}s")
        )
        for file in result_files:
            if file.startswith("v") and file.endswith(f"_chunk_w_{step}s.json"):
                version = file.split("_")[0]
                data = json.load(
                    open(
                        os.path.join(pipeline_result_path, f"identify_{step}s", file),
                        encoding="utf-8",
                    )
                )
                if empty_flag == "not_allow_empty" and len(data) == 0:
                    continue
                versions.append(version)

        # Convert versions to a sorted list of integers
        version_numbers = sorted([int(v.replace("v", "")) for v in versions])
        res[step] = {
            "versions": [f"v{v}" for v in version_numbers],
        }
    return json.dumps(res)


@app.route("/pipeline/<step>/<version>/")
def get_pipeline(step, version):
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
            "based_on": identify_prompts["based_on"],
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


@app.route("/pipeline/<step>/delete/", methods=["POST"])
def delete_pipeline(step):
    version = request.json["version"]
    if step in ["var_type", "var"]:
        os.remove(f"{prompt_context_path}{version}_{step}_definitions.json")
    os.remove(f"{prompt_path}{version}_identify_{step}s.json")
    os.remove(f"{pipeline_result_path}identify_{step}s/{version}_chunk_w_{step}s.json")
    try:
        os.remove(
            f"{pipeline_result_path}identify_{step}s/{version}_identify_{step}s_uncertainty_graph.json"
        )
    except OSError:
        pass
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
    if identify_links == []:
        return {"DPSIR_data": {}, "pipeline_links": []}
    pipeline_links = [
        link for chunk in identify_links for link in chunk["identify_links_result"]
    ]

    var_definitions = json.load(
        open(
            f"{prompt_context_path}v{link_version_number}_var_definitions.json",
            encoding="utf-8",
        )
    )

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
        if testing:
            all_chunks = json.load(
                open(
                    pipeline_result_path
                    + "identify_var_types/v0_chunk_w_var_types.json"
                )
            )
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
        "based_on": context["based_on"],
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
    var_version = request.json["version"]
    # get var type version
    var_type_version = request.json["based_on"]
    var_type_definitions = json.load(
        open(
            f"{prompt_context_path}{var_type_version}_var_type_definitions.json",
            encoding="utf-8",
        )
    )
    # get var version
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
        if testing:
            all_chunks = json.load(
                open(pipeline_result_path + "identify_vars/v0_chunk_w_vars.json")
            )
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
        "based_on": context["based_on"],
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
    var_version = request.json["based_on"]
    link_version = request.json["version"]
    # get var version
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
        if testing:
            all_chunks = json.load(
                open(
                    f"{pipeline_result_path}identify_links/{link_version}_chunk_w_links.json",
                    encoding="utf-8",
                )
            )
        else:
            all_chunks = uncertainty.identify_links_uncertainty(
                all_chunks,
                candidate_links,
                openai_client,
                system_prompt_blocks,
                user_prompt_blocks,
                prompt_variables,
            )
        # local.save_json(
        #     all_chunks,
        #     f"{pipeline_result_path}identify_links/{link_version}_chunk_w_links.json",
        # )
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
        "based_on": context["based_on"],
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


@app.route("/dr/", methods=["POST"])
def get_dr():
    data = request.json["data"]
    texts = list(map(lambda x: x["text"], data))

    embeddings = query.multithread_embeddings(openai_client, texts)
    # clusters = cluster.optics(embeddings)
    clusters = cluster.cluster(embeddings)
    # topic labels, dict: cluster label -> topic
    cluster_topics = query.cluster_topic_assignments(openai_client, clusters, texts)

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
    for i, datum in enumerate(data):
        data[i]["cluster"] = cluster_orders[clusters[i]]
        data[i]["cluster_label"] = cluster_topics[clusters[i]]
        data[i]["angle"] = all_angles[i]

    return json.dumps(data, default=vars)


@app.route("/uncertainty_graph/save/", methods=["POST"])
def save_uncertainty_graph():
    data = request.json["data"]
    key = request.json["key"]
    version = request.json["version"]
    local.save_json(
        data,
        f"{pipeline_result_path}{key}/{version}_{key}_uncertainty_graph.json",
    )
    return "success"


@app.route("/uncertainty_graph/get/", methods=["POST"])
def get_uncertainty_graph():
    key = request.json["key"]
    version = request.json["version"]
    data = json.load(
        open(
            f"{pipeline_result_path}{key}/{version}_{key}_uncertainty_graph.json",
            encoding="utf-8",
        )
    )
    return json.dumps(data, default=vars)


@app.route("/rule/save/", methods=["POST"])
def save_rule():
    rule = request.json["rule"]
    local.save_json(rule, f"{rule_path}rule.json")
    return "success"


@app.route("/rule/get/", methods=["GET"])
def get_rule():
    rule = json.load(open(f"{rule_path}rule.json", encoding="utf-8"))
    return rule


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
