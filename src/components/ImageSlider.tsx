"use client";
import { ChevronLeft, ChevronRight } from 'lucide-react'; // Using lucide-react for slider icons
import Image from 'next/image';
import { useState } from 'react';

// --- ImageSlider Component ---
// This component handles the stacked image display and navigation
const ImageSlider = ({ photos }: {
    photos: any
}) => {
    // State to track the currently visible image index
    const [currentIndex, setCurrentIndex] = useState(0);

    // Function to move to the next image
    const nextImage = () => {
        setCurrentIndex((prevIndex) =>
            // Loop back to the start if at the end
            prevIndex === photos.length - 1 ? 0 : prevIndex + 1
        );
    };

    // Function to move to the previous image
    const prevImage = () => {
        setCurrentIndex((prevIndex) =>
            // Loop back to the end if at the start
            prevIndex === 0 ? photos.length - 1 : prevIndex - 1
        );
    };

    if (!photos || photos.length === 0) {
        return <div className="text-gray-500 italic">No Photos</div>;
    }

    const currentPhotoUrl = photos[currentIndex]?.url;

    return (
        <div className="relative w-40 h-40 border rounded shadow-md flex items-center justify-center bg-gray-100 overflow-hidden">
            {/* Left Button */}
            {photos.length > 1 && (
                <button
                    onClick={prevImage}
                    className="absolute left-0 z-10 p-1 bg-neutral-900 bg-opacity-50 text-white rounded-r-lg hover:bg-opacity-75 transition-opacity"
                    aria-label="Previous image"
                >
                    <ChevronLeft size={16} />
                </button>
            )}

            {/* Image */}
            <div className="flex justify-center items-center w-full h-full">
                {currentPhotoUrl && (
                    <Image
                        src={currentPhotoUrl}
                        alt={`Image ${currentIndex + 1}`}
                        width={160}
                        height={160}
                        className="object-contain"
                    // You can add 'layout="responsive"' and set the parent width/height if needed for different Next.js Image versions/configurations
                    />
                )}
            </div>

            {/* Right Button */}
            {photos.length > 1 && (
                <button
                    onClick={nextImage}
                    className="absolute right-0 z-10 p-1 bg-neutral-900 bg-opacity-50 text-white rounded-l-lg hover:bg-opacity-75 transition-opacity"
                    aria-label="Next image"
                >
                    <ChevronRight size={16} />
                </button>
            )}

            {/* Image Counter (Optional) */}
            {photos.length > 1 && (
                <div className="absolute bottom-1 right-1 px-1 text-xs bg-neutral-900 bg-opacity-50 text-white rounded-full">
                    {currentIndex + 1} / {photos.length}
                </div>
            )}
        </div>
    );
};

export default ImageSlider