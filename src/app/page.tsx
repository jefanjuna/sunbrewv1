import { HomeworkDashboard } from '@/components/homework-dashboard';
import { listHomeworkPosts } from '@/lib/repository';

export default async function HomeworkPage() {
  const homework = await listHomeworkPosts();

  return <HomeworkDashboard initialHomework={homework} />;
}