# Bộ giải mã QR độc lập (phiên bản 1-6, chế độ byte) để kiểm mã do LaTeX tạo: đọc thông tin định dạng, bỏ mặt nạ,
# đọc từ mã theo đường zigzag, tách khối, kiểm Reed-Solomon (syndrome = 0) rồi đọc dữ liệu.
import sys
M=[list(map(int,l.strip())) for l in open(sys.argv[1]) if l.strip()]; n=len(M); ver=(n-17)//4
FMT={}
def bch(d):
    g=0b10100110111; v=d<<10
    for i in range(14,9,-1):
        if v>>i&1: v^=g<<(i-10)
    return ((d<<10)|v)^0b101010000010010
for d in range(32): FMT[bch(d)]=d
bits=[M[8][i] for i in [0,1,2,3,4,5,7,8]]+[M[i][8] for i in [7,5,4,3,2,1,0]]
f=int(''.join(map(str,bits)),2)
best=min(FMT,key=lambda k:bin(k^f).count('1')); d=FMT[best]; ecl={1:'L',0:'M',3:'Q',2:'H'}[d>>3]; mask=d&7
print('format dist',bin(best^f).count('1'),'ecl',ecl,'mask',mask)
masks=[lambda i,j:(i+j)%2==0,lambda i,j:i%2==0,lambda i,j:j%3==0,lambda i,j:(i+j)%3==0,lambda i,j:(i//2+j//3)%2==0,lambda i,j:(i*j)%2+(i*j)%3==0,lambda i,j:((i*j)%2+(i*j)%3)%2==0,lambda i,j:((i+j)%2+(i*j)%3)%2==0]
F=[[0]*n for _ in range(n)]
def mark(r0,c0,h,w):
    for r in range(r0,r0+h):
        for c in range(c0,c0+w):
            if 0<=r<n and 0<=c<n: F[r][c]=1
mark(0,0,9,9);mark(0,n-8,9,8);mark(n-8,0,8,9)
for i in range(n): F[6][i]=F[i][6]=1
if ver>=2:
    p={2:18,3:22,4:26,5:30,6:34}[ver]; mark(p-2,p-2,5,5)
F[n-8][8]=1
cw=[];bitbuf=[]
c=n-1;up=True
while c>0:
    if c==6: c-=1
    rows=range(n-1,-1,-1) if up else range(n)
    for r in rows:
        for cc in (c,c-1):
            if not F[r][cc]:
                b=M[r][cc]^(1 if masks[mask](r,cc) else 0); bitbuf.append(b)
    up=not up; c-=2
for i in range(0,len(bitbuf)//8*8,8): cw.append(int(''.join(map(str,bitbuf[i:i+8])),2))
# bảng khối (tổng từ mã, số ec mỗi khối, số khối) cho M
T={(1,'M'):(26,10,1),(2,'M'):(44,16,1),(3,'M'):(70,26,1),(4,'M'):(100,18,2),(5,'M'):(134,24,2),(6,'M'):(172,16,4)}
tot,ec,nb=T[(ver,ecl)]; dlen=(tot-ec*nb)//nb
blocks=[[] for _ in range(nb)]; k=0
for i in range(dlen):
    for b in range(nb): blocks[b].append(cw[k]); k+=1
for i in range(ec):
    for b in range(nb): blocks[b].append(cw[k]); k+=1
# GF(256) syndrome
E=[1]*512;L=[0]*256;x=1
for i in range(255): E[i]=x; L[x]=i; x<<=1; x^=0x11d if x&0x100 else 0
for i in range(255,512): E[i]=E[i-255]
def mul(a,b): return 0 if a==0 or b==0 else E[L[a]+L[b]]
okrs=True
for bl in blocks:
    for i in range(ec):
        s=0
        for v in bl: s=mul(s,E[i])^v
        if s: okrs=False
data=[v for bl in blocks for v in bl[:dlen]]
bs=''.join(format(v,'08b') for v in data)
mode=int(bs[:4],2); ln=int(bs[4:12],2); txt=bytes(int(bs[12+8*i:20+8*i],2) for i in range(ln)).decode('utf-8')
print('version',ver,'mode',mode,'rs_ok',okrs,'text',txt)
