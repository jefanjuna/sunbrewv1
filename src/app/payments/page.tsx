import { PaymentDashboard } from '@/components/payment-dashboard';
import { listPaymentPosts } from '@/lib/repository';

export default async function PaymentsPage() {
  const payments = await listPaymentPosts();

  return <PaymentDashboard initialPayments={payments} />;
}