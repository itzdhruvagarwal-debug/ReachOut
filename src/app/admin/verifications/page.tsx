import { AdminService } from "@/services/admin.service";
import VerificationQueue from "@/components/admin/VerificationQueue";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Verification Queue | Admin",
  description: "Review pending KYC requests from influencers and brands",
};

export default async function AdminVerificationsPage() {
  // Call service directly on the server to prevent port-binding failures and loopback request overhead
  const pendingUsers = await AdminService.getVerificationQueue();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-verified/10 border border-verified-border flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-verified" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Verification Queue
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage and review pending KYC requests from influencers and brands.
          </p>
        </div>
      </div>

      <VerificationQueue pendingUsers={pendingUsers} isNarrow={true} />
    </div>
  );
}
