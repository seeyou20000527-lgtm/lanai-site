from PIL import Image, ImageDraw
import os
IMG = r"C:\Users\suya\Documents\deepseek-harness\default-workspace\lanai-huoguo\public\assets\img"
OUT = r"C:\Users\suya\Documents\deepseek-harness\default-workspace\lanai-huoguo\tools"
logo = Image.open(os.path.join(IMG, "logo.png")).convert("RGBA")
W, H = logo.size
print("logo", W, H)

def square_icon(crop_box, size=64, pad=0.9):
    part = logo.crop(crop_box)
    canvas = Image.new("RGBA", (size, size), (251, 249, 246, 255))
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle([0, 0, size-1, size-1], radius=int(size*0.22), fill=(251, 249, 246, 255))
    part.thumbnail((int(size*pad), int(size*pad)), Image.LANCZOS)
    canvas.alpha_composite(part, ((size-part.width)//2, (size-part.height)//2))
    return canvas

# 候选：只取「辣」字
c1 = (60, 280, 520, 760)
# 候选：辣 + 花
c2 = (0, 250, 560, 810)

sheet = Image.new("RGB", (560, 300), (240, 236, 232))
for i, box in enumerate((c1, c2)):
    for j, s in enumerate((64, 128)):
        ic = square_icon(box, s)
        big = ic.resize((s*2, s*2), Image.NEAREST)
        sheet.paste(big.convert("RGB"), (20 + i*280 + j*140, 40))
        small = ic.resize((16, 16), Image.LANCZOS).resize((64, 64), Image.NEAREST)
        sheet.paste(small.convert("RGB"), (20 + i*280 + j*140, 200))
sheet.save(os.path.join(OUT, "icon-alt.png"))
print("ok")
