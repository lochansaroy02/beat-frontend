import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";

//@ts-ignore
import "./globals.css";

import { routing } from "@/i18n/routing";


const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });


export const metadata: Metadata = {

  title: "Duty Track",
  description: "Track the performace of beat incharge ",
};


export const generateStaticParams = () =>
  routing.locales.map((locale) => ({ locale }));

const RootLayout = async ({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) => {


  return (
    <html >
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased  bg-neutral-200`}>

        {children}
        <Toaster position="top-right"
          reverseOrder={false} />
      </body>
    </html>
  );
}


export default RootLayout