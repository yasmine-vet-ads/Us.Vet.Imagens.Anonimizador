"""Independent Pillow checks of synthetic hardening ZIP outputs."""
from pathlib import Path
from io import BytesIO
from zipfile import ZipFile
import json,struct,zlib,re
import numpy as np
from PIL import Image
DIR=Path(__file__).parent;FIX=DIR/"generated"/"fixtures";OUT=DIR/"artifacts"
manifest=json.loads((FIX/"manifest-hardening.json").read_text());report=[]
def verify(browser,label,source,names):
    with ZipFile(OUT/(browser+"-"+label+".zip")) as archive:
        assert archive.namelist()==names
        for name,ref in zip(names,source):
            data=archive.read(name);at=8;chunks=[]
            while at<len(data):
                size=struct.unpack(">I",data[at:at+4])[0];tag=data[at+4:at+8];payload=data[at+8:at+8+size]
                assert zlib.crc32(tag+payload)&0xffffffff==struct.unpack(">I",data[at+8+size:at+12+size])[0];chunks.append(tag)
                if tag==b"IHDR":assert payload[8:10]==bytes([8,2])
                at+=12+size
            assert chunks==[b"IHDR",b"IDAT",b"IEND"] and at==len(data)
            with Image.open(BytesIO(data)) as actual,Image.open(FIX/ref) as expected:
                assert actual.mode=="RGB" and not actual.info
                a=np.array(actual).astype(np.int16);b=np.array(expected.convert("RGB")).astype(np.int16);assert a.shape==b.shape
                delta=np.abs(a-b);maximum=int(delta.max());mean=float(delta.mean());assert maximum<=5 and mean<=0.7
                report.append(dict(browser=browser,zip=label,item=name,max=maximum,mean=mean,rgb8=True,metadata=False))
for browser in ["Chrome","Edge","Firefox"]:
    for c in manifest["cases"]:
        for mode,ref in c["refs"].items():verify(browser,re.sub(r"\W","_",c["name"])+"-"+mode,[ref["file"]],["imagem_anonimizada_001.png"])
    for kind in ["absent","context","decoder"]:verify(browser,"hardening-fallback-"+kind,["direct-rgb-none.png"],["imagem_anonimizada_001.png"])
    for cycle in range(6):verify(browser,"hardening-repeat-"+str(cycle),["gray-jpeg-none.png"]*5+["rgb-none.png"]*5,[f"imagem_anonimizada_{i:03d}.png" for i in range(1,11)])
(OUT/"hardening-export-verification.json").write_text(json.dumps(report,indent=2));print("Hardening independent exports:",len(report),"RGB8 PNGs, valid CRCs, neutral names, no metadata")
