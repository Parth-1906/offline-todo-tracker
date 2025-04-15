import { TodoForm } from "@/components/ui/todo-form";
import { TodoList } from "@/components/ui/todo-list";
import { ConnectionStatus } from "@/components/ui/connection-status";
import { SyncStatus } from "@/components/ui/sync-status";
import { addTodo, setupSyncListeners } from "@/lib/offline-sync";
import { useEffect } from "react";

export default function Home() {
  // Set up sync listeners when page loads
  useEffect(() => {
    const cleanup = setupSyncListeners();
    return cleanup;
  }, []);

  const handleAddTodo = async (title: string) => {
    await addTodo(title);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-medium flex items-center">
            <span className="material-icons mr-2">check_circle</span>
            TodoSync
          </h1>
          
          {/* Connection Status */}
          <ConnectionStatus />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-6">
        <TodoForm onSubmit={handleAddTodo} />
        <TodoList />
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-divider py-3 px-4">
        <div className="container mx-auto">
          <SyncStatus />
        </div>
      </footer>
    </div>
  );
}
