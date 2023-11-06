import openai
import json

# openai.api_key = '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'
openai.api_key = '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'

# Load the interview content
with open('chunks_N1.json', 'r') as file:
    chunks = json.load(file)

def toString(chunk):
    result = ''
    for dialogue in chunk:
        if dialogue['speaker'] == 1:
            result += 'Interviewer: ' + dialogue['content'] + '\n'
        if dialogue['speaker'] == 0:
            result += 'Interviewee: ' + dialogue['content'] + '\n'
    # print(result)
    return result

def summarize_arguments(chunk):
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo-16k", 
        messages=[
             {
                "role": "system", "content": """您是一位很專業的顧問，可以逐步分析和總結訪談內容。 用戶會給你提供一個訪談紀錄，這個訪談的受訪者是居住在台灣的綠島的當地居民。 
                訪談者問了他一些問題。請先用一兩句中文簡潔概括被採訪者的有建設性的重點意見并列出要點來總結他的回答。"""
             },
            {"role": "user", "content": toString(chunk)},
        ],
    )
    return response.choices[0]["message"]["content"]


def concise_summarization(summarization):
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo-16k", 
        messages=[
            
             {
                "role": "system", "content": """
                請用幾句簡潔的中文去概括重要觀點和建議。
                """
             },
            {"role": "user", "content": summarization},
        ],
    )
    return response.choices[0]["message"]["content"]

def topic_title(summary):
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo-16k", 
        messages=[
            {
                "role": "system", 
                "content": "鑑於以下採訪摘錄，其中有問題與簡要解決方式。請為其關鍵重點寫出一個合理且相關的中文短語標題使讀者更好理解大概內容。 "
            },
            {"role": "user", "content": summary}
        ],
    )
    return response.choices[0]["message"]["content"]

def concise_title(title):
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo-16k", 
        messages=[
            
             {
                "role": "system", "content": """
                請用簡潔的中文去概括重要觀點生成一個短語。
                """
             },
            {"role": "user", "content": title},
        ],
    )
    return response.choices[0]["message"]["content"]

# def infer_question(answer):
#     response = openai.ChatCompletion.create(
#         model="gpt-3.5-turbo-16k", 
#         messages=[
#             {
#                 "role": "system", 
#                 "content": "您是一位熟練的助手，能夠根據給的訪談內容建立標題。 請為以下摘要創造一個十個字內的中文相關短標題。舉例'''新居民的轉型與挑戰'''"
                
#             },
#             {"role": "user", "content": answer}
#         ],
#     )
#     return response.choices[0]["message"]["content"]

# def infer_title(question, answer):
#     response = openai.ChatCompletion.create(
#         model="gpt-3.5-turbo-16k", 
#         messages=[
#             {
#                 "role": "system", 
#                 你是一個問題推理者，你根據答案推斷出正在被問到問題。請用問句回答並以“問題：”開頭。
#                 "content": "你是一個訪談的紀錄者，以下有一對問題與回答，請用一個短語為回答寫一個標題。"
                    # 舉例類似“人口轉變：現居民多為移居者”。確定主要主題和觀點之後      "鑑於以下採訪摘錄，請提供一個包括簡單問題與解決方式的“合適短語標題”。"
#             },
#             {"role": "user", "content": "問題：{} \n回答：".format(question, answer)}
#         ],
#     )
#     return response.choices[0]["message"]["content"]

# 人口轉變：現居民多為移居者

i = 1
results = []
for chunk in chunks:
    summarization = summarize_arguments(chunk)
    if len(summarization) > 300:
        summarization = concise_summarization(summarization)
    # title = topic_title(summarization)
    title = topic_title(summarization)
    if len(title) > 10:
        title = concise_title(title)
    # title = infer_title(question, toString(chunk))
    # print(question)
    # print(title)
    # continue
    print(f"{i}. {title}:")
    print(f"{summarization}")
    print("\n" + "-"*50 + "\n")    
    i += 1

    results.append({"title": title, "summary": summarization})
    titles = [result["title"] for result in results]
    summaries = [result["summary"] for result in results]
    with open("summaryII.txt", "w") as file:
        j = 1
        for j, (title, summary) in enumerate(zip(titles, summaries)):
            file.write(f"{j}. 「{title}」\n")
            file.write(f"{summary}\n")
            file.write("\n" + "-"*50 + "\n")
            j += 1