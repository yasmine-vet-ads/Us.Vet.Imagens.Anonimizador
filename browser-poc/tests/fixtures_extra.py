"""Additional synthetic formats and kernels; does not mutate the initial corpus."""
from pathlib import Path
from io import BytesIO
import json, struct, sys, zlib
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"app"))
from anonimizador import anonymize_image,image_to_bytes
from fluxo import Entrada,decodificar,validar_lote
OUT=Path(__file__).parent/"generated"/"fixtures"
def chunk(name,data):
    name=name.encode();return struct.pack(">I",len(data))+name+data+struct.pack(">I",zlib.crc32(name+data)&0xffffffff)
def png(w,h,depth,color,raw,interlace=0):
    ihdr=struct.pack(">IIBBBBB",w,h,depth,color,0,0,interlace)
    return b"\x89PNG\r\n\x1a\n"+chunk("IHDR",ihdr)+chunk("IDAT",zlib.compress(raw))+chunk("IEND",b"")
def pattern(w,h):
    y,x=np.indices((h,w));return np.stack(((x*7+y*3)%256,(x*2+y*11)%256,((x//7+y//9)%2)*190+(x+y)%65),axis=2).astype(np.uint8)
CONFIGS=[
 ("none",dict(mode="Tarja preta",top_percent=0,bottom_percent=0,left_percent=0,right_percent=0)),
 ("all",dict(mode="Tarja preta",top_percent=10,bottom_percent=10,left_percent=10,right_percent=10)),
 ("blur",dict(mode="Desfoque",top_percent=40,bottom_percent=40,left_percent=40,right_percent=40)),
 ("pixel",dict(mode="Pixelização",top_percent=40,bottom_percent=27,left_percent=19,right_percent=13))]
cases=[];invalid=[]
def add(name,data):
    (OUT/name).write_bytes(data);im=decodificar(Entrada(name,data));base=name.rsplit(".",1)[0]
    (OUT/(base+".rgb")).write_bytes(np.array(im).tobytes());refs={}
    for mode,config in CONFIGS:
        dest=base+"-"+mode+".png";(OUT/dest).write_bytes(image_to_bytes(anonymize_image(im,**config)));refs[mode]={"file":dest,"config":config}
    cases.append({"name":name,"width":im.width,"height":im.height,"raw":base+".rgb","refs":refs})
def save(im,**kw):
    buf=BytesIO();im.save(buf,format="PNG",**kw);return buf.getvalue()
add("kernel.png",save(Image.fromarray(pattern(256,240))))
for depth in [1,2,4]:
    w,h=17,13;raw=bytearray()
    for y in range(h):
        samples=[(x+y)%(1<<depth) for x in range(w)];row=bytearray((w*depth+7)//8)
        for x,value in enumerate(samples):row[x*depth//8]|=value<<(8-depth-(x*depth%8))
        raw+=b"\x00"+row
    add("gray"+str(depth)+"bit.png",png(w,h,depth,0,raw))
for color,channels in [(2,3),(4,2),(6,4)]:
    w,h=19,17;values=np.arange(w*h*channels,dtype=np.uint16).reshape(h,w,channels)*43
    raw=b"".join(b"\x00"+values[y].astype(">u2").tobytes() for y in range(h))
    add("color"+str(color)+"16bit.png",png(w,h,16,color,raw))
# Adam7 passes, preserve hidden alpha and palette-independent RGB.
for color,channels in [(2,3),(6,4)]:
    w,h=23,19;pixels=pattern(w,h)
    if channels==4:pixels=np.dstack((pixels,(np.indices((h,w))[1]*11).astype(np.uint8)))
    raw=b""
    for sx,sy,dx,dy in [(0,0,8,8),(4,0,8,8),(0,4,4,8),(2,0,4,4),(0,2,2,4),(1,0,2,2),(0,1,1,2)]:
        part=pixels[sy::dy,sx::dx]
        if part.shape[0] and part.shape[1]:raw+=b"".join(b"\x00"+row.tobytes() for row in part)
    add("adam7-"+str(color)+".png",png(w,h,8,color,raw,1))
# Real two-frame APNG plus APNG with a default image outside the animation.
for default in [False,True]:
    buf=BytesIO();first=Image.fromarray(pattern(19,17));second=Image.new("RGB",(19,17),"red")
    first.save(buf,format="PNG",save_all=True,append_images=[second],duration=100,loop=0,default_image=default)
    name="real-apng-"+str(default)+".png";data=buf.getvalue();(OUT/name).write_bytes(data)
    invalid.append({"name":name,"pythonRejects":bool(validar_lote([Entrada(name,data)]))})
(OUT/"manifest-extra.json").write_text(json.dumps({"cases":cases,"invalid":invalid,"pillow":Image.__version__},indent=2))
print("Extra corpus:",len(cases),"valid,",len(invalid),"APNG rejected")
