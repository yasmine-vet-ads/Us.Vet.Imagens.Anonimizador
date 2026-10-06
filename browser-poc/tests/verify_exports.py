"""Independent Pillow/OpenCV checks of the real downloaded browser ZIPs."""
from pathlib import Path
from io import BytesIO
from zipfile import ZipFile
import json, struct, sys, zlib
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"app"))
from fluxo import Entrada,decodificar
from anonimizador import anonymize_image
DIR=Path(__file__).parent
OUT=DIR/"artifacts";FIX=DIR/"generated"/"fixtures"
stress="--stress" in sys.argv
kind="stress" if stress else "functional"
source=decodificar(Entrada(kind+".png",(FIX/(kind+".png")).read_bytes()))
report=[]
for browser in ["Chrome","Edge","Firefox"]:
    for mode in (["tarja"] if stress else ["tarja","desfoque","pixelizacao"]):
        expected=np.array(anonymize_image(source,mode=mode))
        for count in [1,5,10]:
            name=browser+"-"+mode+"-"+str(count)+("-stress" if stress else "")+".zip"
            with ZipFile(OUT/name) as archive:
                assert len(archive.namelist())==count
                for i,entry in enumerate(archive.infolist(),1):
                    assert entry.filename==f"imagem_anonimizada_{i:03d}.png"
                    assert entry.compress_type==0
                    data=archive.read(entry);assert data[:8]==b"\x89PNG\r\n\x1a\n"
                    at=8;chunks=[]
                    while at<len(data):
                        size=struct.unpack(">I",data[at:at+4])[0];tag=data[at+4:at+8]
                        payload=data[at+8:at+8+size];checksum=struct.unpack(">I",data[at+8+size:at+12+size])[0]
                        assert zlib.crc32(tag+payload)&0xffffffff==checksum
                        chunks.append(tag.decode())
                        if tag==b"IHDR":
                            w,h,depth,color,compression,filtering,interlace=struct.unpack(">IIBBBBB",payload)
                            assert (w,h)==source.size and depth==8 and color==2
                        at+=size+12
                    assert chunks==["IHDR","IDAT","IEND"]
                    with Image.open(BytesIO(data)) as image:
                        image.load();assert image.mode=="RGB"
                        pixels=np.array(image)
                    error=np.abs(pixels.astype(np.int16)-expected.astype(np.int16))
                    maximum=int(error.max());mean=float(error.mean())
                    assert maximum<=(2 if mode!="tarja" else 0) and mean<=(.5 if mode!="tarja" else 0)
                    report.append({"zip":name,"item":i,"width":w,"height":h,"max":maximum,"mean":mean,"rgb":True,"chunks":chunks})
                    del pixels,error,data
            print(browser,mode,count,"verified by Pillow/OpenCV")
(OUT/("stress-export-verification.json" if stress else "functional-export-verification.json")).write_text(json.dumps(report,indent=2))
