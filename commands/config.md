---
description: 把 JSON 参数合并写入 bili-scroll 的 config.json；若含 schedule.times 则同步重建定时任务
---

参数是一份完整的配置 JSON（来自侧栏「刷B站」页面）：

$ARGUMENTS

请按顺序执行：

1. 读取 `D:/vibecoding/小龙/bili-scroll/config.json`
2. 用参数里的字段覆盖同名字段；`comment` / `favorite` / `dm` / `schedule` 是对象，按对象逐键合并，不要整块丢弃未出现的键
3. 写回同一路径，UTF-8、两空格缩进
4. **定时任务同步**（仅当参数里出现 `schedule.times` 且与旧值不同时才做）：
   - 用定时任务工具（CronList / CronDelete / CronCreate 或等价能力）列出当前持久化任务
   - 删除 prompt 中引用了 `bili-duty` 或 `skills/bili-duty/SKILL.md` 的旧任务
   - 对 `schedule.times` 里每个 `HH:MM`，按分钟分组创建 cron：同一分钟的多个小时合成一条 `M H1,H2 * * *`，分钟不同的各建一条 `M H * * *`
   - 新任务要求：durable 持久化、expiryDays 为 null（永不过期）、prompt 中写明章程路径 `D:/vibecoding/小龙/bili-scroll/skills/bili-duty/SKILL.md`、工作目录用 `D:/vibecoding/小龙/bili-scroll`
   - 若当前环境没有定时任务工具，跳过本步并在回执里注明「定时任务未更新」
5. 回读一次 config.json 确认写入成功
6. 回复末尾**原样附上**这份回执（页面靠它同步真实配置）：

【刷B站·已写入】
<合并后的完整 config.json>

限制：只改 `config.json` 与定时任务，不要动 `state/` 和 `out/`，不要调用任何 B 站工具。
