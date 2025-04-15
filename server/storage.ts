import { todos, type Todo, type InsertTodo, type UpdateTodo } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getAllTodos(): Promise<Todo[]>;
  getTodo(id: number): Promise<Todo | undefined>;
  createTodo(todo: InsertTodo): Promise<Todo>;
  updateTodo(id: number, todo: UpdateTodo): Promise<Todo | undefined>;
  deleteTodo(id: number): Promise<boolean>;
  getTodoByLocalId(localId: string): Promise<Todo | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getAllTodos(): Promise<Todo[]> {
    return await db.select().from(todos).orderBy(todos.createdAt);
  }

  async getTodo(id: number): Promise<Todo | undefined> {
    const [todo] = await db.select().from(todos).where(eq(todos.id, id));
    return todo;
  }

  async createTodo(insertTodo: InsertTodo): Promise<Todo> {
    const now = new Date();
    const [todo] = await db
      .insert(todos)
      .values({
        ...insertTodo,
        createdAt: now,
        updatedAt: now,
        syncedAt: now
      })
      .returning();
    return todo;
  }

  async updateTodo(id: number, updateData: UpdateTodo): Promise<Todo | undefined> {
    const [todo] = await db
      .update(todos)
      .set({ 
        ...updateData, 
        updatedAt: new Date(),
        syncedAt: new Date()
      })
      .where(eq(todos.id, id))
      .returning();
    return todo;
  }

  async deleteTodo(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(todos)
      .where(eq(todos.id, id))
      .returning();
    return !!deleted;
  }

  async getTodoByLocalId(localId: string): Promise<Todo | undefined> {
    const [todo] = await db.select().from(todos).where(eq(todos.localId, localId));
    return todo;
  }
}

export const storage = new DatabaseStorage();
