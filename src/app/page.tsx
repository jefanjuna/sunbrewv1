import { HomeworkDashboard } from '@/components/homework-dashboard';
import { listHomeworkPosts } from '@/lib/repository';

export const dynamic = 'force-dynamic';

export default async function HomeworkPage() {
  const homework = await listHomeworkPosts();

  return <HomeworkDashboard initialHomework={homework} />;
}