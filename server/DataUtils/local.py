import json
def save_json(data, filepath):
    with open(filepath, 'w', encoding='utf-8') as fp:
        json.dump(data, fp, indent=4, ensure_ascii=False)
def add_variable(file_path, var_name, var_definition, var_type):
    cur_def = json.load(open(file_path, encoding='utf-8'))
    cur_def[var_name] = {
        "definition": var_definition,
        "factor_type": var_type
    }
    save_json(cur_def, file_path)
    return cur_def

def remove_variable(node_file_path, def_file_path, link_file_path, var_name):
    # remove node from chunks
    cur_nodes = json.load(open(node_file_path, encoding='utf-8'))
    if var_name in cur_nodes['variable_mentions']:
        del cur_nodes['variable_mentions'][var_name]
    # remove def
    cur_def = json.load(open(def_file_path, encoding='utf-8'))
    if var_name in cur_def:
        del cur_def[var_name]
    # remove links
    cur_links = json.load(open(link_file_path, encoding='utf-8'))
    cur_links = list(filter(lambda x: x['var1'] != var_name and x['var2'] != var_name, cur_links))

    # save
    save_json(cur_nodes, node_file_path)
    save_json(cur_def, def_file_path)
    save_json(cur_links, link_file_path)

def all_definitions(file_paths):
    all_def_dict = {}
    for file_path in file_paths:
        defs = json.load(open(file_path, encoding='utf-8'))
        for k, v in defs.items():
            all_def_dict[k] = v
    return all_def_dict
