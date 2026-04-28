import { prisma } from '@/lib/prisma';
import {
  createHomeworkPost as createHomeworkPostFallback,
  createPaymentPost as createPaymentPostFallback,
  deleteHomeworkPost as deleteHomeworkPostFallback,
  deletePaymentPost as deletePaymentPostFallback,
  listHomeworkPosts as listHomeworkPostsFallback,
  listPaymentPosts as listPaymentPostsFallback,
  updateHomeworkPost as updateHomeworkPostFallback,
  updatePaymentPost as updatePaymentPostFallback,
  togglePaymentChecklistEntry as togglePaymentChecklistEntryFallback
} from '@/lib/store';
import type {
  HomeworkDeadlineKind,
  HomeworkPost,
  HomeworkSubject,
  PaymentParticipantName,
  PaymentPost,
  PaymentChecklistEntry
} from '@/lib/types';

type DbHomeworkSubject = 'GENERAL_PAPER' | 'PROJECT_WORK' | 'PHYSICS' | 'COMPUTING' | 'MATHEMATICS' | 'ECONOMICS' | 'HISTORY' | 'LITERATURE' | 'CHINESE' | 'TAMIL';
type DbHomeworkDeadlineKind = 'DATE' | 'CUSTOM' | 'NO_DATE';

const useDatabase = Boolean(process.env.DATABASE_URL);

const homeworkSubjectToDb: Record<HomeworkSubject, DbHomeworkSubject> = {
  'General Paper': 'GENERAL_PAPER',
  'Project Work': 'PROJECT_WORK',
  Physics: 'PHYSICS',
  Computing: 'COMPUTING',
  Mathematics: 'MATHEMATICS',
  Economics: 'ECONOMICS',
  History: 'HISTORY',
  Literature: 'LITERATURE',
  Chinese: 'CHINESE',
  Tamil: 'TAMIL'
};

const homeworkSubjectFromDb: Record<DbHomeworkSubject, HomeworkSubject> = {
  GENERAL_PAPER: 'General Paper',
  PROJECT_WORK: 'Project Work',
  PHYSICS: 'Physics',
  COMPUTING: 'Computing',
  MATHEMATICS: 'Mathematics',
  ECONOMICS: 'Economics',
  HISTORY: 'History',
  LITERATURE: 'Literature',
  CHINESE: 'Chinese',
  TAMIL: 'Tamil'
};

const homeworkDeadlineKindToDb: Record<HomeworkDeadlineKind, DbHomeworkDeadlineKind> = {
  date: 'DATE',
  custom: 'CUSTOM',
  'no-date': 'NO_DATE'
};

const homeworkDeadlineKindFromDb: Record<DbHomeworkDeadlineKind, HomeworkDeadlineKind> = {
  DATE: 'date',
  CUSTOM: 'custom',
  NO_DATE: 'no-date'
};

type HomeworkPostRow = {
  id: string;
  title: string;
  description: string | null;
  subject: DbHomeworkSubject;
  deadlineKind: DbHomeworkDeadlineKind;
  deadlineDate: Date | null;
  deadlineCustom: string | null;
  createdAt: Date;
};

type PaymentChecklistRow = {
  id: string;
  name: string;
  isPaid: boolean;
  paidAt: Date | null;
};

type PaymentPostRow = {
  id: string;
  title: string;
  description: string | null;
  priceCents: number;
  createdAt: Date;
  checklist: PaymentChecklistRow[];
};

function mapHomeworkRow(row: {
  id: string;
  title: string;
  description: string | null;
  subject: DbHomeworkSubject;
  deadlineKind: DbHomeworkDeadlineKind;
  deadlineDate: Date | null;
  deadlineCustom: string | null;
  createdAt: Date;
}): HomeworkPost {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    subject: homeworkSubjectFromDb[row.subject],
    deadlineKind: homeworkDeadlineKindFromDb[row.deadlineKind],
    deadlineDate: row.deadlineDate?.toISOString() ?? null,
    deadlineCustom: row.deadlineCustom,
    createdAt: row.createdAt.toISOString()
  };
}

function mapPaymentChecklistRow(row: { id: string; name: string; isPaid: boolean; paidAt: Date | null }): PaymentChecklistEntry {
  return {
    id: row.id,
    name: row.name as PaymentParticipantName,
    isPaid: row.isPaid,
    paidAt: row.paidAt?.toISOString() ?? null
  };
}

function mapPaymentPostRow(row: {
  id: string;
  title: string;
  description: string | null;
  priceCents: number;
  createdAt: Date;
  checklist: Array<{ id: string; name: string; isPaid: boolean; paidAt: Date | null }>;
}): PaymentPost {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priceCents: row.priceCents,
    createdAt: row.createdAt.toISOString(),
    checklist: row.checklist.map(mapPaymentChecklistRow)
  };
}

export async function listHomeworkPosts(): Promise<HomeworkPost[]> {
  if (!useDatabase) {
    return listHomeworkPostsFallback();
  }

  const rows = await prisma.homeworkPost.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return rows.map(mapHomeworkRow);
}

export async function listPaymentPosts(): Promise<PaymentPost[]> {
  if (!useDatabase) {
    return listPaymentPostsFallback();
  }

  const rows = await prisma.paymentPost.findMany({
    orderBy: { createdAt: 'desc' },
    include: { checklist: true }
  });

  return rows.map(mapPaymentPostRow);
}

export async function createHomeworkPost(input: {
  title: string;
  description?: string;
  subject: HomeworkSubject;
  deadlineKind: HomeworkDeadlineKind;
  deadlineDate?: string | null;
  deadlineCustom?: string | null;
}): Promise<HomeworkPost> {
  if (!useDatabase) {
    return createHomeworkPostFallback(input);
  }

  const row = await prisma.homeworkPost.create({
    data: {
      title: input.title.trim(),
      description: input.description?.trim() ? input.description.trim() : null,
      subject: homeworkSubjectToDb[input.subject],
      deadlineKind: homeworkDeadlineKindToDb[input.deadlineKind],
      deadlineDate: input.deadlineKind === 'date' && input.deadlineDate ? new Date(input.deadlineDate) : null,
      deadlineCustom: input.deadlineKind === 'custom' ? input.deadlineCustom?.trim() ?? null : null
    }
  });

  return mapHomeworkRow(row as {
    id: string;
    title: string;
    description: string | null;
    subject: DbHomeworkSubject;
    deadlineKind: DbHomeworkDeadlineKind;
    deadlineDate: Date | null;
    deadlineCustom: string | null;
    createdAt: Date;
  });
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
  if (!useDatabase) {
    return updateHomeworkPostFallback(input);
  }

  const row = await prisma.homeworkPost.update({
    where: { id: input.id },
    data: {
      title: input.title.trim(),
      description: input.description?.trim() ? input.description.trim() : null,
      subject: homeworkSubjectToDb[input.subject],
      deadlineKind: homeworkDeadlineKindToDb[input.deadlineKind],
      deadlineDate: input.deadlineKind === 'date' && input.deadlineDate ? new Date(input.deadlineDate) : null,
      deadlineCustom: input.deadlineKind === 'custom' ? input.deadlineCustom?.trim() ?? null : null
    }
  });

  return mapHomeworkRow(row as HomeworkPostRow);
}

export async function deleteHomeworkPost(input: { id: string }): Promise<void> {
  if (!useDatabase) {
    return deleteHomeworkPostFallback(input);
  }

  await prisma.homeworkPost.delete({
    where: { id: input.id }
  });
}

export async function createPaymentPost(input: {
  title: string;
  description?: string;
  priceCents: number;
}): Promise<PaymentPost> {
  if (!useDatabase) {
    return createPaymentPostFallback(input);
  }

  const row = await prisma.paymentPost.create({
    data: {
      title: input.title.trim(),
      description: input.description?.trim() ? input.description.trim() : null,
      priceCents: input.priceCents,
      checklist: {
        create: [
          { name: 'Ansel' },
          { name: 'Aran' },
          { name: 'Jinzhi' },
          { name: 'Zihan' },
          { name: 'Xu Jie' },
          { name: 'Advait' },
          { name: 'Dania' },
          { name: 'Javan' },
          { name: 'Jorsche' },
          { name: 'Josh' },
          { name: 'Joslyn' },
          { name: 'Bo An' },
          { name: 'Minxiang' },
          { name: 'Junyu' },
          { name: 'Xinyu' },
          { name: 'Dinh' },
          { name: 'Bryan' },
          { name: 'Shao Heng' },
          { name: 'Ricardo' },
          { name: 'Yong Ming' },
          { name: 'Rhys' },
          { name: 'Heng Yi' },
          { name: 'Miaoke' },
          { name: 'Xiaochen' }
        ]
      }
    },
    include: { checklist: true }
  });

  return mapPaymentPostRow(row as {
    id: string;
    title: string;
    description: string | null;
    priceCents: number;
    createdAt: Date;
    checklist: Array<{ id: string; name: string; isPaid: boolean; paidAt: Date | null }>;
  });
}

export async function updatePaymentPost(input: {
  id: string;
  title: string;
  description?: string;
  priceCents: number;
}): Promise<PaymentPost> {
  if (!useDatabase) {
    return updatePaymentPostFallback(input);
  }

  const row = await prisma.paymentPost.update({
    where: { id: input.id },
    data: {
      title: input.title.trim(),
      description: input.description?.trim() ? input.description.trim() : null,
      priceCents: input.priceCents
    },
    include: { checklist: true }
  });

  return mapPaymentPostRow(row as PaymentPostRow);
}

export async function deletePaymentPost(input: { id: string }): Promise<void> {
  if (!useDatabase) {
    return deletePaymentPostFallback(input);
  }

  await prisma.paymentPost.delete({
    where: { id: input.id }
  });
}

export async function togglePaymentChecklistEntry(input: {
  paymentPostId: string;
  name: PaymentParticipantName;
  isPaid: boolean;
}): Promise<PaymentPost> {
  if (!useDatabase) {
    return togglePaymentChecklistEntryFallback(input);
  }

  await prisma.paymentChecklist.update({
    where: {
      paymentPostId_name: {
        paymentPostId: input.paymentPostId,
        name: input.name
      }
    },
    data: {
      isPaid: input.isPaid,
      paidAt: input.isPaid ? new Date() : null
    }
  });

  const row = await prisma.paymentPost.findUnique({
    where: { id: input.paymentPostId },
    include: { checklist: true }
  });

  if (!row) {
    throw new Error('Payment post not found.');
  }

  return mapPaymentPostRow(row as {
    id: string;
    title: string;
    description: string | null;
    priceCents: number;
    createdAt: Date;
    checklist: Array<{ id: string; name: string; isPaid: boolean; paidAt: Date | null }>;
  });
}
