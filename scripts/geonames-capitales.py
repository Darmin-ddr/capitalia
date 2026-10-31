import sys
b=open(sys.argv[1],'rb').read()
pos=0
def varint():
    global pos
    r=s=0
    while True:
        x=b[pos];pos+=1;r|=(x&0x7f)<<s;s+=7
        if x<0x80:return r
def zz(n):return (n>>1)^-(n&1)
lon=lat=0
want={'AL','BA','BG','HR','SI','GR','MK','ME','RS','XK'}
while pos<len(b):
    end=varint()+pos;c={}
    while pos<end:
        k=varint();tag,wt=k>>3,k&7
        if wt==2:
            n=varint();v=b[pos:pos+n].decode();pos+=n;c[tag]=v
        else:
            v=varint()
            if tag==10: lon+=zz(v);c['lon']=lon/1e5
            elif tag==11: lat+=zz(v);c['lat']=lat/1e5
            elif tag==1: c['id']=zz(v)
            else: c[tag]=v
    if c.get(7)=='PPLC' and c.get(3) in want:
        print(c[3],c[2],c['id'],c['lon'],c['lat'])
