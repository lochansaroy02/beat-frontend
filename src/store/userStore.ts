import { api } from '@/utils/constatns';
import axios from 'axios';
import toast from 'react-hot-toast';
import { create } from 'zustand';

// --- Type Definitions ---

/**
 * Defines the structure for a user's data required for creation/update.
 * The 'pnoNo' is assumed to be the unique identifier (like a phone number or ID).
 */
interface UserDataInput {
    pnoNo: string;
    password: string;
    name: string;
    co: string; // Could be 'Care of' or similar
    policeStation: string;
}

/**
 * Defines the structure for the retrieved user data from the backend.
 * Assuming it includes an 'id' and matches UserDataInput structure.
 */
interface UserData extends UserDataInput {
    id: string; // The user's unique ID
    // Add any other fields returned by the backend, e.g.,
    // createdAt: string;
}

// Data passed to the create action: either a single object or an array of objects
type CreateUserInput = UserDataInput | UserDataInput[];
// Data passed to the update action: often includes the user ID or is a partial object,
// but for simplicity, we'll use a single object matching the input structure.
// If your backend expects a specific ID to be passed in the body, adjust this type.
type UpdateUserInput = UserDataInput;

/**
 * Defines the structure of the Zustand store state and actions.
 */
interface UserProps {
    // State
    userData: UserData[]; // Use the specific type for retrieved data array
    selectedUser: UserData | null;

    // Actions
    setSelectedUser: (data: UserData | null) => void; // Use specific type
    setUserData: (personData: UserData[]) => void; // Use specific type

    // FIX: The original code had a missing comma and an incorrect function signature placement.
    getPerson: (adminId: string | undefined) => Promise<UserData[] | null>;
    createUsers: (data: CreateUserInput, adminId: string | undefined) => Promise<void>;
    updateUser: (data: any, userId: string | undefined) => Promise<void>; // FIX: Renamed id to userId for clarity
}

// --- Zustand Store ---

export const useUserStore = create<UserProps>((set, get) => ({
    // State Initialization
    userData: [],
    selectedUser: null,

    // Actions
    setSelectedUser: (data) => {
        set({
            selectedUser: data
        });
    },

    setUserData: (data) => { // Type inference works here from UserProps
        set({
            userData: data
        });
    },

    /**
     * Action to fetch users for a given admin.
     */
    getPerson: async (adminId) => {
        if (!adminId) {
            console.error("Admin ID is undefined for getPerson");
            return null;
        }
        try {
            // FIX: Using the correct 'api' constant defined at the top
            const response = await axios.get(`${api}/admin/get-users/${adminId}`);
            const fetchedData: UserData[] = response.data.data;

            set({
                userData: fetchedData
            });

            return fetchedData;
        } catch (error) {
            console.error("Error fetching persons:", error);
            toast.error("Error fetching users");
            return null;
        }
    },

    /**
     * Action for single or bulk user creation.
     */
    createUsers: async (inputData, adminId) => {
        if (!adminId) {
            toast.error("Admin ID is missing");
            return;
        }

        const body = inputData; // The body is the single object or array
        const isBulk = Array.isArray(inputData);
        const operationType = isBulk ? 'Bulk user creation' : 'User creation';

        try {
            // FIX: Ensure process.env.NEXT_PUBLIC_BASE_URL is defined and accessible
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_BASE_URL}/auth/signup/${adminId}`,
                body
            );

            // Handle various successful status codes
            if (response.status === 207 && isBulk) {
                // Handle 207 Multi-Status for bulk operation
                const { message, errors } = response.data;
                toast.success(`${message}`);
                if (errors && errors.length > 0) {
                    toast.error(`Failed to create ${errors.length} user(s). Check console for details.`);
                    console.error("Bulk Signup Errors:", errors);
                }
            } else if (response.status === 201) {
                // Handle 201 Created
                toast.success(`${operationType} successful!`);
            } else {
                toast.success(`${operationType} complete.`);
            }

            // OPTIONAL: Re-fetch users after successful creation
            // await get().getPerson(adminId);

        } catch (error) {
            console.error(`${operationType} error:`, error);

            const errorMessage = axios.isAxiosError(error) && error.response
                ? error.response.data.message || error.response.data.error || 'Unexpected error'
                : 'Unexpected error';

            toast.error(errorMessage);
        }
    },

    /**
     * Action to update a single user.
     */
    updateUser: async (data, userId) => { // FIX: Renamed 'id' to 'userId' for clarity
        if (!userId) {
            toast.error("User ID is missing for update");
            return;
        }
        try {
            // FIX: Ensure process.env.NEXT_PUBLIC_BASE_URL is defined and accessible
            const response = await axios.put(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/update-user/${userId}`, data);

            toast.success("User updated successfully!");
            console.log("Update response:", response.data);

            // OPTIONAL: Re-fetch user list after update to refresh the UI
            // Assuming the admin ID is needed for re-fetch, you might need to
            // adjust the function signature to include adminId if you use this.
            // await get().getPerson(adminId); 

        } catch (error) {
            console.error("Update user error:", error);

            const errorMessage = axios.isAxiosError(error) && error.response
                ? error.response.data.message || error.response.data.error || 'Unexpected update error'
                : 'Unexpected update error';

            toast.error(errorMessage);
        }
    }
}));