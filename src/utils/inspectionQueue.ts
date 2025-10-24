type QueueTask = () => Promise<void>;

interface QueueItem {
  id: string;
  task: QueueTask;
  resolve: () => void;
  reject: (error: Error) => void;
}

class InspectionQueue {
  private queue: QueueItem[] = [];
  private running: Set<string> = new Set();
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 2) {
    this.maxConcurrent = maxConcurrent;
  }

  async add(id: string, task: QueueTask): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ id, task, resolve, reject });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.running.size >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.running.add(item.id);

    try {
      await item.task();
      item.resolve();
    } catch (error) {
      item.reject(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      this.running.delete(item.id);
      this.process();
    }
  }

  isRunning(id: string): boolean {
    return this.running.has(id);
  }

  isPending(id: string): boolean {
    return this.queue.some(item => item.id === id);
  }

  getRunningCount(): number {
    return this.running.size;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }
}

export const inspectionQueue = new InspectionQueue(2);
