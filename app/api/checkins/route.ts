import { getChatGPTUser } from "@/app/chatgpt-auth";
import { listCheckins, saveCheckin } from "@/db/checkins";
import plan from "@/app/plan.json";

export const dynamic = "force-dynamic";
const validDates = new Set(plan.filter((day) => day.minutes > 0).map((day) => day.date));

function shanghaiToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录后查看打卡记录" }, { status: 401 });
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return Response.json({ error: "月份格式不正确" }, { status: 400 });
  }
  try {
    return Response.json({ checkins: await listCheckins(user.userId, month) });
  } catch (error) {
    console.error("读取打卡记录失败", error);
    return Response.json({ error: "记录暂时无法读取，请稍后重试" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "请先登录后打卡" }, { status: 401 });
  let payload: unknown;
  try { payload = await request.json(); }
  catch { return Response.json({ error: "提交内容无法读取" }, { status: 400 }); }
  if (!payload || typeof payload !== "object") {
    return Response.json({ error: "提交内容不正确" }, { status: 400 });
  }
  const { date, completed, minutes, note } = payload as Record<string, unknown>;
  if (typeof date !== "string" || !validDates.has(date) || date > shanghaiToday() ||
      typeof completed !== "boolean" || !Number.isInteger(minutes) ||
      (minutes as number) < 0 || (minutes as number) > 240 ||
      (completed && minutes === 0) ||
      typeof note !== "string" || note.length > 500) {
    return Response.json({ error: "日期、时长或内容不符合要求" }, { status: 400 });
  }
  try {
    const checkin = await saveCheckin(user.userId, {
      date, completed, minutes: minutes as number, note: note.trim(),
    });
    return Response.json({ checkin });
  } catch (error) {
    console.error("保存打卡记录失败", error);
    return Response.json({ error: "保存失败，内容仍在页面中，请重试" }, { status: 503 });
  }
}
