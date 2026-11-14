from PIL import Image, ImageDraw, ImageFont
import os
import gen_v2 as g
from gen_v2 import CREAM, INK, INK3, ROSE, LOGO, grad, soft_circles, text_ls, font, MAT, IMG
W,H = 1200,750
c = grad((W,H),(252,250,247),(241,232,224)).convert("RGBA")
soft_circles(c, [(200,650,260,ROSE,18),(1050,120,240,(239,231,220),90)], 80)
d = ImageDraw.Draw(c,"RGBA")
lg = LOGO.copy(); lg.thumbnail((420,420), Image.LANCZOS)
c.alpha_composite(lg, ((W-lg.width)//2, 250))
text_ls(d, (W/2, 560), "MATERIAL", font(26), INK3, ls=10, center=True)
c.convert("RGB").save(os.path.join(IMG,"material-default.png"), optimize=True)
print("ok")
