/**
 * Performance Monitoring Utilities
 *
 * Tracks and reports performance metrics for the application
 */

interface PerformanceMetrics {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private reportingEndpoint: string | null = null;

  constructor(reportingEndpoint?: string) {
    this.reportingEndpoint = reportingEndpoint || null;
    this.initializeObservers();
  }

  /**
   * Initialize Performance Observers
   */
  private initializeObservers(): void {
    if (typeof window === 'undefined') return;

    // Observe Largest Contentful Paint (LCP)
    this.observeLCP();

    // Observe First Input Delay (FID)
    this.observeFID();

    // Observe Cumulative Layout Shift (CLS)
    this.observeCLS();

    // Observe Time to First Byte (TTFB)
    this.observeTTFB();
  }

  /**
   * Largest Contentful Paint (LCP)
   * Good: < 2.5s, Needs Improvement: 2.5s - 4s, Poor: > 4s
   */
  private observeLCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number };

        const value = lastEntry.renderTime || lastEntry.loadTime || 0;
        const rating = value < 2500 ? 'good' : value < 4000 ? 'needs-improvement' : 'poor';

        this.recordMetric({
          name: 'LCP',
          value,
          rating,
          timestamp: Date.now(),
        });
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('LCP observation failed:', error);
    }
  }

  /**
   * First Input Delay (FID)
   * Good: < 100ms, Needs Improvement: 100ms - 300ms, Poor: > 300ms
   */
  private observeFID(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          const value = entry.processingStart - entry.startTime;
          const rating = value < 100 ? 'good' : value < 300 ? 'needs-improvement' : 'poor';

          this.recordMetric({
            name: 'FID',
            value,
            rating,
            timestamp: Date.now(),
          });
        });
      });

      observer.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      console.warn('FID observation failed:', error);
    }
  }

  /**
   * Cumulative Layout Shift (CLS)
   * Good: < 0.1, Needs Improvement: 0.1 - 0.25, Poor: > 0.25
   */
  private observeCLS(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });

        const rating = clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor';

        this.recordMetric({
          name: 'CLS',
          value: clsValue,
          rating,
          timestamp: Date.now(),
        });
      });

      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('CLS observation failed:', error);
    }
  }

  /**
   * Time to First Byte (TTFB)
   * Good: < 800ms, Needs Improvement: 800ms - 1800ms, Poor: > 1800ms
   */
  private observeTTFB(): void {
    if (!('performance' in window) || !performance.timing) return;

    try {
      const navigationTiming = performance.timing;
      const value = navigationTiming.responseStart - navigationTiming.requestStart;
      const rating = value < 800 ? 'good' : value < 1800 ? 'needs-improvement' : 'poor';

      this.recordMetric({
        name: 'TTFB',
        value,
        rating,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn('TTFB measurement failed:', error);
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${metric.name}:`, {
        value: `${metric.value.toFixed(2)}ms`,
        rating: metric.rating,
      });
    }

    // Report to analytics endpoint if configured
    if (this.reportingEndpoint) {
      this.reportMetric(metric);
    }
  }

  /**
   * Report metric to analytics endpoint
   */
  private async reportMetric(metric: PerformanceMetrics): Promise<void> {
    if (!this.reportingEndpoint) return;

    try {
      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
      });
    } catch (error) {
      console.error('Failed to report metric:', error);
    }
  }

  /**
   * Get all recorded metrics
   */
  public getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get metrics summary
   */
  public getSummary(): Record<string, { average: number; count: number; rating: string }> {
    const summary: Record<string, { total: number; count: number; rating: string }> = {};

    this.metrics.forEach((metric) => {
      if (!summary[metric.name]) {
        summary[metric.name] = { total: 0, count: 0, rating: 'good' };
      }
      summary[metric.name].total += metric.value;
      summary[metric.name].count += 1;
      summary[metric.name].rating = metric.rating;
    });

    const result: Record<string, { average: number; count: number; rating: string }> = {};
    Object.keys(summary).forEach((key) => {
      result[key] = {
        average: summary[key].total / summary[key].count,
        count: summary[key].count,
        rating: summary[key].rating,
      };
    });

    return result;
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

/**
 * Initialize performance monitoring
 */
export const initializePerformanceMonitoring = (reportingEndpoint?: string): void => {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor(reportingEndpoint);
  }
};

/**
 * Get performance metrics
 */
export const getPerformanceMetrics = (): PerformanceMetrics[] => {
  return performanceMonitor?.getMetrics() || [];
};

/**
 * Get performance summary
 */
export const getPerformanceSummary = (): Record<string, { average: number; count: number; rating: string }> => {
  return performanceMonitor?.getSummary() || {};
};

/**
 * Custom performance marker
 */
export const markPerformance = (name: string): void => {
  if ('performance' in window && performance.mark) {
    performance.mark(name);
  }
};

/**
 * Measure performance between two markers
 */
export const measurePerformance = (name: string, startMark: string, endMark: string): number => {
  if ('performance' in window && performance.measure) {
    try {
      performance.measure(name, startMark, endMark);
      const entries = performance.getEntriesByName(name);
      return entries[entries.length - 1]?.duration || 0;
    } catch (error) {
      console.warn('Performance measurement failed:', error);
      return 0;
    }
  }
  return 0;
};
