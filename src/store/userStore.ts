
import { api } from '@/utils/constatns';
import axios from 'axios';
import toast from 'react-hot-toast';
import { create } from 'zustand';

export const useUserStore = create<any>((set, get) => ({
    userData: [],
    selectedUser: null,

    setSelectedUser: (data: any) => set({ selectedUser: data }),
    setUserData: (data: any[]) => set({ userData: data }),

    getPerson: async (adminId: string) => {
        if (!adminId) return null;
        try {
            const response = await axios.get(`${api}/admin/get-users/${adminId}`);
            const fetchedData = response.data.data;
            set({ userData: fetchedData });
            return fetchedData;
        } catch (error) {
            toast.error("Error fetching users");
            return null;
        }
    },

    createUsers: async (inputData: any[], adminId: string) => {
        // Ensure adminId is a string, not an object
        if (!adminId || typeof adminId !== 'string') {
            toast.error("Invalid Admin ID");
            return;
        }

        try {
            const response = await axios.post(
                `${api}/admin/create-users/${adminId}`,
                inputData // Send the array directly
            );

            if (response.status === 201 || response.status === 200) {
                toast.success("Users created successfully!");
                return response.data;
            }

            if (response.status === 207) {
                toast.success("Partial success in bulk creation");
                return response.data;
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || "Creation failed";
            toast.error(msg);
            throw error;
        }
    },

    updateUser: async (data: any, userId: string) => {
        if (!userId) return;
        try {
            await axios.put(`${api}/admin/update-user/${userId}`, data);
            toast.success("User updated successfully!");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Update failed");
            throw error;
        }
    }
}));