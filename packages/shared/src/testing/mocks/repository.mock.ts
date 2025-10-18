/**
 * Mock repository for testing database operations
 */
export class MockRepository<T = any> {
  private data: Map<string, T> = new Map();

  // Find operations
  async findOne(conditions: any): Promise<T | null> {
    return Array.from(this.data.values()).find((item) =>
      Object.entries(conditions).every(([key, value]) => item[key] === value)
    ) || null;
  }

  async find(conditions?: any): Promise<T[]> {
    if (!conditions) return Array.from(this.data.values());

    return Array.from(this.data.values()).filter((item) =>
      Object.entries(conditions).every(([key, value]) => item[key] === value)
    );
  }

  async findById(id: string): Promise<T | null> {
    return this.data.get(id) || null;
  }

  // Create operations
  async create(entity: Partial<T>): Promise<T> {
    const id = (entity as any).id || this.generateId();
    const created = { ...entity, id, createdAt: new Date(), updatedAt: new Date() } as T;
    this.data.set(id, created);
    return created;
  }

  async save(entity: T): Promise<T> {
    const id = (entity as any).id;
    if (!id) throw new Error('Entity must have an id');

    const updated = { ...entity, updatedAt: new Date() };
    this.data.set(id, updated);
    return updated;
  }

  // Update operations
  async update(id: string, updateData: Partial<T>): Promise<T | null> {
    const existing = this.data.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...updateData, updatedAt: new Date() };
    this.data.set(id, updated);
    return updated;
  }

  // Delete operations
  async delete(id: string): Promise<boolean> {
    return this.data.delete(id);
  }

  async remove(entity: T): Promise<T> {
    const id = (entity as any).id;
    this.data.delete(id);
    return entity;
  }

  // Count operations
  async count(conditions?: any): Promise<number> {
    const items = await this.find(conditions);
    return items.length;
  }

  // Utility methods
  clear(): void {
    this.data.clear();
  }

  getAll(): T[] {
    return Array.from(this.data.values());
  }

  private generateId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
