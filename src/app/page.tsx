import Link from "next/link";
import { Button, Card } from "@/components/ui";

const FEATURES = [
  {
    title: "Members & memberships",
    body: "Add members in seconds, sell plans by branch, and let end dates calculate themselves — monthly, daily or session-based.",
  },
  {
    title: "Payments, dues & GST receipts",
    body: "Record payments at the desk or online, track part-payments as dues, and hand over a proper GST tax invoice every time.",
  },
  {
    title: "Attendance & check-in",
    body: "Quick front-desk check-in with expired-plan and dues warnings built in, plus a daily log for every branch.",
  },
  {
    title: "Built for every branch",
    body: "Role-based access for owners, branch managers, front desk and trainers — scoped automatically to what they should see.",
  },
];

const STEPS = [
  { n: "1", title: "Set up your gym", body: "Add your branches and membership plans in a short guided setup." },
  { n: "2", title: "Add members", body: "Front desk adds members, takes payment, and a WhatsApp-ready receipt is generated." },
  { n: "3", title: "Run it daily", body: "Check-ins, renewals, dues and attendance tracked automatically across every branch." },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-6 py-5 max-w-[1100px] w-full mx-auto">
        <div className="font-display italic text-2xl font-extrabold text-accent">Repflow</div>
        <Link href="/login" className="font-semibold text-link">
          Sign in
        </Link>
      </header>

      <main className="flex-1">
        <section className="px-6 py-16 md:py-24 max-w-[1100px] mx-auto flex flex-col items-start gap-5">
          <h1 className="text-4xl md:text-6xl max-w-2xl">Run your gym at full pace.</h1>
          <p className="text-lg text-muted max-w-xl">
            Members, memberships, payments, GST receipts, attendance and dues — one system for every branch of your gym.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <Link href="/register">
              <Button variant="primary" className="text-base px-6">
                Start free trial
              </Button>
            </Link>
            <span className="text-sm text-muted">14-day free trial. No card required.</span>
          </div>
        </section>

        <section className="px-6 py-10 max-w-[1100px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <h2 className="text-xl">{f.title}</h2>
                <p className="text-muted">{f.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="px-6 py-16 max-w-[1100px] mx-auto">
          <h2 className="text-2xl mb-6">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col gap-2">
                <span className="w-9 h-9 flex items-center justify-center rounded-full bg-accent text-on-accent font-display font-bold">
                  {s.n}
                </span>
                <h3 className="font-semibold text-lg">{s.title}</h3>
                <p className="text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 py-16 max-w-[1100px] mx-auto">
          <Card className="items-center text-center gap-4 py-12 bg-accent-soft border-transparent">
            <h2 className="text-3xl">Ready to run your gym on Repflow?</h2>
            <Link href="/register">
              <Button variant="primary" className="text-base px-6">
                Start your free trial
              </Button>
            </Link>
          </Card>
        </section>
      </main>

      <footer className="px-6 py-8 text-center text-sm text-muted border-t border-line">
        <span className="font-display italic font-extrabold text-accent">Repflow</span> &middot; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
