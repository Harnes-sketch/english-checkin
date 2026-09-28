import { env } from "cloudflare:workers";

export type Checkin = {
  date: string;
  completed: boolean;
  minutes: number;
  note: string;
  updatedAt: string;
};

type Row = {
  date: string;
  completed: number;
  minutes: number;
  note: string;
  updated_at: string;
};

function database(): D1Database {
  if (!env.DB) throw new Error("打卡存储暂时不可用");
  return env.DB;
}

function fromRow(row: Row): Checkin {
  return {
    date: row.date,
    completed: row.completed === 1,
    minutes: row.minutes,
    note: row.note,
    updatedAt: row.updated_at,
  };
}

export async function listCheckins(userId: string, month: string): Promise<Checkin[]> {
  const query = database().prepare(
    "SELECT date, completed, minutes, note, updated_at FROM checkins WHERE user_id = ? AND date LIKE ? ORDER BY date"
  ).bind(userId, `${month}-%`);
  const result = await query.all<Row>();
  return result.results.map(fromRow);
}

export async function saveCheckin(
  userId: string,
  record: Pick<Checkin, "date" | "completed" | "minutes" | "note">,
): Promise<Checkin> {
  await database().prepare(
    "INSERT INTO checkins (user_id, date, completed, minutes, note, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id, date) DO UPDATE SET completed = excluded.completed, minutes = excluded.minutes, note = excluded.note, updated_at = CURRENT_TIMESTAMP"
  ).bind(userId, record.date, record.completed ? 1 : 0, record.minutes, record.note).run();
  const row = await database().prepare(
    "SELECT date, completed, minutes, note, updated_at FROM checkins WHERE user_id = ? AND date = ?"
  ).bind(userId, record.date).first<Row>();
  if (!row) throw new Error("保存后无法读取打卡记录");
  return fromRow(row);
}
