import os, math, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = r"C:\Users\suya\Documents\deepseek-harness\default-workspace\lanai-huoguo"
SRC  = os.path.join(ROOT, "tools", "src")
IMG  = os.path.join(ROOT, "public", "assets", "img")
MAT  = os.path.join(ROOT, "public", "materials")
os.makedirs(IMG, exist_ok=True); os.makedirs(MAT, exist_ok=True)

F_REG = r"C:\Windows\Fonts\msyh.ttc"
F_BOLD = r"C:\Windows\Fonts\msyhbd.ttc"
def font(s, bold=False): return ImageFont.truetype(F_BOLD if bold else F_REG, s)

CREAM  = (251, 249, 246)
PAPER  = (255, 255, 255)
INK    = (58, 53, 50)
INK2   = (111, 104, 98)
INK3   = (156, 148, 141)
ROSE   = (198, 139, 135)
ROSE_D = (169, 112, 110)
ROSE_L = (243, 226, 222)
SAGE   = (166, 181, 160)
MIST   = (174, 192, 206)
SAND   = (239, 231, 220)

def lerp(a,b,t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))
def grad(size, top, bot, horizontal=False):
    w, h = size
    if horizontal:
        img = Image.new("RGB", (w, 1))
        d = ImageDraw.Draw(img)
        for i in range(w):
            d.point((i, 0), fill=lerp(top, bot, i / max(1, w - 1)))
    else:
        img = Image.new("RGB", (1, h))
        d = ImageDraw.Draw(img)
        for i in range(h):
            d.point((0, i), fill=lerp(top, bot, i / max(1, h - 1)))
    return img.resize(size, Image.BILINEAR)

def load_alpha(filename):
    im = Image.open(os.path.join(SRC, filename)).convert("RGBA")
    return im.crop(im.getchannel("A").getbbox())

BUN  = load_alpha("bun.webp")
LONG = load_alpha("long.webp")
LOGO = load_alpha("logo.png")

def fit_h(im, h):
    im = im.copy(); im.thumbnail((9999, h), Image.LANCZOS); return im

def soft_circles(canvas, items, blur=60):
    """模糊圆：分别生成「纯色层 + 模糊 alpha 遮罩」，避免模糊把 RGB 拉向黑色产生脏边。"""
    for (cx,cy,r,color,alpha) in items:
        layer = Image.new("RGBA", canvas.size, color + (0,))
        mask = Image.new("L", canvas.size, 0)
        ImageDraw.Draw(mask).ellipse([cx-r,cy-r,cx+r,cy+r], fill=alpha)
        layer.putalpha(mask.filter(ImageFilter.GaussianBlur(blur)))
        canvas.alpha_composite(layer)

def text_ls(d, xy, s, f, fill, ls=0, center=False):
    widths = [d.textlength(ch, font=f) for ch in s]
    total = sum(widths) + ls*(len(s)-1)
    x,y = xy
    if center: x -= total/2
    for ch,w in zip(s, widths):
        d.text((x,y), ch, font=f, fill=fill); x += w + ls
    return total

def checker(size, cell=40):
    im = Image.new("RGB", size, (255,255,255)); d = ImageDraw.Draw(im)
    for y in range(0,size[1],cell):
        for x in range(0,size[0],cell):
            if (x//cell+y//cell)%2: d.rectangle([x,y,x+cell-1,y+cell-1], fill=(242,238,234))
    return im

# ---------------- 基础素材 ----------------
def build_basics():
    bun = fit_h(BUN, 1400); bun.save(os.path.join(IMG, "char-bun.png"), optimize=True)
    lng = fit_h(LONG, 1400); lng.save(os.path.join(IMG, "char-long.png"), optimize=True)
    logo = LOGO.copy(); logo.thumbnail((900, 900), Image.LANCZOS)
    logo.save(os.path.join(IMG, "logo.png"), optimize=True)

    # 头像（正方形裁切）
    side = int(BUN.width * 0.64)
    cx = 350; cy = 240
    box = (cx-side//2, max(0,cy-side//2), cx+side//2, max(0,cy-side//2)+side)
    face = BUN.crop(box).resize((512,512), Image.LANCZOS)
    av = Image.new("RGBA",(512,512),(0,0,0,0)); av.alpha_composite(face)
    av.save(os.path.join(IMG, "avatar.png"))
    # 实底 favicon / og 用
    for name, s in (("avatar-sm.png",160), ("favicon.png",64)):
        im = av.resize((s,s), Image.LANCZOS)
        bg = Image.new("RGBA",(s,s), ROSE_L+(255,))
        bg.alpha_composite(im)
        bg.resize((s,s), Image.LANCZOS).save(os.path.join(IMG, name))

# ---------------- 物料 ----------------
def canvas_bg(size, top, bot, circles):
    c = grad(size, top, bot).convert("RGBA")
    soft_circles(c, circles, 90)
    return c

def wallpaper_cream():
    W,H = 1920,1080
    c = canvas_bg((W,H), (252,250,247), (240,232,222), [
        (1560,240,340,ROSE,26), (1720,760,260,SAND,90), (240,900,300,ROSE_L,110)])
    d = ImageDraw.Draw(c,"RGBA")
    art = fit_h(BUN, 900)
    c.alpha_composite(art, (1160, H-art.height-40))
    logo = LOGO.copy(); logo.thumbnail((560,560), Image.LANCZOS)
    c.alpha_composite(logo, (130, 250))
    text_ls(d, (140, 640), "一口奶香，两口上头。", font(46), INK2, ls=2)
    text_ls(d, (142, 730), "OFFICIAL MATERIALS · 2026", font(22), INK3, ls=4)
    text_ls(d, (142, 780), "禁止转载 / 商用 · 二创请标注出处", font(22), ROSE_D, ls=1)
    c.convert("RGB").save(os.path.join(MAT, "wallpaper-cream.png"), optimize=True)

def wallpaper_rose():
    W,H = 1920,1080
    c = canvas_bg((W,H), (249,240,237), (232,206,201), [
        (300,200,300,ROSE,30), (1620,880,380,ROSE_L,140), (900,120,220,SAND,80)])
    d = ImageDraw.Draw(c,"RGBA")
    art = fit_h(LONG, 930)
    c.alpha_composite(art, (150, H-art.height-30))
    logo = LOGO.copy(); logo.thumbnail((520,520), Image.LANCZOS)
    c.alpha_composite(logo, (900, 250))
    text_ls(d, (910, 640), "沸腾的不只是锅底，还有直播间。", font(40), INK, ls=1)
    text_ls(d, (912, 730), "BILIBILI · 虚拟主播", font(22), ROSE_D, ls=4)
    text_ls(d, (912, 780), "官方物料 · 禁止转载", font(22), INK3, ls=2)
    c.convert("RGB").save(os.path.join(MAT, "wallpaper-rose.png"), optimize=True)

def wallpaper_phone():
    W,H = 1080,1920
    c = canvas_bg((W,H), (252,249,245), (238,220,214), [
        (180,300,260,ROSE,26), (900,1450,320,SAND,110)])
    d = ImageDraw.Draw(c,"RGBA")
    art = fit_h(BUN, 1050)
    c.alpha_composite(art, ((W-art.width)//2, 470))
    logo = LOGO.copy(); logo.thumbnail((480,480), Image.LANCZOS)
    c.alpha_composite(logo, ((W-logo.width)//2, 120))
    text_ls(d, (W/2, 330), "一 口 奶 香 · 两 口 上 头", font(26), INK2, center=True)
    text_ls(d, (W/2, 1620), "BILIBILI · 辣奶火锅", font(22), ROSE_D, ls=4, center=True)
    c.convert("RGB").save(os.path.join(MAT, "wallpaper-phone.png"), optimize=True)

STICKERS = [("辣","上头"),("奶","奶一口"),("沸","沸腾中"),("饿","好饿"),("困","晚安"),("冲","打call")]
def sticker(ch, sub):
    S = 512
    img = Image.new("RGBA",(S,S),(0,0,0,0)); d = ImageDraw.Draw(img,"RGBA")
    d.rounded_rectangle([26,26,S-26,S-26], radius=100, fill=CREAM+(255,), outline=INK+(28,), width=3)
    f = font(200, True)
    tw = d.textlength(ch, font=f)
    d.text(((S-tw)/2, 120), ch, font=f, fill=ROSE)
    text_ls(d, (S/2, 380), sub, font(28), INK3, ls=4, center=True)
    d.ellipse([S-96, 60, S-72, 84], fill=SAND)
    return img

def obs_frame():
    W,H = 1920,1080
    img = Image.new("RGBA",(W,H),(0,0,0,0)); d = ImageDraw.Draw(img,"RGBA")
    d.rounded_rectangle([36,36,W-36,H-36], radius=40, outline=(255,255,255,235), width=6)
    d.rounded_rectangle([48,48,W-48,H-48], radius=32, outline=ROSE+(110,), width=2)
    # 铭牌
    px,py = 70, H-186
    d.rounded_rectangle([px,py,px+520,py+112], radius=28, fill=(251,249,246,240))
    mark = fit_h(BUN, 86)
    img.alpha_composite(mark, (px+18, py+14))
    text_ls(d, (px+112, py+26), "辣奶火锅", font(40, True), INK, ls=2)
    text_ls(d, (px+116, py+74), "BILIBILI · 直播间", font(17), INK3, ls=3)
    d.rounded_rectangle([W-300, H-150, W-76, H-70], radius=22, fill=(255,255,255,90))
    text_ls(d, (W-188, H-136), "禁止转载", font(26), ROSE_D, ls=2, center=True)
    img.save(os.path.join(MAT, "obs-frame.png"), optimize=True)

def brb_screen():
    W,H = 1920,1080
    c = canvas_bg((W,H), (252,250,247), (240,229,221), [(960,300,420,ROSE,18), (1600,900,300,SAND,90)])
    d = ImageDraw.Draw(c,"RGBA")
    art = fit_h(BUN, 620)
    c.alpha_composite(art, (960-art.width//2, 190))
    text_ls(d, (960, 860), "锅底正在加热…", font(64), INK, ls=6, center=True)
    text_ls(d, (960, 960), "马上回来，先给自己倒杯水吧", font(26), INK2, ls=2, center=True)
    logo = LOGO.copy(); logo.thumbnail((260,260), Image.LANCZOS)
    c.alpha_composite(logo, (70, 60))
    c.convert("RGB").save(os.path.join(MAT, "brb-screen.png"), optimize=True)

def watermark():
    img = Image.new("RGBA",(1000,300),(0,0,0,0)); d = ImageDraw.Draw(img,"RGBA")
    logo = LOGO.copy(); logo.thumbnail((300,300), Image.LANCZOS)
    img.alpha_composite(logo, (0, 60))
    text_ls(d, (330, 92), "辣奶火锅", font(64, True), (255,255,255), ls=2)
    text_ls(d, (334, 174), "BILIBILI · 禁止转载", font(20), (255,255,255), ls=3)
    img.save(os.path.join(MAT, "watermark.png"), optimize=True)
    logo2 = LOGO.copy(); logo2.thumbnail((900,900), Image.LANCZOS)
    logo2.save(os.path.join(MAT, "logo-transparent.png"), optimize=True)

def avatars():
    side = int(BUN.width*0.64); cx,cy = 350,240
    box = (cx-side//2, max(0,cy-side//2), cx+side//2, max(0,cy-side//2)+side)
    face = BUN.crop(box).resize((768,768), Image.LANCZOS)
    colors = [("rose", (232,201,196)), ("sage",(206,216,201)), ("sand",(232,220,204)), ("mist",(210,221,229))]
    for name, col in colors:
        bg = grad((768,768), tuple(min(255,c+14) for c in col), col).convert("RGBA")
        bg.alpha_composite(face)
        bg.convert("RGB").save(os.path.join(MAT, f"avatar-{name}.png"), optimize=True)

if __name__ == "__main__":
    build_basics(); wallpaper_cream(); wallpaper_rose(); wallpaper_phone()
    for i,(ch,sub) in enumerate(STICKERS, 1):
        sticker(ch, sub).save(os.path.join(MAT, f"sticker-{i}.png"), optimize=True)
    obs_frame(); brb_screen(); watermark(); avatars()
    print("assets v2 done")
    for n in ("char-bun.png","char-long.png","logo.png","avatar.png"):
        print(n, os.path.getsize(os.path.join(IMG,n)))
