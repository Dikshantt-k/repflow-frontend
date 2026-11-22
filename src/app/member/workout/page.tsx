"use client";

import { useEffect, useState } from "react";
import { meApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { cx } from "@/components/ui";
import { EmptyTile, PageHeader, PageSpinner, Tile } from "@/components/member-ui";
import { IconDumbbell, IconReceipt } from "@/components/icons";
import type { DietPlan, MealType, Weekday, WorkoutPlan } from "@/types/api";

const WEEKDAY_ORDER: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEKDAY_LABELS: Record<Weekday, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };

function todayWeekday(): Weekday {
  // JS getDay(): 0 = Sunday ... 6 = Saturday
  return WEEKDAY_ORDER[(new Date().getDay() + 6) % 7]!;
}

/** Day-of-month for each weekday of the current week (Mon..Sun). */
function weekDates(): Record<Weekday, number> {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  return Object.fromEntries(
    WEEKDAY_ORDER.map((wd, i) => [wd, new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i).getDate()])
  ) as Record<Weekday, number>;
}

function CheckMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function MemberWorkoutPage() {
  const [view, setView] = useState<"workout" | "diet">("workout");
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState<Weekday>(todayWeekday());
  const today = todayWeekday();

  useEffect(() => {
    meApi.workout().then((res) => {
      setPlan(res.plan);
      setCompleted(new Set(res.completedExerciseIds));
      setLoading(false);
    });
    meApi.diet().then((res) => setDietPlan(res.plan));
  }, []);

  async function toggle(exerciseId: string) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });
    const res = await meApi.toggleExercise(exerciseId);
    setCompleted((prev) => {
      const next = new Set(prev);
      if (res.completed) next.add(exerciseId);
      else next.delete(exerciseId);
      return next;
    });
  }

  if (loading) return <PageSpinner />;

  const day = plan?.days.find((d) => d.weekday === activeDay);
  const dietDay = dietPlan?.days.find((d) => d.weekday === activeDay);
  const isToday = activeDay === today;
  const dates = weekDates();
  const doneToday = day && isToday ? day.exercises.filter((ex) => completed.has(ex._id)).length : 0;

  return (
    <>
      <PageHeader eyebrow={formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })} title="Workout & diet" />

      <div className="inline-flex self-start p-1 rounded-[14px] bg-surface" role="tablist">
        {(["workout", "diet"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cx("min-h-[38px] px-6 rounded-[10px] text-sm font-semibold transition", view === v ? "bg-ink text-surface" : "text-muted hover:text-ink")}
          >
            {v === "workout" ? "Workout" : "Diet"}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1 [scrollbar-width:none]">
        {WEEKDAY_ORDER.map((wd) => {
          const active = activeDay === wd;
          return (
            <button
              key={wd}
              type="button"
              onClick={() => setActiveDay(wd)}
              aria-pressed={active}
              className={cx(
                "flex-1 min-w-[58px] flex flex-col items-center justify-center py-2 rounded-[14px] transition",
                active ? "bg-accent text-on-accent" : "bg-surface hover:bg-line2"
              )}
            >
              <span className={cx("text-[11px] font-medium", active ? "text-on-accent/85" : "text-muted")}>{wd === today ? "Today" : WEEKDAY_LABELS[wd]}</span>
              <span className="text-lg font-bold leading-tight">{dates[wd]}</span>
            </button>
          );
        })}
      </div>

      {view === "workout" &&
        (!plan || plan.days.every((d) => d.exercises.length === 0) ? (
          <EmptyTile icon={<IconDumbbell size={24} />} title="No workout plan yet">
            Your trainer hasn&apos;t set up a workout plan for you yet. Check back soon.
          </EmptyTile>
        ) : !day || day.exercises.length === 0 ? (
          <EmptyTile icon={<IconDumbbell size={24} />} title="Rest day">
            No exercises set for {WEEKDAY_LABELS[activeDay]}. Recover well.
          </EmptyTile>
        ) : (
          <Tile className="gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-sans text-lg font-bold">{day.label || WEEKDAY_LABELS[activeDay]}</h2>
              {isToday && (
                <span className="px-2.5 py-1 rounded-full bg-accent-soft text-accent-ink text-xs font-semibold">
                  {doneToday} of {day.exercises.length} done
                </span>
              )}
            </div>
            <ul className="flex flex-col">
              {day.exercises.map((ex) => {
                const done = isToday && completed.has(ex._id);
                return (
                  <li key={ex._id} className="flex items-center gap-3.5 py-3 border-t border-line first:border-0">
                    {isToday ? (
                      <button
                        type="button"
                        onClick={() => toggle(ex._id)}
                        aria-pressed={done}
                        aria-label={done ? `Mark ${ex.name} not done` : `Mark ${ex.name} done`}
                        className={cx(
                          "w-7 h-7 flex-none rounded-full border-2 flex items-center justify-center transition",
                          done ? "bg-accent border-accent text-on-accent" : "border-line hover:border-accent"
                        )}
                      >
                        {done && <CheckMark />}
                      </button>
                    ) : (
                      <span className="w-7 h-7 flex-none rounded-full bg-bg flex items-center justify-center text-muted">
                        <IconDumbbell size={14} />
                      </span>
                    )}
                    <span className="flex flex-col min-w-0">
                      <span className={cx("font-semibold", done && "line-through text-muted")}>{ex.name}</span>
                      <span className="text-sm text-muted">
                        {[ex.sets ? `${ex.sets} sets` : null, ex.reps ? `${ex.reps} reps` : null].filter(Boolean).join(" · ")}
                        {ex.notes ? ` — ${ex.notes}` : ""}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Tile>
        ))}

      {view === "diet" &&
        (!dietPlan || dietPlan.days.every((d) => d.meals.every((m) => m.items.length === 0)) ? (
          <EmptyTile icon={<IconReceipt size={24} />} title="No diet plan yet">
            Your trainer hasn&apos;t set up a diet plan for you yet. Check back soon.
          </EmptyTile>
        ) : !dietDay || dietDay.meals.every((m) => m.items.length === 0) ? (
          <EmptyTile icon={<IconReceipt size={24} />} title="No meals set">
            Nothing planned for {WEEKDAY_LABELS[activeDay]}.
          </EmptyTile>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {MEAL_TYPES.map((type) => {
              const meal = dietDay.meals.find((m) => m.type === type);
              if (!meal || meal.items.length === 0) return null;
              const kcal = meal.items.reduce((sum, item) => sum + (item.calories ?? 0), 0);
              return (
                <Tile key={type} className="gap-2">
                  <div className="flex items-center justify-between">
                    <h2 className="font-sans text-base font-bold">{MEAL_LABELS[type]}</h2>
                    {kcal > 0 && <span className="text-xs font-semibold text-muted">{kcal} kcal</span>}
                  </div>
                  <ul className="flex flex-col">
                    {meal.items.map((item, i) => (
                      <li key={i} className="flex justify-between gap-3 py-2 border-t border-line first:border-0 text-sm">
                        <span>{item.name}</span>
                        <span className="text-muted whitespace-nowrap">{[item.quantity, item.calories ? `${item.calories} kcal` : null].filter(Boolean).join(" · ")}</span>
                      </li>
                    ))}
                  </ul>
                </Tile>
              );
            })}
          </div>
        ))}
    </>
  );
}
