import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isOnline, syncTodos } from "@/lib/offline-sync";

export function SyncStatus() {
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(false);
  const { toast } = useToast();

  // Check if we have pending changes by comparing syncedAt with updatedAt
  useEffect(() => {
    const checkPendingChanges = async () => {
      try {
        // Access IndexedDB to check for unsynchronized changes
        const db = await window.indexedDB.open("todosdb", 1);
        db.onsuccess = () => {
          const tx = db.result.transaction("todos", "readonly");
          const store = tx.objectStore("todos");
          const request = store.getAll();
          
          request.onsuccess = () => {
            const todos = request.result;
            const hasPending = todos.some(todo => {
              return !todo.syncedAt || new Date(todo.updatedAt) > new Date(todo.syncedAt);
            });
            setPendingChanges(hasPending);
          };
        };
      } catch (error) {
        console.error("Failed to check pending changes:", error);
      }
    };

    checkPendingChanges();
    // Set up an interval to check periodically
    const interval = setInterval(checkPendingChanges, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleForceSync = async () => {
    if (!isOnline()) {
      toast({
        variant: "destructive",
        title: "Offline",
        description: "Cannot sync while offline"
      });
      return;
    }

    if (isSyncing) return;

    setIsSyncing(true);
    try {
      await syncTodos();
      setLastSynced(new Date());
      setPendingChanges(false);
      toast({
        title: "Sync complete",
        description: "All your todos have been synchronized"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: "Failed to sync your todos. Please try again."
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex justify-between items-center w-full">
      <div className="text-sm text-text-secondary flex items-center">
        <span className="material-icons mr-1 text-base">sync</span>
        <span>
          {isSyncing 
            ? "Syncing..." 
            : pendingChanges 
              ? "Pending changes..." 
              : "All changes saved"}
        </span>
      </div>
      
      <button 
        className="text-primary hover:bg-primary hover:bg-opacity-10 transition-colors rounded-md px-3 py-1 text-sm flex items-center disabled:opacity-50"
        onClick={handleForceSync}
        disabled={!isOnline() || isSyncing}
      >
        <span className="material-icons mr-1 text-base">
          {isSyncing ? 'hourglass_empty' : 'cloud_upload'}
        </span>
        Sync Now
      </button>
    </div>
  );
}
