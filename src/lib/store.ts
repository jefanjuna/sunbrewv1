import { randomUUID } from 'crypto';

import {
  homeworkDeadlineKinds,
  homeworkSubjects,
  type HomeworkDeadlineKind,
  type HomeworkPost,
  type HomeworkSubject,
  paymentParticipantNames,
  type PaymentParticipantName,
  type PaymentPost,
  type PaymentChecklistEntry
} from './types';

type StoreState = {
  homework: HomeworkPost[];
  payments: PaymentPost[];
};

declare global {
  var __sunbrewStore: StoreState | undefined;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isoNow(): string {
  return new Date().toISOString();
}

function shiftTime(baseIso: string, milliseconds: number): string {
  return new Date(new Date(baseIso).getTime() + milliseconds).toISOString();
}

function createHomeworkPostSeed(args: {
  title: string;
  description: string | null;
  subject: HomeworkSubject;
  deadlineKind: HomeworkDeadlineKind;
  deadlineDate: string | null;
  deadlineCustom: string | null;
  createdAt: string;
}): HomeworkPost {
  return {
    id: randomUUID(),
    ...args
  };
}

function createChecklistEntries(): PaymentChecklistEntry[] {
  return paymentParticipantNames.map((name) => ({
    id: randomUUID(),
    name,
    isPaid: false,
    paidAt: null
  }));
}

function createPaymentPostSeed(args: {
  title: string;
  description: string | null;
  priceCents: number;
  createdAt: string;
  paidHighlights?: Array<{ name: PaymentParticipantName; millisecondsAfterCreation: number }>;
}): PaymentPost {
  const postId = randomUUID();
  const checklist = createChecklistEntries();

  for (const highlight of args.paidHighlights ?? []) {
    const entry = checklist.find((item) => item.name === highlight.name);
    if (entry) {
      entry.isPaid = true;
      entry.paidAt = shiftTime(args.createdAt, highlight.millisecondsAfterCreation);
    }
  }

  return {
    id: postId,
    title: args.title,
    description: args.description,
    priceCents: args.priceCents,
    createdAt: args.createdAt,
    checklist
  };
}

function createSeedState(): StoreState {
  const now = isoNow();

  return {
    homework: [
      createHomeworkPostSeed({
        title: 'Physics worksheet corrections',
        description: 'Finish the final five questions and annotate working.',
        subject: 'Physics',
        deadlineKind: 'date',
        deadlineDate: shiftTime(now, 1000 * 60 * 60 * 48),
        deadlineCustom: null,
        createdAt: shiftTime(now, -1000 * 60 * 40)
      }),
      createHomeworkPostSeed({
        title: 'Computing sprint retrospective',
        description: 'Add the rough notes from the group discussion.',
        subject: 'Computing',
        deadlineKind: 'date',
        deadlineDate: shiftTime(now, -1000 * 60 * 60 * 5),
        deadlineCustom: null,
        createdAt: shiftTime(now, -1000 * 60 * 90)
      }),
      createHomeworkPostSeed({
        title: 'General Paper essay plan',
        description: 'Aim for a strong thesis and two supporting examples.',
        subject: 'General Paper',
        deadlineKind: 'custom',
        deadlineDate: null,
        deadlineCustom: 'About two weeks',
        createdAt: shiftTime(now, -1000 * 60 * 60 * 6)
      }),
      createHomeworkPostSeed({
        title: 'History reading notes',
        description: null,
        subject: 'History',
        deadlineKind: 'no-date',
        deadlineDate: null,
        deadlineCustom: null,
        createdAt: shiftTime(now, -1000 * 60 * 60 * 24 * 2)
      }),
      createHomeworkPostSeed({
        title: 'Mathematics tutorial set',
        description: 'Show steps for the harder integration questions.',
        subject: 'Mathematics',
        deadlineKind: 'date',
        deadlineDate: shiftTime(now, 1000 * 60 * 60 * 72),
        deadlineCustom: null,
        createdAt: shiftTime(now, -1000 * 60 * 12)
      }),
      createHomeworkPostSeed({
        title: 'Project Work milestone checklist',
        description: 'Assemble the slide deck and confirm the division of labour.',
        subject: 'Project Work',
        deadlineKind: 'custom',
        deadlineDate: null,
        deadlineCustom: 'Before the next consultation',
        createdAt: shiftTime(now, -1000 * 60 * 60 * 14)
      })
    ],
    payments: [
      createPaymentPostSeed({
        title: 'Chemistry notes bundle',
        description: 'Printed notes and a small worksheet set.',
        priceCents: 850,
        createdAt: shiftTime(now, -1000 * 60 * 60 * 5),
        paidHighlights: [
          { name: 'Ansel', millisecondsAfterCreation: 27 * 1000 },
          { name: 'Josh', millisecondsAfterCreation: 11 * 60 * 1000 + 54 * 1000 },
          { name: 'Bryan', millisecondsAfterCreation: 3 * 60 * 60 * 1000 }
        ]
      }),
      createPaymentPostSeed({
        title: 'Physics worksheet pack',
        description: 'Combined worksheet pack for the next two tutorials.',
        priceCents: 1200,
        createdAt: shiftTime(now, -1000 * 60 * 60 * 24 * 16),
        paidHighlights: [
          { name: 'Xinyu', millisecondsAfterCreation: 2 * 24 * 60 * 60 * 1000 },
          { name: 'Rhys', millisecondsAfterCreation: 2 * 7 * 24 * 60 * 60 * 1000 }
        ]
      })
    ]
  };
}

function getStore(): StoreState {
  if (!globalThis.__sunbrewStore) {
    globalThis.__sunbrewStore = createSeedState();
  }

  return globalThis.__sunbrewStore;
}

function validateHomeworkInput(input: {
  title: string;
  description?: string;
  subject: HomeworkSubject;
  deadlineKind: HomeworkDeadlineKind;
  deadlineDate?: string | null;
  deadlineCustom?: string | null;
}): void {
  if (!input.title.trim()) {
    throw new Error('Title is required.');
  }

  if (!homeworkSubjects.includes(input.subject)) {
    throw new Error('Subject is required.');
  }

  if (!homeworkDeadlineKinds.includes(input.deadlineKind)) {
    throw new Error('Deadline is required.');
  }

  if (input.deadlineKind === 'date' && !input.deadlineDate) {
    throw new Error('A date deadline is required.');
  }

  if (input.deadlineKind === 'custom' && !input.deadlineCustom?.trim()) {
    throw new Error('A custom deadline text is required.');
  }
}

function validatePaymentInput(input: { title: string; priceCents: number }): void {
  if (!input.title.trim()) {
    throw new Error('Title is required.');
  }

  if (!Number.isFinite(input.priceCents) || input.priceCents <= 0) {
    throw new Error('Price is required.');
  }
}

export async function listHomeworkPosts(): Promise<HomeworkPost[]> {
  return clone(getStore().homework);
}

export async function listPaymentPosts(): Promise<PaymentPost[]> {
  return clone(getStore().payments);
}

export async function createHomeworkPost(input: {
  title: string;
  description?: string;
  subject: HomeworkSubject;
  deadlineKind: HomeworkDeadlineKind;
  deadlineDate?: string | null;
  deadlineCustom?: string | null;
}): Promise<HomeworkPost> {
  validateHomeworkInput(input);

  const post: HomeworkPost = {
    id: randomUUID(),
    title: input.title.trim(),
    description: input.description?.trim() ? input.description.trim() : null,
    subject: input.subject,
    deadlineKind: input.deadlineKind,
    deadlineDate: input.deadlineKind === 'date' ? input.deadlineDate ?? null : null,
    deadlineCustom: input.deadlineKind === 'custom' ? input.deadlineCustom?.trim() ?? null : null,
    createdAt: isoNow()
  };

  getStore().homework.unshift(post);
  return clone(post);
}

export async function updateHomeworkPost(input: {
  id: string;
  title: string;
  description?: string;
  subject: HomeworkSubject;
  deadlineKind: HomeworkDeadlineKind;
  deadlineDate?: string | null;
  deadlineCustom?: string | null;
}): Promise<HomeworkPost> {
  validateHomeworkInput(input);

  const store = getStore();
  const index = store.homework.findIndex((post) => post.id === input.id);

  if (index === -1) {
    throw new Error('Homework post not found.');
  }

  const updated: HomeworkPost = {
    ...store.homework[index],
    title: input.title.trim(),
    description: input.description?.trim() ? input.description.trim() : null,
    subject: input.subject,
    deadlineKind: input.deadlineKind,
    deadlineDate: input.deadlineKind === 'date' ? input.deadlineDate ?? null : null,
    deadlineCustom: input.deadlineKind === 'custom' ? input.deadlineCustom?.trim() ?? null : null
  };

  store.homework[index] = updated;
  return clone(updated);
}

export async function deleteHomeworkPost(input: { id: string }): Promise<void> {
  const store = getStore();
  const index = store.homework.findIndex((post) => post.id === input.id);

  if (index === -1) {
    throw new Error('Homework post not found.');
  }

  store.homework.splice(index, 1);
}

export async function createPaymentPost(input: {
  title: string;
  description?: string;
  priceCents: number;
}): Promise<PaymentPost> {
  validatePaymentInput(input);

  const post: PaymentPost = {
    id: randomUUID(),
    title: input.title.trim(),
    description: input.description?.trim() ? input.description.trim() : null,
    priceCents: input.priceCents,
    createdAt: isoNow(),
    checklist: paymentParticipantNames.map((name) => ({
      id: randomUUID(),
      name,
      isPaid: false,
      paidAt: null
    }))
  };

  getStore().payments.unshift(post);
  return clone(post);
}

export async function updatePaymentPost(input: {
  id: string;
  title: string;
  description?: string;
  priceCents: number;
}): Promise<PaymentPost> {
  validatePaymentInput(input);

  const store = getStore();
  const index = store.payments.findIndex((post) => post.id === input.id);

  if (index === -1) {
    throw new Error('Payment post not found.');
  }

  const updated: PaymentPost = {
    ...store.payments[index],
    title: input.title.trim(),
    description: input.description?.trim() ? input.description.trim() : null,
    priceCents: input.priceCents
  };

  store.payments[index] = updated;
  return clone(updated);
}

export async function deletePaymentPost(input: { id: string }): Promise<void> {
  const store = getStore();
  const index = store.payments.findIndex((post) => post.id === input.id);

  if (index === -1) {
    throw new Error('Payment post not found.');
  }

  store.payments.splice(index, 1);
}

export async function togglePaymentChecklistEntry(input: {
  paymentPostId: string;
  name: PaymentParticipantName;
  isPaid: boolean;
}): Promise<PaymentPost> {
  const paymentPost = getStore().payments.find((item) => item.id === input.paymentPostId);

  if (!paymentPost) {
    throw new Error('Payment post not found.');
  }

  const checklistEntry = paymentPost.checklist.find((entry) => entry.name === input.name);
  if (!checklistEntry) {
    throw new Error('Checklist entry not found.');
  }

  checklistEntry.isPaid = input.isPaid;
  checklistEntry.paidAt = input.isPaid ? isoNow() : null;

  return clone(paymentPost);
}

export function getHomeworkOverviewCounts(posts: HomeworkPost[]): {
  dated: number;
  custom: number;
  noDate: number;
  due: number;
} {
  const now = new Date();

  return posts.reduce(
    (accumulator, post) => {
      if (post.deadlineKind === 'date') {
        accumulator.dated += 1;
        if (post.deadlineDate && new Date(post.deadlineDate).getTime() < now.getTime()) {
          accumulator.due += 1;
        }
      }

      if (post.deadlineKind === 'custom') {
        accumulator.custom += 1;
      }

      if (post.deadlineKind === 'no-date') {
        accumulator.noDate += 1;
      }

      return accumulator;
    },
    { dated: 0, custom: 0, noDate: 0, due: 0 }
  );
}