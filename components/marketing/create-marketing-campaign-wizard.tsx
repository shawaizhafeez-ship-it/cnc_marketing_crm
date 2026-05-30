"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createMarketingCampaign,
  previewMarketingFilters,
  type CreateMarketingCampaignInput,
} from "@/app/(dashboard)/marketing/campaigns/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CAMPAIGN_TYPES,
  CAMPAIGN_TYPE_LABELS,
  SCHEDULE_TYPE_LABELS,
  type CampaignType,
  type TouchpointConfigInput,
  type TouchpointScheduleType,
} from "@/lib/marketing/campaign-types";
import type { MarketingFilters } from "@/lib/marketing/filter-certificates";
import { formatExpiryDisplay } from "@/lib/renewals/prepare-email-data";
import type { CertificateRow } from "@/lib/renewals/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TemplateOption = {
  id: string;
  name: string;
  category: string;
  subject: string;
  is_active: boolean;
};

type FilterOptions = {
  items: string[];
  companies: string[];
};

type CreateMarketingCampaignWizardProps = {
  filterOptions: FilterOptions;
  templates: TemplateOption[];
};

const STEPS = ["Filters & Preview", "Touchpoints", "Review & Create"];

function emptyTouchpoint(number: number): TouchpointConfigInput {
  return {
    touchpoint_number: number,
    template_id: "",
    schedule_type: "immediate",
    schedule_value: 7,
  };
}

export function CreateMarketingCampaignWizard({
  filterOptions,
  templates,
}: CreateMarketingCampaignWizardProps) {
  const [step, setStep] = useState(0);
  const [previewPending, startPreview] = useTransition();
  const [createPending, startCreate] = useTransition();

  const [filters, setFilters] = useState<MarketingFilters>({
    items: [],
    item_match: "exact",
    companies: [],
    exclude_done: true,
  });
  const [previewCerts, setPreviewCerts] = useState<CertificateRow[]>([]);
  const [previewSummary, setPreviewSummary] = useState({
    totalCertificates: 0,
    uniqueRecipients: 0,
    uniqueCompanies: 0,
  });

  const [touchpoints, setTouchpoints] = useState<TouchpointConfigInput[]>([
    emptyTouchpoint(1),
  ]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [campaignType, setCampaignType] = useState<CampaignType>("marketing");

  const [itemSearch, setItemSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");

  const filteredItemOptions = useMemo(
    () =>
      filterOptions.items.filter((item) =>
        item.toLowerCase().includes(itemSearch.toLowerCase())
      ),
    [filterOptions.items, itemSearch]
  );

  const filteredCompanyOptions = useMemo(
    () =>
      filterOptions.companies.filter((company) =>
        company.toLowerCase().includes(companySearch.toLowerCase())
      ),
    [filterOptions.companies, companySearch]
  );

  function toggleItem(item: string, checked: boolean) {
    setFilters((prev) => ({
      ...prev,
      items: checked
        ? [...prev.items, item]
        : prev.items.filter((value) => value !== item),
    }));
  }

  function toggleCompany(company: string, checked: boolean) {
    setFilters((prev) => ({
      ...prev,
      companies: checked
        ? [...prev.companies, company]
        : prev.companies.filter((value) => value !== company),
    }));
  }

  function runPreview(onSuccess?: () => void) {
    startPreview(async () => {
      const result = await previewMarketingFilters(filters);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setPreviewCerts(result.certificates);
      setPreviewSummary(result.summary);
      onSuccess?.();
    });
  }

  function updateTouchpoint(
    index: number,
    updates: Partial<TouchpointConfigInput>
  ) {
    setTouchpoints((prev) =>
      prev.map((touchpoint, i) =>
        i === index ? { ...touchpoint, ...updates } : touchpoint
      )
    );
  }

  function addTouchpoint() {
    if (touchpoints.length >= 10) return;
    setTouchpoints((prev) => [...prev, emptyTouchpoint(prev.length + 1)]);
  }

  function removeTouchpoint(index: number) {
    if (touchpoints.length <= 1) return;
    setTouchpoints((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((touchpoint, i) => ({
          ...touchpoint,
          touchpoint_number: i + 1,
        }))
    );
  }

  function goNext() {
    if (step === 0) {
      runPreview(() => {
        if (previewSummary.totalCertificates === 0 && !previewPending) {
          // previewSummary may be stale until state updates; check after fetch in callback
        }
        setStep(1);
      });
      return;
    }

    if (step === 1) {
      const missingTemplate = touchpoints.some((tp) => !tp.template_id);
      if (missingTemplate) {
        toast.error("Each touchpoint needs a template.");
        return;
      }
      setStep(2);
      return;
    }

    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function handleCreate() {
    if (!name.trim()) {
      toast.error("Campaign name is required.");
      return;
    }

    const payload: CreateMarketingCampaignInput = {
      name: name.trim(),
      description: description.trim(),
      campaign_type: campaignType,
      filters,
      touchpoints,
    };

    startCreate(async () => {
      const result = await createMarketingCampaign(payload);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  const projectedEmails = previewSummary.uniqueRecipients * touchpoints.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => index < step && setStep(index)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              index === step && "bg-primary text-primary-foreground",
              index < step && "cursor-pointer hover:bg-muted"
            )}
          >
            {index + 1}. {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Audience filters</CardTitle>
              <CardDescription>
                Select at least one ITEM or company. Certificates are grouped by
                recipient email when the campaign is created.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label>Filter by ITEM</Label>
                  <Select
                    value={filters.item_match}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        item_match: value as MarketingFilters["item_match"],
                      }))
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exact">Exact match</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder="Search items..."
                  value={itemSearch}
                  onChange={(event) => setItemSearch(event.target.value)}
                />
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
                  {filteredItemOptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No items found.</p>
                  ) : (
                    filteredItemOptions.map((item) => (
                      <label
                        key={item}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={filters.items.includes(item)}
                          onCheckedChange={(checked) =>
                            toggleItem(item, checked === true)
                          }
                        />
                        {item}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Filter by company (optional)</Label>
                <Input
                  placeholder="Search companies..."
                  value={companySearch}
                  onChange={(event) => setCompanySearch(event.target.value)}
                />
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
                  {filteredCompanyOptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No companies found.
                    </p>
                  ) : (
                    filteredCompanyOptions.map((company) => (
                      <label
                        key={company}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={filters.companies.includes(company)}
                          onCheckedChange={(checked) =>
                            toggleCompany(company, checked === true)
                          }
                        />
                        {company}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={filters.exclude_done}
                  onCheckedChange={(checked) =>
                    setFilters((prev) => ({
                      ...prev,
                      exclude_done: checked === true,
                    }))
                  }
                />
                Exclude certificates with ops_status = done
              </label>

              <Button
                type="button"
                variant="outline"
                onClick={() => runPreview()}
                disabled={previewPending}
              >
                {previewPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Loading preview...
                  </>
                ) : (
                  "Refresh preview"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Filtered preview</CardTitle>
              <CardDescription>
                {previewSummary.totalCertificates} certificates ·{" "}
                {previewSummary.uniqueRecipients} recipients ·{" "}
                {previewSummary.uniqueCompanies} companies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[520px] overflow-auto rounded-lg border">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left">Company</th>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-left">Certificate</th>
                      <th className="px-3 py-2 text-left">Expiry</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Ops</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewCerts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-8 text-center text-muted-foreground"
                        >
                          Run preview after selecting filters.
                        </td>
                      </tr>
                    ) : (
                      previewCerts.map((cert) => (
                        <tr key={cert.id} className="border-t">
                          <td className="px-3 py-2">{cert.company_name}</td>
                          <td className="px-3 py-2">{cert.item ?? "—"}</td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {cert.certificate_no}
                          </td>
                          <td className="px-3 py-2">
                            {formatExpiryDisplay(cert.expiry_date)}
                          </td>
                          <td className="px-3 py-2">{cert.recipient_email}</td>
                          <td className="px-3 py-2">{cert.ops_status || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Touchpoints</CardTitle>
            <CardDescription>
              Configure 1–10 touchpoints. Each recipient gets one email per
              touchpoint with all matching certificates merged in template
              variables.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {touchpoints.map((touchpoint, index) => (
              <div
                key={touchpoint.touchpoint_number}
                className="grid gap-4 rounded-lg border p-4 md:grid-cols-4"
              >
                <div>
                  <Label>Touchpoint</Label>
                  <p className="mt-2 font-medium">#{touchpoint.touchpoint_number}</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Template</Label>
                  <Select
                    value={touchpoint.template_id}
                    onValueChange={(value) =>
                      updateTouchpoint(index, { template_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <Select
                    value={touchpoint.schedule_type}
                    onValueChange={(value) =>
                      updateTouchpoint(index, {
                        schedule_type: value as TouchpointScheduleType,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SCHEDULE_TYPE_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {touchpoint.schedule_type === "custom_days" && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Days between touchpoints</Label>
                    <Input
                      type="number"
                      min={1}
                      value={touchpoint.schedule_value}
                      onChange={(event) =>
                        updateTouchpoint(index, {
                          schedule_value: Number.parseInt(
                            event.target.value || "1",
                            10
                          ),
                        })
                      }
                    />
                  </div>
                )}

                <div className="flex items-end justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={touchpoints.length <= 1}
                    onClick={() => removeTouchpoint(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addTouchpoint}
              disabled={touchpoints.length >= 10}
            >
              <Plus className="h-4 w-4" />
              Add touchpoint
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Campaign details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Name</Label>
                <Input
                  id="campaign-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="PPE Product Update Q2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign-type">Type</Label>
                <Select
                  value={campaignType}
                  onValueChange={(value) =>
                    setCampaignType(value as CampaignType)
                  }
                >
                  <SelectTrigger id="campaign-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {CAMPAIGN_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign-description">Description</Label>
                <Textarea
                  id="campaign-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ReviewRow
                label="Certificates"
                value={String(previewSummary.totalCertificates)}
              />
              <ReviewRow
                label="Recipients"
                value={String(previewSummary.uniqueRecipients)}
              />
              <ReviewRow
                label="Touchpoints"
                value={String(touchpoints.length)}
              />
              <ReviewRow
                label="Emails scheduled"
                value={String(projectedEmails)}
              />
              <ReviewRow
                label="ITEM filters"
                value={
                  filters.items.length > 0
                    ? `${filters.items.length} selected (${filters.item_match})`
                    : "None"
                }
              />
              <ReviewRow
                label="Company filters"
                value={
                  filters.companies.length > 0
                    ? String(filters.companies.length)
                    : "None"
                }
              />
              <ReviewRow
                label="Exclude done"
                value={filters.exclude_done ? "Yes" : "No"}
              />

              <div className="pt-2">
                <p className="mb-2 font-medium">Touchpoint plan</p>
                <ul className="space-y-1 text-muted-foreground">
                  {touchpoints.map((touchpoint) => {
                    const template = templates.find(
                      (entry) => entry.id === touchpoint.template_id
                    );
                    return (
                      <li key={touchpoint.touchpoint_number}>
                        TP{touchpoint.touchpoint_number}: {template?.name ?? "—"} ·{" "}
                        {SCHEDULE_TYPE_LABELS[touchpoint.schedule_type]}
                        {touchpoint.schedule_type === "custom_days"
                          ? ` (${touchpoint.schedule_value}d)`
                          : ""}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0 || createPending}
          onClick={() => setStep((current) => Math.max(current - 1, 0))}
        >
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            onClick={() => {
              if (step === 0) {
                if (filters.items.length === 0 && filters.companies.length === 0) {
                  toast.error("Select at least one ITEM or company filter.");
                  return;
                }
                startPreview(async () => {
                  const result = await previewMarketingFilters(filters);
                  if (result.error) {
                    toast.error(result.error);
                    return;
                  }
                  if (result.summary.totalCertificates === 0) {
                    toast.error("No certificates match the selected filters.");
                    return;
                  }
                  setPreviewCerts(result.certificates);
                  setPreviewSummary(result.summary);
                  setStep(1);
                });
                return;
              }
              goNext();
            }}
            disabled={previewPending}
          >
            {previewPending ? (
              <>
                <Loader2 className="animate-spin" />
                Checking...
              </>
            ) : (
              "Next"
            )}
          </Button>
        ) : (
          <Button type="button" onClick={handleCreate} disabled={createPending}>
            {createPending ? (
              <>
                <Loader2 className="animate-spin" />
                Creating...
              </>
            ) : (
              "Create campaign"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
