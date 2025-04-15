import { Todo } from "@shared/schema";
import { toggleTodo, deleteTodo } from "@/lib/offline-sync";
import { useToast } from "@/hooks/use-toast";

interface TodoItemProps {
  todo: Todo;
  onToggle: (todo: Todo) => Promise<void>;
  onDelete: (todo: Todo) => Promise<void>;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const { toast } = useToast();

  const handleToggle = async () => {
    try {
      await onToggle(todo);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to update todo",
        description: "Your changes will be synced when you're back online"
      });
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(todo);
      toast({
        title: "Todo deleted",
        description: "Your todo has been deleted successfully"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to delete todo",
        description: "Your changes will be synced when you're back online"
      });
    }
  };

  return (
    <div className="bg-surface rounded-md shadow-md hover:shadow-lg transition-shadow p-4 flex items-center group animate-in slide-in-from-top">
      <label className="flex-grow flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          className="hidden" 
          checked={todo.isCompleted}
          onChange={handleToggle}
          aria-label={`Mark "${todo.title}" as ${todo.isCompleted ? 'incomplete' : 'complete'}`}
        />
        <span className={`material-icons text-2xl mr-3 ${todo.isCompleted ? 'text-success' : 'text-divider'}`}>
          {todo.isCompleted ? 'check_circle' : 'radio_button_unchecked'}
        </span>
        <span 
          className={`text-lg ${todo.isCompleted ? 'line-through text-muted-foreground' : ''}`}
        >
          {todo.title}
        </span>
      </label>
      <button 
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-error ml-2 p-1"
        onClick={handleDelete}
        aria-label={`Delete todo: ${todo.title}`}
      >
        <span className="material-icons">delete</span>
      </button>
    </div>
  );
}
