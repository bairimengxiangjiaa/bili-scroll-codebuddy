---
description: 手动跑一轮刷B站，输出本轮结果摘要
---

用 Agent 工具调用 `bili-duty` 子代理，让它严格按 `D:/vibecoding/小龙/bili-scroll/skills/bili-duty/SKILL.md` 跑一轮。

跑完后把它的摘要转述给用户，并额外告诉用户：日报文件路径、本轮入选的视频标题列表。如果它报告凭证失效或风控停止，直接把原文提示给用户，不要自行重试。
