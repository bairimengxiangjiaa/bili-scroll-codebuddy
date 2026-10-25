#!/usr/bin/env python3
"""B站网页扫码登录（自己实现，绕开 login_v2 里失效的 WEB 解析）。

关键点：poll 接口的 Set-Cookie 才是真正凭证，JSON 里的 url 只是副本。
用法：./.venv/Scripts/python.exe tools/login_web.py
"""
import asyncio
import json
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import aiohttp
import qrcode

ROOT = Path(__file__).resolve().parent.parent
CRED = ROOT / "vendor" / "bilibili-mcp" / "bili_credential.json"
QR = ROOT / "state" / "login_qr.png"

GEN = "https://passport.bilibili.com/x/passport-login/web/qrcode/generate"
POLL = "https://passport.bilibili.com/x/passport-login/web/qrcode/poll"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.bilibili.com/",
}


async def main() -> int:
    async with aiohttp.ClientSession(headers=HEADERS) as s:
        async with s.get(GEN, params={"source": "main-fe-header"}) as r:
            gen = await r.json()
        data = gen.get("data") or {}
        link, key = data.get("url"), data.get("qrcode_key")
        if not link or not key:
            print(f"ERROR=生成二维码失败 {gen}", flush=True)
            return 3

        QR.parent.mkdir(parents=True, exist_ok=True)
        qrcode.make(link).save(QR)
        print(f"QR_PNG={QR}", flush=True)
        print("用 B 站手机客户端扫码，确认时选「记住我 / 长期」", flush=True)

        last = None
        while True:
            async with s.get(POLL, params={"qrcode_key": key, "source": "main-fe-header"}) as r:
                body = await r.json()
                jar = {c.key: c.value for c in r.cookies.values()}
            d = body.get("data") or {}
            code = d.get("code")
            label = {86101: "未扫码", 86090: "已扫码待确认", 86038: "已过期", 0: "成功"}.get(code, f"code={code}")
            if label != last:
                print(f"STATE={label}", flush=True)
                last = label

            if code == 86038:
                print("TIMEOUT=1", flush=True)
                return 2
            if code == 0:
                # 优先用 Set-Cookie，其次用 JSON 里 url 的 query
                sess = jar.get("SESSDATA", "")
                jct = jar.get("bili_jct", "")
                uid = jar.get("DedeUserID", "")
                if not (sess and jct and uid):
                    q = parse_qs(urlparse(d.get("url", "")).query)
                    sess = sess or (q.get("SESSDATA") or [""])[0]
                    jct = jct or (q.get("bili_jct") or [""])[0]
                    uid = uid or (q.get("DedeUserID") or [""])[0]
                if not (sess and jct and uid):
                    print(f"ERROR=凭据不完整 cookie键={sorted(jar)} url有query={'?' in d.get('url','')}", flush=True)
                    return 4
                CRED.parent.mkdir(parents=True, exist_ok=True)
                CRED.write_text(
                    json.dumps(
                        {
                            "sessdata": sess,
                            "bili_jct": jct,
                            "buvid3": jar.get("buvid3", ""),
                            "dedeuserid": uid,
                        },
                        ensure_ascii=False,
                    ),
                    encoding="utf-8",
                )
                print(f"OK=1\nUID={uid}\nCRED={CRED}", flush=True)
                return 0

            await asyncio.sleep(2)


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
