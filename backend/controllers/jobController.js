import { Job } from "../models/Job.js";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { Application } from "../models/Application.js"; // Assuming you have an Application model
import axios from 'axios';
import { searchSuggestions } from '../utils/nlpProcessor.js';
import mongoose from "mongoose";

export const postJob = async (req, res) => {
    try {
        const { title, description, requirements, salary, location, jobType, experience, position, companyId } = req.body;
        const userId = req.id;

        if (!title || !description || !requirements || !salary || !location || !jobType || !experience || !position || !companyId) {
            return res.status(400).json({
                message: "Something is missing.",
                success: false
            });
        }
        
        console.log('Creating job with created_by:', userId);
        const job = await Job.create({
            title,
            description,
            requirements: requirements.split(","),
            salary,
            location,
            jobType,
            experienceLevel: experience,
            position,
            company: companyId,
            created_by: userId
        });
        
        return res.status(201).json({
            message: "New job created successfully.",
            job,
            success: true
        });
    } catch (error) {
        console.log('Error in postJob:', error);
        return res.status(500).json({
            message: "An error occurred while creating the job.",
            success: false
        });
    }
};

export const getAllJobs = async (req, res) => {
    try {
        const keyword = req.query.keyword || "";
        const query = {
            $or: [
                { title: { $regex: keyword, $options: "i" } },
                { description: { $regex: keyword, $options: "i" } },
                { location: { $regex: keyword, $options: "i" } }
            ]
        };

        const jobs = await Job.find(query).populate({
            path: "company",
            select: "name logo"
        }).sort({ createdAt: -1 });

        console.log(`Fetched ${jobs.length} jobs for keyword "${keyword}":`, jobs);

        if (!jobs.length) {
            return res.status(404).json({
                message: "Jobs not found.",
                success: false
            });
        }

        return res.status(200).json({
            jobs,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "An error occurred while fetching jobs.",
            success: false
        });
    }
};

export const getJobById = async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await Job.findById(jobId).populate({
            path: "applications",
            select: "applicant"
        }).populate({
            path: "company",
            select: "name logo"
        });

        if (!job) {
            return res.status(404).json({
                message: "Job not found.",
                success: false
            });
        }

        return res.status(200).json({ job, success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "An error occurred while fetching the job.",
            success: false
        });
    }
};

export const getAdminJobs = async (req, res) => {
    try {
        const adminId = req.id;
        console.log('Fetching admin jobs for user ID:', adminId);
        const jobs = await Job.find({ created_by: adminId }).populate({
            path: 'company',
            select: "name logo"
        }).sort({ createdAt: -1 });

        console.log('Found jobs:', jobs);
        if (!jobs.length) {
            return res.status(404).json({
                message: "No jobs found for this employer.",
                success: false
            });
        }

        return res.status(200).json({
            jobs,
            success: true
        });
    } catch (error) {
        console.log('Error in getAdminJobs:', error);
        return res.status(500).json({
            message: "An error occurred while fetching admin jobs.",
            success: false
        });
    }
};

export const deleteJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const userId = req.id;

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                message: "Job not found.",
                success: false
            });
        }

        if (job.created_by.toString() !== userId) {
            return res.status(403).json({
                message: "You are not authorized to delete this job.",
                success: false
            });
        }

        await Job.findByIdAndDelete(jobId);
        return res.status(200).json({
            message: "Job deleted successfully.",
            success: true
        });
    } catch (error) {
        console.error('Error deleting job:', error);
        return res.status(500).json({
            message: "An error occurred while deleting the job.",
            success: false
        });
    }
};

export const getRecommendedJobs = async (req, res) => {
    try {
        const user = await User.findById(req.id).select('profile.skills');
        if (!user) return res.status(404).json({ error: 'User not found' });

        const skills = user.profile?.skills || [];
        if (skills.length === 0) {
            return res.status(200).json({ recommended_jobs: [], message: 'No skills available for recommendations' });
        }

        const mlServiceUrl = 'http://localhost:5001/predict';
        console.log('Sending skills to ML service:', skills);
        const mlResponse = await axios.post(mlServiceUrl, { skills }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        console.log('ML service response:', mlResponse.data);

        if (mlResponse.data && mlResponse.data.recommended_jobs) {
            const recommendedJobs = await Promise.all(
                mlResponse.data.recommended_jobs.map(async (job) => {
                    // Ensure job.company is an ObjectId or string before querying
                    if (job.company && (typeof job.company === 'string' || job.company instanceof mongoose.Types.ObjectId)) {
                        const companyId = job.company.toString(); // Convert ObjectId to string
                        const company = await Company.findById(companyId).select('name logo');
                        job.company = company ? { name: company.name, logo: company.logo } : { name: 'Unknown' };
                    } else if (job.company && typeof job.company === 'object') {
                        // If company is already populated, use it directly
                        job.company = { name: job.company.name || 'Unknown', logo: job.company.logo || '' };
                    } else {
                        // If no company, set a default
                        job.company = { name: 'Unknown', logo: '' };
                    }
                    return job;
                })
            );
            res.status(200).json({ recommended_jobs: recommendedJobs });
        } else {
            res.status(200).json({ recommended_jobs: [], message: 'No recommendations from ML service' });
        }
    } catch (error) {
        console.error('Error in get-recommended-jobs:', error.message);
        if (error.response) {
            console.error('ML Service Error Response:', error.response.data);
            res.status(500).json({ error: 'Failed to fetch recommendations from ML service' });
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            console.error('ML Service unavailable:', error.code);
            res.status(500).json({ error: 'ML service is not running or unreachable' });
        } else {
            console.error('Unexpected error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

export const getAppliedJobs = async (req, res) => {
    try {
        const userId = req.id;
        const applications = await Application.find({ applicant: userId })
            .populate({
                path: 'job',
                populate: {
                    path: 'company',
                    select: 'name logo'
                }
            })
            .sort({ createdAt: -1 });

        if (!applications.length) {
            return res.status(404).json({
                message: "No applications found.",
                success: false
            });
        }

        return res.status(200).json({
            applications,
            success: true
        });
    } catch (error) {
        console.error('Error fetching applied jobs:', error);
        return res.status(500).json({
            message: "An error occurred while fetching applied jobs.",
            success: false
        });
    }
};

export const getJobSuggestions = (req, res) => {
    const { query, type } = req.query;
    const results = searchSuggestions(query, type);
    res.json(results);
};