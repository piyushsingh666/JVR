import express from "express";
import { rankApplicants, upload } from "../controllers/rankController.js";

const router = express.Router();

router.post("/:jobId/rank", (req, res, next) => {
    console.log("Ranking API Hit - Job ID:", req.params.jobId);
    next();
}, rankApplicants);

export default router;
