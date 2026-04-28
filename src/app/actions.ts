'use server';

import {
  createHomeworkPost,
  createPaymentPost,
  deleteHomeworkPost,
  deletePaymentPost,
  togglePaymentChecklistEntry,
  updateHomeworkPost,
  updatePaymentPost
} from '@/lib/repository';
import type { HomeworkDeadlineKind, HomeworkSubject, PaymentParticipantName } from '@/lib/types';

export async function submitHomeworkAction(input: {
  title: string;
  description?: string;
  subject: HomeworkSubject;
  deadlineKind: HomeworkDeadlineKind;
  deadlineDate?: string | null;
  deadlineCustom?: string | null;
}) {
  return createHomeworkPost(input);
}

export async function submitPaymentAction(input: { title: string; description?: string; priceCents: number }) {
  return createPaymentPost(input);
}

export async function updateHomeworkAction(input: {
  id: string;
  title: string;
  description?: string;
  subject: HomeworkSubject;
  deadlineKind: HomeworkDeadlineKind;
  deadlineDate?: string | null;
  deadlineCustom?: string | null;
}) {
  return updateHomeworkPost(input);
}

export async function deleteHomeworkAction(input: { id: string }) {
  return deleteHomeworkPost(input);
}

export async function updatePaymentAction(input: { id: string; title: string; description?: string; priceCents: number }) {
  return updatePaymentPost(input);
}

export async function deletePaymentAction(input: { id: string }) {
  return deletePaymentPost(input);
}

export async function togglePaymentChecklistAction(input: {
  paymentPostId: string;
  name: PaymentParticipantName;
  isPaid: boolean;
}) {
  return togglePaymentChecklistEntry(input);
}