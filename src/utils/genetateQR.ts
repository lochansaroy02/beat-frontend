import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

// Helper to generate the Base64 URL for the QR code
export const generateSingleQrcodeUrl = async (data: any): Promise<string> => {
    // Standardize the object for the QR code scanner to read
    const dataToEncode = {
        latitude: data.lattitude, // Matching your schema's double 't'
        longitude: data.longitude,
        policeStation: data.policeStation,
        dutyPoint: data.dutyPoint,
        category: data.catagory // Matching your schema's 'a'
    };

    const dataString = JSON.stringify(dataToEncode);
    const options: QRCode.QRCodeToDataURLOptions = {
        width: 512,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    };

    try {
        return await QRCode.toDataURL(dataString, options);
    } catch (err) {
        console.error("QR Generation Error:", err);
        throw new Error("Failed to generate QR image.");
    }
};

// Main function to generate and save PDF
export const generatePdfWithQRCodes = async (dataArray: any[], filename: string = 'qrcodes_report.pdf') => {
    if (!dataArray || dataArray.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const TARGET_SIZE = Math.min(pageWidth, pageHeight) / 2;

    for (let i = 0; i < dataArray.length; i++) {
        const item = dataArray[i];
        if (i > 0) doc.addPage();

        try {
            const qrUrl = await generateSingleQrcodeUrl(item);
            const x = (pageWidth - TARGET_SIZE) / 2;
            const y = (pageHeight - TARGET_SIZE) / 2;

            // Add QR Image
            doc.addImage(qrUrl, 'PNG', x, y, TARGET_SIZE, TARGET_SIZE);

            // Add Labels below QR
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text(`${item.dutyPoint.toUpperCase()}`, pageWidth / 2, y + TARGET_SIZE + 15, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Lat: ${item.lattitude} | Lon: ${item.longitude}`, pageWidth / 2, y + TARGET_SIZE + 25, { align: 'center' });
            doc.text(`Station: ${item.policeStation}`, pageWidth / 2, y + TARGET_SIZE + 32, { align: 'center' });

        } catch (error) {
            console.error(`Error processing item ${i}:`, error);
        }
    }

    doc.save(filename);
};