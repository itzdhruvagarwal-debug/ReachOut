import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FileText, Shield, ArrowRight, Clock, Mail, ChevronRight } from "lucide-react";

interface LegalSection {
  id: string;
  heading: string;
}

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  description: string;
  sections: LegalSection[];
  children: React.ReactNode;
}

const LEGAL_DOCUMENTS = [
  { title: "Terms of Service", href: "/terms" },
  { title: "Privacy Policy", href: "/privacy" },
  { title: "Refund & Cancellation", href: "/refund" },
  { title: "Cookie Policy", href: "/cookie-policy" },
  { title: "Legal Center Hub", href: "/legal" },
];

export function LegalLayout({ title, lastUpdated, description, sections, children }: LegalLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        {/* ── Document Hero ─────────────────────────────────── */}
        <section className="border-b border-border/40 pb-12 mb-12">
          <div className="container max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
              <Link href="/legal" className="hover:text-foreground transition-colors">
                Legal Center
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
              <span className="text-foreground font-medium">{title}</span>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
              <Shield className="w-3.5 h-3.5" />
              <span>Official Regulatory Document</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight mb-4">
              {title}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed mb-4">
              {description}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Last updated: <strong className="text-foreground font-semibold">{lastUpdated}</strong></span>
            </div>
          </div>
        </section>

        {/* ── Document Body & Sidebar ──────────────────────── */}
        <section>
          <div className="container max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 items-start">
              {/* Content */}
              <article className="min-w-0 prose prose-neutral dark:prose-invert max-w-none text-muted-foreground text-sm sm:text-base leading-relaxed">
                {children}
              </article>

              {/* Sidebar TOC */}
              <aside className="space-y-6 lg:sticky lg:top-28">
                {/* Table of contents */}
                {sections.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      <span>On This Page</span>
                    </p>
                    <nav className="space-y-1">
                      {sections.map((s) => (
                        <a
                          key={s.id}
                          href={`#${s.id}`}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors block py-1 line-clamp-1"
                        >
                          {s.heading}
                        </a>
                      ))}
                    </nav>
                  </div>
                )}

                {/* All Legal Documents Quick Switcher */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    All Legal Policies
                  </p>
                  <ul className="space-y-1.5">
                    {LEGAL_DOCUMENTS.map((doc) => (
                      <li key={doc.href}>
                        <Link
                          href={doc.href}
                          className={`text-xs block py-1 transition-colors flex items-center justify-between ${
                            doc.title === title
                              ? "text-primary font-bold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span>{doc.title}</span>
                          {doc.title === title && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Grievance & Questions */}
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-xs text-muted-foreground space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Mail className="w-4 h-4 text-primary" />
                    <span>Legal Grievance</span>
                  </div>
                  <p>
                    For regulatory notices, DPDP compliance, or formal disputes:
                  </p>
                  <a
                    href="mailto:legal@vyaparmedia.in"
                    className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                  >
                    legal@vyaparmedia.in <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

/* ── Reusable Section Block ──────────────────────────────── */
export function LegalSection({
  id,
  heading,
  children,
  highlight,
}: {
  id: string;
  heading: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-28 mb-10 ${
        highlight
          ? "rounded-2xl border border-primary/20 bg-primary/5 p-6"
          : ""
      }`}
    >
      <h2 className="text-xl font-bold text-foreground mb-4">
        {heading}
      </h2>
      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
}
