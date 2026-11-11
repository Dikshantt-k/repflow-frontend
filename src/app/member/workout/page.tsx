"use client";

import { useEffect, useState } from "react";
import { meApi } from "@/lib/api";
import { Card, Pill, Spinner } from "@/components/ui";
import type { DietPlan, MealType, Weekday, WorkoutPlan } from "@/types/api";

const WEEKDAY_ORDER: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEKDAY_LABELS: Record<Weekday, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };

function todayWeekday(): Weekday {
  // JS getDay(): 0 = Sunday ... 6 = Saturday
  return WEEKDAY_ORDER[(new Date().getDay() + 6) % 7];
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const day = plan?.days.find((d) => d.weekday === activeDay);
  const dietDay = dietPlan?.days.find((d) => d.weekday === activeDay);
  const isToday = activeDay === today;

  return (
    <div className="flex flex-col gap-3.5">
      <h1 className="text-2xl">Workout & diet</h1>

      <div className="flex gap-2">
        <Pill active={view === "workout"} onClick={() => setView("workout")}>
          Workout
        </Pill>
        <Pill active={view === "diet"} onClick={() => setView("diet")}>
          Diet
        </Pill>
      </div>

      <div className="flex flex-wrap gap-2">
        {WEEKDAY_ORDER.map((wd) => (
          <Pill key={wd} active={activeDay === wd} onClick={() => setActiveDay(wd)}>
            {WEEKDAY_LABELS[wd]}
            {wd === today ? " · Today" : ""}
          </Pill>
        ))}
      </div>

      {view === "workout" &&
        (!plan || plan.days.every((d) => d.exercises.length === 0) ? (
          <Card>
            <p className="text-muted">Your trainer hasn&apos;t set up a workout plan yet. Check back soon.</p>
          </Card>
        ) : (
          <Card>
            <h2 className="text-lg">{day?.label || WEEKDAY_LABELS[activeDay]}</h2>
            {!day || day.exercises.length === 0 ? (
              <p className="text-sm text-muted">Rest day — no exercises set.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {day.exercises.map((ex) => (
                  <li key={ex._id} className="flex items-start gap-3 border-t border-line2 pt-2.5 first:border-0 first:pt-0">
                    {isToday ? (
                      <input
                        type="checkbox"
                        checked={completed.has(ex._id)}
                        onChange={() => toggle(ex._id)}
                        className="w-[20px] h-[20px] mt-0.5 accent-accent flex-none"
                      />
                    ) : (
                      <span className="w-[20px] h-[20px] mt-0.5 flex-none" aria-hidden="true" />
                    )}
                    <span className="flex flex-col">
                      <span className={`font-semibold ${isToday && completed.has(ex._id) ? "line-through text-muted" : ""}`}>{ex.name}</span>
                      <span className="text-sm text-muted">
                        {[ex.sets ? `${ex.sets} sets` : null, ex.reps ? `${ex.reps} reps` : null].filter(Boolean).join(" · ")}
                        {ex.notes ? ` — ${ex.notes}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}

      {view === "diet" &&
        (!dietPlan || dietPlan.days.every((d) => d.meals.every((m) => m.items.length === 0)) ? (
          <Card>
            <p className="text-muted">Your trainer hasn&apos;t set up a diet plan yet. Check back soon.</p>
          </Card>
        ) : (
          <Card>
            <h2 className="text-lg">{WEEKDAY_LABELS[activeDay]}</h2>
            {!dietDay || dietDay.meals.every((m) => m.items.length === 0) ? (
              <p className="text-sm text-muted">No meals set for this day.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {MEAL_TYPES.map((type) => {
                  const meal = dietDay.meals.find((m) => m.type === type);
                  if (!meal || meal.items.length === 0) return null;
                  return (
                    <div key={type} className="border-t border-line2 pt-2.5 first:border-0 first:pt-0">
                      <p className="font-semibold">{MEAL_LABELS[type]}</p>
                      <ul className="flex flex-col gap-0.5 mt-0.5">
                        {meal.items.map((item, i) => (
                          <li key={i} className="text-sm text-muted">
                            {item.name}
                            {item.quantity ? ` · ${item.quantity}` : ""}
                            {item.calories ? ` · ${item.calories} kcal` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ))}
    </div>
  );
}
