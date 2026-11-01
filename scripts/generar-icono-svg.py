"""Genera los SVG del icono (mosaico de regiones en pastel + chincheta con estrella de capital).
Uso: python3 -I scripts/generar-icono-svg.py   (escribe public/icono.svg y scripts/icono-*.svg)
Después: node scripts/generar-iconos.cjs public/icono.svg scripts/icono-maskable.svg scripts/icono-cuadrado.svg public"""
import math

def estrella(cx, cy, re, ri):
    pts = []
    for i in range(10):
        r = re if i % 2 == 0 else ri
        a = math.radians(-90 + 36 * i)
        pts.append(f"{cx + r * math.cos(a):.1f},{cy + r * math.sin(a):.1f}")
    return " ".join(pts)

# Regiones con los colores pastel de la app y bordes blancos, como el mapa.
MOSAICO = '''<rect width="512" height="512" fill="#cdd69a"/>
  <polygon points="0,0 230,0 205,120 120,175 0,150" fill="#f2cf92"/>
  <polygon points="230,0 512,0 512,130 380,160 290,105 205,120" fill="#c8b6e2"/>
  <polygon points="0,150 120,175 150,300 70,390 0,380" fill="#b9d5d6"/>
  <polygon points="380,160 512,130 512,360 420,330 360,250" fill="#f0b8cc"/>
  <polygon points="0,380 70,390 150,300 250,330 300,440 260,512 0,512" fill="#dcc2a4"/>
  <polygon points="420,330 512,360 512,512 260,512 300,440 360,410" fill="#b9d5d6"/>
  <g fill="none" stroke="#ffffff" stroke-width="9" stroke-linejoin="round">
    <polyline points="230,0 205,120 120,175 0,150"/>
    <polyline points="205,120 290,105 380,160 512,130"/>
    <polyline points="120,175 150,300 70,390 0,380"/>
    <polyline points="380,160 360,250 420,330 512,360"/>
    <polyline points="150,300 250,330 300,440 260,512"/>
    <polyline points="300,440 360,410 420,330"/>
    <polyline points="250,330 360,250"/>
  </g>'''

def chincheta(cx=256, cy=215, r=118, punta=440):
    cuerpo = (f'M{cx} {punta} C {cx-50} {punta-80}, {cx-r} {cy+95}, {cx-r} {cy} '
              f'A {r} {r} 0 1 1 {cx+r} {cy} C {cx+r} {cy+95}, {cx+50} {punta-80}, {cx} {punta} Z')
    return (f'<path d="{cuerpo}" fill="#1f2a37" opacity="0.18" transform="translate(6 10)"/>'
            f'<path d="{cuerpo}" fill="#2f62a8" stroke="#ffffff" stroke-width="14" stroke-linejoin="round"/>'
            f'<polygon points="{estrella(cx, cy, 64, 27)}" fill="#ffffff" stroke="#ffffff" stroke-width="8" stroke-linejoin="round"/>')

def svg(redondeo):
    recorte = (f'<defs><clipPath id="r"><rect width="512" height="512" rx="{redondeo}"/></clipPath></defs><g clip-path="url(#r)">'
               if redondeo else '<g>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">{recorte}{MOSAICO}{chincheta()}</g></svg>\n'

# Redondeado (favicon y PWA "any"); sin redondear para iOS y "maskable" (el sistema pone la máscara).
# La chincheta queda dentro de la zona segura de los iconos maskable (círculo de radio 205 px).
open('public/icono.svg', 'w').write(svg(112))
open('scripts/icono-maskable.svg', 'w').write(svg(0))
open('scripts/icono-cuadrado.svg', 'w').write(svg(0))
print('ok')
