"""
TESCAN ESP32 Vehicle CAN Bridge — Hardware Design
Vehicle bus only. OBD-II extension coupler → perfboard.
Parts: Seeed XIAO ESP32C6, SN65HVD230 module, P6KE6.8CA TVS (x2),
       LM2596 buck, 1N5819 Schottky, 3A Pico fuse.
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

FIG_W, FIG_H = 24, 15
fig = plt.figure(figsize=(FIG_W, FIG_H), facecolor='#0d1117')
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, FIG_W)
ax.set_ylim(0, FIG_H)
ax.set_facecolor('#0d1117')
ax.axis('off')

CARD = '#161b22'; BORD = '#30363d'
VEH = '#3fb950'; P12 = '#e3b341'; P5 = '#ff8c00'; P33 = '#58a6ff'
GND = '#6e7681'; BLE = '#a78bfa'; TXT = '#f0f6fc'; TXT2 = '#8b949e'

def rbox(x, y, w, h, edge, face=CARD, lw=2, r=0.12, zo=3):
    ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle=f"round,pad={r}",
                 facecolor=face,edgecolor=edge,linewidth=lw,zorder=zo))
def t(x,y,s,c=TXT,fs=8,ha='center',va='center',bold=False,italic=False):
    ax.text(x,y,s,color=c,fontsize=fs,ha=ha,va=va,fontfamily='monospace',
            fontweight='bold' if bold else 'normal',
            fontstyle='italic' if italic else 'normal',zorder=6)
def dot(x,y,c,s=65): ax.scatter([x],[y],color=c,s=s,zorder=8)
def wire(pts,c,lw=2.4,zo=2):
    xs,ys=zip(*pts)
    ax.plot(xs,ys,color=c,linewidth=lw,
            solid_capstyle='round',solid_joinstyle='round',zorder=zo)
def gnd_sym(x, y, c):
    """GND symbol — connection point is top (y+0.28)"""
    ax.plot([x, x],             [y+0.28, y+0.13], color=c, lw=2,   zorder=7)
    ax.plot([x-0.14, x+0.14],  [y+0.13, y+0.13], color=c, lw=2.5, zorder=7)
    ax.plot([x-0.09, x+0.09],  [y+0.06, y+0.06], color=c, lw=1.8, zorder=7)
    ax.plot([x-0.04, x+0.04],  [y,      y      ], color=c, lw=1.2, zorder=7)
def tvs_sym(x, yc, c):
    """Bidirectional TVS schematic symbol — anode up, cathode bar down"""
    h, w = 0.20, 0.15
    ax.add_patch(plt.Polygon(
        [[x-w, yc+h/2], [x+w, yc+h/2], [x, yc-h/2]],
        closed=True, facecolor=c, edgecolor=c, zorder=6))
    by = yc - h/2
    ax.plot([x-w-0.05, x+w+0.05], [by, by], color=c, lw=2.5, zorder=7)
    ax.plot([x-w-0.05, x-w-0.05], [by-0.06, by+0.06], color=c, lw=2, zorder=7)
    ax.plot([x+w+0.05, x+w+0.05], [by-0.06, by+0.06], color=c, lw=2, zorder=7)

# ─── Title ────────────────────────────────────────────────────────────────────
t(FIG_W/2, 14.55, 'TESCAN  —  ESP32 Vehicle CAN Bridge  —  Hardware Design', TXT, 15, bold=True)
t(FIG_W/2, 14.05,
  'Tesla Model 3 2018  ·  Vehicle Bus (TWAI, bidirectional, 500 kbps)  ·  Bluetooth BLE to Android',
  TXT2, 9.5)

# ─── OBD-II Extension Coupler ─────────────────────────────────────────────────
PX,PY,PW,PH = 0.35,6.2,2.3,6.2
rbox(PX,PY,PW,PH,BORD,'#0f1923',lw=2)
t(PX+PW/2,PY+PH-0.48,'OBD-II',TXT,11,bold=True)
t(PX+PW/2,PY+PH-0.90,'Extension Coupler',TXT2,9)
t(PX+PW/2,PY+PH-1.28,'plug-and-play harness',TXT2,7.5,italic=True)
ax.plot([PX+0.2,PX+PW-0.2],[PY+PH-1.55]*2,color=BORD,linewidth=1)
W_CH=PY+4.5; W_CL=PY+3.4; W_12=PY+1.8; W_GD=PY+0.8
for lbl,c,py in [('CAN-H  (Pin 6)',VEH,W_CH),('CAN-L  (Pin 14)',VEH,W_CL),
                  ('+12V   (Pin 16)',P12,W_12),('GND    (Pin 4)',GND,W_GD)]:
    t(PX+PW/2,py,lbl,c,8); dot(PX+PW,py,c,80)
t(PX+PW/2,PY+PH-2.0,'─ CAN BUS ─',VEH,7.5,bold=True)
t(PX+PW/2,PY+2.45,'─ POWER ─',P12,7.5,bold=True)
PRX = PX+PW  # = 2.65

# ─── P6KE6.8CA TVS Diodes — schematic symbols, shunt to GND ──────────────────
# CAN wires route: CANH horizontal at y=W_CH to x=4.4, then vertical up to y=11.7
#                  CANL horizontal at y=W_CL to x=4.7, then vertical up to y=10.9
# TVS junctions sit on these horizontal runs
T1X = 3.10   # CANH TVS junction x  (on horizontal segment PRX→4.4)
T2X = 4.00   # CANL TVS junction x  (on horizontal segment PRX→4.7)

TVS1_CY   = W_CH - 0.62   # = 10.08 — CANH TVS symbol centre
TVS2_CY   = W_CL - 0.62   # = 8.98  — CANL TVS symbol centre
TVS1_GND  = TVS1_CY - 0.72  # = 9.36 — GND symbol base (top at +0.28 = 9.64)
TVS2_GND  = TVS2_CY - 0.72  # = 8.26 — GND symbol base

# Junction dots
dot(T1X, W_CH, VEH)
dot(T2X, W_CL, VEH)

# CANH → TVS1 → GND  (drop wire crosses CANL line; no dot there = no junction)
wire([(T1X, W_CH),         (T1X, TVS1_CY + 0.12)], VEH, lw=1.8)
tvs_sym(T1X, TVS1_CY, VEH)
wire([(T1X, TVS1_CY-0.14), (T1X, TVS1_GND + 0.28)], GND, lw=1.8)
gnd_sym(T1X, TVS1_GND, GND)
t(T1X+0.28, TVS1_CY+0.12, 'P6KE6.8CA', TXT2, 6.5, ha='left')

# CANL → TVS2 → GND
wire([(T2X, W_CL),         (T2X, TVS2_CY + 0.12)], VEH, lw=1.8)
tvs_sym(T2X, TVS2_CY, VEH)
wire([(T2X, TVS2_CY-0.14), (T2X, TVS2_GND + 0.28)], GND, lw=1.8)
gnd_sym(T2X, TVS2_GND, GND)
t(T2X+0.28, TVS2_CY+0.12, 'P6KE6.8CA', TXT2, 6.5, ha='left')

# ─── SN65HVD230 Module ────────────────────────────────────────────────────────
VTX,VTY,VTW,VTH = 5.4,8.8,4.3,4.5
rbox(VTX,VTY,VTW,VTH,VEH)
t(VTX+VTW/2,VTY+VTH-0.48,'SN65HVD230',VEH,10.5,bold=True)
t(VTX+VTW/2,VTY+VTH-0.90,'3.3V CAN Transceiver  (Module)',TXT2,8)
ax.plot([VTX+0.3,VTX+VTW-0.3],[VTY+VTH-1.15]*2,color=BORD,linewidth=1)
for nm,c,py in [('CANH',VEH,VTY+VTH-1.6),('CANL',VEH,VTY+VTH-2.4),
                (' 3V3',P33,VTY+VTH-3.2),(' GND',GND,VTY+VTH-4.0)]:
    t(VTX+0.1,py,nm,c,8.5,ha='left'); dot(VTX,py,c)
for nm,c,py in [('CTX',VEH,VTY+VTH-1.6),('CRX',VEH,VTY+VTH-2.4)]:
    t(VTX+VTW-0.1,py,nm,c,8.5,ha='right'); dot(VTX+VTW,py,c)
t(VTX+VTW/2,VTY+0.36,'Rs tied to GND on module PCB  (high-speed mode)',TXT2,7.5,italic=True)
t(VTX+VTW/2,VTY+VTH+0.30,'── VEHICLE CAN TRANSCEIVER ──',VEH,8.5,bold=True)
VTRX = VTX+VTW  # = 9.7

# ─── 3A Pico Fuse ─────────────────────────────────────────────────────────────
FX,FY=3.3,5.3
rbox(FX,FY,1.5,0.95,P12,'#0f1923',lw=2)
t(FX+0.75,FY+0.65,'FUSE',P12,9.5,bold=True)
t(FX+0.75,FY+0.26,'3A  Pico',TXT2,7.5)

# ─── 1N5819 Schottky ──────────────────────────────────────────────────────────
DX,DY=5.4,5.57
ax.add_patch(plt.Polygon([[DX,DY+0.44],[DX+0.56,DY+0.22],[DX,DY]],
             closed=True,facecolor=P12,edgecolor=P12,zorder=5))
ax.plot([DX+0.56,DX+0.56],[DY,DY+0.44],color=P12,linewidth=4,solid_capstyle='butt',zorder=5)
t(DX+0.28,DY-0.30,'1N5819',TXT2,7.5)
t(DX+0.28,DY-0.57,'rev. polarity',TXT2,6.5,italic=True)

# ─── LM2596 Buck ──────────────────────────────────────────────────────────────
BX,BY,BW,BH=7.1,4.9,3.0,1.85
rbox(BX,BY,BW,BH,P5,'#0f1923',lw=2)
t(BX+BW/2,BY+BH-0.46,'LM2596  Buck Converter',P5,10,bold=True)
t(BX+BW/2,BY+BH-0.88,'12V  →  5V  regulated',TXT2,8)
t(BX+BW/2,BY+0.34,'◎ inductor  ·  ⊟ feedback resistors',TXT2,7,italic=True)
dot(BX,BY+BH-1.3,P12); t(BX+0.15,BY+BH-1.3,'IN',P12,8,ha='left')
dot(BX+BW,BY+BH-1.3,P5); t(BX+BW-0.15,BY+BH-1.3,'OUT',P5,8,ha='right')
t(BX+BW/2,BY+BH+0.30,'── POWER REGULATION ──',P5,8,bold=True)

# ─── Seeed XIAO ESP32C6 ───────────────────────────────────────────────────────
EX,EY,EW,EH=13.5,4.2,7.5,9.5
rbox(EX,EY,EW,EH,'#58a6ff','#0a1628',lw=3)
t(EX+EW/2,EY+EH-0.50,'Seeed  XIAO  ESP32C6','#58a6ff',13,bold=True)
t(EX+EW/2,EY+EH-0.96,'RISC-V · WiFi 6 · BLE 5.3 · USB-C · 4 MB Flash',TXT2,8.5)
t(EX+EW/2,EY+EH-1.35,'21 × 17.5 mm  ·  castellated pads  ·  thumb-sized',TXT2,8,italic=True)
rbox(EX+0.55,EY+EH-3.3,EW-1.1,1.65,BLE,'#0d0820',lw=1.8,r=0.1)
t(EX+EW/2,EY+EH-2.12,'✦  Bluetooth Low Energy 5.3  ✦',BLE,10.5,bold=True)
t(EX+EW/2,EY+EH-2.57,'Nordic UART Service  (NUS)',BLE,9)
t(EX+EW/2,EY+EH-2.96,'Advertises as:  "TESCAN"',TXT2,8,italic=True)
ax.plot([EX+0.4,EX+EW-0.4],[EY+EH-3.55]*2,color=BORD,linewidth=1.5)
t(EX+EW/2,EY+EH-3.88,'Pin Assignments  (XIAO pad labels)',TXT2,8.5,italic=True)
EP=[('D2  GPIO4  TWAI TX  →  CTX',VEH,EY+EH-4.5),
    ('D3  GPIO5  TWAI RX  ←  CRX',VEH,EY+EH-5.3),
    ('VBUS      +5V in',           P5, EY+EH-6.4),
    ('3V3  →  3V3 (xcvr)',         P33,EY+EH-7.2),
    ('GND   common',               GND,EY+EH-8.0)]
for nm,c,py in EP:
    t(EX+0.18,py,nm,c,9,ha='left'); dot(EX,py,c,80)

# ─── Android Phone ────────────────────────────────────────────────────────────
PHX,PHY,PHW,PHH=22.5,8.0,1.4,2.4
rbox(PHX,PHY,PHW,PHH,BLE,'#0d0820',lw=2,r=0.2)
rbox(PHX+0.14,PHY+0.5,PHW-0.28,PHH-0.78,BLE,'#1a0f30',lw=1,r=0.08)
ax.add_patch(plt.Circle((PHX+PHW/2,PHY+0.3),0.11,
             color=BLE,fill=False,linewidth=1.5,zorder=5))
t(PHX+PHW/2,PHY+PHH+0.38,'Android',BLE,9,bold=True)
t(PHX+PHW/2,PHY+PHH+0.04,'Tescan App',TXT2,7.5)
ax.annotate('',xy=(PHX,PHY+PHH/2),xytext=(EX+EW,EY+EH-2.55),
            arrowprops=dict(arrowstyle='->',color=BLE,lw=2.5,
                            connectionstyle='arc3,rad=-0.2'))
t(21.7,11.1,'BLE',BLE,9.5,bold=True); t(21.7,10.75,'NUS',TXT2,8)

# ─── Wires ────────────────────────────────────────────────────────────────────
# CAN-H: coupler ─[TVS1 junction]─ horizontal ─ vertical(x=4.4) ─ SN65HVD230 CANH
wire([(PRX,W_CH),(4.4,W_CH),(4.4,VTY+VTH-1.6),(VTX,VTY+VTH-1.6)], VEH)

# CAN-L: coupler ─[TVS2 junction]─ horizontal ─ vertical(x=4.7) ─ SN65HVD230 CANL
wire([(PRX,W_CL),(4.7,W_CL),(4.7,VTY+VTH-2.4),(VTX,VTY+VTH-2.4)], VEH, lw=2.2)

# CTX: SN65HVD230 → XIAO D2 (GPIO4)
wire([(VTRX,VTY+VTH-1.6),(11.8,VTY+VTH-1.6),(11.8,EP[0][2]),(EX,EP[0][2])], VEH)
# CRX: SN65HVD230 → XIAO D3 (GPIO5)
wire([(VTRX,VTY+VTH-2.4),(12.1,VTY+VTH-2.4),(12.1,EP[1][2]),(EX,EP[1][2])], VEH, lw=2.2)

# 3V3: XIAO → SN65HVD230  (vertical at x=5.1 — separate from CAN wires)
wire([(EX,EP[3][2]),(5.1,EP[3][2]),(5.1,VTY+VTH-3.2),(VTX,VTY+VTH-3.2)], P33, lw=1.8)

# GND: XIAO → SN65HVD230 → OBD coupler GND
RGND=4.6
wire([(EX,EP[4][2]),(RGND,EP[4][2]),(RGND,VTY+VTH-4.0),(VTX,VTY+VTH-4.0)], GND, lw=1.8)
wire([(RGND,EP[4][2]),(RGND,W_GD),(PRX,W_GD)], GND, lw=2)

# Power: OBD +12V → Pico fuse → 1N5819 → LM2596 → XIAO VBUS
wire([(PRX,W_12),(3.0,W_12),(3.0,FY+0.48),(FX,FY+0.48)], P12)
wire([(FX+1.5,FY+0.48),(DX,FY+0.48),(DX,DY+0.22)], P12)
wire([(DX+0.56,DY+0.22),(BX,DY+0.22),(BX,BY+BH-1.3)], P5)
wire([(BX+BW,BY+BH-1.3),(12.4,BY+BH-1.3),(12.4,EP[2][2]),(EX,EP[2][2])], P5)

# ─── Legend ───────────────────────────────────────────────────────────────────
LX,LY,LW,LH=0.35,0.35,12.6,3.5
rbox(LX,LY,LW,LH,BORD,'#0f1520',lw=1.5)
t(LX+LW/2,LY+LH-0.42,'WIRE  COLOR  LEGEND',TXT2,9,bold=True)
for i,(c,lbl) in enumerate([
        (VEH,'Vehicle CAN  (CANH / CANL  and  CTX / CRX to XIAO)'),
        (BLE,'Bluetooth LE  (NUS — wirelessly to Android)'),
        (P12,'+12V  OBD-II Pin 16  →  Pico Fuse  →  1N5819 Schottky'),
        (P5, '+5V  regulated  (LM2596 out  →  XIAO VBUS)'),
        (P33,'+3.3V  (XIAO 3V3 pin  →  SN65HVD230 3V3)'),
        (GND,'GND  common  (OBD-II Pin 4  →  all components)')]):
    ry=LY+LH-0.92-i*0.40
    ax.plot([LX+0.3,LX+1.25],[ry,ry],color=c,linewidth=4,solid_capstyle='round')
    t(LX+1.45,ry,lbl,TXT2,8,ha='left')

# ─── Parts list ───────────────────────────────────────────────────────────────
NX,NY,NW,NH=13.5,0.35,10.1,3.5
rbox(NX,NY,NW,NH,BORD,'#0f1520',lw=1.5)
t(NX+NW/2,NY+NH-0.45,'PARTS  LIST  &  INSTALL  NOTE',TXT2,9,bold=True)
for i,(c,note) in enumerate([
        (P33,'Seeed XIAO ESP32C6  ·  SN65HVD230 module  (blue PCB)'),
        (VEH,'P6KE6.8CA TVS x2  (DO-15 axial)  ·  1N5819 x1  ·  LM2596'),
        (P12,'3A Pico fuse  ·  prototype through-hole perfboard'),
        (TXT,'Coupler into rear center console OBD-II port — plug & play'),
        (TXT,'CAN-H / CAN-L / +12V / GND pigtails straight to board'),
        (TXT2,'Chassis bus: future satellite XIAO under seat (separate)')]):
    t(NX+NW/2,NY+NH-0.95-i*0.41,note,c,7.8)

plt.savefig('/home/user/Tescan/hardware_design.png',dpi=180,
            bbox_inches='tight',facecolor='#0d1117',edgecolor='none')
print("Saved hardware_design.png")
