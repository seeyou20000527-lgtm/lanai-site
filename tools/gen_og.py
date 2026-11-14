from PIL import Image, ImageDraw
import os, sys
sys.path.insert(0, r"C:\Users\suya\Documents\deepseek-harness\default-workspace\lanai-huoguo\tools")
import gen_v2 as g
from gen_v2 import CREAM, INK, INK2, ROSE, ROSE_D, LOGO, BUN, grad, soft_circles, text_ls, font, IMG, fit_h

W,H = 1200,630
c = grad((W,H),(252,250,247),(240,230,222)).convert("RGBA")
soft_circles(c, [(980,120,260,ROSE,22),(180,560,240,(239,231,220),90)], 80)
d = ImageDraw.Draw(c,"RGBA")
art = fit_h(BUN, 560)
c.alpha_composite(art, (W-art.width-90, H-art.height-10))
lg = LOGO.copy(); lg.thumbnail((420,420), Image.LANCZOS)
c.alpha_composite(lg, (80, 180))
text_ls(d, (86, 380), "一口奶香，两口上头。", font(38), INK2, ls=1)
text_ls(d, (88, 450), "简介 · 月历 · 物料下载 · 二创投稿", font(24), ROSE_D, ls=2)
text_ls(d, (88, 500), "BILIBILI 虚拟主播 · QQ群 858862396", font(20), (156,148,141), ls=1)
c.convert("RGB").save(os.path.join(IMG,"og.png"), optimize=True)
print("og ok")
