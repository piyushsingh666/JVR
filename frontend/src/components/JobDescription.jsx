import React, { useEffect, useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { APPLICATION_API_END_POINT, JOB_API_END_POINT } from '@/utils/constant';
import { setSingleJob } from '@/redux/jobSlice';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';

const JobDescription = () => {
    const { singleJob } = useSelector(store => store.job);
    const { user } = useSelector(store => store.auth);

    const isInitiallyApplied = singleJob?.applications?.some(application => application.applicant === user?._id) || false;
    const [isApplied, setIsApplied] = useState(isInitiallyApplied);

    const params = useParams();
    const jobId = params.id;
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const applyJobHandler = async () => {
        if (!user) {
            toast.error("Please log in to apply for this job!");
            return navigate('/login');
        }
        if (singleJob?.applications?.length >= singleJob?.position) {
            toast.error("Application limit reached for this job!");
            return;
        }
        try {
            const res = await axios.get(`${APPLICATION_API_END_POINT}/apply/${jobId}`, { withCredentials: true });

            if (res.data.success) {
                setIsApplied(true);
                const updatedSingleJob = { ...singleJob, applications: [...singleJob.applications, { applicant: user?._id }] };
                dispatch(setSingleJob(updatedSingleJob));
                toast.success(res.data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response?.data?.message || "Failed to apply for the job.");
        }
    };

    useEffect(() => {
        const fetchSingleJob = async () => {
            try {
                const res = await axios.get(`${JOB_API_END_POINT}/get/${jobId}`, { withCredentials: true });
                if (res.data.success) {
                    dispatch(setSingleJob(res.data.job));
                    setIsApplied(res.data.job.applications.some(application => application.applicant === user?._id));
                }
            } catch (error) {
                console.log(error);
                toast.error("Failed to fetch job details.");
            }
        };
        fetchSingleJob();
    }, [jobId, dispatch, user?._id]);

    return (
        <div className="max-w-6xl mx-auto my-10 p-6 bg-white shadow-md rounded-lg">
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{singleJob?.title}</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge className="text-blue-700 font-bold" variant="ghost">{singleJob?.position} Positions</Badge>
                        <Badge className="text-[#F83002] font-bold" variant="ghost">{singleJob?.jobType}</Badge>
                        <Badge className="text-[#7209b7] font-bold" variant="ghost">{singleJob?.salary} LPA</Badge>
                    </div>
                </div>
                <Button
                    onClick={isApplied ? null : applyJobHandler}
                    disabled={isApplied}
                    className={`rounded-lg px-4 py-2 ${isApplied ? 'bg-gray-600 cursor-not-allowed' : 'bg-[dodgerblue] hover:bg-[#5f32ad]'}`}>
                    {isApplied ? 'Already Applied' : 'Apply Now'}
                </Button>
            </div>

            {/* Job Details Section */}
            <div className="mt-6">
                <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Job Details</h2>
                <div className="mt-4 space-y-3">
                    <h3 className="font-bold text-gray-700">Role: <span className="font-normal text-gray-800">{singleJob?.title}</span></h3>
                    <h3 className="font-bold text-gray-700">Location: <span className="font-normal text-gray-800">{singleJob?.location}</span></h3>
                    <h3 className="font-bold text-gray-700">Description:</h3>
                    <p className="text-gray-800 leading-relaxed">{singleJob?.description}</p>
                    <h3 className="font-bold text-gray-700">Requirements:</h3>
                    <p className="text-gray-800">{singleJob?.requirements}</p>
                    <h3 className="font-bold text-gray-700">Experience: <span className="font-normal text-gray-800">{singleJob?.experienceLevel} years</span></h3>
                    <h3 className="font-bold text-gray-700">Salary: <span className="font-normal text-gray-800">{singleJob?.salary} LPA</span></h3>
                    <h3 className="font-bold text-gray-700">Total Applicants: <span className="font-normal text-gray-800">{singleJob?.applications?.length}</span></h3>
                    <h3 className="font-bold text-gray-700">Posted Date: <span className="font-normal text-gray-800">{singleJob?.createdAt?.split("T")[0]}</span></h3>
                </div>
            </div>


        </div>
    );
};

export default JobDescription;
