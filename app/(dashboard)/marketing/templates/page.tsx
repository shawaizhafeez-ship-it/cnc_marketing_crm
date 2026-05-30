import Link from "next/link";
import { Suspense } from "react";
import { FileText, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SeedDefaultTemplatesButton } from "@/components/marketing/seed-default-templates-button";
import { TemplateListTable } from "@/components/marketing/template-list-table";
import { getTemplates } from "@/app/(dashboard)/marketing/templates/actions";
import { Button } from "@/components/ui/button";

type MarketingTemplatesPageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function MarketingTemplatesPage({
  searchParams,
}: MarketingTemplatesPageProps) {
  const params = await searchParams;
  const categoryFilter = params.category ?? "all";

  let templates: Awaited<ReturnType<typeof getTemplates>> = [];
  let error: string | null = null;

  try {
    templates = await getTemplates({
      category: categoryFilter,
      activeOnly: false,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load templates";
  }

  return (
    <>
      <PageHeader
        title="Marketing Templates"
        description="Create and manage HTML email templates with variable placeholders."
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/marketing/templates/new">
            <Plus className="h-4 w-4" />
            Create template
          </Link>
        </Button>
        <SeedDefaultTemplatesButton />
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {templates.length === 0 && !error ? (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="Create a template from scratch or insert the three default samples (product update, compliance news, monthly newsletter)."
          action={
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/marketing/templates/new">
                  <Plus className="h-4 w-4" />
                  Create template
                </Link>
              </Button>
              <SeedDefaultTemplatesButton />
            </div>
          }
        />
      ) : (
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <TemplateListTable
            templates={templates}
            categoryFilter={categoryFilter}
          />
        </Suspense>
      )}
    </>
  );
}
