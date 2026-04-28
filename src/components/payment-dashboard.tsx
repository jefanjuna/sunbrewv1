'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { deletePaymentAction, submitPaymentAction, togglePaymentChecklistAction, updatePaymentAction } from '@/app/actions';
import { formatCurrency, formatPaymentStopwatch, formatRelativePostDate, parsePriceToCents } from '@/lib/format';
import { paymentParticipantNames, type PaymentFormValues, type PaymentParticipantName, type PaymentPost, type PaymentChecklistEntry } from '@/lib/types';

interface PaymentDashboardProps {
  initialPayments: PaymentPost[];
}

const defaultPaymentForm = (): PaymentFormValues => ({
  title: '',
  description: '',
  price: ''
});

function countPaid(checklist: PaymentChecklistEntry[]): number {
  return checklist.filter((entry) => entry.isPaid).length;
}

function countCollectedCents(payment: PaymentPost): number {
  return countPaid(payment.checklist) * payment.priceCents;
}

function paymentFormFromPost(payment: PaymentPost): PaymentFormValues {
  return {
    title: payment.title,
    description: payment.description ?? '',
    price: (payment.priceCents / 100).toFixed(2)
  };
}

export function PaymentDashboard({ initialPayments }: PaymentDashboardProps) {
  const [payments, setPayments] = useState(initialPayments);
  const [form, setForm] = useState<PaymentFormValues>(defaultPaymentForm);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPaymentId) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedPaymentId(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedPaymentId]);

  const paymentStats = useMemo(() => {
    return {
      items: payments.length,
      collected: payments.reduce((accumulator, payment) => accumulator + countCollectedCents(payment), 0),
      students: paymentParticipantNames.length
    };
  }, [payments]);

  const formPriceCents = parsePriceToCents(form.price);
  const canSubmitPayment = Boolean(form.title.trim()) && Number.isFinite(formPriceCents) && formPriceCents > 0;

  async function handlePaymentSubmit() {
    if (!canSubmitPayment) {
      setError('Title and price are required before posting.');
      return;
    }

    setPending(true);
    setError(null);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        priceCents: formPriceCents
      };

      if (editingPaymentId) {
        const updated = await updatePaymentAction({ id: editingPaymentId, ...payload });
        setPayments((current) => current.map((payment) => (payment.id === updated.id ? updated : payment)));
        setEditingPaymentId(null);
      } else {
        const created = await submitPaymentAction(payload);
        setPayments((current) => [created, ...current]);
      }

      setForm(defaultPaymentForm());
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to save payment post right now.');
    } finally {
      setPending(false);
    }
  }

  function startPaymentEdit(payment: PaymentPost) {
    setSelectedPaymentId(null);
    setEditingPaymentId(payment.id);
    setForm(paymentFormFromPost(payment));
    setError(null);
  }

  function cancelPaymentEdit() {
    setEditingPaymentId(null);
    setForm(defaultPaymentForm());
    setError(null);
  }

  async function handlePaymentDelete(payment: PaymentPost) {
    if (!window.confirm('Delete this payment post?')) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      await deletePaymentAction({ id: payment.id });
      setPayments((current) => current.filter((entry) => entry.id !== payment.id));

      if (selectedPaymentId === payment.id) {
        setSelectedPaymentId(null);
      }

      if (editingPaymentId === payment.id) {
        cancelPaymentEdit();
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to delete payment post right now.');
    } finally {
      setPending(false);
    }
  }

  async function handleChecklistToggle(paymentPostId: string, name: PaymentParticipantName, nextValue: boolean) {
    const updated = await togglePaymentChecklistAction({ paymentPostId, name, isPaid: nextValue });
    setPayments((current) => current.map((payment) => (payment.id === updated.id ? updated : payment)));
  }

  const selectedPayment = useMemo(() => payments.find((payment) => payment.id === selectedPaymentId) ?? null, [payments, selectedPaymentId]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="sunbrew-panel overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="sunbrew-label">Payments</p>
            <h1 className="text-3xl font-semibold text-white sm:text-5xl">Payments overview</h1>
            <p className="sunbrew-muted max-w-2xl">Create payment posts easily. Open a card to review the checklist of names and mark payments yourself.</p>
          </div>

          <div className="flex flex-wrap gap-3 lg:justify-end">
            <StatCard label="ITEMS" value={paymentStats.items} accent="from-orange-400/20 to-amber-400/10" />
            <StatCard label="COLLECTED" value={formatCurrency(paymentStats.collected)} accent="from-cyan-400/20 to-sky-400/10" wide />
            <StatCard label="STUDENTS" value={paymentStats.students} accent="from-white/10 to-white/5" />
          </div>
        </div>
      </section>

      <section className="sunbrew-panel p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="sunbrew-label">Payment post</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{editingPaymentId ? 'Edit payment post' : 'Create payment post'}</h2>
          </div>
          <p className="max-w-lg text-sm text-slate-300">
            Create payment posts with a title and price. Optional descriptions for adding more context.
          </p>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="sunbrew-label" htmlFor="payment-title">Title *</label>
              <input
                id="payment-title"
                className="sunbrew-input"
                placeholder="e.g. GP lecture notes"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="sunbrew-label" htmlFor="payment-description">Description</label>
              <textarea
                id="payment-description"
                className="sunbrew-textarea"
                placeholder="Optional details for the collection"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="sunbrew-label" htmlFor="payment-price">Price (SGD) *</label>
              <div className="flex items-stretch overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 focus-within:border-orange-400/60 focus-within:ring-2 focus-within:ring-orange-400/20">
                <span className="flex items-center border-r border-white/10 px-4 text-sm font-semibold text-slate-300">S$</span>
                <input
                  id="payment-price"
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                  placeholder="0.00"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                />
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Posts automatically generate the class name checklist once they are created.
            </div>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-400">Required fields are title and price.</p>
            {editingPaymentId ? (
              <button className="sunbrew-button-ghost" type="button" onClick={cancelPaymentEdit} disabled={pending}>
                Cancel edit
              </button>
            ) : null}
          </div>
          <button className="sunbrew-button-primary disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={!canSubmitPayment || pending} onClick={handlePaymentSubmit}>
            {pending ? 'Saving...' : editingPaymentId ? 'Save changes' : 'Post payment item'}
          </button>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {payments.length > 0 ? (
          payments.map((payment) => <PaymentCard key={payment.id} payment={payment} onSelect={setSelectedPaymentId} />)
        ) : (
          <div className="sunbrew-panel p-6 text-sm text-slate-400 md:col-span-2 xl:col-span-3">No payment posts match the current board yet.</div>
        )}
      </section>

      <AnimatePresence>
        {selectedPayment ? (
          <PaymentModal
            payment={selectedPayment}
            onClose={() => setSelectedPaymentId(null)}
            onEdit={startPaymentEdit}
            onDelete={handlePaymentDelete}
            onToggleChecklist={handleChecklistToggle}
            disabled={pending}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, accent, wide = false }: { label: string; value: number | string; accent: string; wide?: boolean }) {
  return (
    <div className={`rounded-[1.25rem] border border-white/10 bg-gradient-to-br ${accent} p-4 shadow-soft flex-1 ${wide ? 'min-w-max' : 'min-w-[11rem]'}`}>
      <p className="sunbrew-label">{label}</p>
      <p className="mt-2 whitespace-nowrap text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function PaymentCard({ payment, onSelect }: { payment: PaymentPost; onSelect: (value: string) => void }) {
  const paidCount = countPaid(payment.checklist);
  const collectedCents = countCollectedCents(payment);

  return (
    <motion.button
      layoutId={`payment-card-${payment.id}`}
      type="button"
      onClick={() => onSelect(payment.id)}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 240, damping: 24 }}
      className="sunbrew-card flex h-full flex-col p-5 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="sunbrew-label">Payment post</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{payment.title}</h3>
        </div>
        <span className="sunbrew-chip whitespace-nowrap text-orange-100">{formatCurrency(payment.priceCents)}</span>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-300">
        {payment.description?.trim() ? payment.description : 'No description added yet.'}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 text-xs text-slate-400">
        <span>{formatCurrency(collectedCents)} collected</span>
        <span>Created {formatRelativePostDate(payment.createdAt)}</span>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-cyan-300" style={{ width: `${(paidCount / payment.checklist.length) * 100}%` }} />
      </div>
    </motion.button>
  );
}

function PaymentModal({
  payment,
  onClose,
  onEdit,
  onDelete,
  onToggleChecklist,
  disabled
}: {
  payment: PaymentPost;
  onClose: () => void;
  onEdit: (paymentPost: PaymentPost) => void;
  onDelete: (paymentPost: PaymentPost) => Promise<void>;
  onToggleChecklist: (paymentPostId: string, name: PaymentParticipantName, nextValue: boolean) => Promise<void>;
  disabled: boolean;
}) {
  const paidCount = countPaid(payment.checklist);
  const collectedCents = countCollectedCents(payment);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 sm:px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.button className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" type="button" aria-label="Close payment modal" onClick={onClose} />

      <motion.div
        layoutId={`payment-card-${payment.id}`}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="sunbrew-panel relative z-10 flex h-[86vh] w-full max-w-4xl flex-col overflow-hidden p-6 sm:p-8"
      >
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="sunbrew-label">Payment details</p>
            <h3 className="mt-2 text-3xl font-semibold text-white">{payment.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{payment.description?.trim() ? payment.description : 'No description was added for this payment post.'}</p>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span className="sunbrew-chip whitespace-nowrap text-orange-100">{formatCurrency(payment.priceCents)}</span>
            <div className="flex flex-wrap items-center gap-2">
              <button className="sunbrew-button-ghost" type="button" onClick={() => onEdit(payment)} disabled={disabled}>
                Edit
              </button>
              <button
                className="sunbrew-button-ghost border-rose-400/25 bg-rose-400/10 text-rose-100 hover:border-rose-300/40 hover:bg-rose-400/20"
                type="button"
                onClick={() => {
                  void onDelete(payment);
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
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <DetailPill label="Created" value={formatRelativePostDate(payment.createdAt)} />
          <DetailPill label="Collected" value={formatCurrency(collectedCents)} />
          <DetailPill label="Students" value={`${paymentParticipantNames.length} classmates`} />
        </div>

        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-cyan-300" style={{ width: `${(paidCount / payment.checklist.length) * 100}%` }} />
        </div>

        <div className="mt-5 flex flex-1 min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/5">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="sunbrew-label">Checklist</p>
              <p className="mt-1 text-sm text-slate-300">Tick a name when they pay. The stopwatch shows how long it took.</p>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {payment.checklist.map((entry) => (
                <ChecklistRow
                  key={entry.id}
                  paymentId={payment.id}
                  entry={entry}
                  onToggle={onToggleChecklist}
                  payment={payment}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ChecklistRow({
  paymentId,
  entry,
  onToggle,
  payment
}: {
  paymentId: string;
  entry: PaymentChecklistEntry;
  onToggle: (paymentPostId: string, name: PaymentParticipantName, nextValue: boolean) => Promise<void>;
  payment: PaymentPost;
}) {
  const stopwatch = formatPaymentStopwatch(payment, entry.paidAt);

  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 240, damping: 24 }}
      className={`flex items-center justify-between gap-3 rounded-[1.1rem] border px-4 py-4 text-left transition ${entry.isPaid ? 'border-cyan-400/25 bg-cyan-400/10' : 'border-white/10 bg-slate-950/60 hover:border-white/20 hover:bg-white/10'}`}
      onClick={() => onToggle(paymentId, entry.name, !entry.isPaid)}
    >
      <div className="flex items-center gap-3">
        <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${entry.isPaid ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-white/20 bg-transparent text-transparent'}`}>
          ✓
        </span>
        <div>
          <p className={`text-sm font-medium ${entry.isPaid ? 'text-white' : 'text-slate-200'}`}>{entry.name}</p>
          <p className="text-xs text-slate-400">{entry.isPaid ? 'Marked as paid' : 'Tap to mark as paid'}</p>
        </div>
      </div>

      {entry.isPaid ? <span className="sunbrew-chip whitespace-nowrap text-cyan-100">{stopwatch}</span> : <span className="text-xs text-slate-500">Pending</span>}
    </motion.button>
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