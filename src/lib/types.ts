export const homeworkSubjects = [
  'General Paper',
  'Project Work',
  'Physics',
  'Computing',
  'Mathematics',
  'Economics',
  'History',
  'Literature',
  'Chinese',
  'Tamil'
] as const;

export type HomeworkSubject = (typeof homeworkSubjects)[number];

export const homeworkDeadlineKinds = ['date', 'custom', 'no-date'] as const;

export type HomeworkDeadlineKind = (typeof homeworkDeadlineKinds)[number];

export const paymentParticipantNames = [
  'Ansel',
  'Aran',
  'Jinzhi',
  'Zihan',
  'Xu Jie',
  'Advait',
  'Dania',
  'Javan',
  'Jorsche',
  'Josh',
  'Joslyn',
  'Bo An',
  'Minxiang',
  'Junyu',
  'Xinyu',
  'Dinh',
  'Bryan',
  'Shao Heng',
  'Ricardo',
  'Yong Ming',
  'Rhys',
  'Heng Yi',
  'Miaoke',
  'Xiaochen'
] as const;

export type PaymentParticipantName = (typeof paymentParticipantNames)[number];

export interface HomeworkPost {
  id: string;
  title: string;
  description: string | null;
  subject: HomeworkSubject;
  deadlineKind: HomeworkDeadlineKind;
  deadlineDate: string | null;
  deadlineCustom: string | null;
  createdAt: string;
}

export interface PaymentChecklistEntry {
  id: string;
  name: PaymentParticipantName;
  isPaid: boolean;
  paidAt: string | null;
}

export interface PaymentPost {
  id: string;
  title: string;
  description: string | null;
  priceCents: number;
  createdAt: string;
  checklist: PaymentChecklistEntry[];
}

export interface HomeworkFormValues {
  title: string;
  description: string;
  subject: HomeworkSubject;
  deadlineKind: HomeworkDeadlineKind;
  deadlineDate: string;
  deadlineCustom: string;
}

export interface PaymentFormValues {
  title: string;
  description: string;
  price: string;
}