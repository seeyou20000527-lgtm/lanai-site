from PIL import Image, ImageDraw
import os
IMG = r"C:\Users\suya\Documents\deepseek-harness\default-workspace\lanai-huoguo\public\assets\img"
OUT = r"C:\Users\suya\Documents\deepseek-harness\default-workspace\lanai-huoguo\tools"
logo = Image.open(os.path.join(IMG, "logo.png")).convert("RGBA")
bb = logo.getchannel("A").getbbox()
print("alpha bbox", bb)
content = logo.crop(bb)
print("content", content.size)

def make(part, size, bg=(251,249,246,255), pad=0.88):
    canvas = Image.new("RGBA", (size, size), (0,0,0,0))
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle([0,0,size-1,size-1], radius=int(size*0.22), fill=bg)
    p = part.copy()
    p.thumbnail((int(size*pad), int(size*pad)), Image.LANCZOS)
    canvas.alpha_composite(p, ((size-p.width)//2, (size-p.height)//2))
    return canvas

cands = {
  "full": content,
  "la": logo.crop((40, 60, 300, 340)),
  "flower": logo.crop((0, 40, 190, 230)),
}
sheet = Image.new("RGB", (3*220+40, 320), (238, 234, 230))
for i, (name, part) in enumerate(cands.items()):
    x = 20 + i*220
    sheet.paste(make(part, 96).convert("RGB"), (x, 20))
    sheet.paste(make(part, 32).resize((96,96), Image.NEAREST).convert("RGB"), (x, 130))
    d = ImageDraw.Draw(sheet)
    d.text((x, 245), name, fill=(60,50,45))
sheet.save(os.path.join(OUT, "icon-cands.png"))
print("ok")
