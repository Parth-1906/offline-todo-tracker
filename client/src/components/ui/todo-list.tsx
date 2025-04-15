import { useQuery } from "@tanstack/react-query";
import { Todo } from "@shared/schema";
import { TodoItem } from "./todo-item";
import { toggleTodo, deleteTodo, getLocalTodos } from "@/lib/offline-sync";
import { useEffect, useState } from "react";

export function TodoList() {
  const [isOfflineLoaded, setIsOfflineLoaded] = useState(false);

  // Fetch todos from the server
  const { data: todos, isLoading, isError } = useQuery({
    queryKey: ['/api/todos'],
    staleTime: 60000, // 1 minute
    // If there's an error fetching from server, return empty array but don't show error
    // Offline data will be loaded separately
    retry: false,
    gcTime: Infinity,
  });

  // Load offline data first or when network request fails
  useEffect(() => {
    const loadOfflineTodos = async () => {
      try {
        const localTodos = await getLocalTodos();
        if (!todos || isError) {
          // If we don't have server data yet or there was an error, use local data
          if (localTodos.length > 0) {
            // Update query cache with local data
            window.queryClient.setQueryData(['/api/todos'], localTodos);
          }
        }
        setIsOfflineLoaded(true);
      } catch (error) {
        console.error("Error loading offline todos:", error);
        setIsOfflineLoaded(true);
      }
    };

    loadOfflineTodos();
  }, [todos, isError]);

  const handleToggleTodo = async (todo: Todo) => {
    await toggleTodo(todo);
  };

  const handleDeleteTodo = async (todo: Todo) => {
    await deleteTodo(todo);
  };

  // Show loading state only if we don't have offline data yet
  if (isLoading && !isOfflineLoaded) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-2 text-text-secondary">Loading your todos...</p>
      </div>
    );
  }

  // Show empty state if we have no todos
  if (!todos?.length) {
    return (
      <div className="text-center py-12">
        <div className="text-7xl text-primary opacity-25 mb-4">
          <span className="material-icons" style={{ fontSize: '5rem' }}>fact_check</span>
        </div>
        <h2 className="text-xl font-medium mb-2">No todos yet</h2>
        <p className="text-text-secondary">Add your first todo to get started</p>
      </div>
    );
  }

  return (
    <div className="w-full md:w-2/3 lg:w-1/2 mx-auto space-y-3">
      {todos.map((todo) => (
        <TodoItem 
          key={todo.localId} 
          todo={todo} 
          onToggle={handleToggleTodo}
          onDelete={handleDeleteTodo}
        />
      ))}
    </div>
  );
}
