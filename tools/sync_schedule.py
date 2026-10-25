#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""SessionStart hook：按 config.json 的 schedule.times 校准 bili-duty 定时任务。

为什么需要它：页面只能写 config.json，而 cron 存在宿主项目的
.codebuddy/scheduled_tasks.json 里，两者没有绑定关系。这个 hook 在每次
会话启动时把两边对齐，避免「页面改了时间、任务没变」。
"""
import json
import os
import sys
import time
import uuid
import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = os.path.join(ROOT, "config.json")
LOG = os.path.join(ROOT, "state", "sync_schedule.log")

DESKTOP = os.path.join(
    os.environ.get("USERPROFILE") or os.path.expanduser("~"),
    "Desktop", ".codebuddy", "scheduled_tasks.json",
)
PROJECT_TASKS = os.path.join(ROOT, ".codebuddy", "scheduled_tasks.json")


def log(msg):
    try:
        os.makedirs(os.path.dirname(LOG), exist_ok=True)
        line = "[%s] %s\n" % (datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), msg)
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception:
        pass


def read_hook_cwd():
    try:
        raw = sys.stdin.read()
        if not raw or not raw.strip():
            return None
        return json.loads(raw).get("cwd")
    except Exception:
        return None


def desired_crons(times):
    """['12:30','19:00'] -> ['30 12 * * *', '0 19 * * *']；同分钟合并小时。"""
    groups, order = {}, []
    for item in times or []:
        try:
            hh, mm = str(item).strip().split(":")
            h, m = int(hh), int(mm)
            if not (0 <= h <= 23 and 0 <= m <= 59):
                continue
        except Exception:
            continue
        if m not in groups:
            groups[m] = []
            order.append(m)
        if h not in groups[m]:
            groups[m].append(h)
    return ["%d %s * * *" % (m, ",".join(str(h) for h in sorted(groups[m]))) for m in order]


def is_duty(task):
    p = str(task.get("prompt", ""))
    return ("bili-duty" in p) or ("skills/bili-duty/SKILL.md" in p)


def needs_fix(duty, wanted):
    current = sorted(str(t.get("cron", "")) for t in duty)
    if current != sorted(wanted):
        return True
    for t in duty:
        if t.get("expiryDays") is not None or t.get("expiresAt") is not None:
            return True
    return False


def sync_file(path, crons):
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as exc:
        log("跳过 %s：%s" % (path, exc))
        return None

    tasks = data.get("tasks") or []
    duty = [t for t in tasks if is_duty(t)]
    if not duty:
        log("%s：没有 bili-duty 任务，跳过（不自动新建）" % path)
        return "skip"

    current = sorted(str(t.get("cron", "")) for t in duty)
    if not needs_fix(duty, crons):
        log("%s：已一致 %s" % (path, ",".join(sorted(crons))))
        return "same"

    base = dict(duty[0])
    now = int(time.time() * 1000)
    rebuilt = []
    for i, cron in enumerate(sorted(crons)):
        task = dict(base)
        task["cron"] = cron
        task["recurring"] = True
        task["expiryDays"] = None
        task["expiresAt"] = None
        if i > 0:
            task["id"] = uuid.uuid4().hex[:8]
            task["createdAt"] = now
        rebuilt.append(task)

    data["tasks"] = [t for t in tasks if not is_duty(t)] + rebuilt
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)
    log("%s：已重建 %s -> %s（过期已置空）" % (path, ",".join(current), ",".join(sorted(crons))))
    return "changed"


def main():
    cwd = read_hook_cwd()
    try:
        with open(CONFIG, encoding="utf-8") as f:
            cfg = json.load(f)
        times = (cfg.get("schedule") or {}).get("times") or []
    except Exception as exc:
        log("读取 config 失败：%s" % exc)
        print("bili-scroll: config 不可读，跳过定时校准")
        return

    crons = desired_crons(times)
    if not crons:
        log("schedule.times 无效：%r" % (times,))
        print("bili-scroll: schedule.times 无效，跳过定时校准")
        return

    paths = []
    if cwd:
        paths.append(os.path.join(cwd, ".codebuddy", "scheduled_tasks.json"))
    for p in (DESKTOP, PROJECT_TASKS):
        paths.append(p)

    seen = set()
    unique = []
    for p in paths:
        key = os.path.normcase(os.path.normpath(os.path.abspath(p)))
        if key in seen:
            continue
        seen.add(key)
        unique.append(p)

    done = []
    for p in unique:
        if os.path.exists(p):
            r = sync_file(p, crons)
            if r:
                done.append(os.path.basename(os.path.dirname(os.path.dirname(p))) + ":" + r)

    msg = "bili-scroll 定时校准：%s ｜ 目标 %s" % (",".join(done) or "无任务文件", ", ".join(crons))
    log(msg)
    print(msg)


if __name__ == "__main__":
    main()
