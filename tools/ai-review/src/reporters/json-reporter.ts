import { ReviewResult } from '../types';

export class JsonReporter {
  generate(review: ReviewResult): string {
    return JSON.stringify(review, null, 2);
  }
}
