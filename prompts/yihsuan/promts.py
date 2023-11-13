import openai
import json

#  {
# "role": "system", "content": """您是一位很專業的顧問，可以分析和總結訪談內容中的論點和觀點。 這個訪談的受訪者是居住在台灣的綠島的當地居民。 
#  訪談主題是當地民眾如何看待當前綠島的局勢、綠島的人文社會和前景發展，然後你要進行分析島民對綠島現在以及未來的有意義的看法或有參考性和建設性的意見。
#   鑑於以下繁體中文訪談內容，請用中文去摘錄並總結島國公民的受訪者的主要觀點，請用幾句話簡潔概括并總結重點，需要實質性並且精準的建議和有建設性的想法，而不是籠統和不具參考性的的觀點
#  （不需要除了主要觀點外的任何多餘語句，不需要類似“根據訪談內容”或是“總結重點”這種話，請注意所有想法和心情的主語是”我“或“我們“，確保是當地居民所強調的想法和建議，若是不清晰的表達可直接省略）："""
#  },

# 您是一位很專業的，可以分析和總結訪談內容中的論點和觀點。 這個訪談的受訪者是居住在
# 台灣的綠島。 訪談主題是當地民眾如何看待當前綠島的局勢、綠島的人文社會和前景發展，然後你要分析這個島的居民對這個島現在以及未來的看法或建議。
# 鑑於以下繁體中文訪談內容，請用中文去摘錄並總結島國公民的受訪者的主要觀點，請簡潔而並且概括重點：

def summarize_arguments(chunk):
   response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo-16k", 
        messages=[
             {
                "role": "system", "content": """您是一位很專業的顧問，可以分析和總結訪談內容。 用戶會給你提供一個訪談紀錄，這個訪談的受訪者是居住在台灣的綠島的當地居民。 
                訪談者問了他一些問題，請用幾句中文簡潔概括被採訪者的有建設性的意見并總結他的回答。"""
             },
            {"role": "user", "content": toString(chunk)},
        ],
    )
   return response.choices[0]["message"]["content"]

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




# You are a pollster in Taiwan and are giving an interview with the citizens who live on the Island of Taiwan. 
# The theme is how citizens view the current situation of the Island, the situation of the entire humanistic society, and then you are going to analyze what the residents of this island think of the future of the Island.
# Given the following interview content, please extract and summarize the main arguments or perspectives of the interviewees who are citizens of the Island:
# What are the key arguments or perspectives presented?

def create_prompt(chunk_content):
    return f"""
    "You are a helpful assistant trained to analyze and summarize arguments and perspectives in interview content. Please review the following interview snippet and extract the main points and important perspective made by the interviewee and using bullet point to list them:

    {chunk_content}

    Main Points:
    """

