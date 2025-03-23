import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { Job } from "../models/Job.js";
import { User } from "../models/User.js";
import multer from "multer";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Multer setup for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const rankApplicants = async (req, res) => {
    try {
        const jobId = req.params.jobId;

        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ message: "Invalid Job ID format." });
        }
        // Fetch job and applicants
        const job = await Job.findById(jobId).populate("applications");
        if (!job) return res.status(404).json({ message: "Job not found." });

        const applicantIds = job.applications.map(app => app.applicant);
        const applicants = await User.find({ _id: { $in: applicantIds } });

        if (!applicants.length) return res.status(404).json({ message: "No applicants found." });

        // Extract resume file paths and map to applicant IDs
        let resumeData = [];
        applicants.forEach(applicant => {
            if (applicant.profile && applicant.profile.resume) {
                const resumePath = path.join(__dirname, "../uploads/resumes", applicant.profile.resume.replace("uploads/resumes/", ""));
                if (fs.existsSync(resumePath)) {
                    resumeData.push({ applicantId: applicant._id.toString(), resumePath });
                }
            }
        });

        if (!resumeData.length) return res.status(400).json({ message: "No resumes found for ranking." });

        const pythonProcess = spawn("python", ["ml-model/rank_resumes.py"]);

        // Send job details & resumes to Python script
        pythonProcess.stdin.write(JSON.stringify({
            job_title: job.title,
            job_description: job.description,
            job_requirements: job.requirements,
            resumes: resumeData
        }));
        pythonProcess.stdin.end();

        let output = "";
        pythonProcess.stdout.on("data", (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            console.error("Python Error:", data.toString());
        });

        pythonProcess.on("close", () => {
            try {
                console.log("Python Output:", output);
                const rankedApplicants = JSON.parse(output);
                res.json(rankedApplicants);
            } catch (error) {
                res.status(500).json({ message: "Error processing ranking.", error: error.message });
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Error processing applicants", error: error.message });
    }
};

export { rankApplicants, upload };
