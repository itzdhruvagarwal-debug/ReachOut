import { AdminAnalyticsService } from "@/services/admin-analytics.service";
import AdminAnalyticsView from "@/components/analytics/AdminAnalyticsView";
import { auth } from "@/lib/auth";
import { requireActiveAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Platform Analytics | Admin",
  description: "Real-time monitoring and growth metrics",
};

export default async function AdminAnalyticsPage() {
  const session = await auth();

  try {
    await requireActiveAdmin(session?.user);
  } catch {
    redirect("/dashboard");
  }

  const data = await AdminAnalyticsService.getDashboardStats();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Platform Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time escrow volume, platform GMV, growth velocity, and system health.
          </p>
        </div>
      </div>

      <AdminAnalyticsView data={data} />
    </div>
  );
}
