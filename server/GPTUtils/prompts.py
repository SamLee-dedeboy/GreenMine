import json


def inject_data(prompt_str, data_dict):
    for key, value in data_dict.items():
        # skip if value is not str
        if not isinstance(value, str):
            continue
        prompt_str = prompt_str.replace(f"${{{key}}}", value)
    return prompt_str


def identify_var_type_prompt_factory(
    system_prompt_blocks, user_prompt_blocks, prompt_variables
):
    prompt_blocks = list(
        map(lambda block: inject_data(block, prompt_variables), system_prompt_blocks)
    )
    user_prompt_blocks = list(
        map(lambda block: inject_data(block, prompt_variables), user_prompt_blocks)
    )
    messages = [
        {
            "role": "system",
            "content": "\n".join(prompt_blocks)
            + "\n"
            + """Reply with the following JSON format:
                    {{
                        "result": [
                            {{
                                "concept": string ("driver" or "pressure" or "state" or "impact" or "response", or "none"),
                                "evidence": [] (list of transcript conversation indices, empty if concept is "none"),
                                "explanation": string (explain why the evidence indicates the concept in Traditional Chinese), or "none" if concept is "none"
                            }}
                        ]
                    }}
                """,
            # """Reply with the following JSON format:
            #     {{
            #         "var_types": [] (list of "driver" or "pressure" or "state" or "impact" or "response", or ["none"]),
            #         "evidence": [] (list of sentence indices, empty if var_type is "none"),
            #         "explanation": string (explain why the evidence indicates the variable type), or "none" if var_type is "none"
            #     }}
            # """,
        },
        {"role": "user", "content": "\n".join(user_prompt_blocks)},
    ]

    def extract_response_func(response):
        response = json.loads(response)["result"]
        response = list(
            map(
                lambda x: {
                    "var_type": x["concept"],
                    "evidence": x["evidence"],
                    "explanation": x["explanation"],
                },
                response,
            )
        )
        response = list(filter(lambda x: x["var_type"] != "none", response))
        return response

    response_format = "json"
    return messages, response_format, extract_response_func


def identify_var_prompt_factory(
    system_prompt_blocks, user_prompt_blocks, prompt_variables
):
    prompt_blocks = list(
        map(lambda block: inject_data(block, prompt_variables), system_prompt_blocks)
    )
    user_prompt_blocks = list(
        map(lambda block: inject_data(block, prompt_variables), user_prompt_blocks)
    )
    messages = [
        {
            "role": "system",
            "content": "\n".join(prompt_blocks)
            + "\n"
            + """Reply with the following JSON format:
                    {{
                        "result": [
                            {{
                                "tag": string (one of the above or "none")
                                "evidence": [] (list of transcript conversation indices, empty if tag is "none"),
                                "keywords": [] (list of keywords, empty if tag is "none"),
                                "explanation": string (explain why the evidence indicates the tag in Traditional Chinese), or "none" if tag is "none"
                            }}
                        ]
                    }}
                """,
        },
        {"role": "user", "content": "\n".join(user_prompt_blocks)},
    ]

    def extract_response_func(response):
        response = json.loads(response)["result"]
        response = list(
            map(
                lambda x: {
                    "var": x["tag"],
                    "evidence": x["evidence"],
                    "keywords": x["keywords"],
                    "explanation": x["explanation"],
                },
                response,
            )
        )
        response = list(filter(lambda x: x["var"] != "none", response))
        response = list(filter(lambda x: x["explanation"] != "none", response))
        return response

    response_format = "json"
    return messages, response_format, extract_response_func


def identify_link_prompt_factory(
    system_prompt_blocks, user_prompt_blocks, prompt_variables
):
    prompt_blocks = list(
        map(lambda block: inject_data(block, prompt_variables), system_prompt_blocks)
    )
    user_prompt_blocks = list(
        map(lambda block: inject_data(block, prompt_variables), user_prompt_blocks)
    )
    messages = [
        {
            "role": "system",
            "content": "\n".join(prompt_blocks)
            + "\n"
            + """Reply with the following JSON format:
                    {{
                        "result": 
                            {{
                                "source": string (source concept),
                                "target": string (target concept),
                                "relationship": string (relationship between the two concepts or "none"),
                                "evidence": [] (list of transcript conversation indices, empty if relationship is "none"),
                                "explanation": string (explain why the evidence indicates the relationship in Traditional Chinese), or "none" if relationship is "none"
                            }}
                        
                    }}
                """,
        },
        {"role": "user", "content": "\n".join(user_prompt_blocks)},
    ]

    def extract_response_func(response):
        response = json.loads(response)["result"]
        if response["relationship"] == "none":
            return None
        return response

    response_format = "json"
    return messages, response_format, extract_response_func

    return


def node_extraction_prompt_factory(paragraph, var_name, definition):

    # 驅動變數是基本的人為原因，引起環境中的某些影響，以滿足基本的人類需求。
    # 壓力是對環境或生態系統的負面現象或活動，這些是由驅動變數引起的或自然發生的。
    # 狀態指的是特定時間框架和區域內的物理、化學和生物現象的數量和質量。
    # 影響指的是環境條件、生態系統功能或人類福祉方面的不良變化。
    # 回應指的是保護環境、應對環境問題或友善環境的任何行為、行動或努力。

    messages = [
        {
            "role": "system",
            "content": """ You are a variables identification system.
            The user wants you to identify if there are any {var_name} in the monologue.
            It may include the following objects: {definition}
            The user will give you a monologue in Chinese.
            You will need to identify if the variable is mentioned in the monologue.
            Please provide output in JSON format as follows:
            {{
                "mentioned": yes or no
            }}
            """.format(
                var_name=var_name, definition=definition
            ),
        },
        {
            "role": "user",
            "content": "Monologue: {paragraph}.  ".format(paragraph=paragraph),
        },
    ]
    return messages


def mention_extraction_prompt_factory(sentences, extracted_var, var_definition):
    sentences_str = ""
    for index, sentence in enumerate(sentences):
        sentences_str += f"{index}: {sentence} \n"
    messages = [
        {
            "role": "system",
            "content": """You are a mention extraction system that extracts mentions from a monologue.
            The user will give you a monologue, a concept, and its definition in Chinese.
            You need to extract the sentences that mentions the concept from the monologue.
            Note that the concept may not be directly matched in the monologue, instead, it could be a synonym or a related word, or if the sentence is talking in relevant context.
            Reply with the following JSON format:
            {
                "mentions": [] (list of sentence indices)
            }
            """,
        },
        {
            "role": "user",
            "content": "Concept: {extracted_var} \n Definition: {var_definition} \n Monologue: {sentences_str}".format(
                extracted_var=extracted_var,
                var_definition=var_definition,
                sentences_str=sentences_str,
            ),
        },
    ]
    return messages


def find_relationships_chunk_prompts_factory(chunk_content, comb, var1_def, var2_def):
    messages = [
        {
            "role": "system",
            "content": """You are an expert to find the relationship between {var1}, and {var2}.
                            Some examples of {var1} are: {var1_def}
                            Some examples of {var2} are: {var2_def}

                            You are given a conversation between two people: Interviewer and Interviewee. 
                            Identify and extract any sentences that explicitly or implicitly discuss a relationship between {var1} and {var2}.
                            If the conversation cannot indicate the relationship, please respond "No".
                            Please response in JSON format: 
                            {{"relationship": "Yes" or "No,
                              "evidence": string[] (Sentences extracted from the chunk_content)
                            }} 
                        """.format(
                var1=comb[0], var1_def=var1_def, var2=comb[1], var2_def=var2_def
            ),
        },
        {"role": "user", "content": chunk_content},
    ]
    return messages
