"use client";
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

// Define a proper type for the photo object
interface Photo {
    url: string;
    userId: string;
    createdAt: string | Date;
}

const ImageSlider = ({ photos }: { photos: Photo[] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextImage = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex === photos.length - 1 ? 0 : prevIndex + 1
        );
    };

    const prevImage = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex === 0 ? photos.length - 1 : prevIndex - 1
        );
    };

    if (!photos || photos.length === 0) {
        return <div className="text-gray-500 italic text-xs">No Photos</div>;
    }

    const currentPhoto = photos[currentIndex];

    // Helper to format the date nicely
    const formatDate = (dateString: string | Date) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    console.log(photos);
    return (
        <div className="flex flex-col items-center gap-2">
            {/* Image Container */}
            <div className="relative w-40 h-40 border rounded shadow-sm flex items-center justify-center bg-gray-100 overflow-hidden">
                {photos.length > 1 && (
                    <button
                        onClick={prevImage}
                        className="absolute left-0 z-10 p-1 bg-black/50 text-white rounded-r-lg hover:bg-black/75 transition-opacity"
                    >
                        <ChevronLeft size={16} />
                    </button>
                )}

                <div className="flex justify-center items-center w-full h-full">
                    {currentPhoto?.url && (
                        <Image
                            src={currentPhoto.url}
                            alt={`Upload ${currentIndex + 1}`}
                            width={160}
                            height={160}
                            className="object-contain"
                        />
                    )}
                </div>

                {photos.length > 1 && (
                    <button
                        onClick={nextImage}
                        className="absolute right-0 z-10 p-1 bg-black/50 text-white rounded-l-lg hover:bg-black/75 transition-opacity"
                    >
                        <ChevronRight size={16} />
                    </button>
                )}

                {/* Counter Tag */}
                {photos.length > 1 && (
                    <div className="absolute top-1 right-1 px-2 py-0.5 text-[10px] bg-black/60 text-white rounded-full">
                        {currentIndex + 1} / {photos.length}
                    </div>
                )}
            </div>

            {/* --- Date Display --- */}
            <div className="flex items-center gap-1 text-gray-500">
                <Calendar size={12} />
                <span className="text-[10px] font-medium">

                    {currentPhoto?.createdAt ? formatDate(currentPhoto.createdAt) : "Date N/A"}
                </span>
            </div>
        </div>
    );
};

export default ImageSlider;