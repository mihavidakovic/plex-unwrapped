'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Home, Users, Settings, Mail, FileText, LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = api.getToken();
    if (!token && pathname !== '/admin/login') {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(!!token);
    }
    setLoading(false);
  }, [pathname, router]);

  const handleLogout = () => {
    api.logout();
    router.push('/admin/login');
  };

  if (pathname === '/admin/login') {
    return children;
  }

  if (loading) {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-background">
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&display=swap');
        `}</style>
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: Home },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Generations', href: '/admin/generations', icon: Settings },
    { name: 'Emails', href: '/admin/emails', icon: Mail },
    { name: 'Logs', href: '/admin/logs', icon: FileText },
  ];

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&display=swap');
      `}</style>

      <SidebarProvider>
        <Sidebar className="dark">
          <SidebarHeader>
            <Link href="/admin/dashboard" className="flex flex-col px-4 py-3">
              <h1 className="font-['Archivo'] font-bold text-xl text-sidebar-foreground">
                Unwrapped for Plex
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Admin Panel</p>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="font-['Archivo']">Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={item.href} className="font-['Archivo']">
                            <item.icon />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} className="font-['Archivo']">
                  <LogOut />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="dark">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <h2 className="font-['Archivo'] font-semibold text-foreground">
                Unwrapped for Plex Admin
              </h2>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4">
            <AnimatePresence mode="wait">{children}</AnimatePresence>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
