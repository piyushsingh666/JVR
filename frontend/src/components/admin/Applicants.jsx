import React, { useEffect, useState } from 'react';
import Navbar from '../shared/Navbar';
import { Button } from '../ui/button';
import ApplicantsTable from './ApplicantsTable';
import axios from 'axios';
import { APPLICATION_API_END_POINT } from '@/utils/constant';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setAllApplicants } from '@/redux/applicationSlice';

const Applicants = () => {
    const params = useParams();
    const dispatch = useDispatch();
    const { applicants } = useSelector(store => store.application);
    const [jobDetails, setJobDetails] = useState(null);
    const [rankedApplicants, setRankedApplicants] = useState([]);
    const [showRanking, setShowRanking] = useState(false);

    useEffect(() => {
        const fetchAllApplicants = async () => {
            try {
                const res = await axios.get(`${APPLICATION_API_END_POINT}/${params.id}/applicants`, { withCredentials: true });
                dispatch(setAllApplicants(res.data.job));
                setJobDetails(res.data.job);
            } catch (error) {
                console.error("Error fetching applicants:", error);
            }
        };
        fetchAllApplicants();
    }, [dispatch, params.id]);

    // 📌 Handle Ranking API Call
    const handleRankApplicants = async () => {
        if (!jobDetails) {
            alert("Job details not available. Please try again.");
            return;
        }
    
        try {
            const response = await axios.post(`http://localhost:5000/api/job/${params.id}/rank`);
            const rankedData = response.data;
    
            if (!Array.isArray(rankedData)) {
                throw new Error("Invalid response format from backend");
            }
    
            console.log("Ranking API Response:", rankedData);
    
            // Merge rank data with existing applicants
            let updatedApplicants = applicants?.applications?.map(applicant => {
                const matchedRank = rankedData.find(a => a.applicantId === applicant.applicant._id);
                return matchedRank ? { ...applicant, score: matchedRank.score } : { ...applicant, score: null };
            });
    
            // Sort applicants by score in descending order (highest score first)
            updatedApplicants = updatedApplicants.sort((a, b) => (b.score === null ? 1 : a.score === null ? -1 : b.score - a.score));
    
            // Assign ranks: Highest score gets Rank 1, second highest gets Rank 2, etc.
            let rank = 1;
            updatedApplicants = updatedApplicants.map((applicant, index) => {
                if (applicant.score === null) {
                    return { ...applicant, rank: "N/A" };
                } else {
                    // Assign rank based on position, ensuring equal scores get the same rank
                    const previousApplicant = updatedApplicants[index - 1];
                    if (index > 0 && previousApplicant.score === applicant.score) {
                        return { ...applicant, rank: previousApplicant.rank }; // Same rank if same score
                    } else {
                        return { ...applicant, rank: rank++ }; // Increase rank otherwise
                    }
                }
            });
    
            console.log("Sorted Applicants with Assigned Ranks:", updatedApplicants);
    
            setRankedApplicants(updatedApplicants);
            setShowRanking(true);
        } catch (error) {
            console.error("Error ranking applicants:", error);
        }
    };
    
    
    return (
        <div style={{ marginTop: '100px' }}>
            <Navbar />
            <div className='max-w-6xl mx-auto'>
                <h1 className='font-bold text-xl my-5'>Applicants {applicants?.applications?.length}</h1>

                {/* Rank Applicants Button */}
                <div className='flex items-center justify-end my-5'>
                    <Button onClick={handleRankApplicants} className="hover-#2C2C3E-500">
                        Rank Applicants
                    </Button>
                </div>

                {/* Applicants Table */}
                <ApplicantsTable applicants={showRanking ? rankedApplicants : applicants?.applications} showRanking={showRanking} />
            </div>
        </div>
    );
};

export default Applicants;
