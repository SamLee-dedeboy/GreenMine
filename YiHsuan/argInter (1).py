from openai import OpenAI
import json
client = OpenAI(api_key)

with open('chunks_N1.json', 'r') as file:
    chunks = json.load(file)

def toString(chunk):
    result = ''
    for dialogue in chunk:
        if dialogue['speaker'] == 1:
            result += 'Interviewer: ' + dialogue['content'] + '\n'
        if dialogue['speaker'] == 0:
            result += 'Interviewee: ' + dialogue['content'] + '\n'
    return result

# 提供 JSON 格式的输出，如下所示：
# [{“A. 重要觀點”: },
# {“B. 建議”: }]
def summarize_arguments(chunk):
    response = client.chat.completions.create(
        model="gpt-3.5-turbo-1106", 
        # response_format={ "type": "json_object" },
        messages=[
             {
                "role": "system", 
                "content": """
                您是一位很專業的顧問，可以逐步分析和總結訪談內容。 用戶會給你提供一個訪談紀錄，這個訪談的受訪者是居住在台灣的綠島的當地居民。 
                訪談者問了他一些問題。先用一兩句中文簡潔概括被採訪者的有建設性的重點意見，然後根據提供的例子的格式列出要點來總結他的回答。
                """
             },
             {
                "role": "system",
                "name": "example_assistant",
                "content": 
                """
                A. 重要觀點:
                    ...,
                    ...,
                    ...,
                    ...
                B. 建議:
                    ...,
                    ...,
                    ...,
                    ...
                """
             },
            {"role": "user", "content": toString(chunk)+"\n請幫我根據以上要求去總結"},
        ],
    )
    return response.choices[0].message.content


def concise_summarization(summarization):
    response = client.chat.completions.create(
        model="gpt-3.5-turbo-1106", 
        # response_format={ "type": "json_object" }, 
        messages=[
             {
                "role": "system", 
                "content": """
                您是一位總結分析師，請根據提供的例子的格式並用更簡潔的中文去列出重要觀點和建議。
                """
             },
             {
                "role": "system",
                "name": "example_assistant",
                "content": 
                """
                A. 重要觀點:
                    ...,
                    ...,
                    ...,
                    ...
                B. 建議:
                    ...,
                    ...,
                    ...,
                    ...
                """
             },
            {"role": "user", "content": summarization+"\n請幫我根據以上要求去總結"},
        ],
    )
    return response.choices[0].message.content

def topic_title(summary):
    response = client.chat.completions.create(
        model="gpt-3.5-turbo-1106",  
        messages=[
            {
                "role": "system", 
                "content": """
                    您是一位文章摘要編輯，擅於尋找採訪中的問題和提出的解決辦法所要表達的中心主題。訪談主要為了想了解民眾意見。 鑑於以下採訪摘錄，其中有問題與簡要解決方式。
                """
            },
            # { 根據提供的例子的格式並 請根據提供的問答為其關鍵重點寫出一個嚴謹客觀且相關的標題使讀者更好理解大概內容。
            #     "role": "system",
            #     "name": "example_assistant",
            #     "content": 
            #     """
            #         文章中的問題：提出的解決辦法
            #     """
            #  },
            {"role": "user", "content": summary+"請根據摘要明確採訪議題，用中文簡要出一個嚴謹並且精準明確的採訪問題標題，使讀者更好理解這段文字所要表達的主要內容。"}
        ],
        temperature = 0.2,
        # 請根據摘要明確採訪議題，用中文描繪出一個貼切實際並且有主要問題的標題，使讀者更好理解這段文字所要表達的主要內容"
    )
    return response.choices[0].message.content

def concise_title(title):
    response = client.chat.completions.create(
        model="gpt-3.5-turbo-1106",  
        messages=[
            
             {
                "role": "system", "content": """
                您是一位語句總結師，可以根據提供的語句用中文概括中心主體思想成一個嚴謹客觀且相關的標題，使讀者更好理解大概內容。
                """
             },
            #  { 提供的例子的格式並根據 請根據提供的語句用中文概括重點成十字內的嚴謹客觀且相關的標題使讀者更好理解大概內容。
            #     "role": "system",
            #     "name": "example_assistant",
            #     "content": 
            #     """
            #         文章中的問題：提出的解決辦法
            #     """
            #  },
            {"role": "user", "content": title+"段落較長，請用中文更簡要摘要出一個採訪的精準議題標題"},
        ],
        temperature = 0.1,
    )
    return response.choices[0].message.content

i = 1
results = []
for chunk in chunks:
    summarization = summarize_arguments(chunk)
    if len(summarization) > 300:
        summarization = concise_summarization(summarization)
    title = topic_title(summarization)
    if len(title) > 30:
        title = concise_title(title)
    print(f"{i}. {title}:")
    print(f"{summarization}")
    print("\n" + "-"*50 + "\n")    
    i += 1

    results.append({"title": title, "summary": summarization})
    titles = [result["title"] for result in results]
    summaries = [result["summary"] for result in results]
    with open("promptA_sumVI.txt", "w") as file:
        j = 1
        for j, (title, summary) in enumerate(zip(titles, summaries)):
            file.write(f"{j}. 「{title}」\n")
            file.write(f"{summary}\n")
            file.write("\n" + "-"*50 + "\n")
            j += 1