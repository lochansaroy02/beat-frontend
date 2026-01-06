export const api = process.env.NEXT_PUBLIC_BASE_URL


export const coOptions = [
    { label: "City", value: "city" },
    { label: "Kairana", value: "kairana" },
    { label: "Thanabhawan", value: "thanabhawan" },
];

export const getPoliceStationOptions = (co: any) => {
    switch (co) {
        case "city":
            return [

                { label: "Shamli", value: "shamli" },
                { label: "Adarsh Mandi", value: "adarshMandi" },
            ];
        case "kairana":
            return [

                { label: "Kairana", value: "kairana" },
                { label: "Jhinjana", value: "jhinjhana" },
                { label: "Kandhala", value: "kandhala" },
            ];
        case "thanabhawan":
            return [

                { label: "Thanabhawan", value: "thanabhawan" },
                { label: "Babri", value: "babri" },
                { label: "Garipukhta", value: "garipukhta" },
            ];
        default:
            return [{ label: "Select CO first", value: "" }];
    }
};
