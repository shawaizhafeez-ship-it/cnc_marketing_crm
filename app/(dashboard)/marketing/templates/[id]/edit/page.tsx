import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { TemplateForm } from "@/components/marketing/template-form";
import {
  getTemplate,
  updateTemplate,
} from "@/app/(dashboard)/marketing/templates/actions";
import { Button } from "@/components/ui/button";

type EditTemplatePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditMarketingTemplatePage({
  params,
}: EditTemplatePageProps) {
  const { id } = await params;

  let template: Awaited<ReturnType<typeof getTemplate>> | null = null;

  try {
    template = await getTemplate(id);
  } catch {
    notFound();
  }

  const boundUpdate = updateTemplate.bind(null, id);

  return (
    <>
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/marketing/templates">Back to templates</Link>
        </Button>
      </div>

      <PageHeader
        title={template.name}
        description="Edit template content, category, and preview with test variables."
      />

      <TemplateForm
        template={template}
        action={boundUpdate}
        submitLabel="Save changes"
      />
    </>
  );
}
