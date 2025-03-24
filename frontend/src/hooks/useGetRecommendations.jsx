import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { JOB_API_END_POINT } from '@/utils/constant';
import { setRecommendedJobs } from '@/redux/jobSlice';

const useGetRecommendations = () => {
    const dispatch = useDispatch();
    const { user } = useSelector(store => store.auth);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchRecommendations = async () => {
            if (!user) {
                console.log('User not logged in, skipping recommendations fetch');
                return;
            }

            try {
                setLoading(true);
                console.log('Fetching recommendations from:', `${JOB_API_END_POINT}/get-recommended-jobs`);
                const res = await axios.get(`${JOB_API_END_POINT}/get-recommended-jobs`, { withCredentials: true });
                console.log('Recommendations response:', res.data);
                if (res.data.recommended_jobs) {
                    dispatch(setRecommendedJobs(res.data.recommended_jobs));
                } else {
                    console.log('No recommended jobs in response:', res.data);
                    dispatch(setRecommendedJobs([]));
                }
            } catch (error) {
                console.error('Error fetching recommendations:', error);
                dispatch(setRecommendedJobs([]));
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, [user, dispatch]);

    return { loading };
};

export default useGetRecommendations;