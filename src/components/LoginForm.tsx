"use client";
import { AUTH_TOKEN_KEY, useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import InputComponent from './ui/InputComponent';
import { Button } from './ui/button';
// --- Assuming you have a toast library imported (e.g., from 'react-hot-toast')
// --- Assuming you have a simple spinner component (e.g., Lucide icon or custom CSS)
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DropDown from './ui/DropDown';

const LoginForm = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState('')
    // State to manage the auth check status (Correctly implemented for FOUC fix)
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);


    const { userData, token, isLoggedIn, isLoading, login } = useAuthStore();
    const router = useRouter();

    const handleLogin = async () => {
        // Prevent clicking while a login request is already running
        if (isLoading) return;


        const response = await login({ email, password, role });
        if (response) {
            toast.success("Login successful! Redirecting to dashboard.");
            router.push("/dashboard");
        } else {
            toast.error("Login failed. Please check your credentials.");
        }
    }

    const roleOptions = [
        { value: "admin", label: "Admin" },
        { value: "subadmin", label: "Sub Admin" },

    ]

    useEffect(() => {
        // This check runs only on the client-side after mount
        if (typeof window !== 'undefined' && localStorage.getItem(AUTH_TOKEN_KEY)) {
            // Token found, redirect immediately
            router.replace("/dashboard");
        } else {
            // No token found, we can now render the form
            setIsCheckingAuth(false);
        }
    }, [router]);

    // Conditional Render: Show loading while checking auth status
    if (isCheckingAuth) {
        return <div className='p-10 h-screen '>
            <h1 className='text-2xl'>
                Loading...
            </h1>
        </div>;
    }

    return (
        <div className=' p-10 rounded-xl  border border-neutral-800/50  shadow-md w-1/2  '>
            <div className='flex flex-col gap-8 '>
                <DropDown options={roleOptions} selectedValue={role} handleSelect={setRole} />
                <InputComponent value={email} setInput={setEmail} label={role === "subadmin" ? "Mobile" : "Email"} />
                <InputComponent type='password' value={password} setInput={setPassword} label='Password' />
            </div>
            <div className='w-full flex justify-center  mt-6 '>
                <Button onClick={handleLogin} disabled={isLoading}>
                    {isLoading ? (
                        // 2. Button Loader Spinner
                        <>
                            {/* Loader2 is a common spinner icon. 'animate-spin' is a Tailwind CSS utility */}
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Logging In
                        </>
                    ) : (
                        "Login"
                    )}
                </Button>
            </div>
        </div>
    )
}

export default LoginForm;