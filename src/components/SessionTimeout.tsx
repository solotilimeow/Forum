'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 60 * 1000; // 1 minute warning

export default function SessionTimeout() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;
    let warningTimer: NodeJS.Timeout;
    let countdownInterval: NodeJS.Timeout;
    
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);
      clearInterval(countdownInterval);
      setShowWarning(false);
      setTimeLeft(60);
      
      // Set warning timer (29 minutes)
      warningTimer = setTimeout(() => {
        setShowWarning(true);
        
        // Start countdown
        countdownInterval = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, INACTIVITY_TIMEOUT - WARNING_TIME);
      
      // Set logout timer (30 minutes)
      inactivityTimer = setTimeout(async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login?timeout=true');
      }, INACTIVITY_TIMEOUT);
    };
    
    // Listen for activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });
    
    // Initial timer
    resetTimer();
    
    return () => {
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);
      clearInterval(countdownInterval);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [router]);
  
  const extendSession = async () => {
    // Ping server to extend session
    await fetch('/api/auth/session/ping', { method: 'POST' });
    setShowWarning(false);
    setTimeLeft(60);
  };
  
  if (!showWarning) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-red-600 mb-2">Session Timeout Warning</h3>
        <p className="text-gray-600 mb-4">
          Your session will expire in <span className="font-bold text-red-600">{timeLeft}</span> seconds due to inactivity.
        </p>
        <div className="flex gap-3">
          <button
            onClick={extendSession}
            className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}
