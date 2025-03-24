from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import os
import logging
from bson.objectid import ObjectId
import pymongo
import threading
from collections import Counter

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/predict": {"origins": ["http://localhost:3000", "http://localhost:5000"], "methods": ["POST", "OPTIONS"], "allow_headers": ["Content-Type"]}})

# Connect to MongoDB
client = pymongo.MongoClient("mongodb://localhost:27017/")
db = client['JobVoyage']
job_collection = db['jobs']
company_collection = db['companies']
user_collection = db['users']

# Global variables for the ML model
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = BASE_DIR
tfidf = None
jobs_data = []
user_indices = []
job_indices = []
similarity_matrix = None
match_counts = None
user_skills_list = []
user_skills_sets = []
job_requirements_list = []
job_requirements_sets = []
existing_job_ids = set()
model_lock = threading.Lock()

# Helper function to convert ObjectId to string
def convert_objectid_to_str(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, dict):
        return {k: convert_objectid_to_str(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_objectid_to_str(item) for item in obj]
    return obj

# Train or update the ML model
def train_ml_model(update=False, new_job=None, deleted_job_id=None):
    global tfidf, jobs_data, user_indices, job_indices, similarity_matrix, match_counts
    global user_skills_list, user_skills_sets, job_requirements_list, job_requirements_sets, existing_job_ids

    with model_lock:
        if not update:
            # Initial training
            users = list(user_collection.find())
            jobs_data = list(job_collection.find())
            user_skills_list = []
            user_skills_sets = []
            for user in users:
                skills = user.get('profile', {}).get('skills', [])
                if not skills or not isinstance(skills, list):
                    user_skills_list.append("")
                    user_skills_sets.append(set())
                else:
                    cleaned_skills = [skill.lower().strip() for skill in skills if skill.strip()]
                    user_skills_list.append(" ".join(cleaned_skills))
                    user_skills_sets.append(set(cleaned_skills))

            job_requirements_list = []
            job_requirements_sets = []
            for job in jobs_data:
                company_field = job.get('company', None)
                if isinstance(company_field, ObjectId) or (isinstance(company_field, str) and len(company_field) == 24):
                    try:
                        company_id = ObjectId(company_field)
                        company = company_collection.find_one({'_id': company_id})
                        job['company'] = {'name': company.get('name', 'Unknown') if company else 'Unknown', 'logo': company.get('logo', '') if company else ''}
                    except Exception as e:
                        logger.error(f"Error resolving company {company_field}: {e}")
                        job['company'] = {'name': 'Unknown', 'logo': ''}
                job['_id'] = str(job['_id'])
                job = convert_objectid_to_str(job)
                reqs = job.get('requirements', [])
                if not reqs or not isinstance(reqs, list):
                    job_requirements_list.append("")
                    job_requirements_sets.append(set())
                else:
                    cleaned_reqs = [req.lower().strip() for req in reqs if req.strip()]
                    job_requirements_list.append(" ".join(cleaned_reqs))
                    job_requirements_sets.append(set(cleaned_reqs))
                existing_job_ids.add(job['_id'])
        else:
            if new_job:
                # Add new job
                company_field = new_job.get('company', None)
                if isinstance(company_field, ObjectId) or (isinstance(company_field, str) and len(company_field) == 24):
                    try:
                        company_id = ObjectId(company_field)
                        company = company_collection.find_one({'_id': company_id})
                        new_job['company'] = {'name': company.get('name', 'Unknown') if company else 'Unknown', 'logo': company.get('logo', '') if company else ''}
                    except Exception as e:
                        logger.error(f"Error resolving company {company_field}: {e}")
                        new_job['company'] = {'name': 'Unknown', 'logo': ''}
                new_job['_id'] = str(new_job['_id'])
                new_job = convert_objectid_to_str(new_job)
                jobs_data.append(new_job)
                existing_job_ids.add(new_job['_id'])
                reqs = new_job.get('requirements', [])
                if not reqs or not isinstance(reqs, list):
                    job_requirements_list.append("")
                    job_requirements_sets.append(set())
                else:
                    cleaned_reqs = [req.lower().strip() for req in reqs if req.strip()]
                    job_requirements_list.append(" ".join(cleaned_reqs))
                    job_requirements_sets.append(set(cleaned_reqs))
            elif deleted_job_id:
                # Remove deleted job
                jobs_data[:] = [job for job in jobs_data if job['_id'] != deleted_job_id]
                existing_job_ids.discard(deleted_job_id)
                new_job_requirements_list = []
                new_job_requirements_sets = []
                for job in jobs_data:
                    reqs = job.get('requirements', [])
                    if not reqs or not isinstance(reqs, list):
                        new_job_requirements_list.append("")
                        new_job_requirements_sets.append(set())
                    else:
                        cleaned_reqs = [req.lower().strip() for req in reqs if req.strip()]
                        new_job_requirements_list.append(" ".join(cleaned_reqs))
                        new_job_requirements_sets.append(set(cleaned_reqs))
                job_requirements_list = new_job_requirements_list
                job_requirements_sets = new_job_requirements_sets

        # Filter valid entries
        valid_users = [(i, skills, skill_set) for i, (skills, skill_set) in enumerate(zip(user_skills_list, user_skills_sets)) if skill_set]
        valid_jobs = [(i, reqs, req_set) for i, (reqs, req_set) in enumerate(zip(job_requirements_list, job_requirements_sets)) if req_set]

        if not valid_users or not valid_jobs:
            logger.warning("No valid user skills or job requirements found")
            tfidf = TfidfVectorizer(stop_words=None, lowercase=False)
            similarity_matrix = np.array([[]])
            match_counts = np.array([[]])
            user_indices = []
            job_indices = []
            return

        user_indices[:], user_skills_list[:], user_skills_sets[:] = zip(*valid_users)
        job_indices[:], job_requirements_list[:], job_requirements_sets[:] = zip(*valid_jobs)

        # TF-IDF Vectorization
        all_text = list(user_skills_list) + list(job_requirements_list)
        tfidf = TfidfVectorizer(stop_words=None, lowercase=False)
        tfidf_matrix = tfidf.fit_transform(all_text)

        # Split into user and job matrices
        n_users = len(user_skills_list)
        user_tfidf = tfidf_matrix[:n_users]
        job_tfidf = tfidf_matrix[n_users:]

        # Compute cosine similarity and exact matches
        similarity_matrix = cosine_similarity(user_tfidf, job_tfidf)
        match_counts = np.zeros((n_users, len(job_requirements_sets)))
        for i, user_skills in enumerate(user_skills_sets):
            for j, job_reqs in enumerate(job_requirements_sets):
                match_counts[i, j] = len(user_skills.intersection(job_reqs))

        # Save the model and data
        try:
            joblib.dump(tfidf, os.path.join(MODEL_DIR, 'tfidf_vectorizer.joblib'))
            joblib.dump(jobs_data, os.path.join(MODEL_DIR, 'jobs_data.joblib'))
            joblib.dump(similarity_matrix, os.path.join(MODEL_DIR, 'similarity_matrix.joblib'))
            joblib.dump(match_counts, os.path.join(MODEL_DIR, 'match_counts.joblib'))
            joblib.dump(list(user_indices), os.path.join(MODEL_DIR, 'user_indices.joblib'))
            joblib.dump(list(job_indices), os.path.join(MODEL_DIR, 'job_indices.joblib'))
            logger.info("Updated ML model and saved files")
        except Exception as e:
            logger.error(f"Error saving model files: {e}")

# Watch for changes in the jobs collection
def watch_jobs_collection():
    try:
        with job_collection.watch([{'$match': {'operationType': {'$in': ['insert', 'delete']}}}]) as stream:
            for change in stream:
                operation_type = change['operationType']
                if operation_type == 'insert':
                    new_job = change['fullDocument']
                    logger.info(f"New job added: {new_job.get('title', 'No title')}")
                    train_ml_model(update=True, new_job=new_job)
                elif operation_type == 'delete':
                    deleted_job_id = str(change['documentKey']['_id'])
                    logger.info(f"Job deleted: {deleted_job_id}")
                    train_ml_model(update=True, deleted_job_id=deleted_job_id)
    except Exception as e:
        logger.error(f"Error in change stream: {e}")

# Start the change stream in a background thread
threading.Thread(target=watch_jobs_collection, daemon=True).start()

# Initial training
train_ml_model()

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        if not data or 'skills' not in data:
            logger.warning("Invalid or missing skills data")
            return jsonify({'recommended_jobs': []}), 200

        user_skills = data.get('skills', [])
        user_skills_set = set(skill.lower().strip() for skill in user_skills if skill.strip())
        
        if not user_skills_set:
            return jsonify({'recommended_jobs': []}), 200

        with model_lock:
            # Process job requirements
            job_texts = []
            job_requirements_sets = []
            for job in jobs_data:
                if not isinstance(job, dict):
                    continue
                reqs = job.get('requirements', [])
                cleaned_reqs = [req.lower().strip() for req in reqs if isinstance(reqs, list) and req.strip()]
                job_texts.append(" ".join(cleaned_reqs))
                job_requirements_sets.append(set(cleaned_reqs))

            if not job_texts:
                return jsonify({'recommended_jobs': []}), 200

            # Compute similarities
            user_text = ' '.join(user_skills)
            user_tfidf = tfidf.transform([user_text])
            job_tfidf = tfidf.transform(job_texts)
            user_similarity = cosine_similarity(user_tfidf, job_tfidf)[0]
            match_counts_user = np.array([len(user_skills_set.intersection(job_reqs)) for job_reqs in job_requirements_sets])

            # Get recommendations
            valid_indices = np.where(match_counts_user > 0)[0]
            if len(valid_indices) == 0:
                return jsonify({'recommended_jobs': []}), 200

            sorted_indices = valid_indices[np.argsort(-match_counts_user[valid_indices])]
            final_indices = []
            for count in sorted(set(match_counts_user[valid_indices]), reverse=True):
                tie_indices = [i for i in sorted_indices if match_counts_user[i] == count]
                tie_indices.sort(key=lambda i: user_similarity[i], reverse=True)
                final_indices.extend(tie_indices)
                if len(final_indices) >= 5:
                    break

            # Format recommendations
            recommended_jobs = []
            for idx in final_indices[:5]:
                job = jobs_data[idx]
                company = job.get('company', {'name': 'Unknown', 'logo': ''})
                job_data = {
                    '_id': job.get('_id', 'Unknown'),
                    'title': job.get('title', 'No title'),
                    'description': job.get('description', 'No description'),
                    'requirements': job.get('requirements', []),
                    'salary': job.get('salary', 'Not Provided'),
                    'location': job.get('location', 'Not Provided'),
                    'jobType': job.get('jobType', 'Not Provided'),
                    'company': {
                        'name': company.get('name', 'Unknown'),
                        'logo': company.get('logo', '')
                    },
                    'match_count': int(match_counts_user[idx]),
                    'similarity_score': float(user_similarity[idx])
                }
                recommended_jobs.append(job_data)

            return jsonify({'recommended_jobs': recommended_jobs}), 200

    except Exception as e:
        logger.error(f"Error in predict endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)