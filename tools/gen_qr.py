# -*- coding: utf-8 -*-
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer
from qrcode.image.styles.colormasks import SolidFillColorMask

URL = "https://lanai-site.onrender.com"
ROOT = r"C:\Users\suya\Documents\deepseek-harness\default-workspace\lanai-huoguo"
ICON = os.path.join(ROOT, "public", "assets", "img", "avatar.png")
DESK = r"C:\Users\suya\Desktop"
SIMSUN = r"C:\Windows\Fonts\simsun.ttc"
MSYH = r"C:\Windows\Fonts\msyh.ttc"
MSYHBD = r"C:\Windows\Fonts\msyhbd.ttc"

INK = (58, 47, 43)
MUTED = (150, 134, 126)
ROSE = (198, 139, 135)
CREAM = (255, 253, 251)
LINE = (238, 229, 221)

def make_qr(box=20, border=2):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=box, border=border)
    qr.add_data(URL)
    qr.make(fit=True)
    img = qr.make_image(image_factory=StyledPilImage,
                        module_drawer=RoundedModuleDrawer(radius_ratio=0.5),
                        color_mask=SolidFillColorMask(front_color=INK, back_color=(255,255,255)))
    return img.convert("RGBA"), qr.modules_count

qr_img, n = make_qr()
side = qr_img.width
print("qr", side, "modules", n)

# ---- 纯图版 ----
plain = Image.new("RGBA", (side + 80, side + 80), CREAM + (255,))
plain.alpha_composite(qr_img, (40, 40))
plain.save(os.path.join(DESK, "辣奶火锅-二维码.png"))
print("plain saved")

# ---- 卡片版 ----
W, H = 1080, 1400
card = Image.new("RGBA", (W, H), CREAM + (255,))
d = ImageDraw.Draw(card)

# 顶部细线装饰
d.rectangle([0, 0, W, 10], fill=ROSE + (70,))

f_kick = ImageFont.truetype(MSYH, 26)
f_title = ImageFont.truetype(SIMSUN, 92)
f_sub = ImageFont.truetype(MSYH, 30)
f_url = ImageFont.truetype(MSYH, 27)
f_foot = ImageFont.truetype(MSYH, 25)
f_group = ImageFont.truetype(MSYHBD, 27)

def center(text, font, y, fill):
    w = d.textlength(text, font=font)
    d.text(((W - w) / 2, y), text, font=font, fill=fill)

center("SCAN  ·  扫 码 打 开", f_kick, 78, ROSE)
center("辣奶火锅", f_title, 118, INK)
center("虚拟主播 · 官方小站", f_sub, 250, MUTED)

# QR 阴影卡片
qsize = 660
pad = 30
cardy = 330
shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
sd.rounded_rectangle([(W - qsize) / 2 - pad + 6, cardy + 10, (W + qsize) / 2 + pad + 6, cardy + qsize + pad * 2 + 10],
                     radius=44, fill=(120, 95, 85, 46))
shadow = shadow.filter(ImageFilter.GaussianBlur(18))
card.alpha_composite(shadow)

d = ImageDraw.Draw(card)
d.rounded_rectangle([(W - qsize) / 2 - pad, cardy, (W + qsize) / 2 + pad, cardy + qsize + pad * 2],
                    radius=44, fill=(255, 255, 255, 255), outline=LINE + (255,), width=2)
qr_big = qr_img.resize((qsize, qsize), Image.LANCZOS)
card.alpha_composite(qr_big, (int((W - qsize) / 2), cardy + pad))

# 中心 LOGO
logo = Image.open(ICON).convert("RGBA").resize((150, 150), Image.LANCZOS)
lp = Image.new("RGBA", (178, 178), (0, 0, 0, 0))
ImageDraw.Draw(lp).rounded_rectangle([0, 0, 177, 177], radius=40, fill=(255, 255, 255, 255))
mask = Image.new("L", (150, 150), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, 149, 149], radius=32, fill=255)
lp.paste(logo, (14, 14), mask)
card.alpha_composite(lp, (int(W / 2 - 89), cardy + pad + qsize // 2 - 89))

d = ImageDraw.Draw(card)
center(URL.replace("https://", ""), f_url, cardy + qsize + pad * 2 + 34, MUTED)

# 分隔线
d.line([(W / 2 - 120, 1188), (W / 2 + 120, 1188)], fill=LINE + (255,), width=2)

center("物料下载  ·  歌单 374 首  ·  直播月历  ·  二创投稿", f_foot, 1222, MUTED)
center("粉丝 QQ 群  858862396", f_group, 1276, INK)

out = os.path.join(DESK, "辣奶火锅-站点二维码.png")
card.convert("RGB").save(out, quality=95)
print("card saved", os.path.getsize(out) // 1024, "KB")

# 预览用（缩小）
card.convert("RGB").resize((540, 700), Image.LANCZOS).save(os.path.join(ROOT, "tools", "qr-preview.png"))
