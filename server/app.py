import glob
from flask import Flask, request
from flask_cors import CORS
import json
app = Flask(__name__)
CORS(app)
data_path = '../data/'

@app.route("/data/")
def get_data():
    # interview
    interviews = []
    for interview_file in glob.glob(data_path + "result/chunks/v2_1029/*.json"):
        interview_data = json.load(open(interview_file))
        file_name = interview_file.split('/')[-1].replace(".json", "")
        interviews.append(
            {
                "file_name": file_name,
                "data": interview_data
            }
        )
    interviews = sorted(interviews, key=lambda x: int(x['file_name'].replace("chunks_N", "").replace("_background", "").replace("_topics", "")))
    # reports
    reports = []
    # for report_file in glob.glob(data_path + "raw/reports/representative_proposals/json/*.json"):
    #     report_data = json.load(open(report_file))
    #     file_name = report_file.split('/')[-1].replace(".json", "")
    #     reports.append({
    #         "file_name": file_name,
    #         "data": report_data
    #     })
    res = {
        'interviews': interviews,
        'reports': reports
    }
    return json.dumps(res, default=vars)
