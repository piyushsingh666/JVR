import React, { useEffect, useState } from "react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Avatar, AvatarImage } from "../ui/avatar";
import { Edit2 } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { COMPANY_API_END_POINT, BACKEND_BASE_URL } from "@/utils/constant"; // Ensure the API endpoint is correctly set

const CompaniesTable = () => {
    const { companies, searchCompanyByText } = useSelector((store) => store.company);
    const [filteredCompanies, setFilteredCompanies] = useState(companies);
    const navigate = useNavigate();

    useEffect(() => {
        const filtered = companies.filter((company) => {
            if (!searchCompanyByText) return true;
            return company?.name?.toLowerCase().includes(searchCompanyByText.toLowerCase());
        });
        setFilteredCompanies(filtered);
    }, [companies, searchCompanyByText]);

    return (
        <div className="p-4">
            <Table className="border rounded-lg shadow-sm">
                <TableCaption className="text-gray-600">A list of recently registered companies</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead style={{ backgroundColor: '#bbdefb', color: 'black', padding: '10px', textAlign: 'left' }}>Logo</TableHead>
                        <TableHead style={{ backgroundColor: '#bbdefb', color: 'black', padding: '10px', textAlign: 'left' }}>Name</TableHead>
                        <TableHead style={{ backgroundColor: '#bbdefb', color: 'black', padding: '10px', textAlign: 'left' }}>Date</TableHead>
                        <TableHead style={{ backgroundColor: '#bbdefb', color: 'black', padding: '10px', textAlign: 'left' }}>Action</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {filteredCompanies.length > 0 ? (
                        filteredCompanies.map((company) => {
                            const companyLogoUrl = company?.logo
                                ? `${BACKEND_BASE_URL}${company.logo}`
                                : "/default-logo.png"; 

                            return (
                                <TableRow key={company._id} className="hover:bg-gray-100">
                                    <TableCell className="p-3">
                                        <Avatar className="w-12 h-12 rounded-none border">
                                            <AvatarImage
                                                src={companyLogoUrl}
                                                alt={company.name}
                                                className="w-full h-full"
                                                onError={(e) => { e.target.src = "/default-logo.png"; }}
                                            />
                                        </Avatar>
                                    </TableCell>

                                    <TableCell className="p-3">{company.name}</TableCell>
                                    <TableCell className="p-3">{company.createdAt?.split("T")[0]}</TableCell>
                                    <TableCell className="p-3 text-right cursor-pointer">
                                        <div
                                            onClick={() => navigate(`/admin/companies/${company._id}`)}
                                            className="flex items-center gap-2 text-black-600 hover:text-black-800"
                                        >
                                            <Edit2 className='w-4 text-blue-500' />
                                            <span>Edit</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan="4" className="text-center py-4 text-gray-500">
                                No companies found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default CompaniesTable;
