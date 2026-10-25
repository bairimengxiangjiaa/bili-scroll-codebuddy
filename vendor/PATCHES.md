# vendor 修改记录

上游：`adoresever/bilibili-mcp`，固定 commit `1521d19d4118bfe23e08ec4c7702991c5f9de0ba`，MIT。
下面两处是为了「刷B站」需要的字段做的**最小改动**，其余未动。

## 1. `bili_search` 增加 `pubdate`

搜索接口本身返回发布时间，但原实现没带出来，导致「只取近 3 天」还得为每条候选额外调一次 `bili_video_info`。
在 `videos.append({...})` 里补一行 `"pubdate": item.get("pubdate", 0)`。

## 2. `bili_reply` 返回 `rpid`

原实现把 `comment.send_comment()` 的返回值丢掉了，只回 `{"success": true}`，无法记录评论 id。
改为 `{"success": true, "message": ..., "result": result}`，上游返回体里的 `rpid` 就能拿到。

## 3. 新增 `bili_notify(text)`

上游只有 `bili_send_message(receiver_uid, text)`，接收者由调用方任意指定。
一旦字幕/标题里藏了注入指令，子代理就可能被诱导给陌生人发私信。

新增窄口工具 `bili_notify(text)`：接收者从 `config.json` 的 `comment.at_uid` 读取，
**不接受参数**。子代理的工具白名单里已用 `bili_notify` 替换掉 `bili_send_message`。

## 4. 新增 `bili_frames(bvid, count=6)`

上游没有「看画面」能力。新增工具走 B 站故事板（`x/player/videoshot`，就是进度条预览图）：

- 取 `image`（10×10 雪碧图数组）+ `index`（每格对应秒数）
- 下载雪碧图，按 `img_x_len/img_y_len/img_x_size/img_y_size` 切格
- 按 `count` 均匀取帧，存到 `<项目根>/state/frames/<bvid>/`
- 返回每帧的 `second` 与本地路径，供调用方用 Read 看图

**不需要 ffmpeg，不需要下载视频。** `second=-1` 表示接口没给该格时间。

## 升级上游时

重打这两个 patch 后跑一遍冒烟：
```
./.venv/Scripts/python.exe -c "import importlib.util,sys; spec=importlib.util.spec_from_file_location('m','vendor/bilibili-mcp/mcp_server.py'); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m); print('ok')"
```
