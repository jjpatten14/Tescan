"""
TESCAN ESP32 Vehicle CAN Bridge — Hardware Design
Vehicle bus only. Input: OBD-II extension coupler (4 pigtail wires).
BLE (Nordic UART Service) to Android.
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

# Title
t(FIG_W/2,14.55,'TESCAN  —  ESP32 Vehicle CAN Bridge  —  Hardware Design',TXT,15,bold=True)
t(FIG_W/2,14.05,
  'Tesla Model 3 2018  ·  Vehicle Bus (TWAI, bidirectional, 500 kbps)  ·  Bluetooth BLE to Android',
  TXT2,9.5)

# OBD-II Extension Coupler
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
PRX=PX+PW

# TVS diode PESD2CAN
TVX,TVY=3.3,9.65
rbox(TVX,TVY,1.1,1.1,VEH,'#0f1923',lw=1.5)
t(TVX+0.55,TVY+0.80,'TVS',VEH,8,bold=True)
t(TVX+0.55,TVY+0.42,'PESD2CAN',TXT2,6.5)
t(TVX+0.55,TVY+0.14,'CAN ESD',TXT2,6,italic=True)

# SN65HVD230
VTX,VTY,VTW,VTH = 5.4,8.8,4.3,4.5
rbox(VTX,VTY,VTW,VTH,VEH)
t(VTX+VTW/2,VTY+VTH-0.48,'SN65HVD230',VEH,10.5,bold=True)
t(VTX+VTW/2,VTY+VTH-0.90,'3.3V CAN Transceiver  (DIP-8)',TXT2,8)
ax.plot([VTX+0.3,VTX+VTW-0.3],[VTY+VTH-1.15]*2,color=BORD,linewidth=1)
for nm,c,py in [('CANH',VEH,VTY+VTH-1.6),('CANL',VEH,VTY+VTH-2.4),
                (' VCC',P33,VTY+VTH-3.2),(' GND',GND,VTY+VTH-4.0)]:
    t(VTX+0.1,py,nm,c,8.5,ha='left'); dot(VTX,py,c)
for nm,c,py in [('TXD',VEH,VTY+VTH-1.6),('RXD',VEH,VTY+VTH-2.4)]:
    t(VTX+VTW-0.1,py,nm,c,8.5,ha='right'); dot(VTX+VTW,py,c)
t(VTX+VTW/2,VTY+0.36,'Rs → GND  (high-speed mode)',TXT2,7.5,italic=True)
t(VTX+VTW/2,VTY+VTH+0.30,'── VEHICLE CAN TRANSCEIVER ──',VEH,8.5,bold=True)
VTRX=VTX+VTW

# Fuse
FX,FY=3.3,5.3
rbox(FX,FY,1.5,0.95,P12,'#0f1923',lw=2)
t(FX+0.75,FY+0.65,'FUSE',P12,9.5,bold=True)
t(FX+0.75,FY+0.26,'3A  ATO',TXT2,7.5)

# 1N5819 Schottky
DX,DY=5.4,5.57
ax.add_patch(plt.Polygon([[DX,DY+0.44],[DX+0.56,DY+0.22],[DX,DY]],
             closed=True,facecolor=P12,edgecolor=P12,zorder=5))
ax.plot([DX+0.56,DX+0.56],[DY,DY+0.44],color=P12,linewidth=4,solid_capstyle='butt',zorder=5)
t(DX+0.28,DY-0.30,'1N5819',TXT2,7.5)
t(DX+0.28,DY-0.57,'rev. polarity',TXT2,6.5,italic=True)

# LM2596 Buck
BX,BY,BW,BH=7.1,4.9,3.0,1.85
rbox(BX,BY,BW,BH,P5,'#0f1923',lw=2)
t(BX+BW/2,BY+BH-0.46,'LM2596  Buck Converter',P5,10,bold=True)
t(BX+BW/2,BY+BH-0.88,'12V  →  5V  regulated',TXT2,8)
t(BX+BW/2,BY+0.34,'◎ inductor  ·  ⊟ feedback resistors',TXT2,7,italic=True)
dot(BX,BY+BH-1.3,P12); t(BX+0.15,BY+BH-1.3,'IN',P12,8,ha='left')
dot(BX+BW,BY+BH-1.3,P5); t(BX+BW-0.15,BY+BH-1.3,'OUT',P5,8,ha='right')
t(BX+BW/2,BY+BH+0.30,'── POWER REGULATION ──',P5,8,bold=True)

# ESP32
EX,EY,EW,EH=13.5,4.2,7.5,9.5
rbox(EX,EY,EW,EH,'#58a6ff','#0a1628',lw=3)
t(EX+EW/2,EY+EH-0.50,'ESP32  DevKit V1','#58a6ff',13,bold=True)
t(EX+EW/2,EY+EH-0.96,'38-pin · 240 MHz dual-core · 520 KB SRAM',TXT2,8.5)
t(EX+EW/2,EY+EH-1.35,'CP2102 USB-Serial  ·  Micro-USB',TXT2,8,italic=True)
rbox(EX+0.55,EY+EH-3.3,EW-1.1,1.65,BLE,'#0d0820',lw=1.8,r=0.1)
t(EX+EW/2,EY+EH-2.12,'✦  Bluetooth Low Energy  ✦',BLE,10.5,bold=True)
t(EX+EW/2,EY+EH-2.57,'Nordic UART Service  (NUS)',BLE,9)
t(EX+EW/2,EY+EH-2.96,'Advertises as:  "TESCAN"',TXT2,8,italic=True)
ax.plot([EX+0.4,EX+EW-0.4],[EY+EH-3.55]*2,color=BORD,linewidth=1.5)
t(EX+EW/2,EY+EH-3.88,'GPIO Assignments',TXT2,8.5,italic=True)
EP=[('GPIO 21  TWAI TX',VEH,EY+EH-4.5),('GPIO 22  TWAI RX',VEH,EY+EH-5.3),
    ('VIN       +5V in',P5, EY+EH-6.4),('3.3V  xcvr pwr',  P33,EY+EH-7.2),
    ('GND   common',    GND,EY+EH-8.0)]
for nm,c,py in EP:
    t(EX+0.18,py,nm,c,9.5,ha='left'); dot(EX,py,c,80)

# Android phone
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

# Wires
wire([(PRX,W_CH),(TVX,W_CH),(TVX+0.55,W_CH),(TVX+0.55,VTY+VTH-1.6),(VTX,VTY+VTH-1.6)],VEH)
wire([(PRX,W_CL),(4.9,W_CL),(4.9,VTY+VTH-2.4),(VTX,VTY+VTH-2.4)],VEH,lw=2.2)
wire([(VTRX,VTY+VTH-1.6),(11.8,VTY+VTH-1.6),(11.8,EP[0][2]),(EX,EP[0][2])],VEH)
wire([(VTRX,VTY+VTH-2.4),(12.1,VTY+VTH-2.4),(12.1,EP[1][2]),(EX,EP[1][2])],VEH,lw=2.2)
R33=4.9
wire([(EX,EP[3][2]),(R33,EP[3][2]),(R33,VTY+VTH-3.2),(VTX,VTY+VTH-3.2)],P33,lw=1.8)
RGND=4.6
wire([(EX,EP[4][2]),(RGND,EP[4][2]),(RGND,VTY+VTH-4.0),(VTX,VTY+VTH-4.0)],GND,lw=1.8)
wire([(RGND,EP[4][2]),(RGND,W_GD),(PRX,W_GD)],GND,lw=2)
wire([(PRX,W_12),(3.0,W_12),(3.0,FY+0.48),(FX,FY+0.48)],P12)
wire([(FX+1.5,FY+0.48),(DX,FY+0.48),(DX,DY+0.22)],P12)
wire([(DX+0.56,DY+0.22),(BX,DY+0.22),(BX,BY+BH-1.3)],P5)
wire([(BX+BW,BY+BH-1.3),(12.4,BY+BH-1.3),(12.4,EP[2][2]),(EX,EP[2][2])],P5)

# Legend
LX,LY,LW,LH=0.35,0.35,12.6,3.5
rbox(LX,LY,LW,LH,BORD,'#0f1520',lw=1.5)
t(LX+LW/2,LY+LH-0.42,'WIRE  COLOR  LEGEND',TXT2,9,bold=True)
for i,(c,lbl) in enumerate([(VEH,'Vehicle CAN  (CANH / CANL / TXD / RXD)'),
        (BLE,'Bluetooth LE  (NUS — wirelessly to Android)'),
        (P12,'+12V  from OBD-II coupler  (Pin 16)'),
        (P5, '+5V  regulated  (LM2596  →  ESP32 VIN)'),
        (P33,'+3.3V  regulated  (ESP32  →  SN65HVD230 VCC)'),
        (GND,'GND  common  (OBD-II Pin 4  →  all components)')]):
    ry=LY+LH-0.92-i*0.40
    ax.plot([LX+0.3,LX+1.25],[ry,ry],color=c,linewidth=4,solid_capstyle='round')
    t(LX+1.45,ry,lbl,TXT2,8,ha='left')

# Install note
NX,NY,NW,NH=13.5,0.35,10.1,3.5
rbox(NX,NY,NW,NH,BORD,'#0f1520',lw=1.5)
t(NX+NW/2,NY+NH-0.45,'INSTALLATION  NOTE',TXT2,9,bold=True)
for i,(c,note) in enumerate([
        (VEH,'Plug coupler into rear center console OBD-II port'),
        (TXT,'CAN-H / CAN-L / +12V / GND pigtails → board'),
        (VEH,'No wire tapping  —  connector-to-connector install'),
        (TXT,'Powers from ignition-switched +12V on Pin 16'),
        (TXT2,'Chassis bus: future satellite ESP32 under seat'),
        (TXT2,'  separate coupler, BLE, read-only, no wire runs')]):
    t(NX+NW/2,NY+NH-0.95-i*0.41,note,c,7.8)

plt.savefig('/home/user/Tescan/hardware_design.png',dpi=180,
            bbox_inches='tight',facecolor='#0d1117',edgecolor='none')
print("Saved hardware_design.png")
