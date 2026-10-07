"""Synthetic JPEG corpus; YCCK is encoded from constant DCT blocks, not relabeled CMYK."""
from pathlib import Path
from io import BytesIO
import json, struct, sys
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"app"))
from fluxo import Entrada,decodificar
from anonimizador import anonymize_image,image_to_bytes
OUT=Path(__file__).parent/"generated"/"fixtures"
OUT.mkdir(parents=True,exist_ok=True)
def segment(marker,payload):return bytes([255,marker])+struct.pack(">H",len(payload)+2)+payload
def constant_ycck():
    # Four independent 8x8 DCT blocks, DC=0, all AC=0 -> samples=128.
    adobe=b"Adobe"+struct.pack(">HHH",100,0,0)+bytes([2])
    quant=bytes([0])+bytes([1])*64
    sof=bytes([8])+struct.pack(">HHB",8,8,4)+b"".join(bytes([i,17,0]) for i in range(1,5))
    huffman=b"".join(bytes([kind,1])+bytes(15)+bytes([0]) for kind in [0,16])
    sos=bytes([4])+b"".join(bytes([i,0]) for i in range(1,5))+bytes([0,63,0])
    return b"\xff\xd8"+segment(238,adobe)+segment(219,quant)+segment(192,sof)+segment(196,huffman)+segment(218,sos)+bytes([0])+b"\xff\xd9"
y,x=np.indices((75,125));rgb=np.stack(((x*7+y*3)%256,(x*2+y*11)%256,((x//7+y//9)%2)*190+(x+y)%65),axis=2).astype(np.uint8)
def save(im,**kw):
    buf=BytesIO();im.save(buf,format="JPEG",quality=95,subsampling=0,**kw);return buf.getvalue()
inputs={"gray-jpeg.jpg":save(Image.fromarray(rgb[:,:,0])),"gray-progressive.jpg":save(Image.fromarray(rgb[:,:,0]),progressive=True),"direct-rgb.jpg":save(Image.fromarray(rgb),keep_rgb=True),"cmyk.jpg":save(Image.fromarray(rgb).convert("CMYK")),"ycck.jpg":constant_ycck()}
baseline=save(Image.fromarray(rgb));at=baseline.index(b"\xff\xc0");inputs["extended-sequential.jpg"]=baseline[:at+1]+bytes([193])+baseline[at+2:]
configs=[("none",dict(mode="Tarja preta",top_percent=0,bottom_percent=0,left_percent=0,right_percent=0)),("all",dict(mode="Tarja preta",top_percent=10,bottom_percent=10,left_percent=10,right_percent=10)),("blur",dict(mode="Desfoque",top_percent=40,bottom_percent=27,left_percent=19,right_percent=13)),("pixel",dict(mode="Pixelização",top_percent=40,bottom_percent=27,left_percent=19,right_percent=13))]
cases=[];rejected=[]
for name,data in inputs.items():
    (OUT/name).write_bytes(data)
    with Image.open(BytesIO(data)) as source:
        source.load();mode=source.mode;transform=source.info.get("adobe_transform")
    im=decodificar(Entrada(name,data));base=name.rsplit(".",1)[0];(OUT/(base+".rgb")).write_bytes(np.array(im).tobytes())
    if name in ["cmyk.jpg","ycck.jpg"]:
        if name=="ycck.jpg":assert mode=="CMYK" and transform==2 and im.size==(8,8)
        rejected.append(dict(name=name,pythonMode=mode,adobeTransform=transform,pythonAccepts=True,width=im.width,height=im.height,raw=base+".rgb"));continue
    refs={}
    for kind,config in configs:
        filename=base+"-"+kind+".png";(OUT/filename).write_bytes(image_to_bytes(anonymize_image(im,**config)));refs[kind]=dict(file=filename,config=config)
    cases.append(dict(name=name,width=im.width,height=im.height,raw=base+".rgb",refs=refs))
(OUT/"manifest-hardening.json").write_text(json.dumps(dict(cases=cases,rejected=rejected,pillow=Image.__version__,ycckConstruction="constant four-component DCT blocks; native Adobe transform 2"),indent=2))
print("Hardening JPEG corpus:",len(cases),"supported;",len(rejected),"Python accepts / MVP rejects")
