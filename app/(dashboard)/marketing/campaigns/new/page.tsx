import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { CreateMarketingCampaignWizard } from "@/components/marketing/create-marketing-campaign-wizard";
import {
  getMarketingFilterOptions,
  getMarketingTemplatesForCampaign,
} from "@/app/(dashboard)/marketing/campaigns/actions";
import { Button } from "@/components/ui/button";

export default async function NewMarketingCampaignPage() {
  let filterOptions = { items: [] as string[], companies: [] as string[] };
  let templates: Awaited<ReturnType<typeof getMarketingTemplatesForCampaign>> = [];
  let error: string | null = null;

  try {
    [filterOptions, templates] = await Promise.all([
      getMarketingFilterOptions(),
      getMarketingTemplatesForCampaign(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load campaign options";
  }

  return (
    <>
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/marketing/campaigns">Back to campaigns</Link>
        </Button>
      </div>

      <PageHeader
        title="Create Marketing Campaign"
        description="Filter your audience, configure touchpoints, and schedule grouped emails by recipient."
      />

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {templates.length === 0 && !error ? (
        <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
          No active marketing templates found.{" "}
          <Link href="/marketing/templates" className="underline">
            Create templates
          </Link>{" "}
          before launching a campaign.
        </div>
      ) : (
        <CreateMarketingCampaignWizard
          filterOptions={filterOptions}
          templates={templates}
        />
      )}
    </>
  );
}
