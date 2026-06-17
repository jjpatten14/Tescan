"""
Generate TESCAN ESP32 CAN Bridge hardware wiring diagram.
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np

# ── Canvas ─────────────────────────────────────────────────────────────────────
FIG_W, FIG_H = 26, 18
fig = plt.figure(figsize=(FIG_W, FIG_H), facecolor='#0d1117')
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, FIG_W)
ax.set_ylim(0, FIG_H)
ax.set_facecolor('#0d1117')
ax.axis('off')

# ── Palette ────────────────────────────────────────────────────────────────────
BG     = '#0d1117'
CARD   = '#161b22'
BORDER = '#30363d'
VEH    = '#3fb950'   # vehicle bus — green
CHS    = '#f85149'   # chassis bus — red
PWR12  = '#e3b341'   # 12V — gold
PWR5   = '#ff8c00'   # 5V — orange
PWR33  = '#58a6ff'   # 3.3V — blue
GND    = '#6e7681'   # ground — gray
SPI    = '#d2a8ff'   # SPI signals — purple
TXT    = '#f0f6fc'   # main text
TXT2   = '#8b949e'   # secondary text
WARN   = '#f85149'   # warning — red


# ── Helpers ────────────────────────────────────────────────────────────────────
def rbox(x, y, w, h, edge, face=CARD, lw=2, r=0.15, zorder=3, alpha=1.0):
    p = FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad={r}",
                        facecolor=face, edgecolor=edge, linewidth=lw,
                        zorder=zorder, alpha=alpha)
    ax.add_patch(p)

def txt(x, y, s, color=TXT, fs=8, ha='center', va='center',
        bold=False, italic=False, zorder=6):
    w = 'bold' if bold else 'normal'
    sty = 'italic' if italic else 'normal'
    ax.text(x, y, s, color=color, fontsize=fs, ha=ha, va=va,
            fontfamily='monospace', fontweight=w, fontstyle=sty, zorder=zorder)

def pin_dot(x, y, color, size=60):
    ax.scatter([x], [y], color=color, s=size, zorder=8)

def wire(pts, color, lw=2.2, zorder=2):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    ax.plot(xs, ys, color=color, linewidth=lw,
            solid_capstyle='round', solid_joinstyle='round', zorder=zorder)

def pin_label_left(x, y, label, color, fs=7.5):
    """Label left of x,y with dot at x,y."""
    txt(x - 0.12, y, label, color, fs, ha='right')
    pin_dot(x, y, color)

def pin_label_right(x, y, label, color, fs=7.5):
    txt(x + 0.12, y, label, color, fs, ha='left')
    pin_dot(x, y, color)

def ic_box(x, y, w, h, edge, title, subtitle='', left_pins=None, right_pins=None, extra_lines=None):
    """
    Draw an IC/module box.
    left_pins / right_pins: list of (name, color, y_offset_from_top)
    """
    rbox(x, y, w, h, edge)
    txt(x + w/2, y + h - 0.45, title, edge, 9.5, bold=True)
    if subtitle:
        txt(x + w/2, y + h - 0.85, subtitle, TXT2, 7.5)
    if left_pins:
        for name, color, yo in left_pins:
            py = y + h - yo
            pin_label_right(x, py, name, color)
    if right_pins:
        for name, color, yo in right_pins:
            py = y + h - yo
            pin_label_left(x + w, py, name, color)
    if extra_lines:
        for (sx, sy, ex, ey, c, lw) in extra_lines:
            ax.plot([sx, ex], [sy, ey], color=c, linewidth=lw,
                    solid_capstyle='round', zorder=5)


# ══════════════════════════════════════════════════════════════════════════════
# Title
# ══════════════════════════════════════════════════════════════════════════════
txt(FIG_W/2, 17.4, 'TESCAN  —  ESP32 Dual-CAN Bridge  —  Hardware Wiring Diagram',
    TXT, 17, bold=True)
txt(FIG_W/2, 16.8,
    'Tesla Model 3 2018  ·  Vehicle Bus (read/write, TWAI)  +  Chassis Bus (read-only, MCP2515)',
    TXT2, 10)


# ══════════════════════════════════════════════════════════════════════════════
# OBD-II Connector (J1962)
# ══════════════════════════════════════════════════════════════════════════════
OBD_X, OBD_Y = 0.5, 4.8
OBD_W, OBD_H = 2.6, 10.8

rbox(OBD_X, OBD_Y, OBD_W, OBD_H, BORDER, '#0f1923', lw=2)
txt(OBD_X + OBD_W/2, OBD_Y + OBD_H - 0.45, 'OBD-II', TXT, 11, bold=True)
txt(OBD_X + OBD_W/2, OBD_Y + OBD_H - 0.85, 'J1962', TXT2, 9)
txt(OBD_X + OBD_W/2, OBD_Y + OBD_H - 1.25, '16-pin Male', TXT2, 8, italic=True)

# Divider
ax.plot([OBD_X + 0.2, OBD_X + OBD_W - 0.2],
        [OBD_Y + OBD_H - 1.55, OBD_Y + OBD_H - 1.55],
        color=BORDER, linewidth=1)

# Pin definitions: (name, color, y-abs)
OBD_PINS = [
    ('Pin 6   CANH',  VEH,   OBD_Y + 9.0),
    ('Pin 14  CANL',  VEH,   OBD_Y + 8.0),
    ('Pin 3   CANH',  CHS,   OBD_Y + 6.5),
    ('Pin 11  CANL',  CHS,   OBD_Y + 5.5),
    ('Pin 16  +12V',  PWR12, OBD_Y + 3.8),
    ('Pin 4   GND',   GND,   OBD_Y + 3.0),
]

for name, color, py in OBD_PINS:
    txt(OBD_X + OBD_W/2, py, name, color, 8)
    pin_dot(OBD_X + OBD_W, py, color, 80)

# Bus labels
txt(OBD_X + OBD_W/2, OBD_Y + 9.6, '── VEHICLE BUS ──', VEH, 7.5, bold=True)
txt(OBD_X + OBD_W/2, OBD_Y + 7.1, '── CHASSIS BUS ──', CHS, 7.5, bold=True)
txt(OBD_X + OBD_W/2, OBD_Y + 4.5, '─── POWER ───', PWR12, 7.5, bold=True)


# ══════════════════════════════════════════════════════════════════════════════
# TVS Diode — Vehicle bus  (PESD2CAN)
# ══════════════════════════════════════════════════════════════════════════════
TVS_VX, TVS_VY = 4.0, 12.3
rbox(TVS_VX, TVS_VY, 1.1, 0.9, VEH, '#0f1923', lw=1.5)
txt(TVS_VX + 0.55, TVS_VY + 0.6, 'TVS', VEH, 7.5, bold=True)
txt(TVS_VX + 0.55, TVS_VY + 0.22, 'PESD2CAN', TXT2, 6.5)

# TVS Diode — Chassis bus
TVS_CX, TVS_CY = 4.0, 9.3
rbox(TVS_CX, TVS_CY, 1.1, 0.9, CHS, '#0f1923', lw=1.5)
txt(TVS_CX + 0.55, TVS_CY + 0.6, 'TVS', CHS, 7.5, bold=True)
txt(TVS_CX + 0.55, TVS_CY + 0.22, 'PESD2CAN', TXT2, 6.5)


# ══════════════════════════════════════════════════════════════════════════════
# SN65HVD230 — Vehicle CAN Transceiver
# ══════════════════════════════════════════════════════════════════════════════
VT_X, VT_Y = 5.8, 11.5
VT_W, VT_H = 4.0, 4.0

ic_box(VT_X, VT_Y, VT_W, VT_H,
       edge=VEH,
       title='SN65HVD230',
       subtitle='3.3V CAN Transceiver  (DIP-8)',
       left_pins=[
           ('CANH', VEH,   1.5),
           ('CANL', VEH,   2.1),
           (' VCC', PWR33, 2.8),
           (' GND', GND,   3.4),
       ],
       right_pins=[
           ('TXD', VEH, 1.5),
           ('RXD', VEH, 2.1),
           (' Rs→GND', TXT2, 2.8),
       ])

# Rs-to-GND note
txt(VT_X + VT_W/2, VT_Y + 0.45, 'Rs pin → GND  (high-speed mode)', TXT2, 7, italic=True)


# ══════════════════════════════════════════════════════════════════════════════
# MCP2515 Module — Chassis CAN Controller
# ══════════════════════════════════════════════════════════════════════════════
CT_X, CT_Y = 5.8, 6.2
CT_W, CT_H = 4.0, 4.8

rbox(CT_X, CT_Y, CT_W, CT_H, CHS, CARD)
txt(CT_X + CT_W/2, CT_Y + CT_H - 0.45, 'MCP2515 Module', CHS, 9.5, bold=True)
txt(CT_X + CT_W/2, CT_Y + CT_H - 0.85, 'SPI CAN Controller  +  TJA1050 Xcvr', TXT2, 7.5)
txt(CT_X + CT_W/2, CT_Y + CT_H - 1.2, '8 MHz crystal · 500 kbps', TXT2, 7, italic=True)

# Left pins (CAN bus side)
CT_LEFT = [
    ('CANH', CHS,   CT_Y + CT_H - 1.8),
    ('CANL', CHS,   CT_Y + CT_H - 2.5),
    (' VCC', PWR33, CT_Y + CT_H - 3.2),
    (' GND', GND,   CT_Y + CT_H - 3.9),
]
for name, color, py in CT_LEFT:
    pin_label_right(CT_X, py, name, color)

# Right pins (SPI side)
CT_RIGHT = [
    ('MOSI', SPI,   CT_Y + CT_H - 1.8),
    ('MISO', SPI,   CT_Y + CT_H - 2.5),
    (' SCK', SPI,   CT_Y + CT_H - 3.2),
    ('  CS', SPI,   CT_Y + CT_H - 3.9),
]
for name, color, py in CT_RIGHT:
    pin_label_left(CT_X + CT_W, py, name, color)

# TX DISCONNECTED — red box inside module
TX_WARN_Y = CT_Y + 0.65
rbox(CT_X + 0.4, TX_WARN_Y - 0.35, CT_W - 0.8, 0.85, WARN,
     '#2d0000', lw=2, r=0.08)
txt(CT_X + CT_W/2, TX_WARN_Y + 0.17, '✗  TX PIN — PHYSICALLY CUT / LIFTED', WARN, 8, bold=True)
txt(CT_X + CT_W/2, TX_WARN_Y - 0.18, 'No electrical path to CAN bus', WARN, 7, italic=True)


# ══════════════════════════════════════════════════════════════════════════════
# Power Path: Fuse → Schottky → LM2596 Buck Converter
# ══════════════════════════════════════════════════════════════════════════════

# Fuse holder
FUSE_X, FUSE_Y = 3.8, 3.6
FUSE_W, FUSE_H = 1.6, 1.0
rbox(FUSE_X, FUSE_Y, FUSE_W, FUSE_H, PWR12, '#0f1923', lw=2)
txt(FUSE_X + FUSE_W/2, FUSE_Y + 0.65, 'FUSE', PWR12, 9, bold=True)
txt(FUSE_X + FUSE_W/2, FUSE_Y + 0.28, '3A  ATO blade', TXT2, 7)

# Schottky diode (1N5819) — draw as diode symbol
D_X = 6.1
D_Y = 4.1
# Triangle body
tri = plt.Polygon(
    [[D_X, D_Y + 0.48], [D_X + 0.6, D_Y + 0.24], [D_X, D_Y]],
    closed=True, facecolor=PWR12, edgecolor=PWR12, zorder=5
)
ax.add_patch(tri)
# Bar (cathode)
ax.plot([D_X + 0.6, D_X + 0.6], [D_Y, D_Y + 0.48],
        color=PWR12, linewidth=4, solid_capstyle='butt', zorder=5)
txt(D_X + 0.3, D_Y - 0.32, '1N5819', TXT2, 7)
txt(D_X + 0.3, D_Y - 0.6, 'Reverse polarity', TXT2, 6.5, italic=True)

# LM2596 Buck converter module
BUCK_X, BUCK_Y = 7.5, 3.2
BUCK_W, BUCK_H = 3.0, 1.8
rbox(BUCK_X, BUCK_Y, BUCK_W, BUCK_H, PWR5, '#0f1923', lw=2)
txt(BUCK_X + BUCK_W/2, BUCK_Y + BUCK_H - 0.45, 'LM2596  Buck Converter', PWR5, 9, bold=True)
txt(BUCK_X + BUCK_W/2, BUCK_Y + BUCK_H - 0.82, '12V  →  5V regulated', TXT2, 7.5)
txt(BUCK_X + BUCK_W/2, BUCK_Y + 0.35, '◎ inductor    ⊟ feedback divider', TXT2, 7, italic=True)

# Buck IN/OUT labels
txt(BUCK_X + 0.15, BUCK_Y + BUCK_H - 1.3, 'IN', PWR12, 7.5, ha='left')
pin_dot(BUCK_X, BUCK_Y + BUCK_H - 1.3, PWR12)
txt(BUCK_X + BUCK_W - 0.15, BUCK_Y + BUCK_H - 1.3, 'OUT', PWR5, 7.5, ha='right')
pin_dot(BUCK_X + BUCK_W, BUCK_Y + BUCK_H - 1.3, PWR5)


# ══════════════════════════════════════════════════════════════════════════════
# ESP32 DevKit V1
# ══════════════════════════════════════════════════════════════════════════════
ESP_X, ESP_Y = 14.0, 4.5
ESP_W, ESP_H = 7.5, 11.2

rbox(ESP_X, ESP_Y, ESP_W, ESP_H, '#58a6ff', '#0a1628', lw=3)
txt(ESP_X + ESP_W/2, ESP_Y + ESP_H - 0.5,  'ESP32  DevKit V1', '#58a6ff', 13, bold=True)
txt(ESP_X + ESP_W/2, ESP_Y + ESP_H - 0.95, '38-pin · 240 MHz dual-core · 520 KB SRAM', TXT2, 8.5)
txt(ESP_X + ESP_W/2, ESP_Y + ESP_H - 1.35, 'CP2102 USB-Serial  ·  Micro-USB', TXT2, 8, italic=True)

# WiFi graphic
txt(ESP_X + ESP_W/2, ESP_Y + ESP_H - 2.1,  ')))  WiFi  802.11 b/g/n  (((', '#58a6ff', 9.5)
txt(ESP_X + ESP_W/2, ESP_Y + ESP_H - 2.55, 'WebSocket Server  ws://<ip>:81', '#58a6ff', 8.5)

# Divider
ax.plot([ESP_X + 0.4, ESP_X + ESP_W - 0.4],
        [ESP_Y + ESP_H - 3.0, ESP_Y + ESP_H - 3.0],
        color='#30363d', linewidth=1.5)
txt(ESP_X + ESP_W/2, ESP_Y + ESP_H - 3.35, 'GPIO Pin Assignments', TXT2, 8, italic=True)

# Left-side GPIO pins
ESP_GPIOS = [
    ('GPIO 21  TWAI TX',  VEH,   ESP_Y + ESP_H - 4.0),
    ('GPIO 22  TWAI RX',  VEH,   ESP_Y + ESP_H - 4.8),
    ('GPIO 23  SPI MOSI', SPI,   ESP_Y + ESP_H - 5.9),
    ('GPIO 19  SPI MISO', SPI,   ESP_Y + ESP_H - 6.7),
    ('GPIO 18  SPI SCK',  SPI,   ESP_Y + ESP_H - 7.5),
    ('GPIO  5  SPI CS',   SPI,   ESP_Y + ESP_H - 8.3),
    ('VIN      +5V in',   PWR5,  ESP_Y + ESP_H - 9.5),
    ('3.3V  xcvr supply', PWR33, ESP_Y + ESP_H - 10.2),
    ('GND   common',      GND,   ESP_Y + ESP_H - 10.9),
]

for name, color, py in ESP_GPIOS:
    txt(ESP_X + 0.18, py, name, color, 8.5, ha='left')
    pin_dot(ESP_X, py, color, 80)


# ══════════════════════════════════════════════════════════════════════════════
# WIRES
# ══════════════════════════════════════════════════════════════════════════════

def obd_pin_y(name):
    return {n: y for n, c, y in OBD_PINS}[name]

OBD_RX = OBD_X + OBD_W   # right edge of OBD connector

# ── Vehicle bus CANH: OBD Pin 6 → TVS → SN65HVD230 CANH
wire([(OBD_RX, obd_pin_y('Pin 6   CANH')),
      (TVS_VX, obd_pin_y('Pin 6   CANH')),
      (TVS_VX + 0.55, obd_pin_y('Pin 6   CANH')),
      (TVS_VX + 0.55, VT_Y + VT_H - 1.5),
      (VT_X, VT_Y + VT_H - 1.5)], VEH)

# ── Vehicle bus CANL: OBD Pin 14 → SN65HVD230 CANL
wire([(OBD_RX, obd_pin_y('Pin 14  CANL')),
      (4.9, obd_pin_y('Pin 14  CANL')),
      (4.9, VT_Y + VT_H - 2.1),
      (VT_X, VT_Y + VT_H - 2.1)], VEH, lw=2.2)

# ── SN65HVD230 TXD → ESP32 GPIO 21
VT_RX = VT_X + VT_W
wire([(VT_RX, VT_Y + VT_H - 1.5),
      (12.0, VT_Y + VT_H - 1.5),
      (12.0, ESP_GPIOS[0][2]),
      (ESP_X, ESP_GPIOS[0][2])], VEH)

# ── SN65HVD230 RXD → ESP32 GPIO 22
wire([(VT_RX, VT_Y + VT_H - 2.1),
      (12.3, VT_Y + VT_H - 2.1),
      (12.3, ESP_GPIOS[1][2]),
      (ESP_X, ESP_GPIOS[1][2])], VEH, lw=2.2)

# ── Chassis bus CANH: OBD Pin 3 → TVS → MCP2515 CANH
wire([(OBD_RX, obd_pin_y('Pin 3   CANH')),
      (TVS_CX, obd_pin_y('Pin 3   CANH')),
      (TVS_CX + 0.55, obd_pin_y('Pin 3   CANH')),
      (TVS_CX + 0.55, CT_Y + CT_H - 1.8),
      (CT_X, CT_Y + CT_H - 1.8)], CHS)

# ── Chassis bus CANL: OBD Pin 11 → MCP2515 CANL
wire([(OBD_RX, obd_pin_y('Pin 11  CANL')),
      (5.1, obd_pin_y('Pin 11  CANL')),
      (5.1, CT_Y + CT_H - 2.5),
      (CT_X, CT_Y + CT_H - 2.5)], CHS, lw=2.2)

# ── MCP2515 SPI → ESP32 (MOSI, MISO, SCK, CS)
CT_RX = CT_X + CT_W
SPI_ESP = [ESP_GPIOS[2][2], ESP_GPIOS[3][2], ESP_GPIOS[4][2], ESP_GPIOS[5][2]]
SPI_MCP = [CT_Y + CT_H - 1.8, CT_Y + CT_H - 2.5, CT_Y + CT_H - 3.2, CT_Y + CT_H - 3.9]
SPI_OFFSETS = [11.0, 11.4, 11.8, 12.2]

for mcp_y, esp_y_val, x_mid in zip(SPI_MCP, SPI_ESP, SPI_OFFSETS):
    wire([(CT_RX, mcp_y), (x_mid, mcp_y), (x_mid, esp_y_val), (ESP_X, esp_y_val)], SPI)

# ── Power: OBD +12V → Fuse → Schottky → Buck → ESP32 VIN
wire([(OBD_RX, obd_pin_y('Pin 16  +12V')),
      (3.5, obd_pin_y('Pin 16  +12V')),
      (3.5, FUSE_Y + 0.5),
      (FUSE_X, FUSE_Y + 0.5)], PWR12)
wire([(FUSE_X + FUSE_W, FUSE_Y + 0.5), (D_X, FUSE_Y + 0.5), (D_X, D_Y + 0.24)], PWR12)
wire([(D_X + 0.6, D_Y + 0.24), (BUCK_X, D_Y + 0.24), (BUCK_X, BUCK_Y + BUCK_H - 1.3)], PWR5)
wire([(BUCK_X + BUCK_W, BUCK_Y + BUCK_H - 1.3),
      (13.0, BUCK_Y + BUCK_H - 1.3),
      (13.0, ESP_GPIOS[6][2]),
      (ESP_X, ESP_GPIOS[6][2])], PWR5)

# ── GND: OBD Pin 4 → ESP32 GND
wire([(OBD_RX, obd_pin_y('Pin 4   GND')),
      (13.3, obd_pin_y('Pin 4   GND')),
      (13.3, ESP_GPIOS[8][2]),
      (ESP_X, ESP_GPIOS[8][2])], GND, lw=2)

# ── 3.3V rail from ESP32 → SN65HVD230 VCC and MCP2515 VCC
VCC_X_RAIL = 5.3
wire([(ESP_X, ESP_GPIOS[7][2]),
      (13.2, ESP_GPIOS[7][2]),
      (13.2, 16.0),
      (VCC_X_RAIL, 16.0),
      (VCC_X_RAIL, VT_Y + VT_H - 2.8),
      (VT_X, VT_Y + VT_H - 2.8)], PWR33, lw=1.8)   # vehicle xcvr VCC
wire([(VCC_X_RAIL, CT_Y + CT_H - 3.2),
      (CT_X, CT_Y + CT_H - 3.2)], PWR33, lw=1.8)    # chassis xcvr VCC


# ══════════════════════════════════════════════════════════════════════════════
# Warning box
# ══════════════════════════════════════════════════════════════════════════════
WB_X, WB_Y = 0.5, 0.4
WB_W, WB_H = 13.0, 3.6
rbox(WB_X, WB_Y, WB_W, WB_H, WARN, '#1a0505', lw=2.5)
txt(WB_X + WB_W/2, WB_Y + WB_H - 0.5,
    '⚠   CHASSIS BUS WRITE PROTECTION  —  DO NOT MODIFY   ⚠',
    WARN, 10, bold=True)
ax.plot([WB_X + 0.4, WB_X + WB_W - 0.4],
        [WB_Y + WB_H - 0.85, WB_Y + WB_H - 0.85], color=WARN, linewidth=1)

txt(WB_X + WB_W/2, WB_Y + WB_H - 1.25,
    'Layer 1  (firmware)  :  MCP2515 setListenOnlyMode()', TXT, 9)
txt(WB_X + WB_W/2, WB_Y + WB_H - 1.65,
    '  → ACK suppressed · no error frames · peripheral cannot transmit', TXT2, 8, italic=True)
txt(WB_X + WB_W/2, WB_Y + WB_H - 2.15,
    'Layer 2  (hardware)  :  TXD pin on TJA1050 is physically CUT / lifted', TXT, 9)
txt(WB_X + WB_W/2, WB_Y + WB_H - 2.55,
    '  → no electrical path exists to transmit even if firmware is misconfigured', TXT2, 8, italic=True)
txt(WB_X + WB_W/2, WB_Y + 0.55,
    'Both layers are independent.  Either alone would be sufficient.  Both are required.',
    WARN, 8.5, bold=True)


# ══════════════════════════════════════════════════════════════════════════════
# Wire colour legend
# ══════════════════════════════════════════════════════════════════════════════
LG_X, LG_Y = 14.0, 0.4
LG_W, LG_H = 12.0, 3.6
rbox(LG_X, LG_Y, LG_W, LG_H, BORDER, '#0f1520', lw=1.5)
txt(LG_X + LG_W/2, LG_Y + LG_H - 0.45, 'WIRE  COLOR  LEGEND', TXT2, 9, bold=True)

legend_items = [
    (VEH,   'Vehicle CAN bus  (CANH / CANL / TXD / RXD)'),
    (CHS,   'Chassis CAN bus  (CANH / CANL)'),
    (SPI,   'SPI signals  (MOSI / MISO / SCK / CS)'),
    (PWR12, '+12V  OBD-II battery power'),
    (PWR5,  '+5V   regulated  (LM2596 output  →  ESP32 VIN)'),
    (PWR33, '+3.3V regulated  (ESP32 output  →  transceiver VCC)'),
    (GND,   'GND  common ground rail'),
]
for i, (color, label) in enumerate(legend_items):
    row_y = LG_Y + LG_H - 0.95 - i * 0.37
    ax.plot([LG_X + 0.3, LG_X + 1.3], [row_y, row_y], color=color, linewidth=4,
            solid_capstyle='round')
    txt(LG_X + 1.5, row_y, label, TXT2, 8, ha='left')


# ══════════════════════════════════════════════════════════════════════════════
# Section labels (floating)
# ══════════════════════════════════════════════════════════════════════════════
txt(VT_X + VT_W/2, VT_Y + VT_H + 0.35, '── VEHICLE BUS TRANSCEIVER ──', VEH, 8.5, bold=True)
txt(CT_X + CT_W/2, CT_Y + CT_H + 0.35, '── CHASSIS BUS CONTROLLER ──', CHS, 8.5, bold=True)
txt(BUCK_X + BUCK_W/2, BUCK_Y + BUCK_H + 0.35, '── POWER REGULATION ──', PWR5, 8, bold=True)


# ══════════════════════════════════════════════════════════════════════════════
# Save
# ══════════════════════════════════════════════════════════════════════════════
out = '/home/user/Tescan/hardware_design.png'
plt.savefig(out, dpi=180, bbox_inches='tight',
            facecolor='#0d1117', edgecolor='none')
print(f"Saved: {out}")
