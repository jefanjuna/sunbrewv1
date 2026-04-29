'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { deleteHomeworkAction, submitHomeworkAction, updateHomeworkAction } from '@/app/actions';
import { formatCompactDate, formatDeadlineLabel, formatRelativePostDate, isHomeworkDueToday, isHomeworkOverdue } from '@/lib/format';
import { homeworkDeadlineKinds, homeworkSubjects, type HomeworkDeadlineKind, type HomeworkFormValues, type HomeworkPost, type HomeworkSubject } from '@/lib/types';

interface HomeworkDashboardProps {
  initialHomework: HomeworkPost[];
}

const defaultHomeworkForm = (): HomeworkFormValues => ({
  title: '',
  description: '',
  subject: homeworkSubjects[0],
  deadlineKind: 'date',
  deadlineDate: '',
  deadlineCustom: ''
});

function homeworkFormFromPost(homework: HomeworkPost): HomeworkFormValues {
  return {
    title: homework.title,
    description: homework.description ?? '',
    subject: homework.subject,
    deadlineKind: homework.deadlineKind,
    deadlineDate: homework.deadlineDate ?? '',
    deadlineCustom: homework.deadlineCustom ?? ''
  };
}

function sortDatePosts(posts: HomeworkPost[]): HomeworkPost[] {
  return [...posts].sort((left, right) => {
    const leftTime = left.deadlineDate ? new Date(left.deadlineDate).getTime() : Number.POSITIVE_INFINITY;
    const rightTime = right.deadlineDate ? new Date(right.deadlineDate).getTime() : Number.POSITIVE_INFINITY;

    if (leftTime === rightTime) {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    }

    return leftTime - rightTime;
  });
}

function sortCreatedPosts(posts: HomeworkPost[]): HomeworkPost[] {
  return [...posts].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function HomeworkDashboard({ initialHomework }: HomeworkDashboardProps) {
  const [homework, setHomework] = useState(initialHomework);
  const [form, setForm] = useState<HomeworkFormValues>(defaultHomeworkForm);
  const [selectedSubjects, setSelectedSubjects] = useState<HomeworkSubject[]>([...homeworkSubjects]);
  const [selectedKinds, setSelectedKinds] = useState<HomeworkDeadlineKind[]>([...homeworkDeadlineKinds]);
  const [selectedHomeworkId, setSelectedHomeworkId] = useState<string | null>(null);
  const [editingHomeworkId, setEditingHomeworkId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedHomeworkId) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedHomeworkId(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedHomeworkId]);

  const filteredHomework = useMemo(() => {
    const subjectSet = new Set(selectedSubjects);
    const kindSet = new Set(selectedKinds);

    return homework.filter((post) => subjectSet.has(post.subject) && kindSet.has(post.deadlineKind));
  }, [homework, selectedKinds, selectedSubjects]);

  const homeworkCounts = useMemo(() => ({
    overdue: homework.filter((post) => isHomeworkOverdue(post)).length,
    dueToday: homework.filter((post) => isHomeworkDueToday(post)).length,
    total: homework.length
  }), [homework]);

  const filteredHomeworkCounts = useMemo(() => ({
    overdue: filteredHomework.filter((post) => isHomeworkOverdue(post)).length,
    dueToday: filteredHomework.filter((post) => isHomeworkDueToday(post)).length
  }), [filteredHomework]);

  const groupedHomework = useMemo(() => {
    const dated = sortDatePosts(filteredHomework.filter((post) => post.deadlineKind === 'date'));
    const custom = sortCreatedPosts(filteredHomework.filter((post) => post.deadlineKind === 'custom'));
    const noDate = sortCreatedPosts(filteredHomework.filter((post) => post.deadlineKind === 'no-date'));

    return { dated, custom, noDate };
  }, [filteredHomework]);

  const visibleHomeworkCount = filteredHomework.length;

  const formDeadlineReady =
    form.deadlineKind === 'date'
      ? Boolean(form.deadlineDate)
      : form.deadlineKind === 'custom'
        ? Boolean(form.deadlineCustom.trim())
        : true;

  const canSubmitHomework = Boolean(form.title.trim()) && Boolean(form.subject) && formDeadlineReady;

  async function handleHomeworkSubmit() {
    if (!canSubmitHomework) {
      setError('Title, subject, and deadline are required before posting.');
      return;
    }

    setPending(true);
    setError(null);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        subject: form.subject,
        deadlineKind: form.deadlineKind,
        deadlineDate: form.deadlineKind === 'date' ? form.deadlineDate : null,
        deadlineCustom: form.deadlineKind === 'custom' ? form.deadlineCustom : null
      };

      if (editingHomeworkId) {
        const updated = await updateHomeworkAction({ id: editingHomeworkId, ...payload });
        setHomework((current) => current.map((post) => (post.id === updated.id ? updated : post)));
        setEditingHomeworkId(null);
      } else {
        const created = await submitHomeworkAction(payload);
        setHomework((current) => [created, ...current]);
      }

      setForm(defaultHomeworkForm());
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to save homework right now.');
    } finally {
      setPending(false);
    }
  }

  function startHomeworkEdit(homeworkPost: HomeworkPost) {
    setSelectedHomeworkId(null);
    setEditingHomeworkId(homeworkPost.id);
    setForm(homeworkFormFromPost(homeworkPost));
    setError(null);
  }

  function cancelHomeworkEdit() {
    setEditingHomeworkId(null);
    setForm(defaultHomeworkForm());
    setError(null);
  }

  async function handleHomeworkDelete(homeworkPost: HomeworkPost) {
    if (!window.confirm('Delete this homework post?')) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      await deleteHomeworkAction({ id: homeworkPost.id });
      setHomework((current) => current.filter((post) => post.id !== homeworkPost.id));

      if (selectedHomeworkId === homeworkPost.id) {
        setSelectedHomeworkId(null);
      }

      if (editingHomeworkId === homeworkPost.id) {
        cancelHomeworkEdit();
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to delete homework right now.');
    } finally {
      setPending(false);
    }
  }

  function toggleSubjectFilter(subject: HomeworkSubject) {
    setSelectedSubjects((current) => {
      if (current.includes(subject)) {
        const next = current.filter((entry) => entry !== subject);
        return next.length > 0 ? next : [...homeworkSubjects];
      }

      return [...current, subject];
    });
  }

  function toggleKindFilter(kind: HomeworkDeadlineKind) {
    setSelectedKinds((current) => {
      if (current.includes(kind)) {
        const next = current.filter((entry) => entry !== kind);
        return next.length > 0 ? next : [...homeworkDeadlineKinds];
      }

      return [...current, kind];
    });
  }

  const selectedHomework = useMemo(() => homework.find((post) => post.id === selectedHomeworkId) ?? null, [homework, selectedHomeworkId]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="sunbrew-panel overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="sunbrew-label">Homework</p>
            <h1 className="text-3xl font-semibold text-white sm:text-5xl">Homework overview</h1>
            <p className="sunbrew-muted max-w-2xl">Post homework, filter by subject, and keep track of what is due next.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="OVERDUE" value={homeworkCounts.overdue} accent="from-rose-400/20 to-red-400/10" />
            <StatCard label="DUE TODAY" value={homeworkCounts.dueToday} accent="from-amber-400/20 to-orange-400/10" />
            <StatCard label="TOTAL" value={homeworkCounts.total} accent="from-white/10 to-white/5" />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="sunbrew-label">Subject filters</p>
              <p className="mt-1 text-sm text-slate-300">Choose one or many filters. Use reset to show everything again.</p>
            </div>

            <button className="sunbrew-button-ghost" type="button" onClick={() => {
              setSelectedSubjects([...homeworkSubjects]);
              setSelectedKinds([...homeworkDeadlineKinds]);
            }}>
              Reset filters
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {homeworkSubjects.map((subject) => {
              const active = selectedSubjects.includes(subject);

              return (
                <button
                  key={subject}
                  type="button"
                  className={active ? 'sunbrew-chip sunbrew-chip-active whitespace-nowrap' : 'sunbrew-chip whitespace-nowrap'}
                  onClick={() => toggleSubjectFilter(subject)}
                >
                  {subject}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col items-start gap-3">
            <p className="sunbrew-label">Deadline filters</p>

            <div className="flex flex-wrap gap-2">
              {homeworkDeadlineKinds.map((kind) => {
                const active = selectedKinds.includes(kind);
                const label = kind === 'date' ? 'Date' : kind === 'custom' ? 'Custom date' : 'No date';

                return (
                  <button
                    key={kind}
                    type="button"
                    className={active ? 'sunbrew-chip sunbrew-chip-active' : 'sunbrew-chip'}
                    onClick={() => toggleKindFilter(kind)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            <span>
              Showing <strong className="text-white">{visibleHomeworkCount}</strong> homework post{visibleHomeworkCount === 1 ? '' : 's'} in the filtered board.
            </span>
            <span>
              <strong className="text-rose-200">{filteredHomeworkCounts.overdue}</strong> overdue, <strong className="text-amber-200">{filteredHomeworkCounts.dueToday}</strong> due today
            </span>
          </div>
        </div>
      </section>

      <section className="sunbrew-panel p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="sunbrew-label">Homework post</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{editingHomeworkId ? 'Edit homework card' : 'Create a homework card'}</h2>
          </div>
          <p className="max-w-lg text-sm text-slate-300">
            Post a homework by entering its details. Description is optional for extra context.
          </p>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="sunbrew-label" htmlFor="homework-title">Title *</label>
              <input
                id="homework-title"
                className="sunbrew-input"
                placeholder="e.g. Physics worksheet corrections"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="sunbrew-label" htmlFor="homework-description">Description</label>
              <textarea
                id="homework-description"
                className="sunbrew-textarea"
                placeholder="Optional details for the class"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="sunbrew-label" htmlFor="homework-subject">Subject *</label>
              <select
                id="homework-subject"
                className="sunbrew-select"
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value as HomeworkSubject }))}
              >
                {homeworkSubjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <p className="sunbrew-label">Deadline *</p>
              <div className="flex flex-wrap gap-2">
                {homeworkDeadlineKinds.map((kind) => {
                  const active = form.deadlineKind === kind;
                  const label = kind === 'date' ? 'Date' : kind === 'custom' ? 'Custom date' : 'No deadline';

                  return (
                    <button
                      key={kind}
                      type="button"
                      className={active ? 'sunbrew-chip sunbrew-chip-active' : 'sunbrew-chip'}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          deadlineKind: kind,
                          deadlineDate: kind === 'date' ? current.deadlineDate : '',
                          deadlineCustom: kind === 'custom' ? current.deadlineCustom : ''
                        }))
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {form.deadlineKind === 'date' ? (
                <input
                  type="date"
                  className="sunbrew-input"
                  value={form.deadlineDate}
                  onChange={(event) => setForm((current) => ({ ...current, deadlineDate: event.target.value }))}
                />
              ) : null}

              {form.deadlineKind === 'custom' ? (
                <input
                  className="sunbrew-input"
                  placeholder="e.g, next term"
                  value={form.deadlineCustom}
                  onChange={(event) => setForm((current) => ({ ...current, deadlineCustom: event.target.value }))}
                />
              ) : null}

              {form.deadlineKind === 'no-date' ? <p className="text-sm text-slate-400">This post will sit at the end of the list.</p> : null}
            </div>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-400">Required fields are title, subject, and a deadline choice.</p>
            {editingHomeworkId ? (
              <button className="sunbrew-button-ghost" type="button" onClick={cancelHomeworkEdit} disabled={pending}>
                Cancel edit
              </button>
            ) : null}
          </div>
          <button className="sunbrew-button-primary disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={!canSubmitHomework || pending} onClick={handleHomeworkSubmit}>
            {pending ? 'Saving...' : editingHomeworkId ? 'Save changes' : 'Post homework'}
          </button>
        </div>
      </section>

      <section className="space-y-6">
        <HomeworkGroupSection
          title="Dated homework"
          subtitle="Sorted by the nearest date. Overdue cards stay muted and carry a status tag."
          items={groupedHomework.dated}
          emptyCopy="No dated homework is visible with the current filters."
          onSelect={setSelectedHomeworkId}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <HomeworkGroupSection
            title="Custom deadlines"
            subtitle="Text-based timing that stays distinct from the no-deadline group."
            items={groupedHomework.custom}
            emptyCopy="No custom deadline posts match the current filters."
            onSelect={setSelectedHomeworkId}
          />

          <HomeworkGroupSection
            title="No deadline"
            subtitle="These stay at the end of the board and are easy to skim."
            items={groupedHomework.noDate}
            emptyCopy="No no-deadline posts match the current filters."
            onSelect={setSelectedHomeworkId}
          />
        </div>
      </section>

      <AnimatePresence>
        {selectedHomework ? (
          <HomeworkModal
            homework={selectedHomework}
            onClose={() => setSelectedHomeworkId(null)}
            onEdit={startHomeworkEdit}
            onDelete={handleHomeworkDelete}
            disabled={pending}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className={`rounded-[1.25rem] border border-white/10 bg-gradient-to-br ${accent} p-4 shadow-soft`}>
      <p className="sunbrew-label">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function HomeworkGroupSection({
  title,
  subtitle,
  items,
  emptyCopy,
  onSelect
}: {
  title: string;
  subtitle: string;
  items: HomeworkPost[];
  emptyCopy: string;
  onSelect: (value: string) => void;
}) {
  return (
    <section className="sunbrew-panel p-6 sm:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="sunbrew-label">Board section</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
        </div>
        <p className="max-w-xl text-sm text-slate-300">{subtitle}</p>
      </div>

      <div className="mt-5 space-y-4">
        {items.length > 0 ? (
          items.map((post) => <HomeworkCard key={post.id} homework={post} onSelect={onSelect} />)
        ) : (
          <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-sm text-slate-400">{emptyCopy}</div>
        )}
      </div>
    </section>
  );
}

function HomeworkCard({ homework, onSelect }: { homework: HomeworkPost; onSelect: (value: string) => void }) {
  const overdue = isHomeworkOverdue(homework);
  const dueToday = !overdue && isHomeworkDueToday(homework);
  const deadlineLabel = formatDeadlineLabel(homework);

  return (
    <motion.button
      layoutId={`homework-card-${homework.id}`}
      type="button"
      onClick={() => onSelect(homework.id)}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 240, damping: 24 }}
      className={`sunbrew-card w-full p-5 text-left transition-opacity ${overdue ? 'border-rose-400/30 bg-rose-400/10 opacity-[0.88]' : dueToday ? 'border-amber-400/40 bg-amber-400/10' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="sunbrew-label">{homework.subject}</p>
          <h3 className={`text-xl font-semibold ${overdue ? 'text-slate-200' : 'text-white'}`}>{homework.title}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={overdue || dueToday ? 'sunbrew-chip sunbrew-chip-active border-white/20' : 'sunbrew-chip'}>{homework.deadlineKind === 'date' ? 'Date' : homework.deadlineKind === 'custom' ? 'Custom date' : 'No date'}</span>
          {overdue ? <span className="sunbrew-chip border-rose-400/40 bg-rose-400/20 text-rose-50">OVERDUE</span> : null}
          {dueToday ? <span className="sunbrew-chip border-amber-400/40 bg-amber-400/20 text-amber-50">DUE TODAY</span> : null}
        </div>
      </div>

      <p className={`mt-4 line-clamp-2 text-sm leading-6 ${overdue ? 'text-slate-400' : 'text-slate-300'}`}>
        {homework.description?.trim() ? homework.description : 'No description added yet.'}
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <span>{deadlineLabel}</span>
        <span>Created {formatRelativePostDate(homework.createdAt)}</span>
      </div>
    </motion.button>
  );
}

function HomeworkModal({
  homework,
  onClose,
  onEdit,
  onDelete,
  disabled
}: {
  homework: HomeworkPost;
  onClose: () => void;
  onEdit: (homeworkPost: HomeworkPost) => void;
  onDelete: (homeworkPost: HomeworkPost) => Promise<void>;
  disabled: boolean;
}) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 sm:px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.button className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" type="button" aria-label="Close homework modal" onClick={onClose} />

      <motion.div
        layoutId={`homework-card-${homework.id}`}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="sunbrew-panel relative z-10 w-full max-w-3xl overflow-hidden p-6 sm:p-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="sunbrew-label">Homework details</p>
            <h3 className="mt-2 text-3xl font-semibold text-white">{homework.title}</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="sunbrew-button-ghost" type="button" onClick={() => onEdit(homework)} disabled={disabled}>
              Edit
            </button>
            <button
              className="sunbrew-button-ghost border-rose-400/25 bg-rose-400/10 text-rose-100 hover:border-rose-300/40 hover:bg-rose-400/20"
              type="button"
              onClick={() => {
                void onDelete(homework);
              }}
              disabled={disabled}
            >
              Delete
            </button>
            <button className="sunbrew-button-ghost" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <DetailPill label="Subject" value={homework.subject} />
          <DetailPill label="Deadline" value={formatDeadlineLabel(homework)} />
          <DetailPill label="Created" value={formatRelativePostDate(homework.createdAt)} />
        </div>

        <div className="mt-6 rounded-[1.25rem] border border-white/10 bg-white/5 p-5">
          <p className="sunbrew-label">Description</p>
          <p className="mt-3 text-sm leading-7 text-slate-200">
            {homework.description?.trim() ? homework.description : 'No description was entered for this homework card.'}
          </p>
        </div>

        {homework.deadlineKind === 'date' ? (
          <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-slate-950/60 p-5 text-sm text-slate-300">
            <p className="sunbrew-label">Deadline status</p>
            <p className="mt-3">
              {isHomeworkOverdue(homework)
                ? 'This homework is overdue.'
                : isHomeworkDueToday(homework)
                  ? 'This homework is due today.'
                  : `The deadline is set for ${formatCompactDate(homework.deadlineDate)}`}
            </p>
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-white/10 bg-white/5 px-4 py-4">
      <p className="sunbrew-label">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}