import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    allJobs: [],
    homepageJobs: [], // Add this
    singleJob: null,
    recommendedJobs: [],
    allAdminJobs: [],
    allAppliedJobs: [],
    searchedQuery: '',
    searchJobByText: '',
    loading: false
};

const jobSlice = createSlice({
    name: 'job',
    initialState,
    reducers: {
        setAllJobs: (state, action) => {
            state.allJobs = action.payload;
        },
        setHomepageJobs: (state, action) => { // Add this
            state.homepageJobs = action.payload;
        },
        setSingleJob: (state, action) => {
            state.singleJob = action.payload;
        },
        setRecommendedJobs: (state, action) => {
            state.recommendedJobs = action.payload;
        },
        setAllAdminJobs: (state, action) => {
            state.allAdminJobs = action.payload;
        },
        setAllAppliedJobs: (state, action) => {
            state.allAppliedJobs = action.payload;
        },
        setSearchedQuery: (state, action) => {
            state.searchedQuery = action.payload;
        },
        setSearchJobByText: (state, action) => {
            state.searchJobByText = action.payload;
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        deleteJob: (state, action) => {
            state.allAdminJobs = state.allAdminJobs.filter(job => job._id !== action.payload);
        }
    }
});

export const { 
    setAllJobs, 
    setHomepageJobs, // Add this
    setSingleJob, 
    setRecommendedJobs, 
    setAllAdminJobs, 
    setAllAppliedJobs, 
    setSearchedQuery, 
    setSearchJobByText, 
    setLoading, 
    deleteJob 
} = jobSlice.actions;

export default jobSlice.reducer;