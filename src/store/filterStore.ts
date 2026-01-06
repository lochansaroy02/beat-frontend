import { api } from '@/utils/constatns';
import axios from 'axios';
import { create } from 'zustand';

interface filterProps {
    fiteredPersonData: any[],
    setPersonData: (personData: any) => void
    getPerson: (adminId: string | undefined) => Promise<any>
}

export const useFilterStore = create<filterProps>((set) => ({
    fiteredPersonData: [],
    setPersonData: (data: any) => {
        set({
            fiteredPersonData: data
        })
    },


    getPerson: async (adminId: string | undefined) => {
        try {
            const response = await axios.get(`${api}/admin/get-users/${adminId}`)
            set({
                fiteredPersonData: response.data.data
            })

        } catch (error) {
            console.error(error);
            return null

        }
    }
}));

