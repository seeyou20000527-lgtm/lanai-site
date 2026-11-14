from PIL import Image, ImageDraw
import os
IMG = r"C:\Users\suya\Documents\deepseek-harness\default-workspace\lanai-huoguo\public\assets\img"
OUT = r"C:\Users\suya\Documents\deepseek-harness\default-workspace\lanai-huoguo\tools"
logo = Image.open(os.path.join(IMG, "logo.png")).convert("RGBA")
print("logo", logo.size)
logo.convert("RGB").save(os.path.join(OUT, "logo-now.png"))
