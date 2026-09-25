import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "react-hot-toast";

//@ts-ignore
import "./globals.css";

import { routing } from "@/i18n/routing";


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
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased  bg-neutral-200`}>

        {children}
        <Toaster position="top-right"
          reverseOrder={false} />
      </body>
    </html>
  );
}


export default RootLayout
