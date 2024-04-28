def node_extraction_prompt_factory(paragraph, var_name, definition):

    # 驅動變數是基本的人為原因，引起環境中的某些影響，以滿足基本的人類需求。
    # 壓力是對環境或生態系統的負面現象或活動，這些是由驅動變數引起的或自然發生的。
    # 狀態指的是特定時間框架和區域內的物理、化學和生物現象的數量和質量。
    # 影響指的是環境條件、生態系統功能或人類福祉方面的不良變化。 
    # 回應指的是保護環境、應對環境問題或友善環境的任何行為、行動或努力。

    messages = [
        {
            "role":"system",
            "content":""" You are a variables identification system.
            The user wants you to identify if there are any {var_name} in the monologue.
            It may include the following objects: {definition}
            The user will give you a monologue in Chinese.
            You will need to identify if the variable is mentioned in the monologue.
            Please provide output in JSON format as follows:
            {{
                "mentioned": yes or no
            }}
            """.format(var_name=var_name, definition=definition)
        },
        {
            "role":"user",
            "content":"Monologue: {paragraph}.  ".format(paragraph=paragraph)
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
            """
        }, 
        {
            "role": "user",
            "content": "Concept: {extracted_var} \n Definition: {var_definition} \n Monologue: {sentences_str}".format(extracted_var=extracted_var, var_definition=var_definition, sentences_str=sentences_str)
        }
    ]
    return messages