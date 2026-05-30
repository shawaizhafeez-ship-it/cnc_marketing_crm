import { PageHeader } from "@/components/shared/page-header";
import { ManualEmailComposer } from "@/components/manual-email/manual-email-composer";

export default function ManualEmailPage() {
  return (
    <>
      <PageHeader
        title="Manual Email"
        description="Compose and send one-off emails outside of campaigns."
      />
      <ManualEmailComposer />
    </>
  );
}
