export const api = process.env.NEXT_PUBLIC_BASE_URL

export const catagoryArr = [
    {
        label: "Bank", value: "bank",

    },
    {
        label: "Patrol Pump", value: "petrolPump",

    },
    {
        label: "HS satyapan", value: "satyapan",

    },
    {
        label: "Gaushala", value: "gaushala",

    },
    {
        label: "Tubewell", value: "tubewell",

    },
    {
        label: "Religious Places", value: "religiousPlaces",

    },
    {
        label: "Sarafa", value: "sarafa",

    },
    {
        label: "wine shop", value: "wineShop",

    },
    {
        label: "Mafiya/ Nakabjan/ Taska", value: "mafia",
    },
    {
        label: "Other", value: "other",
    },

]

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
