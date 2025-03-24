import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import Footer from './shared/Footer';
import { Avatar, AvatarImage } from './ui/avatar';
import Navbar from './shared/Navbar';
import { Search } from 'lucide-react';
import useGetAllJobs from '@/hooks/useGetAllJobs';
import { setSearchedQuery } from '@/redux/jobSlice';
import Chatbot from './ui/Chatbot';
import CompanyLogo from './CompanyLogo';
import SearchSuggestions from './SearchSuggestions';
import { setSearchCompanyByText } from '@/redux/companySlice';
import useGetRecommendations from '@/hooks/useGetRecommendations';

const HeroSection = () => {
    const [jobQuery, setJobQuery] = useState("");
    const [companyQuery, setCompanyQuery] = useState("");
    const [locationQuery, setLocationQuery] = useState("");

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const searchHandler = () => {
        if (jobQuery) dispatch(setSearchedQuery(jobQuery));
        if (companyQuery) dispatch(setSearchCompanyByText(companyQuery));
        if (locationQuery) dispatch(setSearchedQuery(locationQuery));
        navigate("/browse");
    };

    return (
        <div className='text-center'>
            <div className='flex flex-col gap-5 my-10'>
                <h1 className='text-5xl font-bold'>
                    Find Your Dream Jobs<br />
                    With <span className='text-[dodgerblue]'>Job Voyage</span>
                </h1>

                <div className="flex items-center w-[60%] mx-auto bg-white shadow-md rounded-full py-2 pl-4 pr-2 border border-gray-300">
                    <Search className="h-5 w-5 text-gray-400" />

                    <div className="relative w-full">
                        <input
                            type="text"
                            placeholder="Enter role"
                            value={jobQuery}
                            onChange={(e) => setJobQuery(e.target.value)}
                            className="outline-none border-none flex-grow text-gray-500 placeholder-gray-400 bg-transparent px-3"
                        />
                        <SearchSuggestions query={jobQuery} type="job" onSelect={setJobQuery} />
                    </div>
                    <div className="border-l border-gray-300 h-6"></div>

                    <div className="relative w-full">
                        <input
                            type="text"
                            placeholder="Enter company name"
                            value={companyQuery}
                            onChange={(e) => setCompanyQuery(e.target.value)}
                            className="outline-none border-none text-gray-500 placeholder-gray-400 bg-transparent px-3"
                        />
                        <SearchSuggestions query={companyQuery} type="company" onSelect={setCompanyQuery} />
                    </div>

                    <div className="border-l border-gray-300 h-6"></div>

                    <div className="relative w-full">
                        <input
                            type="text"
                            placeholder="Enter location"
                            value={locationQuery}
                            onChange={(e) => setLocationQuery(e.target.value)}
                            className="outline-none border-none flex-grow text-gray-500 placeholder-gray-400 bg-transparent px-3"
                        />
                        <SearchSuggestions query={locationQuery} type="location" onSelect={setLocationQuery} />
                    </div>

                    <Button onClick={searchHandler} className="bg-blue-500 text-white px-5 py-2 rounded-full">
                        Search
                    </Button>
                </div>
            </div>
        </div>
    );
};

const LatestJobCards = ({ job }) => {
    const navigate = useNavigate();
    const logoUrl = job?.company?.logo ? `http://localhost:5000${job.company.logo}` : 'https://via.placeholder.com/40';

    return (
        <div
            onClick={() => navigate(`/description/${job._id}`)}
            className='p-5 rounded-md shadow-xl bg-white border border-gray-100 cursor-pointer'
        >
            <div className='flex items-center gap-2 my-2'>
                <Button className="p-6" variant="outline" size="icon">
                    <Avatar>
                        <AvatarImage src={logoUrl} alt="Company Logo" />
                    </Avatar>
                </Button>
                <div>
                    <h1 className='font-medium text-lg'>{job?.company?.name || 'Unknown'}</h1>
                    <p className='text-sm text-gray-500'>
                        {job?.location || 'India'}
                        {job?.company?.website && (
                            <a href={job.company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-2">
                                Website
                            </a>
                        )}
                    </p>
                </div>
            </div>
            <div>
                <h1 className='font-bold text-lg my-2'>{job?.title}</h1>
                <p className='text-sm text-gray-600'>{job?.description}</p>
            </div>
            <div className='flex items-center gap-2 mt-4'>
                <Badge className={'text-blue-700 font-bold'} variant="ghost">{job?.position} Positions</Badge>
                <Badge className={'text-[#F83002] font-bold'} variant="ghost">{job?.jobType}</Badge>
                <Badge className={'text-[#7209b7] font-bold'} variant="ghost">{job?.salary}LPA</Badge>
            </div>
        </div>
    );
};

const LatestJobs = () => {
    const { homepageJobs, recommendedJobs, loading } = useSelector(store => store.job); // Change allJobs to homepageJobs
    console.log('homepageJobs in LatestJobs:', homepageJobs);

    return (
        <div className='max-w-6xl mx-auto my-20'>
            <h1 className='text-4xl font-bold'>
                <span className='text-[dodgerblue]'>Latest </span> Job Openings
            </h1>
            {loading ? (
                <p>Loading latest jobs...</p>
            ) : Array.isArray(homepageJobs) && homepageJobs.length > 0 ? ( // Change allJobs to homepageJobs
                <div className='grid grid-cols-3 gap-4 my-5'>
                    {homepageJobs.slice(0, 6).map((job) => <LatestJobCards key={job._id} job={job} />)}
                </div>
            ) : (
                <span>No Job Available</span>
            )}

            <h1 className='text-4xl font-bold mt-10'>
                <span className='text-[dodgerblue]'>Personalized </span> Recommendations
            </h1>
            {loading ? (
                <p>Loading recommendations...</p>
            ) : Array.isArray(recommendedJobs) && recommendedJobs.length > 0 ? (
                <div className='grid grid-cols-3 gap-4 my-5'>
                    {recommendedJobs.slice(0, 3).map((job) => <LatestJobCards key={job._id} job={job} />)}
                </div>
            ) : (
                <span>No personalized recommendations available</span>
            )}
        </div>
    );
};

const Home = () => {
    useGetAllJobs(true); // Pass true to indicate this is the homepage
    useGetRecommendations();
    const { user } = useSelector(store => store.auth);
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.role === 'Employer') {
            navigate("/admin/companies");
        }
    }, [user, navigate]);

    return (
        <div style={{ marginTop: '100px' }}>
            <Navbar />
            <HeroSection />
            <CompanyLogo />
            <LatestJobs />
            <Footer />
            <Chatbot />
        </div>
    );
};

export default Home;