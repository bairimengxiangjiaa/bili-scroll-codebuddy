# 第三方组件与致谢

本项目的原创部分以 MIT 许可发布，见 `LICENSE`。以下组件/项目按各自的许可使用。

## vendor/bilibili-mcp

- 来源：https://github.com/adoresever/bilibili-mcp
- 许可：MIT
- Copyright (c) 2026 AGI_Ananas
- 许可证全文：`vendor/bilibili-mcp/LICENSE`
- 我们对上游的修改：见 `vendor/PATCHES.md`（新增 `bili_notify`、`bili_frames`，补充搜索结果字段）

> 分发本项目的二进制或源码时，请保留上述版权声明与许可声明。

## 流程与章程参考

- https://github.com/c1overzz/dsh-bili-scroll
- 许可：MIT（其动画素材另有 ASSET_LICENSE，本项目未使用其素材）
- 本项目未复制其代码，仅参考了「搜索 → 读字幕 → 判断 → 日报」的流程设计与提示词思路

## Python 依赖

`bilibili-api-python`、`aiohttp`、`mcp`、`Pillow` 等按各自许可分发，详见各包元数据。
