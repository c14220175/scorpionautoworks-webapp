"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const SESSION_KEY = "scorpion_admin_token";
const TIMESTAMP_KEY = "scorpion_admin_last_activity";
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 menit

export default function AdminAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkSession = useCallback(() => {
    const token = sessionStorage.getItem(SESSION_KEY);
    const lastActivity = sessionStorage.getItem(TIMESTAMP_KEY);

    if (!token || !lastActivity) {
      return false;
    }

    const elapsed = Date.now() - parseInt(lastActivity, 10);
    if (elapsed > SESSION_TIMEOUT_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(TIMESTAMP_KEY);
      return false;
    }

    return true;
  }, []);

  // Update timestamp setiap kali ada aktivitas
  const updateActivity = useCallback(() => {
    const token = sessionStorage.getItem(SESSION_KEY);
    if (token) {
      sessionStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
    }
  }, []);

  useEffect(() => {
    const valid = checkSession();
    if (!valid) {
      router.replace("/admin-login");
    } else {
      updateActivity();
      setIsAuthed(true);
    }
    setIsChecking(false);
  }, [checkSession, updateActivity, router]);

  useEffect(() => {
    if (!isAuthed) return;

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) =>
      window.addEventListener(event, updateActivity, { passive: true })
    );

    const interval = setInterval(() => {
      const valid = checkSession();
      if (!valid) {
        router.replace("/admin-login");
      }
    }, 60_000);

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, updateActivity)
      );
      clearInterval(interval);
    };
  }, [isAuthed, checkSession, updateActivity, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm animate-pulse">
            Memverifikasi sesi...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return null;
  }

  return <>{children}</>;
}

export function adminLogout() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(TIMESTAMP_KEY);
}
