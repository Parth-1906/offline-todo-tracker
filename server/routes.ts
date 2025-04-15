import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTodoSchema, updateTodoSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api
  const apiRouter = express.Router();

  // Get all todos
  apiRouter.get("/todos", async (req, res) => {
    try {
      const todos = await storage.getAllTodos();
      res.json(todos);
    } catch (error) {
      console.error("Error fetching todos:", error);
      res.status(500).json({ message: "Failed to fetch todos" });
    }
  });

  // Get a specific todo
  apiRouter.get("/todos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const todo = await storage.getTodo(id);
      if (!todo) {
        return res.status(404).json({ message: "Todo not found" });
      }

      res.json(todo);
    } catch (error) {
      console.error("Error fetching todo:", error);
      res.status(500).json({ message: "Failed to fetch todo" });
    }
  });

  // Create a new todo
  apiRouter.post("/todos", async (req, res) => {
    try {
      const todoData = insertTodoSchema.parse(req.body);
      const todo = await storage.createTodo(todoData);
      res.status(201).json(todo);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating todo:", error);
      res.status(500).json({ message: "Failed to create todo" });
    }
  });

  // Update a todo
  apiRouter.patch("/todos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const updateData = updateTodoSchema.parse(req.body);
      const updatedTodo = await storage.updateTodo(id, updateData);

      if (!updatedTodo) {
        return res.status(404).json({ message: "Todo not found" });
      }

      res.json(updatedTodo);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error updating todo:", error);
      res.status(500).json({ message: "Failed to update todo" });
    }
  });

  // Delete a todo
  apiRouter.delete("/todos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const success = await storage.deleteTodo(id);
      if (!success) {
        return res.status(404).json({ message: "Todo not found" });
      }

      res.status(204).end();
    } catch (error) {
      console.error("Error deleting todo:", error);
      res.status(500).json({ message: "Failed to delete todo" });
    }
  });

  // Sync todos by local ID
  apiRouter.post("/todos/sync", async (req, res) => {
    try {
      const { todos: clientTodos } = req.body;
      const results = [];

      for (const todoData of clientTodos) {
        // Check if todo with this localId already exists
        const existingTodo = await storage.getTodoByLocalId(todoData.localId);
        
        if (existingTodo) {
          // Update existing todo
          const updatedTodo = await storage.updateTodo(existingTodo.id, {
            isCompleted: todoData.isCompleted
          });
          if (updatedTodo) results.push(updatedTodo);
        } else {
          // Create new todo
          const parsedTodo = insertTodoSchema.parse(todoData);
          const newTodo = await storage.createTodo(parsedTodo);
          results.push(newTodo);
        }
      }

      // Return all synced todos
      const allTodos = await storage.getAllTodos();
      res.status(200).json(allTodos);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error syncing todos:", error);
      res.status(500).json({ message: "Failed to sync todos" });
    }
  });

  app.use("/api", apiRouter);

  const httpServer = createServer(app);

  return httpServer;
}
