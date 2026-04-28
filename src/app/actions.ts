'use server';

import { revalidatePath } from 'next/cache';

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
  const result = await createHomeworkPost(input);
  revalidatePath('/');
  return result;
}

export async function submitPaymentAction(input: { title: string; description?: string; priceCents: number }) {
  const result = await createPaymentPost(input);
  revalidatePath('/payments');
  return result;
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
  const result = await updateHomeworkPost(input);
  revalidatePath('/');
  return result;
}

export async function deleteHomeworkAction(input: { id: string }) {
  const result = await deleteHomeworkPost(input);
  revalidatePath('/');
  return result;
}

export async function updatePaymentAction(input: { id: string; title: string; description?: string; priceCents: number }) {
  const result = await updatePaymentPost(input);
  revalidatePath('/payments');
  return result;
}

export async function deletePaymentAction(input: { id: string }) {
  const result = await deletePaymentPost(input);
  revalidatePath('/payments');
  return result;
}

export async function togglePaymentChecklistAction(input: {
  paymentPostId: string;
  name: PaymentParticipantName;
  isPaid: boolean;
}) {
  const result = await togglePaymentChecklistEntry(input);
  revalidatePath('/payments');
  return result;
}