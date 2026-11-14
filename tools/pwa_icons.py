from PIL import Image
import os
IMG = r"C:\Users\suya\Documents\deepseek-harness\default-workspace\lanai-huoguo\public\assets\img"
src = Image.open(os.path.join(IMG, "avatar.png")).convert("RGBA")
for size in (192, 512):
    bg = Image.new("RGBA", (size, size), (251, 249, 246, 255))
    im = src.copy()
    im.thumbnail((int(size*0.86), int(size*0.86)), Image.LANCZOS)
    bg.alpha_composite(im, ((size-im.width)//2, (size-im.height)//2))
    bg.convert("RGB").save(os.path.join(IMG, f"icon-{size}.png"), optimize=True)
print("icons ok")
