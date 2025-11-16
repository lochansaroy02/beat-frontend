
import { api } from '@/utils/constatns';
import axios from 'axios';
import { create } from 'zustand';



interface QrProps {
    lattitude: string,
    longitude: string,
    policeStation: string
}

interface QRStoreProps {
    allQRData: any[]
    createQR: (data: QrProps) => Promise<any>
    getQRData: (userId: string | undefined) => Promise<any>
    getAllQR: () => Promise<any>
    createBulkQR: (data: QrProps[]) => Promise<any>
    deleteQR: (qrId: string | undefined) => Promise<any>
    deleteMultipleQRs: (qrIds: string | undefined[]) => Promise<string>

}

export const useQRstore = create<QRStoreProps>((set) => ({
    allQRData: [],
    createQR: async (data: QrProps) => {

        try {
            const response = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/qr/create`, data)
            return response.data
        } catch (error) {
            console.error(error)
            return null
        }
    },
    createBulkQR: async (data: QrProps[]) => {
        try {
            // Assuming your backend has a new route for bulk creation: /qr/create/bulk
            const response = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/qr/create/bulk`, { bulkData: data });
            return response.data
        } catch (error) {
            console.error("Bulk QR creation error:", error)
            return null
        }
    },
    getQRData: async (pnoNO: string | undefined) => {
        try {
            const response = await axios.get(`${api}/qr/get/${pnoNO}`)
            set({ allQRData: response.data || [] });
            return response

        } catch (error) {
            console.log(error);
        }
    },
    getAllQR: async () => {
        try {
            const response = await axios.get(`${api}/qr/get-all `)
            console.log(response.data.data);
            set({
                allQRData: response.data.data
            })
            return response.data
        } catch (error) {

            return null
        }
    },
    deleteQR: async (qrId: string | undefined) => {
        try {
            const response = await axios.delete(`${api}/qr/delete/${qrId} `)
            console.log(response.data);
            return response.data
        } catch (error) {
            console.log(error);
        }
    },
    deleteMultipleQRs: async (qrIds: string | undefined[]) => {
        let successCount = 0;
        let errorCount = 0;
        const results: any[] = [];

        // Get the current state functions
        const { getAllQR } = useQRstore.getState(); // NEW: Get the function from state

        for (const qrId of qrIds) {
            try {
                // FIX: Removed the trailing space from URL in single delete
                const response = await axios.delete(`${api}/qr/delete/${qrId}`);
                results.push({ id: qrId, status: 'success', data: response.data });
                successCount++;
            } catch (error) {
                console.error(`Error deleting QR ${qrId}:`, error);
                results.push({ id: qrId, status: 'error', error: error });
                errorCount++;
            }
        }

        // --- NEW: REFRESH STATE AFTER DELETIONS ---
        if (successCount > 0) {
            // Call the updated getAllQR to fetch new data and update 'allQRData' state
            await getAllQR();
        }
        // ----------------------------------------

        if (errorCount === 0) {
            return `Successfully deleted ${successCount} QR code(s).`;
        } else {
            return `Completed deletions. ${successCount} successful, ${errorCount} failed.`;
        }
    }


}));

