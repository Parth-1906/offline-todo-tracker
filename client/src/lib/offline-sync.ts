import { Todo } from "@shared/schema";
import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";

// IndexedDB setup
const DB_NAME = "todosdb";
const DB_VERSION = 1;
const STORE_NAME = "todos";

// Initialize IndexedDB
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      reject("Error opening IndexedDB");
    };
    
    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "localId" });
        store.createIndex("id", "id", { unique: true });
        store.createIndex("syncedAt", "syncedAt", { unique: false });
      }
    };
  });
};

// Get todos from IndexedDB
export const getLocalTodos = async (): Promise<Todo[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject("Error fetching local todos");
    };
  });
};

// Save a todo to IndexedDB
export const saveLocalTodo = async (todo: Todo): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(todo);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject("Error saving local todo");
    };
  });
};

// Delete a todo from IndexedDB
export const deleteLocalTodo = async (localId: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(localId);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject("Error deleting local todo");
    };
  });
};

// Helper to generate a local ID
export const generateLocalId = (): string => {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Sync local todos with the server
export const syncTodos = async (): Promise<Todo[]> => {
  try {
    // Get all local todos
    const localTodos = await getLocalTodos();
    
    // Send to server for syncing
    const response = await apiRequest('POST', '/api/todos/sync', { todos: localTodos });
    const serverTodos: Todo[] = await response.json();
    
    // Update local database with server data
    for (const todo of serverTodos) {
      await saveLocalTodo({
        ...todo,
        syncedAt: new Date()
      });
    }
    
    // Update React Query cache
    queryClient.setQueryData(['/api/todos'], serverTodos);
    
    return serverTodos;
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
};

// Check online status
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Add new todo with offline support
export const addTodo = async (title: string): Promise<Todo> => {
  const localId = generateLocalId();
  const newTodo: Partial<Todo> = {
    title,
    isCompleted: false,
    localId,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  try {
    if (isOnline()) {
      // If online, save to server first
      const response = await apiRequest('POST', '/api/todos', {
        title,
        isCompleted: false,
        localId
      });
      const serverTodo = await response.json();
      
      // Save to local DB
      await saveLocalTodo({
        ...serverTodo,
        syncedAt: new Date()
      });
      
      // Update cache
      const currentTodos = queryClient.getQueryData<Todo[]>(['/api/todos']) || [];
      queryClient.setQueryData(['/api/todos'], [...currentTodos, serverTodo]);
      
      return serverTodo;
    } else {
      // If offline, save to local DB only
      const offlineTodo = newTodo as Todo;
      await saveLocalTodo(offlineTodo);
      
      // Update cache
      const currentTodos = queryClient.getQueryData<Todo[]>(['/api/todos']) || [];
      queryClient.setQueryData(['/api/todos'], [...currentTodos, offlineTodo]);
      
      return offlineTodo;
    }
  } catch (error) {
    console.error('Error adding todo:', error);
    
    // Always save locally on error
    const offlineTodo = newTodo as Todo;
    await saveLocalTodo(offlineTodo);
    
    // Update cache
    const currentTodos = queryClient.getQueryData<Todo[]>(['/api/todos']) || [];
    queryClient.setQueryData(['/api/todos'], [...currentTodos, offlineTodo]);
    
    return offlineTodo;
  }
};

// Toggle todo completion with offline support
export const toggleTodo = async (todo: Todo): Promise<Todo> => {
  const updatedTodo = {
    ...todo,
    isCompleted: !todo.isCompleted,
    updatedAt: new Date()
  };
  
  try {
    if (isOnline() && todo.id) {
      // If online and has a server ID, update on server
      const response = await apiRequest('PATCH', `/api/todos/${todo.id}`, {
        isCompleted: updatedTodo.isCompleted
      });
      const serverTodo = await response.json();
      
      // Update local DB
      await saveLocalTodo({
        ...serverTodo,
        syncedAt: new Date()
      });
      
      // Update cache
      const currentTodos = queryClient.getQueryData<Todo[]>(['/api/todos']) || [];
      queryClient.setQueryData(['/api/todos'], 
        currentTodos.map(t => t.id === todo.id ? serverTodo : t)
      );
      
      return serverTodo;
    } else {
      // If offline or no server ID, save locally only
      await saveLocalTodo(updatedTodo);
      
      // Update cache
      const currentTodos = queryClient.getQueryData<Todo[]>(['/api/todos']) || [];
      queryClient.setQueryData(['/api/todos'], 
        currentTodos.map(t => t.localId === todo.localId ? updatedTodo : t)
      );
      
      return updatedTodo;
    }
  } catch (error) {
    console.error('Error toggling todo:', error);
    
    // Always save locally on error
    await saveLocalTodo(updatedTodo);
    
    // Update cache
    const currentTodos = queryClient.getQueryData<Todo[]>(['/api/todos']) || [];
    queryClient.setQueryData(['/api/todos'], 
      currentTodos.map(t => t.localId === todo.localId ? updatedTodo : t)
    );
    
    return updatedTodo;
  }
};

// Delete todo with offline support
export const deleteTodo = async (todo: Todo): Promise<void> => {
  try {
    if (isOnline() && todo.id) {
      // If online and has a server ID, delete on server
      await apiRequest('DELETE', `/api/todos/${todo.id}`, undefined);
    }
    
    // Always delete locally
    await deleteLocalTodo(todo.localId);
    
    // Update cache
    const currentTodos = queryClient.getQueryData<Todo[]>(['/api/todos']) || [];
    queryClient.setQueryData(['/api/todos'], 
      currentTodos.filter(t => t.localId !== todo.localId)
    );
  } catch (error) {
    console.error('Error deleting todo:', error);
    
    // On error, still delete locally
    await deleteLocalTodo(todo.localId);
    
    // Update cache
    const currentTodos = queryClient.getQueryData<Todo[]>(['/api/todos']) || [];
    queryClient.setQueryData(['/api/todos'], 
      currentTodos.filter(t => t.localId !== todo.localId)
    );
  }
};

// Setup online/offline event listeners to trigger sync
export const setupSyncListeners = (): () => void => {
  const handleOnline = () => {
    console.log('Back online, syncing todos...');
    syncTodos()
      .then(() => console.log('Sync completed'))
      .catch(err => console.error('Sync failed:', err));
  };
  
  window.addEventListener('online', handleOnline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
  };
};
