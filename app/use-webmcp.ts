"use client";

import { useEffect } from "react";
import plan from "./plan.json";

type Checkin = { date: string; completed: boolean; minutes: number; note: string; updatedAt: string };
type Context = {
  registerTool: (tool: {
    name: string;
    title: string;
    description: string;
    inputSchema: object;
    annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
    execute: (input: unknown) => Promise<unknown>;
  }, options: { signal: AbortSignal }) => void | Promise<void>;
};

const validDates = new Set(plan.filter((day) => day.minutes > 0).map((day) => day.date));

export function useWebMcp(
  onSaved: (record: Checkin) => void,
) {
  useEffect(() => {
    const context = (document as Document & { modelContext?: Context }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    const readTool = {
      name: "get_english_monthly_progress",
      title: "查看英语月度进度",
      description: "读取一个月份已完成的英语练习、时长和每日打卡记录。",
      inputSchema: {
        type: "object", properties: { month: { type: "string", pattern: "^2026-(09|10|11)$" } },
        required: ["month"], additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      async execute(input: unknown) {
        const month = (input as { month?: unknown })?.month;
        if (typeof month !== "string" || !/^2026-(09|10|11)$/.test(month)) throw new Error("月份应为 2026-09、2026-10 或 2026-11");
        const response = await fetch(`/api/checkins?month=${month}`);
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "读取失败");
        const checkins = body.checkins as Checkin[];
        const done = checkins.filter((row) => row.completed);
        return {
          month, completedDays: done.length,
          minutes: done.reduce((sum, row) => sum + row.minutes, 0),
          completed: done.map((row) => ({ date: row.date, title: plan.find((day) => day.date === row.date)?.title, note: row.note })),
        };
      },
    };

    const writeTool = {
      name: "save_english_checkin",
      title: "保存英语打卡",
      description: "保存计划内某一天的完成状态、实际练习分钟数和简短收获，并更新页面。",
      inputSchema: {
        type: "object",
        properties: {
          date: { type: "string", pattern: "^2026-(09|10|11)-[0-9]{2}$" },
          completed: { type: "boolean" },
          minutes: { type: "integer", minimum: 0, maximum: 240 },
          note: { type: "string", maxLength: 500 },
        },
        required: ["date", "completed", "minutes", "note"], additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input: unknown) {
        const record = input as { date?: unknown; completed?: unknown; minutes?: unknown; note?: unknown } | null;
        if (!record || typeof record.date !== "string" || !validDates.has(record.date) ||
          typeof record.completed !== "boolean" || !Number.isInteger(record.minutes) ||
          (record.minutes as number) < 0 || (record.minutes as number) > 240 ||
          (record.completed && record.minutes === 0) || typeof record.note !== "string" || record.note.length > 500) {
          throw new Error("请输入计划内日期、完成状态、0—240 分钟和不超过 500 字的收获");
        }
        const response = await fetch("/api/checkins", {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(record),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "保存失败");
        onSaved(body.checkin as Checkin);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        return { date: record.date, completed: record.completed, minutes: record.minutes, saved: true };
      },
    };

    try {
      void Promise.resolve(context.registerTool(readTool, { signal: lifecycle.signal })).catch(() => {});
      void Promise.resolve(context.registerTool(writeTool, { signal: lifecycle.signal })).catch(() => {});
    } catch { /* Optional browser capability; visible UI remains available. */ }
    return () => lifecycle.abort();
  }, [onSaved]);
}
