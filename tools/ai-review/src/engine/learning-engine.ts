import * as fs from 'fs';
import * as path from 'path';
import { ReviewResult } from '../types';

interface LearningConfig {
  enabled: boolean;
  feedbackThreshold: number;
  storageType: string;
  storagePath: string;
}

interface FeedbackEntry {
  issueType: string;
  accepted: boolean;
  feedback: string;
  timestamp: string;
}

export class LearningEngine {
  private config: LearningConfig;
  private feedbackData: Map<string, FeedbackEntry[]>;
  private storagePath: string;

  constructor(config: LearningConfig) {
    this.config = config;
    this.feedbackData = new Map();
    this.storagePath = path.join(process.cwd(), config.storagePath, 'feedback.json');
    this.loadFeedbackData();
  }

  async enhance(review: ReviewResult): Promise<ReviewResult> {
    if (!this.config.enabled) {
      return review;
    }

    // Filter issues based on historical feedback
    const enhancedIssues = review.issues.filter((issue) => {
      return this.shouldIncludeIssue(issue.type, issue.category);
    });

    // Adjust severity based on feedback
    for (const issue of enhancedIssues) {
      this.adjustSeverity(issue);
    }

    return {
      ...review,
      issues: enhancedIssues,
    };
  }

  private shouldIncludeIssue(issueType: string, category: string): boolean {
    const key = `${category}:${issueType}`;
    const feedback = this.feedbackData.get(key);

    if (!feedback || feedback.length === 0) {
      return true; // No feedback, include by default
    }

    // Calculate acceptance rate
    const acceptedCount = feedback.filter((f) => f.accepted).length;
    const acceptanceRate = acceptedCount / feedback.length;

    // Only include if acceptance rate is above threshold
    return acceptanceRate >= this.config.feedbackThreshold;
  }

  private adjustSeverity(issue: any): void {
    const key = `${issue.category}:${issue.type}`;
    const feedback = this.feedbackData.get(key);

    if (!feedback || feedback.length < 5) {
      return; // Not enough data to adjust
    }

    // If consistently rejected, downgrade severity
    const acceptedCount = feedback.filter((f) => f.accepted).length;
    const acceptanceRate = acceptedCount / feedback.length;

    if (acceptanceRate < 0.3 && issue.severity !== 'info') {
      const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
      const currentIndex = severityOrder.indexOf(issue.severity);
      if (currentIndex < severityOrder.length - 1) {
        issue.severity = severityOrder[currentIndex + 1];
      }
    }
  }

  async recordFeedback(issueType: string, category: string, accepted: boolean, feedback: string): Promise<void> {
    const key = `${category}:${issueType}`;

    if (!this.feedbackData.has(key)) {
      this.feedbackData.set(key, []);
    }

    this.feedbackData.get(key)!.push({
      issueType,
      accepted,
      feedback,
      timestamp: new Date().toISOString(),
    });

    await this.saveFeedbackData();
  }

  private loadFeedbackData(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf-8');
        const parsed = JSON.parse(data);

        for (const [key, value] of Object.entries(parsed)) {
          this.feedbackData.set(key, value as FeedbackEntry[]);
        }
      }
    } catch (error) {
      console.error('Error loading feedback data:', error);
    }
  }

  private async saveFeedbackData(): Promise<void> {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data: Record<string, FeedbackEntry[]> = {};
      for (const [key, value] of this.feedbackData.entries()) {
        data[key] = value;
      }

      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving feedback data:', error);
    }
  }

  getStatistics(): Record<string, any> {
    const stats: Record<string, any> = {
      totalFeedbackEntries: 0,
      byCategory: {},
      topAccepted: [],
      topRejected: [],
    };

    for (const [key, feedback] of this.feedbackData.entries()) {
      stats.totalFeedbackEntries += feedback.length;

      const [category] = key.split(':');
      if (!stats.byCategory[category]) {
        stats.byCategory[category] = {
          total: 0,
          accepted: 0,
          rejected: 0,
        };
      }

      stats.byCategory[category].total += feedback.length;
      stats.byCategory[category].accepted += feedback.filter((f) => f.accepted).length;
      stats.byCategory[category].rejected += feedback.filter((f) => !f.accepted).length;
    }

    return stats;
  }
}
