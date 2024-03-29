from openai import OpenAI
import glob
import tiktoken
import json
import requests
api_key = open("api_key", "r").read()
client = OpenAI(api_key=api_key)

def request_gpt4(messages):
    # model = "gpt-4-1106-preview"
    model = "gpt-3.5-turbo-1106"
    enc = tiktoken.encoding_for_model(model)
    # enc = tiktoken.encoding_for_model("gpt-3.5-turbo-1106")
    text = json.dumps(messages)
    print(len(enc.encode(text)))
    kept_index = 0
    while len(enc.encode(text)) > 16385:
    # while len(enc.encode(text)) > 128000:
        print("truncating...")
        # find the first user input
        for index, message in enumerate(messages):
            if message['role'] == 'user' and len(message['content']) > 1000:
                messages[index] = {
                    "role": "user",
                    "content": message['content'][:-1000]
                }
                break
        text = json.dumps(messages)
        print(len(enc.encode(text)))
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0
        )
    except Exception as e:
        print(e)
        print("retrying...")
        return request_gpt4(messages)
    return response.choices[0].message.content

def save_json(data, filepath=r'new_data.json'):
    with open(filepath, 'w', encoding='utf-8') as fp:
        json.dump(data, fp, indent=4)

def toString(chunk):
    result = ''
    for dialogue in chunk:
        if dialogue['speaker'] == '1':
            result += "Interviewer: "
        else:
            result += "Interviewee: "
        # result += dialogue['speaker'] + ": " + dialogue['content'] + '\n'
        result += dialogue['content'] + "\n"
    return result

def extract_title(conversation):
    messages = [
        {
            "role": "system",
            "content": """You are a title analysis system. 
            You are given a conversation between two people: Interviewer and Interviewee. 
            Give a concise title for the conversation with no more than 10 words.
            Reply with Traditional Chinese.
        """
        },
        {
            "role": "user",
            "content": conversation
        }
    ]
    return request_gpt4(messages)
    

def chunk_titles():
    # Note: run time very long, consider running on kwon
    for interview_file in glob.glob("chunk_summaries/*.json"):
        interview_data = json.load(open(interview_file))
        print(interview_file)
        for chunk in interview_data:
            # if 'raw_keywords' in chunk:
            #     continue
            interviewee_messages = toString(chunk['conversation'])
            title = extract_title(interviewee_messages)
            # print(interviewee_messages)
            print(title)
            chunk['title'] = title
        print("===========================================")
        save_json(interview_data, interview_file)

if __name__ == "__main__":
    chunk_titles()
