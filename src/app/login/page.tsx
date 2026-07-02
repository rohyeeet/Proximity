import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

const DEMO_ACCOUNTS = [
  { email: "rohit.singh@varaha.com", role: "Super Admin — every organization" },
  { email: "arun.kumar@varaha.com", role: "Org Admin — Varaha South" },
  { email: "sara.rao@varaha.com", role: "Reviewer (Lab Technician) — view-only Studio" },
  { email: "deepak.sharma@varaha.com", role: "Submitter (Field Surveyor) — view-only Studio" },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; from?: string }> }) {
  const { error, from } = await searchParams;

  async function loginAction(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    try {
      await signIn("credentials", { email, password, redirectTo: from || "/" });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/login?error=invalid${from ? `&from=${encodeURIComponent(from)}` : ""}`);
      }
      throw err;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-brand-500 text-[14px] font-bold text-white">P</div>
          <span className="text-lg font-semibold text-ink">Proximity</span>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <h1 className="mb-1 text-lg font-semibold text-ink">Sign in</h1>
          <p className="mb-5 text-sm text-ink-soft">Sign in to your organization&apos;s workspace.</p>

          {error && (
            <p className="mb-4 rounded-md border border-critical-text/30 bg-critical-bg px-3 py-2 text-[13px] text-critical-text">
              That email/password combination didn&apos;t work. Try again.
            </p>
          )}

          <form action={loginAction} className="flex flex-col gap-3">
            <div>
              <label htmlFor="email" className="mb-1 block text-[12px] font-medium text-ink-soft">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                placeholder="you@company.com"
                className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-2 text-[13.5px] text-ink outline-none focus:border-brand-500 placeholder:text-ink-soft/60"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-[12px] font-medium text-ink-soft">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-2 text-[13.5px] text-ink outline-none focus:border-brand-500"
              />
            </div>
            <Button type="submit" variant="primary" className="mt-1 w-full justify-center">
              Sign in
            </Button>
          </form>
        </div>

        <div className="mt-4 rounded-lg border border-dashed border-border-strong bg-surface/60 p-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">Demo accounts (seeded data)</p>
          <ul className="flex flex-col gap-1.5">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email} className="text-[12.5px] text-ink-soft">
                <span className="font-mono text-ink">{account.email}</span> — {account.role}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-ink-soft">
            Password for every seeded account: <span className="font-mono text-ink">demo1234</span>
          </p>
        </div>
      </div>
    </div>
  );
}
