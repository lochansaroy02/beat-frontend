"use client";
import LoginForm from "@/components/LoginForm";


export default function LoginPage() {

  return (
    <div className="flex min-h-screen  items-center  flex-col  mt-[8%] ">
      <h1 className="text-2xl text-blue-900 font-bold mb-6 text-center">Duty Track</h1>
      <div className="  w-3/4  flex items-center justify-center  ">
        <LoginForm />
      </div>
    </div>
  );
}
