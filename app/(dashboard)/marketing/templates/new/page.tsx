import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { TemplateForm } from "@/components/marketing/template-form";
import { createTemplate } from "@/app/(dashboard)/marketing/templates/actions";
import { Button } from "@/components/ui/button";

export default function NewMarketingTemplatePage() {
  return (
    <>
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/marketing/templates">Back to templates</Link>
        </Button>
      </div>

      <PageHeader
        title="Create template"
        description="Build a new marketing email template with HTML and variable placeholders."
      />

      <TemplateForm action={createTemplate} submitLabel="Create template" />
    </>
  );
}
