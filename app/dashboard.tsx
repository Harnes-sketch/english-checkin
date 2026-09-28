"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, ExternalLink, RefreshCw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import plan from "./plan.json";
import { useWebMcp } from "./use-webmcp";

type Day = (typeof plan)[number];
type Checkin = { date: string; completed: boolean; minutes: number; note: string; updatedAt: string };
type StoredMonths = Record<string, Record<string, Checkin>>;

const months = ["2026-09", "2026-10", "2026-11"];
const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
const dayByDate = new Map(plan.map((day) => [day.date, day]));
const resources: Record<string, { title: string; url: string }> = {
  "2026-10-02": { title: "打开业务访谈练习", url: "https://learnenglish.britishcouncil.org/free-resources/listening/b2/business-interview" },
  "2026-10-08": { title: "打开邮件练习", url: "https://learnenglish.britishcouncil.org/free-resources/business/english-emails/unit-5-making-arrangements" },
  "2026-10-09": { title: "打开业务访谈练习", url: "https://learnenglish.britishcouncil.org/free-resources/listening/b2/business-interview" },
  "2026-10-12": { title: "打开说明问题练习", url: "https://learnenglish.britishcouncil.org/free-resources/speaking/b2/dealing-problem" },
  "2026-10-23": { title: "打开 B2 听力材料", url: "https://learnenglish.britishcouncil.org/free-resources/listening/b2" },
  "2026-11-02": { title: "打开讨论意见练习", url: "https://learnenglish.britishcouncil.org/free-resources/speaking/b2" },
  "2026-11-13": { title: "打开面试视频练习", url: "https://learnenglish.britishcouncil.org/free-resources/business/youre-hired" },
  "2026-11-20": { title: "打开 B2 听力材料", url: "https://learnenglish.britishcouncil.org/free-resources/listening/b2" },
};

function shanghaiToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function chooseInitialDate(today: string): string {
  if (today < plan[0].date) return plan[0].date;
  if (today > plan[plan.length - 1].date) return plan[plan.length - 1].date;
  return today;
}

function dateLabel(date: string): string {
  const d = dayByDate.get(date);
  return `${Number(date.slice(5, 7))} 月 ${Number(date.slice(8, 10))} 日${d ? ` · 周${d.weekday}` : ""}`;
}

function monthLabel(month: string): string {
  return `${month.slice(0, 4)} 年 ${Number(month.slice(5))} 月`;
}

function monthCalendar(month: string): (string | null)[] {
  const [year, number] = month.split("-").map(Number);
  const offset = (new Date(year, number - 1, 1).getDay() + 6) % 7;
  const count = new Date(year, number, 0).getDate();
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let i = 1; i <= count; i++) cells.push(`${month}-${String(i).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

function checkinMap(rows: Checkin[]): Record<string, Checkin> {
  return Object.fromEntries(rows.map((row) => [row.date, row]));
}

export default function Dashboard({ todayIso }: { todayIso: string }) {
  const [today, setToday] = useState(todayIso);
  const [selectedDate, setSelectedDate] = useState(() => chooseInitialDate(todayIso));
  const [month, setMonth] = useState(() => chooseInitialDate(todayIso).slice(0, 7));
  const [storedMonths, setStoredMonths] = useState<StoredMonths>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadNonce, setLoadNonce] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [draftMinutes, setDraftMinutes] = useState(0);

  const handleWebMcpSave = useCallback((record: Checkin) => {
    const targetMonth = record.date.slice(0, 7);
    setMonth(targetMonth);
    setSelectedDate(record.date);
    setStoredMonths((previous) => ({
      ...previous,
      [targetMonth]: { ...(previous[targetMonth] ?? {}), [record.date]: record },
    }));
    setSaveMessage("已保存打卡");
  }, []);
  useWebMcp(handleWebMcpSave);

  useEffect(() => {
    const timer = window.setInterval(() => setToday(shanghaiToday()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    fetch(`/api/checkins?month=${month}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "记录无法读取");
        return body as { checkins: Checkin[] };
      })
      .then((body) => setStoredMonths((previous) => ({ ...previous, [month]: checkinMap(body.checkins) })))
      .catch((error) => { if (error.name !== "AbortError") setLoadError(error.message || "记录无法读取"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [month, loadNonce]);

  const records = storedMonths[month] ?? {};
  const selectedDay = dayByDate.get(selectedDate);
  const selectedRecord = records[selectedDate];
  const canCheckIn = Boolean(selectedDay && selectedDay.minutes > 0 && selectedDate <= today);

  useEffect(() => {
    setDraftNote(selectedRecord?.note ?? "");
    setDraftMinutes(selectedRecord?.minutes || selectedDay?.minutes || 0);
    setSaveMessage("");
  }, [selectedDate, selectedRecord?.updatedAt, selectedDay?.minutes]);

  const monthDays = useMemo(() => plan.filter((day) => day.date.startsWith(month) && day.minutes > 0), [month]);
  const elapsedDays = monthDays.filter((day) => day.date <= today);
  const completedDays = monthDays.filter((day) => records[day.date]?.completed);
  const missedDays = monthDays.filter((day) => day.date < today && !records[day.date]?.completed);
  const minutesCompleted = completedDays.reduce((total, day) => total + (records[day.date]?.minutes ?? 0), 0);
  const calendarCells = useMemo(() => monthCalendar(month), [month]);
  const weeklyRows = Array.from({ length: calendarCells.length / 7 }, (_, index) => {
    const dates = calendarCells.slice(index * 7, index * 7 + 7).filter((value): value is string => Boolean(value));
    const planned = dates.filter((date) => (dayByDate.get(date)?.minutes ?? 0) > 0 && date <= today);
    const done = planned.filter((date) => records[date]?.completed).length;
    return { label: `第 ${index + 1} 周`, planned: planned.length, done };
  }).filter((row) => row.planned > 0);
  const activity = Object.values(records)
    .filter((row) => row.completed || row.note.trim())
    .sort((a, b) => b.date.localeCompare(a.date));

  async function persist(completed: boolean) {
    if (!canCheckIn || saving || loading || loadError) return;
    const minutes = Number(draftMinutes);
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 240 || (completed && minutes === 0)) {
      setSaveMessage("请填写 1—240 分钟的实际练习时长。");
      return;
    }
    setSaving(true);
    setSaveMessage("");
    try {
      const response = await fetch("/api/checkins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, completed, minutes, note: draftNote }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "保存失败");
      const checkin = body.checkin as Checkin;
      setStoredMonths((previous) => ({
        ...previous,
        [month]: { ...(previous[month] ?? {}), [selectedDate]: checkin },
      }));
      setSaveMessage(completed ? "已保存打卡" : "已保存记录");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  function goToMonth(direction: -1 | 1) {
    const next = months[months.indexOf(month) + direction];
    if (!next) return;
    setMonth(next);
    const first = plan.find((day) => day.date.startsWith(next) && day.minutes > 0);
    setSelectedDate(today.startsWith(next) ? today : first?.date ?? `${next}-01`);
    setSaveMessage("");
  }

  function selectDate(date: string) {
    setSelectedDate(date);
    setSaveMessage("");
  }

  const displayToday = selectedDate === today;
  const selectedIsRest = selectedDay?.minutes === 0;
  const resource = resources[selectedDate];
  const firstStep = selectedDay?.steps.split("；")[0] ?? "";

  return (
    <main className="min-h-screen">
      <header className="border-b border-[#efdee2] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#b54569] text-white"><Check className="size-5" strokeWidth={3} /></span>
            <span className="text-[1.05rem] font-bold tracking-tight">英语打卡</span>
          </div>
          <span className="rounded-full bg-[#eaf6ef] px-3 py-1 text-sm font-medium text-[#286354]">9 月 28 日—11 月 22 日</span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 pb-16 pt-9 sm:px-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-[#933955]">{dateLabel(selectedDate)}{selectedDay ? ` · 第 ${selectedDay.week} 周` : ""}</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{displayToday ? "今天，练一件事。" : "这一天，做了什么？"}</h1>
          </div>
          {selectedDate !== today && today >= plan[0].date && today <= plan[plan.length - 1].date && (
            <Button variant="outline" className="h-10 rounded-xl border-[#dfc8d0] bg-white text-base" onClick={() => { setMonth(today.slice(0, 7)); selectDate(today); }}>回到今天</Button>
          )}
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.36fr)_minmax(350px,1fr)]">
          <section className="overflow-hidden rounded-[1.35rem] border border-[#ebdfe2] bg-white shadow-[0_16px_42px_rgba(115,65,83,.07)]">
            <div className="border-b border-[#f0e2e5] bg-[#fff0f3] px-6 py-5 sm:px-8">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-[#933955]">
                <span className="rounded-full bg-white px-3 py-1">{displayToday ? "今日任务" : "当天任务"}</span>
                {selectedDay && selectedDay.minutes > 0 && <span className="flex items-center gap-1.5"><Clock3 className="size-4" />计划 {selectedDay.minutes} 分钟</span>}
              </div>
              <h2 className="text-[1.65rem] font-bold tracking-tight">{selectedDay?.title ?? "没有安排任务"}</h2>
              <p className="mt-2 text-base leading-7 text-[#695c66]">
                {selectedIsRest ? "这一天留给休息。" : selectedDay ? firstStep : "可以切换月份，查看计划内的练习。"}
              </p>
            </div>

            {selectedDay && selectedDay.minutes > 0 && (
              <div className="px-6 py-6 sm:px-8">
                <details className="mb-5 rounded-2xl border border-[#eedee2] bg-[#fffbfa] p-5">
                  <summary className="cursor-pointer text-base font-semibold text-[#8e3552]">展开完整做法与验收</summary>
                  <p className="mt-4 text-base leading-7">{selectedDay.steps}</p>
                  <p className="mt-3 border-t border-[#eedee2] pt-3 text-base leading-7"><strong>做到这一步：</strong>{selectedDay.criterion}</p>
                </details>
                {resource && <a className="mb-5 inline-flex items-center gap-1.5 text-base font-semibold text-[#b54569] underline-offset-4 hover:underline" href={resource.url} target="_blank" rel="noopener noreferrer">{resource.title}<ExternalLink className="size-4" /></a>}

                {selectedDate > today ? (
                  <p className="rounded-2xl border border-[#eedee2] bg-[#fffbfa] px-5 py-4 text-base text-[#6f626b]">这一天还没到，届时可以在这里打卡。</p>
                ) : (
                  <div className="space-y-4">
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#e6bfcc] bg-[#fff6f7] px-5 py-4 text-base font-semibold">
                      <Checkbox aria-label={`标记${dateLabel(selectedDate)}已完成`} checked={selectedRecord?.completed ?? false} disabled={saving || loading || Boolean(loadError)} onCheckedChange={(value) => void persist(Boolean(value))} className="size-5" />
                      {selectedRecord?.completed ? "这一天已打卡" : "完成练习，打卡"}
                    </label>

                    <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                      <div>
                        <label htmlFor="actual-minutes" className="mb-2 block text-sm font-semibold text-[#695c66]">实际分钟</label>
                        <Input id="actual-minutes" type="number" inputMode="numeric" min="0" max="240" value={draftMinutes} onChange={(event) => setDraftMinutes(Number(event.target.value))} className="h-11 text-base" />
                      </div>
                      <div>
                        <label htmlFor="achievement" className="mb-2 block text-sm font-semibold text-[#695c66]">今天做了什么 · 可选</label>
                        <Textarea id="achievement" maxLength={500} rows={3} placeholder="例如：录了两版介绍，第二版能讲清我负责的部分。" value={draftNote} onChange={(event) => setDraftNote(event.target.value)} className="min-h-24 resize-y text-base" />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button disabled={saving || loading || Boolean(loadError)} onClick={() => void persist(selectedRecord?.completed ?? false)} className="h-11 rounded-xl px-5 text-base">{saving ? "保存中…" : "保存今日记录"}</Button>
                      <span className={`text-sm ${saveMessage.includes("失败") || saveMessage.includes("请填写") ? "text-[#a9394b]" : "text-[#695c66]"}`} role="status" aria-live="polite">{saveMessage}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {(!selectedDay || selectedIsRest) && <div className="px-6 py-6 text-base text-[#6f626b] sm:px-8">{selectedIsRest ? "休息日不计入未打卡。" : "选择 9 月 28 日至 11 月 22 日的练习日即可查看任务。"}</div>}
          </section>

          <aside className="space-y-5">
            <section className="rounded-[1.35rem] border border-[#ebdfe2] bg-white p-6 shadow-[0_16px_42px_rgba(115,65,83,.07)] sm:p-7">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div><p className="mb-1 text-sm font-semibold text-[#76666d]">月度记录</p><h2 className="text-2xl font-bold">{monthLabel(month)}</h2></div>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" aria-label="上个月" disabled={month === months[0]} onClick={() => goToMonth(-1)} className="size-10 rounded-lg border-[#ecdee2]"><ChevronLeft className="size-4" /></Button>
                  <Button variant="outline" size="icon" aria-label="下个月" disabled={month === months[months.length - 1]} onClick={() => goToMonth(1)} className="size-10 rounded-lg border-[#ecdee2]"><ChevronRight className="size-4" /></Button>
                </div>
              </div>

              {loadError && <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl bg-[#fff1f3] p-3 text-sm text-[#ab3349]">{loadError}<Button variant="ghost" size="sm" onClick={() => setLoadNonce((value) => value + 1)}><RefreshCw className="size-4" />重试</Button></div>}
              <div className="mb-5 grid grid-cols-3 gap-2.5" aria-label="本月打卡统计">
                <div className="rounded-xl bg-[#fff0f3] px-3 py-3"><p className="text-sm text-[#8e5369]">已打卡</p><p className="mt-1 text-2xl font-bold text-[#b54569]">{completedDays.length}<span className="ml-1 text-sm font-medium">天</span></p></div>
                <div className="rounded-xl bg-[#fff2e6] px-3 py-3"><p className="text-sm text-[#82532f]">未打卡</p><p className="mt-1 text-2xl font-bold text-[#82532f]">{missedDays.length}<span className="ml-1 text-sm font-medium">天</span></p></div>
                <div className="rounded-xl bg-[#eaf6ef] px-3 py-3"><p className="text-sm text-[#286354]">已练习</p><p className="mt-1 text-2xl font-bold text-[#286354]">{minutesCompleted}<span className="ml-1 text-sm font-medium">分钟</span></p></div>
              </div>

              <div className="mb-2 grid grid-cols-7 text-center text-sm font-medium text-[#85747c]">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
              <div className="grid grid-cols-7 gap-1.5 text-center" aria-label={`${monthLabel(month)}每日打卡日历`}>
                {calendarCells.map((date, index) => {
                  if (!date) return <span key={`empty-${index}`} />;
                  const day = dayByDate.get(date);
                  const done = Boolean(records[date]?.completed);
                  const isPastMissed = Boolean(day && day.minutes > 0 && date < today && !done);
                  const isToday = date === today;
                  const isSelected = date === selectedDate;
                  const status = done ? "已打卡" : isPastMissed ? "未打卡" : day?.minutes === 0 ? "休息" : isToday ? "待打卡" : date > today ? "未开始" : "无任务";
                  return <button key={date} type="button" onClick={() => selectDate(date)} aria-label={`${dateLabel(date)}，${status}`} aria-pressed={isSelected}
                    className={`relative grid aspect-square min-h-10 place-items-center rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b54569]
                      ${done ? "border-[#b54569] bg-[#b54569] text-white" : isPastMissed ? "border-[#f1d7b8] bg-[#fff1e3] text-[#82532f]" : day?.minutes === 0 ? "border-transparent bg-[#f1ecf4] text-[#8d8192]" : isToday ? "border-[#b54569] bg-[#fff0f3] text-[#b54569]" : "border-transparent bg-[#f8f3f5] text-[#746771]"}
                      ${isSelected ? "ring-2 ring-[#433842] ring-offset-2" : ""}`}>{Number(date.slice(-2))}</button>;
                })}
              </div>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#6f626b]">
                <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-[#b54569]" />已打卡</span>
                <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-[#fff1e3] ring-1 ring-[#f1d7b8]" />未打卡</span>
                <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-[#f1ecf4]" />休息／未开始</span>
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-[#76666d]"><CalendarDays className="size-4" />点选日期，可以补记过去的练习。</p>
            </section>

            <section className="rounded-[1.35rem] border border-[#ebdfe2] bg-white p-6 sm:p-7">
              <h2 className="mb-1 text-xl font-bold">这个月做了什么</h2>
              <p className="mb-5 text-sm text-[#6f626b]">截至今天安排练习 {elapsedDays.length} 天，完成 {completedDays.length} 天。</p>
              <div className="mb-6 space-y-3" aria-label="每周打卡比例图">
                {weeklyRows.length === 0 && <p className="text-sm text-[#6f626b]">这个月的练习还没开始。</p>}
                {weeklyRows.map((row) => <div className="grid grid-cols-[54px_1fr_42px] items-center gap-2 text-sm" key={row.label}>
                  <span className="text-[#695c66]">{row.label}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#f3e8eb]"><div className="h-full rounded-full bg-[#b54569]" style={{ width: `${row.planned ? row.done / row.planned * 100 : 0}%` }} /></div>
                  <span className="text-right font-medium text-[#695c66]">{row.done}/{row.planned}</span>
                </div>)}
              </div>

              {loading ? <p className="text-base text-[#6f626b]">正在读取打卡记录…</p> : activity.length === 0 ? (
                <p className="rounded-xl bg-[#f8f3f5] p-4 text-base leading-6 text-[#6f626b]">打卡后，这里会列出本月完成的练习和你写下的收获。</p>
              ) : <ul className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {activity.map((row) => <li key={row.date} className="border-t border-[#efe3e6] pt-3 first:border-0 first:pt-0">
                  <button type="button" className="w-full text-left" onClick={() => selectDate(row.date)}>
                    <span className="text-sm font-semibold text-[#933955]">{dateLabel(row.date)} · {row.completed ? `完成 ${row.minutes} 分钟` : "有一条记录"}</span>
                    <span className="mt-1 block text-base font-semibold text-[#433842]">{dayByDate.get(row.date)?.title ?? "当天记录"}</span>
                    {row.note && <span className="mt-1 block whitespace-pre-wrap break-words text-sm leading-6 text-[#695c66]">{row.note}</span>}
                  </button>
                </li>)}
              </ul>}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
