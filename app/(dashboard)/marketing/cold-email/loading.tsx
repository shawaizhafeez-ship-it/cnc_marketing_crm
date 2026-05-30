import { PageHeader } from "@/components/shared/page-header";

export default function ColdEmailLoading() {
  return (
    <>
      <PageHeader
        title="Cold Email"
        description="Loading cold email batches…"
      />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </>
  );
}
