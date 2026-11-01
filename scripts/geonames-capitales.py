"""Extrae coordenadas de capitales de GeoNames desde el cities.pbf del paquete npm all-the-cities.

Uso: python3 -I scripts/geonames-capitales.py <ruta>/cities.pbf AL,DE,... [Nombre:PAIS ...]
- Para cada código ISO alfa-2, imprime los lugares con código PPLC (capital).
- Los argumentos extra "Nombre:XX" buscan además una ciudad por nombre en el país XX.
Salida: PAIS<TAB>nombre<TAB>geonamesId<TAB>lon<TAB>lat<TAB>tipo
(No ejecuta código del paquete: decodifica el formato protobuf a mano.)
"""
import sys

def main():
    b = open(sys.argv[1], 'rb').read()
    want = set(sys.argv[2].split(','))
    extra = {}
    for a in sys.argv[3:]:
        nombre, pais = a.rsplit(':', 1)
        extra.setdefault(pais, set()).add(nombre)
    pos = 0
    def varint():
        nonlocal pos
        r = s = 0
        while True:
            x = b[pos]; pos += 1; r |= (x & 0x7f) << s; s += 7
            if x < 0x80: return r
    zz = lambda n: (n >> 1) ^ -(n & 1)
    lon = lat = 0
    while pos < len(b):
        end = varint() + pos; c = {}
        while pos < end:
            k = varint(); tag, wt = k >> 3, k & 7
            if wt == 2:
                n = varint(); c[tag] = b[pos:pos + n].decode(); pos += n
            else:
                v = varint()
                if tag == 10: lon += zz(v); c['lon'] = lon / 1e5
                elif tag == 11: lat += zz(v); c['lat'] = lat / 1e5
                elif tag == 1: c['id'] = zz(v)
                else: c[tag] = v
        pais = c.get(3)
        if c.get(7) == 'PPLC' and pais in want:
            print(f"{pais}\t{c[2]}\t{c['id']}\t{c['lon']}\t{c['lat']}\tPPLC")
        elif pais in extra and c.get(2) in extra[pais]:
            print(f"{pais}\t{c[2]}\t{c['id']}\t{c['lon']}\t{c['lat']}\t{c.get(7)}")

main()
