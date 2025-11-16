import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';


interface LocationData {
    lattitude: string;
    longitude: string;
    dutyPoint: string;
    policeStation?: string;
}

interface DataWithLabel extends LocationData {
    label: string;
}

type InputData = LocationData | LocationData[];



/**
 * Generates a single QR code image as a Base64 Data URL (PNG) from the location data.
 */
const generateSingleQrcodeUrl = async (data: LocationData): Promise<string> => {

    const dataToEncode = {
        latitude: data.lattitude, // Corrected casing for consistency
        longitude: data.longitude,
        policeStation: data.policeStation,
        dutyPoint: data.dutyPoint,
    };
    const dataString = JSON.stringify(dataToEncode);
    const options: QRCode.QRCodeToDataURLOptions = {

        width: 512,
        margin: 2,
        color: {
            dark: '#000000ff',
            light: '#ffffffff'
        },
        errorCorrectionLevel: 'H'
    };

    try {
        const url = await QRCode.toDataURL(dataString, options);
        return url;
    } catch (err) {
        console.error("Error generating QR code URL:", err);
        throw new Error("Failed to generate QR code image URL.");
    }
};



/**
 * Generates a PDF containing QR codes for the provided data.
 * The data can be a single LocationData object or an array of them.
 *
 * FIX: Each QR code is printed on its own page, centered, with size 1/2 of page dimensions.
 */
export const generatePdfWithQRCodes = async (inputData: InputData, filename: string = 'qrcodes_report.pdf'): Promise<void> => {


    let dataArray: DataWithLabel[] = [];

    if (Array.isArray(inputData)) {

        if (inputData.length === 0) {
            console.warn("No data provided for PDF generation.");
            return;
        }
        dataArray = inputData.map((data, index) => ({
            ...data,
            label: data.dutyPoint || `Location ${index + 1}`
        }));
    } else {
        dataArray = [{
            ...inputData,
            label: inputData.dutyPoint || 'Single Location QR'
        }];
    }


    const doc = new jsPDF();
    let qrCount = 0;


    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();


    const TARGET_SIZE = Math.min(pageWidth, pageHeight) / 2;

    // Line spacing adjustment (approximate in mm)
    const LINE_HEIGHT = 6;

    for (const item of dataArray) {
        if (qrCount > 0) {

            doc.addPage();
        }

        try {

            const qrUrl = await generateSingleQrcodeUrl(item);


            const x = (pageWidth / 2) - (TARGET_SIZE / 2);
            const y = (pageHeight / 2) - (TARGET_SIZE / 2);


            doc.addImage(qrUrl, 'PNG', x, y, TARGET_SIZE, TARGET_SIZE);

            // --- Text Section Starts Below QR Code ---
            let textY = y + TARGET_SIZE + 10;

            // 1. Duty Point (Large Font)
            // Note: Hindi text requires proper font loading (as discussed previously)
            doc.setFontSize(14);
            // doc.text(item.dutyPoint, pageWidth / 2, textY, {
            //     align: 'center'
            // });

            textY += LINE_HEIGHT;
            // 2. Latitude and Longitude (Smaller Font)
            if (item.lattitude && item.longitude) {
                doc.setFontSize(10);
                doc.text(`Lat: ${item.lattitude} | Lon: ${item.longitude}`, pageWidth / 2, textY, {
                    align: 'center'
                });
            }

            textY += LINE_HEIGHT;

            // 3. Police Station (Smallest Font, if present)
            if (item.policeStation) {
                doc.setFontSize(8);
                doc.text(`Police Station: ${item.policeStation}`, pageWidth / 2, textY, {
                    align: 'center'
                });
            }

            qrCount++;

        } catch (error) {
            console.error(`Skipping QR code for ${item.label} due to error:`, error);
        }
    }


    doc.save(filename);
    console.log(`PDF "${filename}" generated successfully with ${qrCount} QR codes, each on its own page.`);
};


/**
 * Convenience wrapper for single QR code generation that directly creates a PDF.
 */
export const generateQrcode = async (data: LocationData): Promise<void> => {

    await generatePdfWithQRCodes(data, `qr_${data.dutyPoint || 'single'}.pdf`);
};