"use client";
import { Calendar, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface Photo {
    url: string;
    clickedOn: string | Date;
}

const ImageSlider = ({ photos }: { photos: Photo }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    console.log(photos);



    if (photos === undefined) {
        return (
            <div className="flex flex-col items-center justify-center p-2 text-gray-400">
                <ImageIcon size={20} strokeWidth={1.5} />
                <span className="text-[10px] italic">No Photos</span>
            </div>
        );
    }



    const formatDate = (dateString: string | Date) => {
        try {
            return new Date(dateString).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
            }) + ", " + new Date(dateString).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short'
            });
        } catch (e) {
            return "Date N/A";
        }
    };

    return (
        <div className="flex flex-col items-center gap-2 py-1">
            <div className="relative w-24 h-24 border rounded-md shadow-sm bg-gray-50 overflow-hidden group">

                <Image
                    src={photos.url}
                    alt="Scan preview"
                    fill
                    sizes="96px"
                    className="object-cover cursor-pointer hover:scale-110 transition-transform duration-300"
                    unoptimized // Use this if you are getting Cloudinary domain errors in Next.js config
                />
            </div>

            <div className="flex items-center gap-1 text-gray-500 whitespace-nowrap">
                <Calendar size={10} />
                <span className="text-[9px] font-medium">
                    {formatDate(photos.clickedOn)}
                </span>
            </div>
        </div>
    );
};

export default ImageSlider;