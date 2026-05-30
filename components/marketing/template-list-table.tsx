"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Eye, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTemplate } from "@/app/(dashboard)/marketing/templates/actions";
import { TemplatePreviewPanel } from "@/components/marketing/template-preview-panel";
import { DataTable } from "@/components/ui/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORY_LABELS,
  type MarketingTemplate,
} from "@/lib/marketing/template-types";

type TemplateListTableProps = {
  templates: MarketingTemplate[];
  categoryFilter: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function DeleteTemplateButton({ template }: { template: MarketingTemplate }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTemplate(template.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.success ?? "Template deleted.");
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete template?</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{template.name}&quot; will be marked inactive and hidden from
            campaign creation.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={handleDelete}
          >
            {pending ? <Loader2 className="animate-spin" /> : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PreviewTemplateDialog({ template }: { template: MarketingTemplate }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
        </DialogHeader>
        <TemplatePreviewPanel
          subject={template.subject}
          htmlContent={template.html_content}
        />
      </DialogContent>
    </Dialog>
  );
}

export function TemplateListTable({
  templates,
  categoryFilter,
}: TemplateListTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateCategory(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("category");
    } else {
      params.set("category", value);
    }
    router.push(`/marketing/templates?${params.toString()}`);
  }

  const columns: ColumnDef<MarketingTemplate>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{row.original.name}</p>
          {row.original.description && (
            <p className="text-xs text-muted-foreground">
              {row.original.description}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {TEMPLATE_CATEGORY_LABELS[row.original.category]}
        </Badge>
      ),
    },
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => (
        <span className="max-w-[240px] truncate">{row.original.subject}</span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "default" : "outline"}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      cell: ({ row }) => formatDate(row.original.updated_at),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <PreviewTemplateDialog template={row.original} />
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/marketing/templates/${row.original.id}/edit`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <DeleteTemplateButton template={row.original} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={categoryFilter} onValueChange={updateCategory}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {TEMPLATE_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {TEMPLATE_CATEGORY_LABELS[category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {templates.length} template{templates.length === 1 ? "" : "s"}
        </p>
      </div>

      <DataTable
        columns={columns}
        data={templates}
        emptyMessage="No templates found. Create one or insert the default samples."
      />
    </div>
  );
}
