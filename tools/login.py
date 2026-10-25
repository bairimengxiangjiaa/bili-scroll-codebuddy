#!/usr/bin/env python3
"""B站扫码登录：二维码落成 PNG，轮询到确认后把凭证写回 MCP 目录。

用法（项目根目录）：
    ./.venv/Scripts/python.exe tools/login.py
"""
import asyncio
import json
from pathlib import Path

from bilibili_api.login_v2 import (
    QrCodeLogin,
    QrCodeLoginChannel,
    QrCodeLoginEvents,
)

ROOT = Path(__file__).resolve().parent.parent
CRED = ROOT / "vendor" / "bilibili-mcp" / "bili_credential.json"
QR = ROOT / "state" / "login_qr.png"


async def main() -> int:
    # WEB 分支在 login_v2 里解析 events["url"]，接口改版后字段为空；
    # TV 分支走 cookie_info，仍然可用。
    qr = QrCodeLogin(platform=QrCodeLoginChannel.TV)
    await qr.generate_qrcode()

    pic = qr.get_qrcode_picture()
    data = getattr(pic, "content", None) or getattr(pic, "raw", None)
    if not data:
        print("ERROR=无法获取二维码图片内容", flush=True)
        return 3

    QR.parent.mkdir(parents=True, exist_ok=True)
    QR.write_bytes(data)
    print(f"QR_PNG={QR}", flush=True)
    print("请用 B 站手机客户端扫码，并在手机上选「记住我 / 长期」", flush=True)

    last = None
    while True:
        state = await qr.check_state()
        if state != last:
            print(f"STATE={state}", flush=True)
            last = state
        if state == QrCodeLoginEvents.DONE:
            break
        if state == QrCodeLoginEvents.TIMEOUT:
            print("TIMEOUT=1", flush=True)
            return 2
        await asyncio.sleep(2)

    cred = qr.get_credential()
    if not (cred.sessdata and cred.bili_jct and cred.dedeuserid):
        print("ERROR=凭据不完整（sessdata/bili_jct/dedeuserid 有空的），未写入文件", flush=True)
        return 4
    CRED.parent.mkdir(parents=True, exist_ok=True)
    CRED.write_text(
        json.dumps(
            {
                "sessdata": cred.sessdata,
                "bili_jct": cred.bili_jct,
                "buvid3": cred.buvid3,
                "dedeuserid": cred.dedeuserid,
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(f"OK=1\nCRED={CRED}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
