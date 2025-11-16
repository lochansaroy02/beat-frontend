import { api } from '@/utils/constatns';
import axios from 'axios';
import { create } from 'zustand';

interface PersonProps {
    personData: any[],
    setPersonData: (personData: any) => void
    getPerson: (adminId: string | undefined) => Promise<any>
}

export const usePersonStore = create<PersonProps>((set) => ({
    personData: [],
    setPersonData: (data: any) => {
        set({ 
            personData: data
        })
    },
    getPerson: async (adminId: string | undefined) => {
        try {
            const response = await axios.get(`${api}/admin/get-users/${adminId}`)
            set({
                personData: response.data.data
            })
        } catch (error) {
            console.error(error);
            return null

        }
    }
}));

