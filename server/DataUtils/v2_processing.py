import json
from DataUtils import dr
from collections import defaultdict
import jieba
import numpy as np


def generate_DPSIR_data(
    chunks,
    var_type_mentions,
    keyword_embeddings,
    stopwords=[],
    userdict=None,
    reducer=None,
):
    if userdict is not None:
        jieba.load_userdict(userdict)
    chunks_dict = {chunk["id"]: chunk for chunk in chunks}
    res = {}
    mentioned_chunk_ids = set()
    for var_type, var_type_data in var_type_mentions.items():
        res[var_type] = {
            "variable_type": var_type,
            "variable_mentions": {},
            "keyword_data": {
                "keyword_list": [],
                "keyword_coordinates": {},
                "keyword_statistics": {},
            },
        }
        for variable_data in var_type_data["variable_mentions"].values():
            variable_name = variable_data["variable_name"]
            if variable_name not in res[var_type]["variable_mentions"]:
                res[var_type]["variable_mentions"][variable_name] = {
                    "variable_name": variable_name,
                    "mentions": [],
                }
            res[var_type]["variable_mentions"][variable_name][
                "mentions"
            ] += variable_data["mentions"]
            mentioned_chunk_ids.update(
                list(map(lambda x: x["chunk_id"], variable_data["mentions"]))
            )
        mentioned_chunk_data = [
            chunks_dict[chunk_id] for chunk_id in mentioned_chunk_ids
        ]
        keyword_list, keyword_statistics, keyword_coordinates = generate_keyword_data(
            var_type, mentioned_chunk_data, keyword_embeddings, stopwords, reducer
        )
        res[var_type]["keyword_data"] = {
            "keyword_list": keyword_list,
            "keyword_statistics": keyword_statistics,
            "keyword_coordinates": keyword_coordinates,
        }
    res = add_tf_idf(res)
    return res


def generate_keyword_data(
    var_type, chunks, keyword_embeddings, stopwords=[], reducer=None
):

    keyword_embeddings_dict = {
        keyword["keyword"]: keyword for keyword in keyword_embeddings
    }
    all_keywords = set()
    keyword_statistics = defaultdict(int)
    keyword_coordinates = {}
    for chunk in chunks:
        if chunk["identify_var_types_result"] == []:
            continue
        evidences = list(
            set(
                [
                    sentence_index
                    for evidences in map(
                        lambda x: x["evidence"],
                        filter(
                            lambda y: y["var_type"] == var_type,
                            chunk["identify_var_types_result"],
                        ),
                    )
                    for sentence_index in evidences
                ]
            )
        )
        evidence_messages = [chunk["conversation"][i]["content"] for i in evidences]
        chunk_keywords = set()
        for sentence in evidence_messages:
            words = jieba.cut(sentence)
            words = list(filter(lambda x: x not in stopwords, words))
            words = list(filter(lambda x: x in keyword_embeddings_dict, words))
            chunk_keywords.update(words)
        for keyword in chunk_keywords:
            keyword_statistics[keyword] += 1
        all_keywords.update(chunk_keywords)
    all_keywords = list(all_keywords)
    keyword_statistics = {
        keyword: {"frequency": freq} for keyword, freq in keyword_statistics.items()
    }
    all_keyword_embeddings = [
        keyword_embeddings_dict[keyword]["embedding"] for keyword in all_keywords
    ]
    if reducer is None:
        XY, reducer, dr_scaler, min_coord, max_coord, init_positions = dr.scatter_plot(
            all_keyword_embeddings, method="kernel_pca"
        )
    else:
        XY = dr.reapply_dr(
            all_keyword_embeddings,
            scaler=reducer["scaler"],
            estimator=reducer["estimator"],
            min_val=reducer["min_val"],
            max_val=reducer["max_val"],
        )
    for keyword, coordinate in zip(all_keywords, XY):
        keyword_coordinates[keyword] = coordinate.tolist()
    return all_keywords, keyword_statistics, keyword_coordinates


def add_tf_idf(res):
    all_keyword_freq = defaultdict(int)
    for var_type, data in res.items():
        keyword_statistics = data["keyword_data"]["keyword_statistics"]
        for keyword, stat in keyword_statistics.items():
            # all_keyword_freq[keyword] += stat["frequency"]
            all_keyword_freq[keyword] += 1
    for var_type, data in res.items():
        keyword_statistics = data["keyword_data"]["keyword_statistics"]
        for keyword, stat in keyword_statistics.items():
            tf = stat["frequency"]
            idf = np.log(len(res) / all_keyword_freq[keyword])
            tf_idf = tf * idf
            keyword_statistics[keyword]["tf_idf"] = tf_idf
    return res
