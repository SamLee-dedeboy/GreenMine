from openai import OpenAI
import json
client = OpenAI(api_key = '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')

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

def summarize_arguments(chunk):
    response = client.chat.completions.create(
        model="gpt-3.5-turbo-1106", 
        response_format={ "type": "json_object" },
        messages=[
             {
                "role": "system", 
                "content": """
                "Answering the following with JSON format:"
                "A. 重要觀點":
                “B. 建議”: 
                您是一位很專業的顧問，可以逐步分析和總結訪談內容。 用戶會給你提供一個訪談紀錄，這個訪談的受訪者是居住在台灣的綠島的當地居民。 
                訪談者問了他一些問題。請先用一兩句中文簡潔概括被採訪者的有建設性的重點意見，并列出要點來總結他的回答。
                舉例為
                “- 綠島目前的人口結構主要是由工作人口和其家屬組成，大約2/3是新居民。 
                - 原住民的人數較少，目前的原住民數據主要是因為工作在綠島的原住民登記，而非真正居住在島上的原住民。
                - 學校中的學生約一半以上的學生是新居民的孩子。
                - 現在考量問題需考慮到新居民的意見和角度。” 
                """
             },
            {"role": "user", "content": toString(chunk)},
        ],
    )
    return response.choices[0].message.content


def concise_summarization(summarization):
    response = client.chat.completions.create(
        model="gpt-3.5-turbo-1106", 
        response_format={ "type": "json_object" }, 
        messages=[
             {
                "role": "system", 
                "content": """
                Answering the following with JSON format:
                "A. 重要觀點:":
                “B. 建議:”:
                您是一位總結分析師，請用更簡潔的中文去列出重要觀點和建議。
                """
             },
            {"role": "user", "content": summarization},
        ],
    )
    return response.choices[0].message.content

def topic_title(summary):
    messages = []

    response = client.chat.completions.create(
        model="gpt-3.5-turbo-1106", 
        response_format={ "type": "json_object" },
        messages=messages,
        temperature=0,
    )
    return response.choices[0].message.content

def concise_title(title):
    response = client.chat.completions.create(
        model="gpt-3.5-turbo-1106", 
        response_format={ "type": "json_object" },
        messages=[
            
             {
                "role": "system", 
                "content": """
                Answering the following with JSON format:
                "標題":
                您是一位總結分析師，請用中文概括其被採訪者的重要觀點成一個相關且合理的短語使讀者更好理解內容。
                """
             },
            {"role": "user", "content": title},
        ],
    )
    return response.choices[0].message.content

i = 1
results = []
for chunk in chunks:
    summarization = summarize_arguments(chunk)
    if len(summarization) > 300:
        summarization = concise_summarization(summarization)
    title = topic_title(summarization)
    if len(title) > 15:
        title = concise_title(title)
    print(f"{i}. {title}:")
    print(f"{summarization}")
    print("\n" + "-"*50 + "\n")    
    i += 1

    results.append({"title": title, "summary": summarization})
    titles = [result["title"] for result in results]
    summaries = [result["summary"] for result in results]
    with open("promptA_sumIII.txt", "w") as file:
        j = 1
        for j, (title, summary) in enumerate(zip(titles, summaries)):
            file.write(f"{j}. 「{title}」\n")
            file.write(f"{summary}\n")
            file.write("\n" + "-"*50 + "\n")
            j += 1