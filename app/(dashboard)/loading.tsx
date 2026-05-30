import { PageSkeleton } from "@/components/shared/page-skeleton";

export default function DashboardLoading() {
  return <PageSkeleton stats={4} table cards={2} />;
}
