"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import ClientLayout from "@/components/ClientLayout";
import Agenda from "@/components/pages/Agenda";

export default function AgendaPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (sessionLoading) return;
    
    if (isRedirecting || session?.user) return;
    
    if (!session?.user) {
      setIsRedirecting(true);
      router.push('/login?redirect=/agenda');
    }
  }, [session, sessionLoading, router, isRedirecting]);

  if (sessionLoading || isRedirecting) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!session?.user) {
    return null; // Will redirect via effect
  }

  return (
    <ClientLayout currentPage="agenda">
      <Agenda />
    </ClientLayout>
  );
}