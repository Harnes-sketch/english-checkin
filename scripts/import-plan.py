import json
import re
from datetime import date
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root.parent / "英语每日行动计划_2026-09-28至11-22.md"
text = source.read_text(encoding="utf-8")
rows = re.findall(r"^\| (\d+)/(\d+) 周([一二三四五六日]) \| (\d+) 分钟 \| (.*?) \| (.*?) \|$", text, re.M)
titles = [
    ["起点录音", "一分钟自我介绍", "回答三个工作问题", "写一则进度更新", "听懂并介绍一个产品", "本周复盘", "休息"],
    ["画出工作流程", "两分钟讲流程", "解释流程中的判断", "写交付安排邮件", "把流程压缩到45秒", "本周复盘", "休息"],
    ["描述一个真实问题", "讲问题、行动和结果", "回答为什么这么做", "写问题说明邮件", "短版案例与澄清", "本周复盘", "休息"],
    ["提出澄清问题", "复述最终约定", "随机追问练习", "写需求确认邮件", "听一段新材料", "四周中期检查", "休息"],
    ["读懂一组数据", "解释观察与假设", "回答数据追问", "写分析短文", "设计一个小测试", "本周复盘", "休息"],
    ["学习讨论表达", "提出改进建议", "回应三种质疑", "写方案建议邮件", "迁移到新场景", "本周复盘", "休息"],
    ["对应岗位要求", "岗位版自我介绍", "回答求职动机", "写时间确认邮件", "观察面试问答", "模拟面试", "休息"],
    ["复习八个旧表达", "复述两个项目案例", "随机追问练习", "独立写工作邮件", "陌生材料听力", "最终模拟与回顾", "休息"],
]

def clean(value):
    value = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", value)
    value = value.replace("**", "").replace("`", "")
    return re.sub(r"\s+", " ", value).strip()

assert len(rows) == 56, f"Expected 56 dated entries, got {len(rows)}"
plan = []
for i, (month, day, weekday, minutes, steps, criterion) in enumerate(rows):
    plan.append({
        "date": date(2026, int(month), int(day)).isoformat(),
        "weekday": weekday,
        "minutes": int(minutes),
        "title": titles[i // 7][i % 7],
        "steps": clean(steps),
        "criterion": clean(criterion),
        "week": i // 7 + 1,
    })

(root / "app" / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
