from GPTUtils import query
from collections import defaultdict


def identify_var_types_uncertainty(
    all_chunks,
    openai_client,
    system_prompt_blocks,
    user_prompt_blocks,
    prompt_variables,
):
    def merge_var_types(var_type_results):
        merged_var_types = {}
        for var_types in var_type_results:
            for var_type in var_types:
                if var_type["var_type"] not in merged_var_types:
                    merged_var_types[var_type["var_type"]] = var_type
                else:
                    merged_var_types[var_type["var_type"]]["evidence"] = list(
                        set(
                            merged_var_types[var_type["var_type"]]["evidence"]
                            + var_type["evidence"]
                        )
                    )
        return list(merged_var_types.values())

    # uncertainty calculation
    iteration_results = []
    k = 5
    for _ in range(k):
        all_chunks = query.identify_var_types(
            all_chunks,
            openai_client,
            system_prompt_blocks,
            user_prompt_blocks,
            prompt_variables,
        )
        for chunk_index, chunk in enumerate(all_chunks):
            if len(iteration_results) <= chunk_index:
                iteration_results.append([])
            iteration_results[chunk_index].append(chunk["identify_var_types_result"])
    for chunk_index, chunk in enumerate(all_chunks):
        # create ensemble of var types from k iterations
        ensemble_var_types = merge_var_types(iteration_results[chunk_index])
        candidate_var_types = list(
            map(
                lambda var_types: [x["var_type"] for x in var_types],
                iteration_results[chunk_index],
            )
        )
        # calculate uncertainty, will be the same for all var types
        uncertainty = average_pairwise_jaccard(candidate_var_types)
        for var_type_result in ensemble_var_types:
            # calculate confidence for each var type
            # confidence = number of times var type occurs in k iterations
            var_type_occurrence = len(
                list(
                    filter(
                        lambda candidate: var_type_result["var_type"] in candidate,
                        candidate_var_types,
                    )
                )
            )
            confidence = var_type_occurrence / k
            var_type_result["uncertainty"] = uncertainty
            var_type_result["confidence"] = confidence
        chunk["identify_var_types_result"] = ensemble_var_types
        if "uncertainty" not in chunk:
            chunk["uncertainty"] = {}
        chunk["uncertainty"]["identify_var_types"] = uncertainty
    return all_chunks


def identify_vars_uncertainty(
    all_chunks,
    openai_client,
    system_prompt_blocks,
    user_prompt_blocks,
    prompt_variables,
):
    def merge_vars(vars_results):
        merged_vars = {}
        for vars in vars_results:
            for var in vars:
                if var["var"] not in merged_vars:
                    merged_vars[var["var"]] = var
                else:
                    merged_vars[var["var"]]["evidence"] = list(
                        set(merged_vars[var["var"]]["evidence"] + var["evidence"])
                    )
        return list(merged_vars.values())

    # uncertainty calculation
    k = 5
    iteration_results = []
    for _ in range(k):
        all_chunks = query.identify_vars(
            all_chunks,
            openai_client,
            system_prompt_blocks,
            user_prompt_blocks,
            prompt_variables,
        )
        for chunk_index, chunk in enumerate(all_chunks):
            if len(iteration_results) <= chunk_index:
                iteration_results.append(defaultdict(list))
            for var_type, vars in chunk["identify_vars_result"].items():
                iteration_results[chunk_index][var_type].append(vars)
    for chunk_index, chunk in enumerate(all_chunks):
        for var_type, vars in iteration_results[chunk_index].items():
            ensemble_vars = merge_vars(vars)
            candidate_vars = list(
                map(lambda var_list: [x["var"] for x in var_list], vars)
            )
            vars_set = set([var for var_list in candidate_vars for var in var_list])
            uncertainty = average_pairwise_jaccard(candidate_vars)
            for var in vars_set:
                var_occurrence = len(
                    list(filter(lambda candidate: var in candidate, candidate_vars))
                )
                confidence = var_occurrence / k
                var_index = list(map(lambda x: x["var"], ensemble_vars)).index(var)
                ensemble_vars[var_index]["confidence"] = confidence
                ensemble_vars[var_index]["uncertainty"] = uncertainty
                chunk["identify_vars_result"][var_type] = ensemble_vars
            if "uncertainty" not in chunk:
                chunk["uncertainty"] = {}
            chunk["uncertainty"]["identify_vars"] = uncertainty
    return all_chunks


def identify_links_uncertainty(
    all_chunks,
    raw_links,
    openai_client,
    system_prompt_blocks,
    user_prompt_blocks,
    prompt_variables,
):
    def merge_links(links_results):
        merged_links = {}
        for links in links_results:
            for link in links:
                link_id = f"{link['var1']}_{link['var2']}"
                if link_id not in merged_links:
                    link["response"]["relationship"] = [
                        link["response"]["relationship"]
                    ]
                    merged_links[link_id] = link
                else:
                    merged_links[link_id]["response"]["evidence"] = list(
                        set(
                            merged_links[link_id]["response"]["evidence"]
                            + link["response"]["evidence"]
                        )
                    )
                    merged_links[link_id]["response"]["relationship"].append(
                        link["response"]["relationship"]
                    )

        return list(merged_links.values())

    # identify links
    iteration_results = []
    k = 5
    for _ in range(k):
        all_chunks = query.identify_links(
            all_chunks,
            raw_links,
            openai_client,
            system_prompt_blocks,
            user_prompt_blocks,
            prompt_variables,
        )
        for chunk_index, chunk in enumerate(all_chunks):
            if len(iteration_results) <= chunk_index:
                iteration_results.append([])
            iteration_results[chunk_index].append(chunk["identify_links_result"])
    for chunk_index, chunk in enumerate(all_chunks):
        if chunk["identify_links_result"] == []:
            chunk["uncertainty"]["identify_links"] = 0
            continue
        ensemble_links = merge_links(iteration_results[chunk_index])
        candidate_links = list(
            map(
                lambda links: [f"{x['var1']}_{x['var2']}" for x in links],
                iteration_results[chunk_index],
            )
        )
        uncertainty = average_pairwise_jaccard(candidate_links)
        for link in ensemble_links:
            link_occurrence = len(
                list(
                    filter(
                        lambda candidate: f"{link['var1']}_{link['var2']}" in candidate,
                        candidate_links,
                    )
                )
            )
            confidence = link_occurrence / k
            link["uncertainty"] = uncertainty
            link["confidence"] = confidence
            # relationship confidence
            relationship_occurrences = defaultdict(int)
            for relationship in link["response"]["relationship"]:
                relationship_occurrences[relationship] += 1
            link["response"]["relationship"] = []
            for relationship, occurrence_frequency in relationship_occurrences.items():
                relationship_confidence = occurrence_frequency / k
                link["response"]["relationship"].append(
                    {
                        "label": relationship,
                        "confidence": relationship_confidence,
                    }
                )
        chunk["identify_links_result"] = ensemble_links
        if "uncertainty" not in chunk:
            chunk["uncertainty"] = {}
        chunk["uncertainty"]["identify_links"] = uncertainty
    return all_chunks


# calculate average pairwise jaccard distance between sets of strings
# larger means higher uncertainty
def average_pairwise_jaccard(candidate_sets):
    from itertools import combinations

    total_jaccard_distance = 0
    pairs = list(combinations(candidate_sets, 2))
    for pair in pairs:
        set1, set2 = pair
        set1 = set(set1)
        set2 = set(set2)
        union = set1.union(set2)
        if len(union) == 0:
            continue
        intersection = set1.intersection(set2)
        jaccard_distance = (len(union) - len(intersection)) / len(union)
        total_jaccard_distance += jaccard_distance
    return total_jaccard_distance / len(pairs)
