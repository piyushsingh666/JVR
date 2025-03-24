//server.js
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from './utils/db.js';
import userRoute from './routes/authRoute.js';
import companyRoute from './routes/compRoute.js';
import jobRoute from './routes/jobRoute.js';
import applicationRoute from './routes/appRoute.js';
import emailRoute from './routes/emailRoute.js';
import rankRoutes from './routes/rankRoute.js'
import axios from 'axios';
import { User } from './models/User.js';
import Authenticate from './middlewares/isAuthenticated.js';

dotenv.config(); 

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const allowedOrigins = [
    "http://localhost:3000",  
    process.env.CLIENT_URL    
];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
};
app.use(cors(corsOptions));

// API Routes
app.use("/api/user", userRoute);
app.use("/api/company", companyRoute);
app.use("/api/job", jobRoute);
app.use("/api/application", applicationRoute);
app.use("/api/email", emailRoute);
app.use("/api/job", rankRoutes);
app.get('/api/user/get-recommended-jobs', Authenticate, async (req, res) => {
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
            res.status(200).json({ recommended_jobs: mlResponse.data.recommended_jobs });
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
});

const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    await connectDB();
    console.log(`Server running at http://localhost:${PORT}`);
});
