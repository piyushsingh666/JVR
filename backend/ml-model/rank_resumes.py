import sys
import json
import joblib
import os
import numpy as np
from pdfminer.high_level import extract_text
from sklearn.feature_extraction.text import TfidfVectorizer

BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "resume_rank_model.joblib")
VECTORIZER_PATH = os.path.join(BASE_DIR, "tfidf_vectorizer.joblib")

model = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VECTORIZER_PATH)

def extract_pdf_text(pdf_path):
    """Extract text from a PDF resume."""
    if not os.path.exists(pdf_path):
        return ""
    try:
        return extract_text(pdf_path).strip()
    except Exception:
        return ""

def rank_resumes(job_title, job_description, job_requirements, resumes):
    if not resumes:
        return {"error": "No resumes provided"}

    job_text = f"{job_title} {job_description} {job_requirements}"
    resume_texts = [extract_pdf_text(res["resumePath"]) for res in resumes]

    valid_resumes = [res for i, res in enumerate(resumes) if resume_texts[i].strip()]
    valid_texts = [text for text in resume_texts if text.strip()]

    if not valid_resumes:
        return {"error": "No valid resumes found"}

    job_vector = vectorizer.transform([job_text])
    resume_vectors = vectorizer.transform(valid_texts)

    scores = model.predict(resume_vectors.toarray())

    rankings = sorted(
        [{"applicantId": valid_resumes[i]["applicantId"], "score": round(scores[i], 2)}
         for i in range(len(scores))],
        key=lambda x: x["score"], reverse=True
    )

    return rankings

if __name__ == "__main__":
    data = json.loads(sys.stdin.read())
    ranked_applicants = rank_resumes(
        data.get("job_title", ""), 
        data.get("job_description", ""), 
        data.get("job_requirements", ""), 
        data.get("resumes", [])
    )
    print(json.dumps(ranked_applicants))
