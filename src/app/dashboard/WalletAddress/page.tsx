'use client';
import { client } from "@/app/client";
import { CROWDFUNDING_FACTORY } from "@/app/constants/contracts";
import { MyCampaignCard } from "@/app/components/MyCampaignCard";
import { useState } from "react";
import { getContract } from "thirdweb";
import { sepolia } from "thirdweb/chains";
import { deployPublishedContract } from "thirdweb/deploys";
import { useActiveAccount, useReadContract } from "thirdweb/react";

// Helper function to convert ETH to Wei
const ethToWei = (eth: string): bigint => {
    // Remove any trailing zeros after decimal point
    const cleanValue = eth.replace(/\.?0+$/, "");
    
    // Split the number into whole and decimal parts
    const [whole, decimal = ""] = cleanValue.split(".");
    
    // Pad or truncate decimal to 18 places
    const paddedDecimal = decimal.padEnd(18, "0").slice(0, 18);
    
    // Combine whole and decimal parts
    const wei = `${whole}${paddedDecimal}`;
    
    // Convert to BigInt
    return BigInt(wei);
};

export default function DashboardPage() {
    const account = useActiveAccount();
    
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    const contract = getContract({
        client: client,
        chain: sepolia,
        address: CROWDFUNDING_FACTORY,
    });

    // Get Campaigns
    const { data: myCampaigns, isLoading: isLoadingMyCampaigns, refetch } = useReadContract({
        contract: contract,
        method: "function getUserCampaigns(address _user) view returns ((address campaignAddress, address owner, string name, uint256 creationTime)[])",
        params: [account?.address as string]
    });
    
    return (
        <div className="mx-auto max-w-7xl px-4 mt-16 sm:px-6 lg:px-8">
            <div className="flex flex-row justify-between items-center mb-8">
                <p className="text-4xl font-semibold">Dashboard</p>
                <button
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    onClick={() => setIsModalOpen(true)}
                >Create Campaign</button>
            </div>
            <p className="text-2xl font-semibold mb-4">My Campaigns:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {!isLoadingMyCampaigns && (
                    myCampaigns && myCampaigns.length > 0 ? (
                        myCampaigns.map((campaign, index) => (
                            <MyCampaignCard
                                key={index}
                                contractAddress={campaign.campaignAddress}
                            />
                        ))
                    ) : (
                        <p className="text-gray-500">No campaigns found</p>
                    )
                )}
            </div>
            
            {isModalOpen && (
                <CreateCampaignModal
                    setIsModalOpen={setIsModalOpen}
                    refetch={refetch}
                />
            )}
        </div>
    )
}

type CreateCampaignModalProps = {
    setIsModalOpen: (value: boolean) => void
    refetch: () => void
}

const CreateCampaignModal = (
    { setIsModalOpen, refetch }: CreateCampaignModalProps
) => {
    const account = useActiveAccount();
    const [isDeployingContract, setIsDeployingContract] = useState<boolean>(false);
    const [campaignName, setCampaignName] = useState<string>("");
    const [campaignDescription, setCampaignDescription] = useState<string>("");
    const [campaignGoal, setCampaignGoal] = useState<string>("1");
    const [campaignDeadline, setCampaignDeadline] = useState<number>(1);
    
    // Deploy contract from CrowdfundingFactory
    const handleDeployContract = async () => {
        if (!campaignName || !campaignDescription || !campaignGoal || !campaignDeadline) {
            alert("Please fill in all fields");
            return;
        }

        setIsDeployingContract(true);
        try {
            console.log("Deploying contract...");
            
            // Calculate deadline timestamp in seconds
            const deadlineInSeconds = Math.floor(Date.now() / 1000) + (campaignDeadline * 24 * 60 * 60);
            
            // Convert ETH amount to Wei using our helper function
            const goalInWei = ethToWei(campaignGoal);
            
            const contractAddress = await deployPublishedContract({
                client: client,
                chain: sepolia,
                account: account!,
                contractId: "Crowdfunding",
                contractParams: {
                    name: campaignName,
                    description: campaignDescription,
                    goal: goalInWei,
                    deadline: deadlineInSeconds
                },
                publisher: "0x707cD5894f028b29a4CD52054C721095Bf3D4b43",
                version: "1.0.1",
            });
            
            console.log("Contract deployed at:", contractAddress);
            alert("Campaign created successfully!");
            refetch();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error deploying contract:", error);
            alert("Failed to create campaign. Please try again.");
        } finally {
            setIsDeployingContract(false);
        }
    };

    const handleCampaignGoal = (value: string) => {
        // Allow only numbers and decimals
        if (/^\d*\.?\d*$/.test(value) || value === '') {
            setCampaignGoal(value);
        }
    }

    const handleCampaignLengthChange = (value: number) => {
        if (value < 1) {
            setCampaignDeadline(1);
        } else {
            setCampaignDeadline(value);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center backdrop-blur-md z-50">
            <div className="w-full max-w-xl bg-slate-100 p-6 rounded-md">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-lg font-semibold">Create a Campaign</p>
                    <button
                        className="text-sm px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
                        onClick={() => setIsModalOpen(false)}
                    >Close</button>
                </div>
                <div className="flex flex-col space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name:</label>
                        <input 
                            type="text" 
                            value={campaignName}
                            onChange={(e) => setCampaignName(e.target.value)}
                            placeholder="Enter campaign name"
                            className="w-full px-4 py-2 bg-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Description:</label>
                        <textarea
                            value={campaignDescription}
                            onChange={(e) => setCampaignDescription(e.target.value)}
                            placeholder="Enter campaign description"
                            rows={4}
                            className="w-full px-4 py-2 bg-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        ></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Goal (ETH):</label>
                        <input 
                            type="text"
                            value={campaignGoal}
                            onChange={(e) => handleCampaignGoal(e.target.value)}
                            placeholder="Enter goal amount in ETH"
                            className="w-full px-4 py-2 bg-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Length (Days):</label>
                        <input 
                            type="number"
                            value={campaignDeadline}
                            onChange={(e) => handleCampaignLengthChange(parseInt(e.target.value))}
                            min="1"
                            className="w-full px-4 py-2 bg-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <button
                        className="w-full mt-6 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
                        onClick={handleDeployContract}
                        disabled={isDeployingContract}
                    >
                        {isDeployingContract ? "Creating Campaign..." : "Create Campaign"}
                    </button>
                </div>
            </div>
        </div>
    )
}