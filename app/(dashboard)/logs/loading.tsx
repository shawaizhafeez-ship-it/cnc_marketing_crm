import { PageSkeleton } from "@/components/shared/page-skeleton";

export default function LogsLoading() {
  return <PageSkeleton stats={4} table />;
}
