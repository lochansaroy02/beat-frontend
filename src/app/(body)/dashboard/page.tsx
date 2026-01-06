// 📁 dashboard/page.tsx
import { redirect } from 'next/navigation';

// This is a Server Component, running on the server.
// It will instantly redirect the user to the default tab's URL.
export default function DashboardRootPage() {
    // Redirects to the Users Dashboard page.
    redirect('/dashboard/user');
}