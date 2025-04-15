import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface TodoFormProps {
  onSubmit: (title: string) => Promise<void>;
}

export function TodoForm({ onSubmit }: TodoFormProps) {
  const [todoTitle, setTodoTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const title = todoTitle.trim();
    if (!title) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Todo title cannot be empty"
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(title);
      setTodoTitle("");
      toast({
        title: "Todo added",
        description: "Your todo has been added successfully"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error adding todo",
        description: "Your todo will be synced when you're back online"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-8">
      <form className="flex w-full md:w-2/3 lg:w-1/2 mx-auto" onSubmit={handleSubmit}>
        <input 
          type="text" 
          placeholder="Add a new task..." 
          className="flex-grow p-3 rounded-l-md border border-r-0 border-divider focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          value={todoTitle}
          onChange={(e) => setTodoTitle(e.target.value)}
          disabled={isSubmitting}
        />
        <button 
          type="submit"
          className="bg-primary text-white px-4 rounded-r-md hover:bg-opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
          disabled={isSubmitting}
        >
          <span className="material-icons">{isSubmitting ? 'hourglass_empty' : 'add'}</span>
        </button>
      </form>
    </div>
  );
}
