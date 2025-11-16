export interface QRDataItem {
    id: string;
    lattitude: string;
    longitude: string;
    dutyPoint: string,
    policeStation: string;
    isScanned: boolean;
    scannedOn: string;
    scannedBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface Person {
    id: string;
    name: string;
    pnoNo: string;
    photos: string[];
    co: string,
    policeStation: string
    // other properties
}
