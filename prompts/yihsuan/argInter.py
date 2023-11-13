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
                "role": "system", "content": """
                您是一位很專業的顧問，可以逐步分析和總結訪談內容。 用戶會給你提供一個訪談紀錄，這個訪談的受訪者是居住在台灣的綠島的當地居民。 
                訪談者問了他一些問題。請先用一兩句中文簡潔概括被採訪者的有建設性的重點意見并列出要點來總結他的回答。舉例為
                “- 綠島目前的人口結構主要是由工作人口和其家屬組成，大約2/3是新居民。 
                - 原住民的人數較少，目前的原住民數據主要是因為工作在綠島的原住民登記，而非真正居住在島上的原住民。
                - 學校中的學生約一半以上的學生是新居民的孩子。
                - 現在考量問題需考慮到新居民的意見和角度。” 
                """
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
                您是一位總結分析師，請用簡潔的中文去概括重要觀點和建議。
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
                "content": """
                您是一位答疑專家，鑑於以下採訪摘錄，其中有問題與簡要解決方式。請為其關鍵重點寫出一個合理且相關的中文短語標題使讀者更好理解大概內容。舉例為
                "人口轉變：現居民多為移居者" 
                """
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
                您是一位總結分析師，請概括其重點成一句相關且合理的短語。
                """
             },
            {"role": "user", "content": title},
        ],
    )
    return response.choices[0]["message"]["content"]

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
    with open("promptA_sumIII.txt", "w") as file:
        j = 1
        for j, (title, summary) in enumerate(zip(titles, summaries)):
            file.write(f"{j}. 「{title}」\n")
            file.write(f"{summary}\n")
            file.write("\n" + "-"*50 + "\n")
            j += 1