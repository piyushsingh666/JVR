import React from 'react';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import axios from 'axios';

const shortlistingStatus = ["Accepted", "Rejected"];

const ApplicantsTable = ({ applicants, showRanking }) => {
    const { allAdminJobs } = useSelector(store => store.job);
    const handleStatusUpdate = async (status, id, email, jobId) => {
        try {
            axios.defaults.withCredentials = true;
            const res = await axios.post(`http://localhost:5000/api/application/status/${id}/update`, { status });

            if (res.data.success) {
                const jobDetails = allAdminJobs.find(job => job._id === jobId);
                const companyName = jobDetails?.company?.name || "the company";

                await axios.post(`http://localhost:5000/api/email/send-email`, {
                    to: email,
                    subject: `Your application has been ${status}`,
                    message: `Dear applicant,\n\nWe appreciate your interest in the ${jobDetails?.title} position at ${companyName} in ${jobDetails?.location}. After careful consideration, we wanted to update you regarding your application status.\n\nStatus Update: Your application has been ${status}.\n\n${status === "Accepted" ? "Congratulations! Our team was impressed with your profile, and we look forward to discussing the next steps with you. Stay tuned for further details!" : "We truly appreciate the time and effort you put into your application. While this role may not be the right fit at this moment, we encourage you to apply for future opportunities with us!"}\n\nIf you have any questions, feel free to reach out. Thank you for your time and interest in joining ${companyName}!\n\nBest regards,\n${companyName} Hiring Team`
                });

                toast.success('Status updated and email sent successfully');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'An error occurred');
        }
    };

    return (
        <Table className="border rounded-lg shadow-sm">
            <TableCaption>A list of your applicants.</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead style={{ backgroundColor: '#bbdefb', color: 'black' }}>Photo</TableHead>
                    <TableHead style={{ backgroundColor: '#bbdefb', color: 'black' }}>Full Name</TableHead>
                    <TableHead style={{ backgroundColor: '#bbdefb', color: 'black' }}>Email</TableHead>
                    <TableHead style={{ backgroundColor: '#bbdefb', color: 'black' }}>Contact</TableHead>
                    <TableHead style={{ backgroundColor: '#bbdefb', color: 'black' }}>Resume</TableHead>
                    <TableHead style={{ backgroundColor: '#bbdefb', color: 'black' }}>Date</TableHead>
                    {showRanking && <TableHead style={{ backgroundColor: '#bbdefb', color: 'black' }}>Rank</TableHead>}
                    <TableHead style={{ backgroundColor: '#bbdefb', color: 'black' }} className="text-right">Action</TableHead>
                </TableRow>
            </TableHeader>

            <TableBody>
                {applicants && applicants.length > 0 ? (
                    applicants.map((item) => {
                        const profilePhoto = item?.applicant?.profile?.profilePhoto
                            ? `http://localhost:5000${item.applicant.profile.profilePhoto}`
                            : "/default-profile.png";

                        const resumeUrl = item?.applicant?.profile?.resume
                            ? `http://localhost:5000${item.applicant.profile.resume}`
                            : null;

                        return (
                            <TableRow key={item._id}>
                                <TableCell>
                                    <img src={profilePhoto} alt="Profile" className="w-10 h-10 rounded-full border object-cover" />
                                </TableCell>
                                <TableCell>{item?.applicant?.fullname}</TableCell>
                                <TableCell>{item?.applicant?.email}</TableCell>
                                <TableCell>{item?.applicant?.phoneNumber}</TableCell>
                                <TableCell>
                                    {resumeUrl ? (
                                        <a className="text-blue-600 cursor-pointer hover:underline" href={resumeUrl} target="_blank" rel="noopener noreferrer">
                                            View Resume
                                        </a>
                                    ) : (
                                        <span>NA</span>
                                    )}
                                </TableCell>
                                <TableCell>{item?.applicant?.createdAt?.split("T")[0] || 'N/A'}</TableCell>
                                {showRanking && <TableCell>{item.rank || 'N/A'}</TableCell>}
                                <TableCell className="float-right cursor-pointer">
                                    <Popover>
                                        <PopoverTrigger>
                                            <MoreHorizontal />
                                        </PopoverTrigger>
                                        <PopoverContent className="w-32">
                                            {shortlistingStatus.map((status, index) => (
                                                <div onClick={() => handleStatusUpdate(status, item?._id, item?.applicant?.email, item?.job)} key={index} className='flex w-fit items-center my-2 cursor-pointer'>
                                                    <span>{status}</span>
                                                </div>
                                            ))}
                                        </PopoverContent>
                                    </Popover>
                                </TableCell>
                            </TableRow>
                        );
                    })
                ) : (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center">No applicants found</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
};

export default ApplicantsTable;
