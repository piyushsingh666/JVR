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

const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    await connectDB();
    console.log(`Server running at http://localhost:${PORT}`);
});
