"""Genera src/data/countries.json a partir de la tabla de abajo, las coordenadas de GeoNames
(fichero TSV de scripts/geonames-capitales.py) y los trucos ya existentes.
Uso: python3 -I scripts/generar-paises.py <capitales.tsv>
Nombres de país y capital: exactamente los de docs/listas/ (fuente de verdad)."""
import json, sys

# nombre, capital, alfa3, numérico, alfa2, continentes, región, [regiones extra], [variantes]
E, A, EA = ['europa'], ['asia'], ['europa', 'asia']
T = [
 # Europa del sur
 ('España','Madrid','ESP','724','ES',E,'europa-sur',[],[]),
 ('Portugal','Lisboa','PRT','620','PT',E,'europa-sur',[],['Lisbon']),
 ('Italia','Roma','ITA','380','IT',E,'europa-sur',[],[]),
 ('Andorra','Andorra la Vieja','AND','020','AD',E,'europa-sur',[],['Andorra la Vella']),
 ('Mónaco','Mónaco','MCO','492','MC',E,'europa-sur',[],[]),
 ('San Marino','San Marino','SMR','674','SM',E,'europa-sur',[],[]),
 ('Vaticano','Ciudad del Vaticano','VAT','336','VA',E,'europa-sur',[],['Vaticano']),
 ('Malta','La Valeta','MLT','470','MT',E,'europa-sur',[],['Valeta','Valletta']),
 # Europa occidental
 ('Francia','París','FRA','250','FR',E,'europa-occidental',[],[]),
 ('Bélgica','Bruselas','BEL','056','BE',E,'europa-occidental',[],[]),
 ('Países Bajos','Ámsterdam','NLD','528','NL',E,'europa-occidental',[],[]),
 ('Luxemburgo','Luxemburgo','LUX','442','LU',E,'europa-occidental',[],[]),
 ('Alemania','Berlín','DEU','276','DE',E,'europa-occidental',[],[]),
 ('Suiza','Berna','CHE','756','CH',E,'europa-occidental',[],[]),
 ('Austria','Viena','AUT','040','AT',E,'europa-occidental',[],[]),
 ('Liechtenstein','Vaduz','LIE','438','LI',E,'europa-occidental',[],[]),
 # Islas Británicas y países nórdicos
 ('Reino Unido','Londres','GBR','826','GB',E,'europa-norte',[],[]),
 ('Irlanda','Dublín','IRL','372','IE',E,'europa-norte',[],[]),
 ('Islandia','Reikiavik','ISL','352','IS',E,'europa-norte',[],['Reykjavik']),
 ('Noruega','Oslo','NOR','578','NO',E,'europa-norte',[],[]),
 ('Suecia','Estocolmo','SWE','752','SE',E,'europa-norte',[],[]),
 ('Finlandia','Helsinki','FIN','246','FI',E,'europa-norte',[],[]),
 ('Dinamarca','Copenhague','DNK','208','DK',E,'europa-norte',[],[]),
 # Europa central y bálticos
 ('Polonia','Varsovia','POL','616','PL',E,'europa-central',[],[]),
 ('República Checa','Praga','CZE','203','CZ',E,'europa-central',[],[]),
 ('Eslovaquia','Bratislava','SVK','703','SK',E,'europa-central',[],[]),
 ('Hungría','Budapest','HUN','348','HU',E,'europa-central',[],[]),
 ('Estonia','Tallin','EST','233','EE',E,'europa-central',[],['Tallinn']),
 ('Letonia','Riga','LVA','428','LV',E,'europa-central',[],[]),
 ('Lituania','Vilna','LTU','440','LT',E,'europa-central',[],['Vilnius']),
 # Balcanes (ya existían: se conservan trucos y variantes)
 ('Albania','Tirana','ALB','008','AL',E,'balcanes',[],[]),
 ('Bosnia y Herzegovina','Sarajevo','BIH','070','BA',E,'balcanes',[],[]),
 ('Bulgaria','Sofía','BGR','100','BG',E,'balcanes',[],[]),
 ('Croacia','Zagreb','HRV','191','HR',E,'balcanes',[],[]),
 ('Eslovenia','Liubliana','SVN','705','SI',E,'balcanes',[],['Ljubljana']),
 ('Grecia','Atenas','GRC','300','GR',E,'balcanes',[],[]),
 ('Macedonia del Norte','Skopie','MKD','807','MK',E,'balcanes',[],['Skopje']),
 ('Montenegro','Podgorica','MNE','499','ME',E,'balcanes',[],[]),
 ('Serbia','Belgrado','SRB','688','RS',E,'balcanes',[],['Beograd']),
 # Europa del este
 ('Bielorrusia','Minsk','BLR','112','BY',E,'europa-este',[],[]),
 ('Ucrania','Kiev','UKR','804','UA',E,'europa-este',[],['Kyiv']),
 ('Moldavia','Chisinau','MDA','498','MD',E,'europa-este',[],['Chisináu','Kishinev']),
 ('Rumanía','Bucarest','ROU','642','RO',E,'europa-este',[],[]),
 ('Rusia','Moscú','RUS','643','RU',EA,'europa-este',['asia-central'],[]),
 ('Turquía','Ankara','TUR','792','TR',EA,'europa-este',['oriente-proximo'],[]),
 ('Chipre','Nicosia','CYP','196','CY',E,'europa-este',[],[]),
 # Asia oriental
 ('China','Pekín','CHN','156','CN',A,'asia-oriental',[],['Beijing']),
 ('Japón','Tokio','JPN','392','JP',A,'asia-oriental',[],['Tokyo']),
 ('Corea del Sur','Seúl','KOR','410','KR',A,'asia-oriental',[],['Seoul']),
 ('Corea del Norte','Pionyang','PRK','408','KP',A,'asia-oriental',[],['Pyongyang']),
 ('Mongolia','Ulán Bator','MNG','496','MN',A,'asia-oriental',[],['Ulan Bator','Ulaanbaatar']),
 ('Taiwán','Taipéi','TWN','158','TW',A,'asia-oriental',[],['Taipei']),
 # Asia del sur
 ('India','Nueva Delhi','IND','356','IN',A,'asia-sur',[],['New Delhi']),
 ('Pakistán','Islamabad','PAK','586','PK',A,'asia-sur',[],[]),
 ('Bangladés','Daca','BGD','050','BD',A,'asia-sur',[],['Dhaka']),
 ('Nepal','Katmandú','NPL','524','NP',A,'asia-sur',[],['Kathmandu']),
 ('Bután','Timbu','BTN','064','BT',A,'asia-sur',[],['Thimphu']),
 ('Sri Lanka','Sri Jayawardenepura Kotte','LKA','144','LK',A,'asia-sur',[],['Sri Jayewardenepura Kotte','Kotte']),
 ('Maldivas','Malé','MDV','462','MV',A,'asia-sur',[],[]),
 # Sudeste asiático continental
 ('Birmania (Myanmar)','Naipyidó','MMR','104','MM',A,'sudeste-continental',[],['Naypyidaw','Nay Pyi Taw']),
 ('Tailandia','Bangkok','THA','764','TH',A,'sudeste-continental',[],[]),
 ('Laos','Vientián','LAO','418','LA',A,'sudeste-continental',[],['Vientiane']),
 ('Camboya','Nom Pen','KHM','116','KH',A,'sudeste-continental',[],['Phnom Penh']),
 ('Vietnam','Hanói','VNM','704','VN',A,'sudeste-continental',[],[]),
 ('Malasia','Kuala Lumpur','MYS','458','MY',A,'sudeste-continental',[],[]),
 # Sudeste asiático insular
 ('Singapur','Singapur','SGP','702','SG',A,'sudeste-insular',[],['Singapore']),
 ('Indonesia','Yakarta','IDN','360','ID',A,'sudeste-insular',[],['Jakarta']),
 ('Filipinas','Manila','PHL','608','PH',A,'sudeste-insular',[],[]),
 ('Brunéi','Bandar Seri Begawan','BRN','096','BN',A,'sudeste-insular',[],[]),
 ('Timor Oriental','Dili','TLS','626','TL',A,'sudeste-insular',[],[]),
 # Cáucaso y Oriente Próximo
 ('Georgia','Tiflis','GEO','268','GE',A,'oriente-proximo',[],['Tbilisi']),
 ('Armenia','Ereván','ARM','051','AM',A,'oriente-proximo',[],['Yerevan']),
 ('Azerbaiyán','Bakú','AZE','031','AZ',A,'oriente-proximo',[],['Baku']),
 ('Siria','Damasco','SYR','760','SY',A,'oriente-proximo',[],[]),
 ('Líbano','Beirut','LBN','422','LB',A,'oriente-proximo',[],[]),
 ('Israel','Jerusalén','ISR','376','IL',A,'oriente-proximo',[],[]),
 ('Palestina','Jerusalén Este / Ramala','PSE','275','PS',A,'oriente-proximo',[],['Ramallah']),
 ('Jordania','Amán','JOR','400','JO',A,'oriente-proximo',[],['Amman']),
 # Golfo Pérsico y península arábiga
 ('Irak','Bagdad','IRQ','368','IQ',A,'golfo',[],['Baghdad']),
 ('Irán','Teherán','IRN','364','IR',A,'golfo',[],['Tehran']),
 ('Arabia Saudita','Riad','SAU','682','SA',A,'golfo',[],['Riyadh']),
 ('Kuwait','Kuwait','KWT','414','KW',A,'golfo',[],['Ciudad de Kuwait','Kuwait City']),
 ('Baréin','Manama','BHR','048','BH',A,'golfo',[],[]),
 ('Catar','Doha','QAT','634','QA',A,'golfo',[],[]),
 ('Emiratos Árabes Unidos','Abu Dabi','ARE','784','AE',A,'golfo',[],['Abu Dhabi']),
 ('Omán','Mascate','OMN','512','OM',A,'golfo',[],['Muscat']),
 ('Yemen','Saná','YEM','887','YE',A,'golfo',[],['Sanaa']),
 # Asia central
 ('Kazajistán','Astaná','KAZ','398','KZ',A,'asia-central',[],[]),
 ('Uzbekistán','Taskent','UZB','860','UZ',A,'asia-central',[],['Tashkent']),
 ('Turkmenistán','Asgabat','TKM','795','TM',A,'asia-central',[],['Ashgabat','Asjabad']),
 ('Kirguistán','Biskek','KGZ','417','KG',A,'asia-central',[],['Bishkek']),
 ('Tayikistán','Dusambé','TJK','762','TJ',A,'asia-central',[],['Dushanbe']),
 ('Afganistán','Kabul','AFG','004','AF',A,'asia-central',[],[]),
]

# Lugar de GeoNames a usar cuando no es el PPLC (o hay varios).
LUGAR = {'LK': 'Sri Jayewardenepura Kotte', 'PS': 'Ramallah', 'IL': 'Jerusalem'}

def truco(tipo, texto):
    return {'tipo': tipo, 'texto': texto, 'revisado': False}

MISMO_NOMBRE = truco('familia', 'Fácil: la capital se llama igual que el país.')
TRUCOS = {
  'HUN': [truco('historia', 'Budapest son dos ciudades unidas por el Danubio: Buda y Pest.')],
  'KAZ': [truco('palabras', 'Astaná significa «capital» en kazajo. No tiene pérdida.')],
  'TJK': [truco('palabras', 'Dusambé significa «lunes» en tayiko: allí había un mercado los lunes.')],
  'UZB': [truco('palabras', 'Taskent significa «ciudad de piedra».')],
  'JPN': [truco('palabras', 'Tokio y Kioto tienen las mismas sílabas cambiadas de orden. La capital es Tokio.')],
  'CHN': [truco('palabras', 'Pekín significa «capital del norte».')],
  'ISL': [truco('palabras', 'Reikiavik significa «bahía humeante», por el vapor de sus aguas termales.')],
  'NLD': [truco('palabras', 'Ámsterdam: un dique («dam») en el río Amstel.')],
  'PAK': [truco('palabras', 'Islamabad significa «ciudad del islam».')],
  'MYS': [truco('palabras', 'Kuala Lumpur significa «confluencia fangosa»: donde se juntan dos ríos.')],
  'MNG': [truco('palabras', 'Ulán Bator significa «héroe rojo».')],
  'SAU': [truco('palabras', 'Riad significa «jardines», algo raro en pleno desierto.')],
  'MCO': [MISMO_NOMBRE], 'SMR': [MISMO_NOMBRE], 'LUX': [MISMO_NOMBRE], 'KWT': [MISMO_NOMBRE], 'SGP': [MISMO_NOMBRE],
  'VAT': [truco('familia', 'Fácil: la capital es la propia Ciudad del Vaticano.')],
}

# Nombres de país equivalentes, aceptados sin aviso al escribir el país (mapa mudo).
# Solo formas evidentes del mismo nombre (normativas o grafías habituales), nunca nombres antiguos.
VARIANTES_PAIS = {
  'CZE': ['Chequia'],
  'SAU': ['Arabia Saudí'],
  'MMR': ['Birmania', 'Myanmar'],
  'BGD': ['Bangladesh'],
  'QAT': ['Qatar'],
  'BHR': ['Bahréin', 'Bahrein'],
  'KAZ': ['Kazajstán'],
  'KGZ': ['Kirguizistán'],
  'TLS': ['Timor Leste'],
  'ARE': ['Emiratos'],
  'BIH': ['Bosnia-Herzegovina', 'Bosnia'],
  'VAT': ['Ciudad del Vaticano', 'Santa Sede'],
  'MDA': ['Moldova'],
  'BLR': ['Belarús'],
  'IRQ': ['Iraq'],
}
# Aceptados con aviso, como una errata (decisión del responsable).
AVISOS_PAIS = {
  'NLD': ['Holanda'],
}

def main():
    geo = {}
    for linea in open(sys.argv[1], encoding='utf-8'):
        pais, nombre, gid, lon, lat, tipo = linea.rstrip('\n').split('\t')
        if pais in LUGAR:
            if nombre == LUGAR[pais]: geo[pais] = (int(gid), float(lon), float(lat))
        elif tipo == 'PPLC':
            geo[pais] = (int(gid), float(lon), float(lat))
    actual = json.load(open('src/data/countries.json', encoding='utf-8'))
    previos = {p['id']: p for p in actual['paises']}
    paises = []
    for nombre, capital, a3, num, a2, cont, region, extra, variantes in T:
        gid, lon, lat = geo[a2]
        prev = previos.get(a3, {})
        p = {
          'id': a3, 'isoNumerico': num, 'nombre': nombre, 'capital': capital,
          'variantes': prev.get('variantes') or variantes, 'antiguos': [],
          'continentes': cont, 'region': region,
        }
        if extra: p['regionesExtra'] = extra
        if a3 in VARIANTES_PAIS: p['variantesPais'] = VARIANTES_PAIS[a3]
        if a3 in AVISOS_PAIS: p['avisosPais'] = AVISOS_PAIS[a3]
        p.update({'capitalCoords': [round(lon, 3), round(lat, 3)], 'geonamesId': gid, 'opcional': False,
                  'trucos': prev.get('trucos') or TRUCOS.get(a3, [])})
        paises.append(p)
    kosovo = previos['XKX']
    kosovo.pop('nota', None)
    paises.append(kosovo)
    actual['paises'] = paises
    actual['fuentes']['nombres'] = ('Nombres de país y capital: listados de clase de 3º de ESO (docs/listas/), '
        'fuente de verdad del proyecto. Kosovo no figura en los listados (opcional, desactivado); se usa la forma de Fundéu (Pristina).')
    actual['fuentes']['capitalCoords'] = ('GeoNames (geonames.org, CC BY 4.0), lugares con código PPLC, vía el paquete npm '
        'all-the-cities 3.1.0 (ver scripts/geonames-capitales.py). Excepciones: Sri Lanka usa el lugar «Sri Jayewardenepura Kotte» '
        '(GeoNames marca Colombo como PPLC; el listado da Kotte); Palestina usa Ramallah; Israel usa Jerusalem (PPLA en GeoNames). '
        'Identificador GeoNames en «geonamesId». Coordenadas redondeadas a 3 decimales.')
    actual['fuentes']['trucos'] = 'Redactados por Claude. Todos pendientes de revisión por un adulto (revisado: false).'
    actual['fuentes'].pop('antiguos', None)
    with open('src/data/countries.json', 'w', encoding='utf-8') as f:
        json.dump(actual, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(len(paises), 'países')

main()
