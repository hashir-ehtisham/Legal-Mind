export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  retryOnStatuses?: number[];
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes a promise-returning function and retries it with exponential backoff and jitter
 * if it fails due to network issues or specific HTTP statuses (429, 403, 503).
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 5;
  let delay = options.initialDelayMs ?? 1000;
  const maxDelay = options.maxDelayMs ?? 30000;
  const retryStatuses = options.retryOnStatuses ?? [429, 403, 503];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      const isRetryableStatus = status ? retryStatuses.includes(status) : true; // assume retryable if no explicit non-retryable status is identified

      if (isRetryableStatus && attempt < maxRetries) {
        // Calculate jittered exponential backoff: delay * 2^attempt + jitter
        const jitter = Math.random() * 200;
        const sleepTime = Math.min(delay * Math.pow(2, attempt) + jitter, maxDelay);
        
        console.warn(
          `[Retry Helper] Attempt ${attempt + 1}/${maxRetries} failed with error/status: ${
            error?.message || error
          }. Retrying in ${Math.round(sleepTime)}ms...`
        );
        
        await sleep(sleepTime);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
