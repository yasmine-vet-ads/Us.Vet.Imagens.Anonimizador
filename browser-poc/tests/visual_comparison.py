"""Compose synthetic Python/browser evidence for human inspection."""
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
from PIL import Image, ImageDraw, ImageChops
DIR=Path(__file__).parent
OUT=DIR/"artifacts"
images=[]
for mode in ["blur","pixel"]:
    name="kernel-"+mode+".png"
    reference=Image.open(DIR/"generated"/"fixtures"/name).convert("RGB")
    with ZipFile(OUT/("Chrome-kernel_png-"+mode+".zip")) as z:
        browser=Image.open(BytesIO(z.read("imagem_anonimizada_001.png"))).convert("RGB")
    difference=ImageChops.difference(reference,browser)
    scaled=difference.point(lambda v:min(255,v*64))
    row=Image.new("RGB",(reference.width*3,reference.height+36),"white")
    draw=ImageDraw.Draw(row)
    for i,(label,im) in enumerate([("Python / "+mode,reference),("Browser / "+mode,browser),("Difference x64",scaled)]):
        draw.text((i*reference.width+8,10),label,fill="black");row.paste(im,(i*reference.width,36))
    images.append(row)
result=Image.new("RGB",(images[0].width,sum(i.height for i in images)),"white");y=0
for im in images:result.paste(im,(0,y));y+=im.height
result.save(OUT/"python-browser-comparison.png")
print("Synthetic comparison:",OUT/"python-browser-comparison.png")
