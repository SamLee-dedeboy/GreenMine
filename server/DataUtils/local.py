import json
def save_json(data, filepath):
    with open(filepath, 'w', encoding='utf-8') as fp:
        json.dump(data, fp, indent=4)
def add_variable(file_path, var_name, var_definition, var_type):
    cur_def = json.load(open(file_path, encoding='utf-8'))
    cur_def[var_name] = {
        "definition": var_definition,
        "factor_type": var_type
    }
    save_json(cur_def, file_path)
    return cur_def
def all_definitions(file_paths):
    all_def_dict = {}
    for file_path in file_paths:
        defs = json.load(open(file_path, encoding='utf-8'))
        for k, v in defs.items():
            all_def_dict[k] = v
    return all_def_dict
