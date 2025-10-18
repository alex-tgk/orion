import { Job } from 'bull';

interface QueueJob<T = any> {
  id: string;
  data: T;
  opts: any;
  timestamp: number;
  attempts: number;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  result?: any;
  error?: Error;
}

/**
 * Mock Bull queue for testing message queue operations
 */
export class MockQueue<T = any> {
  private jobs: Map<string, QueueJob<T>> = new Map();
  private processors: Array<(job: Job<T>) => Promise<any>> = [];
  private jobCounter = 0;

  constructor(public readonly name: string) {}

  // Add jobs
  async add(data: T, opts?: any): Promise<Job<T>> {
    const id = `${++this.jobCounter}`;
    const job: QueueJob<T> = {
      id,
      data,
      opts: opts || {},
      timestamp: Date.now(),
      attempts: 0,
      status: 'waiting',
    };

    this.jobs.set(id, job);

    // Auto-process if processor exists
    if (this.processors.length > 0) {
      setImmediate(() => this.processJob(id));
    }

    return this.createJobObject(job);
  }

  async addBulk(jobs: Array<{ data: T; opts?: any }>): Promise<Job<T>[]> {
    return Promise.all(jobs.map(job => this.add(job.data, job.opts)));
  }

  // Process jobs
  process(processor: (job: Job<T>) => Promise<any>): void;
  process(concurrency: number, processor: (job: Job<T>) => Promise<any>): void;
  process(
    processorOrConcurrency: number | ((job: Job<T>) => Promise<any>),
    processor?: (job: Job<T>) => Promise<any>
  ): void {
    if (typeof processorOrConcurrency === 'function') {
      this.processors.push(processorOrConcurrency);
    } else if (processor) {
      this.processors.push(processor);
    }
  }

  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || this.processors.length === 0) return;

    job.status = 'active';
    job.attempts++;

    try {
      const jobObject = this.createJobObject(job);
      const result = await this.processors[0](jobObject);

      job.status = 'completed';
      job.result = result;
    } catch (error) {
      job.status = 'failed';
      job.error = error as Error;

      // Retry logic
      if (job.opts.attempts && job.attempts < job.opts.attempts) {
        job.status = 'waiting';
        setTimeout(() => this.processJob(jobId), job.opts.backoff?.delay || 1000);
      }
    }
  }

  // Get jobs
  async getJob(jobId: string): Promise<Job<T> | null> {
    const job = this.jobs.get(jobId);
    return job ? this.createJobObject(job) : null;
  }

  async getJobs(
    types: Array<'waiting' | 'active' | 'completed' | 'failed'>,
    start?: number,
    end?: number
  ): Promise<Job<T>[]> {
    const filtered = Array.from(this.jobs.values())
      .filter(job => types.includes(job.status))
      .slice(start, end);

    return filtered.map(job => this.createJobObject(job));
  }

  async getWaiting(): Promise<Job<T>[]> {
    return this.getJobs(['waiting']);
  }

  async getActive(): Promise<Job<T>[]> {
    return this.getJobs(['active']);
  }

  async getCompleted(): Promise<Job<T>[]> {
    return this.getJobs(['completed']);
  }

  async getFailed(): Promise<Job<T>[]> {
    return this.getJobs(['failed']);
  }

  // Job counts
  async count(): Promise<number> {
    return this.jobs.size;
  }

  async getJobCounts(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const jobs = Array.from(this.jobs.values());
    return {
      waiting: jobs.filter(j => j.status === 'waiting').length,
      active: jobs.filter(j => j.status === 'active').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
    };
  }

  // Clean jobs
  async clean(grace: number, status?: string): Promise<Job<T>[]> {
    const cutoff = Date.now() - grace;
    const toClean = Array.from(this.jobs.entries())
      .filter(([_, job]) => {
        if (status && job.status !== status) return false;
        return job.timestamp < cutoff;
      });

    const cleaned = toClean.map(([id, job]) => {
      this.jobs.delete(id);
      return this.createJobObject(job);
    });

    return cleaned;
  }

  async empty(): Promise<void> {
    this.jobs.clear();
  }

  async close(): Promise<void> {
    this.jobs.clear();
    this.processors = [];
  }

  // Pause/Resume
  async pause(): Promise<void> {
    // Mock implementation
  }

  async resume(): Promise<void> {
    // Mock implementation
  }

  // Create Job-like object
  private createJobObject(job: QueueJob<T>): Job<T> {
    return {
      id: job.id,
      data: job.data,
      opts: job.opts,
      timestamp: job.timestamp,
      attemptsMade: job.attempts,
      returnvalue: job.result,
      failedReason: job.error?.message,

      // Methods
      progress: jest.fn(),
      log: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
      retry: jest.fn().mockResolvedValue(undefined),
      discard: jest.fn().mockResolvedValue(undefined),
      promote: jest.fn().mockResolvedValue(undefined),

      // Status methods
      isCompleted: jest.fn().mockResolvedValue(job.status === 'completed'),
      isFailed: jest.fn().mockResolvedValue(job.status === 'failed'),
      isActive: jest.fn().mockResolvedValue(job.status === 'active'),
      isWaiting: jest.fn().mockResolvedValue(job.status === 'waiting'),
    } as any;
  }
}
