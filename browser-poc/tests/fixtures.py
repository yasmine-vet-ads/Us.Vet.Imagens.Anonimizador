"""Synthetic inputs only. Calls the untouched Python reference at the pinned base."""
from pathlib import Path
from io import BytesIO
import json, struct, sys, zlib
import numpy as np
import cv2
from PIL import Image, ImageCms, PngImagePlugin
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "app"))
from anonimizador import anonymize_image, image_to_bytes
from fluxo import Entrada, decodificar, validar_lote
OUT = Path(__file__).parent / "generated" / "fixtures"
OUT.mkdir(parents=True, exist_ok=True)
SENTINELS = ["PATIENT_TEST_123", "OWNER_TEST_456", "CLINIC_TEST_789", "PRIVACY_TEST_7F2A9C", "PACIENTE-TESTE-PRIVACIDADE-7F2A9C"]
def pattern(w, h):
    y,x=np.indices((h,w),dtype=np.uint32)
    return np.stack(((x*7+y*3)%256,(x*2+y*11)%256,((x//7+y//9)%2)*190+(x+y)%65),axis=2).astype(np.uint8)
def chunk(name, data):
    name=name.encode("ascii")
    return struct.pack(">I",len(data))+name+data+struct.pack(">I",zlib.crc32(name+data)&0xffffffff)
def png_extra(data, chunks):
    return data[:33]+b"".join(chunk(k,v) for k,v in chunks)+data[33:]
def save(im, fmt="PNG", **kw):
    b=BytesIO(); im.save(b,format=fmt,**kw); return b.getvalue()
def exif(orientation=1):
    e=Image.Exif();e[274]=orientation;e[270]=SENTINELS[0];e[315]=SENTINELS[1];e[306]="2026:10:06 12:00:00"
    e[34853]={1:"N",2:(1.0,2.0,3.0),3:"E",4:(4.0,5.0,6.0)}
    e[34665]={37510:b"ASCII\x00\x00\x00"+SENTINELS[2].encode()}
    return e
profile=ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()+SENTINELS[3].encode()
cases=[];invalid=[]
configs=[("none",dict(mode="Tarja preta",top_percent=0,bottom_percent=0,left_percent=0,right_percent=0)),
 ("top",dict(mode="Tarja preta",top_percent=10,bottom_percent=0,left_percent=0,right_percent=0)),
 ("bottom",dict(mode="Tarja preta",top_percent=0,bottom_percent=10,left_percent=0,right_percent=0)),
 ("left",dict(mode="Tarja preta",top_percent=0,bottom_percent=0,left_percent=10,right_percent=0)),
 ("right",dict(mode="Tarja preta",top_percent=0,bottom_percent=0,left_percent=0,right_percent=10)),
 ("all",dict(mode="Tarja preta",top_percent=10,bottom_percent=10,left_percent=10,right_percent=10)),
 ("blur",dict(mode="Desfoque",top_percent=40,bottom_percent=27,left_percent=19,right_percent=13)),
 ("pixel",dict(mode="Pixelização",top_percent=40,bottom_percent=27,left_percent=19,right_percent=13))]
def add(name, data, selected=None):
    (OUT/name).write_bytes(data)
    im=decodificar(Entrada(name,data)); base=name.rsplit(".",1)[0]
    (OUT/(base+".rgb")).write_bytes(np.array(im).tobytes())
    refs={}
    for kind,config in (selected or configs):
        result=anonymize_image(im,**config)
        dest=base+"-"+kind+".png";(OUT/dest).write_bytes(image_to_bytes(result))
        refs[kind]={"file":dest,"config":config}
    cases.append({"name":name,"width":im.width,"height":im.height,"raw":base+".rgb","refs":refs})
rgb=pattern(125,75)
add("rgb.png",save(Image.fromarray(rgb)))
add("round.png",save(Image.fromarray(pattern(25,35))))
add("thin.png",save(Image.fromarray(pattern(1,17))))
for kind,alpha in [("opaque",np.full((75,125),255,dtype=np.uint8)),("partial",np.indices((75,125))[1].astype(np.uint8)*2),("transparent",np.zeros((75,125),dtype=np.uint8))]:
    add(kind+".png",save(Image.fromarray(np.dstack((rgb,alpha)))))
add("gray.png",save(Image.fromarray(rgb[:,:,0])))
pal=Image.fromarray(rgb).quantize(colors=16)
add("palette.png",save(pal,transparency=0))
add("gray16.png",save(Image.fromarray((np.indices((23,31))[1]*100).astype(np.uint16))))
for orientation in range(1,9):
    data=save(Image.fromarray(rgb),"JPEG",quality=95,subsampling=0,exif=exif(orientation),icc_profile=profile)
    xmp=b"http://ns.adobe.com/xap/1.0/\x00"+("<x:xmpmeta>"+SENTINELS[3]+"</x:xmpmeta>").encode()
    com=SENTINELS[4].encode()
    data=data[:2]+b"\xff\xe1"+struct.pack(">H",len(xmp)+2)+xmp+b"\xff\xfe"+struct.pack(">H",len(com)+2)+com+data[2:]
    add("orientation"+str(orientation)+(".jpg" if orientation%2 else ".jpeg"),data,[configs[0],configs[5],configs[6],configs[7]])
add("progressive.jpg",save(Image.fromarray(rgb),"JPEG",quality=92,progressive=True))
info=PngImagePlugin.PngInfo()
info.add_text("Patient",SENTINELS[0])
info.add_text("Owner",SENTINELS[1],zip=True)
info.add_itxt("Clinic",SENTINELS[2])
info.add_itxt("XML:com.adobe.xmp","<x:xmpmeta>"+SENTINELS[3]+"</x:xmpmeta>")
info.add_text("Privacy",SENTINELS[4])
meta=save(Image.fromarray(rgb),pnginfo=info,exif=exif(),icc_profile=profile,dpi=(96,96))
meta=png_extra(meta,[("tIME",struct.pack(">HBBBBB",2026,10,6,12,0,0))])
add("PACIENTE-TESTE-PRIVACIDADE-7F2A9C.png",meta)
def bad(name,data):
    (OUT/name).write_bytes(data)
    errors=validar_lote([Entrada(name,data)])
    invalid.append({"name":name,"pythonRejects":bool(errors)})
bad("fake.jpg",save(Image.fromarray(rgb)))
bad("incompatible.png",save(Image.fromarray(rgb),"GIF"))
bad("broken.png",b"not an image")
good=save(Image.fromarray(rgb))
corrupt=bytearray(good);corrupt[len(corrupt)//2]^=1
bad("crc.png",corrupt);bad("truncated.png",good[:-8])
jpeg=save(Image.fromarray(rgb),"JPEG")
bad("truncated.jpg",jpeg[:-12])
bad("empty.png",b"")
bad("apng.png",png_extra(good,[("acTL",struct.pack(">II",2,0))]))
oversized=bytearray(good[:33]);oversized[16:20]=struct.pack(">I",100000);oversized[20:24]=struct.pack(">I",100000)
oversized[29:33]=struct.pack(">I",zlib.crc32(oversized[12:29])&0xffffffff)
bad("oversized.png",bytes(oversized)+good[33:])
bad("extension.txt",good)
# CRC-valid but zlib-invalid and short pixel stream must still fail real decoding.
bad("zlib.png",good[:33]+chunk("IDAT",b"invalid zlib")+chunk("IEND",b""))
bad("short-data.png",good[:33]+chunk("IDAT",zlib.compress(b"\x00\x00"))+chunk("IEND",b""))
for w,h,kind in [(1600,1200,"functional"),(4000,3000,"stress")]:
    data=save(Image.fromarray(pattern(w,h)))
    (OUT/(kind+".png")).write_bytes(data)
manifest={"cases":cases,"invalid":invalid,"sentinels":SENTINELS,"pillow":Image.__version__,"opencv":cv2.__version__,"numpy":np.__version__,"pythonMaxPixels":Image.MAX_IMAGE_PIXELS}
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf8")
print(json.dumps({"cases":len(cases),"invalid":len(invalid),"pythonMaxPixels":Image.MAX_IMAGE_PIXELS}))
