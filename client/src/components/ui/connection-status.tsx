import { useState, useEffect } from "react";

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex items-center">
      <span 
        className={`inline-block w-3 h-3 rounded-full ${isOnline ? 'bg-success' : 'bg-error'} mr-2`}
        aria-hidden="true"
      />
      <span className="text-sm">{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );
}
