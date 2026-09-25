import axios from "axios";

/**
 * Converts coordinates to a human-readable address using a geocoding API.
 * The API key is expected to be available via process.env.
 * @param lat Latitude string.
 * @param long Longitude string.
 * @returns A formatted address string or null on failure.
 */
export const cordToAddress = async (lat: string, long: string): Promise<string | null> => {
    try {
        // You MUST ensure NEXT_PUBLIC_FREE_MAP_API_KEY is available in the browser environment.
        const apiKey = process.env.NEXT_PUBLIC_FREE_MAP_API_KEY;

        if (!apiKey) {
            console.error("API Key for geocoding is missing.");
            return `${lat}, ${long}`; // Return coordinates if key is missing
        }

        const response = await axios.get(`https://geocode.maps.co/reverse?lat=${lat}&lon=${long}&api_key=${apiKey}`);

        const address = response.data.address;

        // Example of formatting: prioritize road, city, and country
        const formattedAddress = [
            address.road,
            address.city || address.town || address.village,
            address.country
        ].filter(part => part).join(', ');

        return formattedAddress || `${lat}, ${long}`; // Fallback to coordinates
    } catch (error) {
        // console.error("Error fetching address:", error);
        return `${lat}, ${long}`; // Return coordinates on API error
    }
};
