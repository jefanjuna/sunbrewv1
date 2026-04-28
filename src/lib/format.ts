import type { HomeworkPost, PaymentPost } from './types';

const singaporeDateFormatter = new Intl.DateTimeFormat('en-SG', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});

const singaporeDateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Singapore',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const relativeDateFormatter = new Intl.DateTimeFormat('en-SG', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit'
});

function formatSingaporeDateKey(date: Date): string {
  const parts = singaporeDateKeyFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '00';
  const day = parts.find((part) => part.type === 'day')?.value ?? '00';

  return `${year}-${month}-${day}`;
}

function getHomeworkDeadlineDate(post: HomeworkPost): Date | null {
  if (post.deadlineKind !== 'date' || !post.deadlineDate) {
    return null;
  }

  const deadlineDate = new Date(post.deadlineDate);
  return Number.isNaN(deadlineDate.getTime()) ? null : deadlineDate;
}

export function formatCurrency(priceCents: number): string {
  return `S$${(priceCents / 100).toFixed(2)}`;
}

export function parsePriceToCents(rawPrice: string): number {
  const sanitized = rawPrice.trim().replace(/[^0-9.]/g, '');
  if (!sanitized) {
    return Number.NaN;
  }

  const value = Number.parseFloat(sanitized);
  if (!Number.isFinite(value) || value <= 0) {
    return Number.NaN;
  }

  return Math.round(value * 100);
}

export function formatCompactDate(isoDate: string | null): string {
  if (!isoDate) {
    return 'No clear deadline';
  }

  return singaporeDateFormatter.format(new Date(isoDate));
}

export function formatRelativePostDate(isoDate: string): string {
  return relativeDateFormatter.format(new Date(isoDate));
}

export function isHomeworkDueToday(post: HomeworkPost, now = new Date()): boolean {
  const deadlineDate = getHomeworkDeadlineDate(post);

  if (!deadlineDate) {
    return false;
  }

  return formatSingaporeDateKey(deadlineDate) === formatSingaporeDateKey(now);
}

export function isHomeworkOverdue(post: HomeworkPost, now = new Date()): boolean {
  const deadlineDate = getHomeworkDeadlineDate(post);

  if (!deadlineDate) {
    return false;
  }

  return formatSingaporeDateKey(deadlineDate) < formatSingaporeDateKey(now);
}

export function isHomeworkDue(post: HomeworkPost, now = new Date()): boolean {
  return isHomeworkOverdue(post, now);
}

export function formatStopwatchDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes}m ${totalSeconds % 60}s`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    return `${totalHours}h`;
  }

  const totalDays = Math.floor(totalHours / 24);
  if (totalDays < 7) {
    return `${totalDays}d`;
  }

  const totalWeeks = Math.floor(totalDays / 7);
  return `${totalWeeks}w`;
}

export function formatPaymentStopwatch(post: PaymentPost, paidAtIso: string | null): string | null {
  if (!paidAtIso) {
    return null;
  }

  const elapsed = new Date(paidAtIso).getTime() - new Date(post.createdAt).getTime();
  return formatStopwatchDuration(elapsed);
}

export function formatDeadlineLabel(post: HomeworkPost): string {
  if (post.deadlineKind === 'date' && post.deadlineDate) {
    return formatCompactDate(post.deadlineDate);
  }

  if (post.deadlineKind === 'custom') {
    return post.deadlineCustom?.trim() ? post.deadlineCustom.trim() : 'Custom deadline';
  }

  return 'No clear deadline';
}