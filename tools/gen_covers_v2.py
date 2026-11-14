import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import gen_v2 as g
from gen_v2 import (CREAM, PAPER, INK, INK2, INK3, ROSE, ROSE_D, ROSE_L, SAGE, MIST, SAND,
                    BUN, LONG, LOGO, fit_h, grad, soft_circles, text_ls, font, MAT, IMG, checker)

W,H = 1200,750

def base(top=(252,250,247), bot=(240,231,221), circles=None):
    c = grad((W,H), top, bot).convert("RGBA")
    soft_circles(c, circles or [(1000,120,260,ROSE,20),(180,660,240,SAND,80)], 80)
    return c

def rounded(im, r):
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0,0,im.size[0]-1,im.size[1]-1], radius=r, fill=255)
    out = im.convert("RGBA"); out.putalpha(m); return out

def crop_center(im, size):
    tw,th = size; sw,sh = im.size
    s = max(tw/sw, th/sh)
    im2 = im.resize((int(sw*s)+1,int(sh*s)+1), Image.LANCZOS)
    l=(im2.width-tw)//2; t=(im2.height-th)//2
    return im2.crop((l,t,l+tw,t+th))

def small_logo(w=150):
    lg = LOGO.copy(); lg.thumbnail((w,w), Image.LANCZOS); return lg

def cover_char(art, title, sub, flip=False):
    c = base((252,250,247),(243,235,228), [(1050,140,300,ROSE,24),(920,700,260,SAND,90)])
    d = ImageDraw.Draw(c,"RGBA")
    a = fit_h(art, 660)
    if flip:
        a = a.transpose(Image.FLIP_LEFT_RIGHT)
        c.alpha_composite(a, (130, H-a.height-40))
        tx = 640
    else:
        c.alpha_composite(a, (W-a.width-140, H-a.height-40))
        tx = 120
    c.alpha_composite(small_logo(170), (tx, 110))
    text_ls(d, (tx, 330), title, font(58, True), INK, ls=3)
    text_ls(d, (tx+2, 420), sub, font(24), INK2, ls=2)
    text_ls(d, (tx+2, 470), "禁止转载 · 仅限个人使用", font(20), ROSE_D, ls=1)
    c.convert("RGB").save(os.path.join(MAT, "cover-"+("char-long" if flip else "char-bun")+".png"), optimize=True)

def cover_avatars():
    c = base((251,249,246),(245,238,231), [(600,375,420,ROSE_L,120)])
    d = ImageDraw.Draw(c,"RGBA")
    names = ["rose","sage","sand","mist"]
    for i,n in enumerate(names):
        im = Image.open(os.path.join(MAT, f"avatar-{n}.png")).convert("RGB").resize((230,230), Image.LANCZOS)
        x = 130 + (i%2)*250; y = 180 + (i//2)*250
        c.alpha_composite(rounded(im, 24), (x,y))
    text_ls(d, (720, 300), "头像包", font(54, True), INK, ls=3)
    text_ls(d, (722, 386), "四色 · 1024×1024", font(24), INK2, ls=2)
    text_ls(d, (722, 436), "PNG · 直接换上", font(20), ROSE_D, ls=1)
    c.alpha_composite(small_logo(120), (722, 200))
    c.convert("RGB").save(os.path.join(MAT, "cover-avatars.png"), optimize=True)

def cover_phone():
    c = base((252,249,245),(238,222,215), [(950,120,280,ROSE,22)])
    d = ImageDraw.Draw(c,"RGBA")
    pw,ph = 300,600; px,py = 760,70
    d.rounded_rectangle([px-13,py-13,px+pw+13,py+ph+13], radius=46, fill=(232,218,212))
    scr = Image.open(os.path.join(MAT,"wallpaper-phone.png")).convert("RGB")
    scr = crop_center(scr,(pw,ph))
    c.paste(rounded(scr,36),(px,py), rounded(scr,36))
    text_ls(d, (90, 250), "手机壁纸", font(58, True), INK, ls=3)
    text_ls(d, (92, 340), "1080 × 1920", font(24), INK2, ls=2)
    text_ls(d, (92, 400), "锁屏专用 · 禁止转载", font(20), ROSE_D, ls=1)
    c.alpha_composite(small_logo(150), (92, 120))
    c.convert("RGB").save(os.path.join(MAT,"cover-phone.png"), optimize=True)

def cover_stickers():
    c = Image.new("RGB",(W,H),(251,249,246))
    d = ImageDraw.Draw(c)
    for i in range(6):
        st = Image.open(os.path.join(MAT,f"sticker-{i+1}.png")).convert("RGBA").resize((240,240), Image.LANCZOS)
        x = 90 + (i%3)*330; y = 70 + (i//3)*290
        c.paste(st,(x,y),st)
    text_ls(d, (W/2, 655), "辣奶火锅 · 表情包", font(28), INK3, ls=6, center=True)
    c.save(os.path.join(MAT,"cover-stickers.png"), optimize=True)

def cover_obs():
    c = grad((W,H),(90,84,80),(58,53,50)).convert("RGBA")
    d = ImageDraw.Draw(c,"RGBA")
    d.rounded_rectangle([90,90,760,620], radius=14, fill=(38,34,32))
    text_ls(d, (425, 320), "直播画面", font(38), (110,102,97), ls=10, center=True)
    # 缩小叠加边框
    fr = Image.open(os.path.join(MAT,"obs-frame.png")).convert("RGBA")
    fr.thumbnail((900,900), Image.LANCZOS)
    c.alpha_composite(fr, (150, (H-fr.height)//2 - 10))
    text_ls(d, (90, 60), "OBS 直播边框", font(28), (235,229,224), ls=4)
    c.convert("RGB").save(os.path.join(MAT,"cover-obs.png"), optimize=True)

def cover_watermark():
    c = grad((W,H),(226,197,192),(198,139,135)).convert("RGBA")
    d = ImageDraw.Draw(c,"RGBA")
    wm = Image.open(os.path.join(MAT,"watermark.png")).convert("RGBA")
    wm.thumbnail((760,760), Image.LANCZOS)
    c.alpha_composite(wm, ((W-wm.width)//2, 260))
    text_ls(d, (W/2, 170), "水印 & LOGO · 透明 PNG", font(28), (255,255,255), ls=3, center=True)
    c.convert("RGB").save(os.path.join(MAT,"cover-watermark.png"), optimize=True)

def cover_all():
    c = grad((W,H),(250,247,243),(232,218,209)).convert("RGBA")
    d = ImageDraw.Draw(c,"RGBA")
    thumbs = [("wallpaper-cream.png",(0,0)),("cover-avatars.png",(0,0)),("cover-stickers.png",(0,0))]
    for i,name in enumerate(["wallpaper-cream.png","cover-avatars.png","cover-stickers.png"]):
        im = Image.open(os.path.join(MAT,name)).convert("RGB")
        im = crop_center(im,(300,190))
        x = 640 + (i%2)*310; y = 120 + (i//2)*230
        c.alpha_composite(rounded(im,14),(x,y))
    text_ls(d, (80, 240), "全部物料", font(64, True), INK, ls=3)
    text_ls(d, (82, 350), "一次打包 · 免费下载", font(26), INK2, ls=2)
    text_ls(d, (82, 404), "禁止转载", font(20), ROSE_D, ls=2)
    c.alpha_composite(small_logo(150), (80, 100))
    c.convert("RGB").save(os.path.join(MAT,"cover-all.png"), optimize=True)

if __name__ == "__main__":
    cover_char(BUN, "立绘 · 双马尾", "透明 PNG · 1400px")
    cover_char(LONG, "立绘 · 长发", "透明 PNG · 1400px", flip=True)
    cover_avatars(); cover_phone(); cover_stickers(); cover_obs(); cover_watermark(); cover_all()
    for src_name, out in (("wallpaper-cream.png","cover-wp-cream.png"),("wallpaper-rose.png","cover-wp-rose.png"),("brb-screen.png","cover-brb.png")):
        im = Image.open(os.path.join(MAT,src_name)).convert("RGB")
        crop_center(im,(W,H)).save(os.path.join(MAT,out), optimize=True)
    print("covers v2 done")
