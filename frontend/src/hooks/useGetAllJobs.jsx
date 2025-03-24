import { setAllJobs, setHomepageJobs, setLoading } from '@/redux/jobSlice';
import { JOB_API_END_POINT } from '@/utils/constant';
import axios from 'axios';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const useGetAllJobs = (isHomepage = false) => {
    const dispatch = useDispatch();
    const { searchedQuery } = useSelector(store => store.job);

    useEffect(() => {
        const fetchAllJobs = async () => {
            try {
                dispatch(setLoading(true));
                // On the homepage, always fetch all jobs (keyword=''); elsewhere, use searchedQuery
                const res = await axios.get(`${JOB_API_END_POINT}/get?keyword=${isHomepage ? '' : searchedQuery}`, { withCredentials: true });
                console.log(`Fetched ${res.data.jobs?.length || 0} jobs from API (isHomepage: ${isHomepage}):`, res.data.jobs);
                if (res.data.success) {
                    if (isHomepage) {
                        dispatch(setHomepageJobs(res.data.jobs));
                    } else {
                        dispatch(setAllJobs(res.data.jobs));
                    }
                }
            } catch (error) {
                console.log(error);
            } finally {
                dispatch(setLoading(false));
            }
        };
        fetchAllJobs();
    }, [isHomepage ? null : searchedQuery]); // Re-fetch when searchedQuery changes, but not on homepage
};

export default useGetAllJobs;