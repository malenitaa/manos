/** Spanish strings. Must cover every key defined in the English dictionary. */

import type { Dictionary } from "./en";

export const esDictionary: Dictionary = {
  "app.tagline":
    "Un instrumento que se toca en el aire. La cámara mira tus manos y el navegador genera el sonido; no se sube nada a ningún lado.",
  "app.privacy": "Necesita permiso de cámara. La primera vez descarga el modelo que reconoce las manos, unos 8 MB.",
  "app.start": "Empezar",
  "app.starting": "encendiendo…",
  "app.waiting": "esperando",
  "app.error.camera": "Hace falta permiso de cámara para poder verte las manos.",
  "app.error.generic": "No arrancó: {message}",

  "panel.toggle": "controles",
  "panel.scale": "Escala",
  "panel.key": "Tonalidad",
  "panel.tuning": "Afinación",
  "panel.timbre": "Timbre",
  "panel.effects": "Efectos",
  "panel.response": "Respuesta",
  "panel.hands": "Manos",
  "panel.language": "Idioma",

  "group.simple": "Sin vueltas",
  "group.modes": "Modos",
  "group.world": "Del mundo",
  "group.tones": "Frecuencias fijas",
  "group.free": "Sin escala",

  "tuning.440": "440 Hz — estándar",
  "tuning.432": "432 Hz — más grave",
  "tuning.hint":
    "La referencia contra la que se mide todo lo demás. 432 queda apenas por debajo del diapasón habitual y se usa mucho en música de meditación. Las escalas de frecuencias fijas la ignoran.",

  "mode.guided": "Guiado",
  "mode.guided.hint": "Cinco acordes que suenan bien en cualquier orden. Imposible errarle.",
  "mode.major": "Mayor",
  "mode.major.hint": "Los siete grados de una tonalidad mayor, con sus números romanos.",
  "mode.minor": "Menor",
  "mode.minor.hint": "Los siete grados de una tonalidad menor. Más oscura, más melancólica.",
  "mode.harmonicMinor": "Menor armónica",
  "mode.harmonicMinor.hint":
    "Menor con la séptima subida: el menor dramático. Su acorde V es mayor y empuja fuerte de vuelta a casa.",
  "mode.pentatonicMinor": "Pentatónica menor",
  "mode.pentatonicMinor.hint": "Cinco notas, las del blues y el rock. Tampoco se puede errar.",
  "mode.blues": "Blues",
  "mode.blues.hint":
    "La pentatónica menor más la nota blue. Sus acordes propios salen abiertos; inclinada a la derecha da las séptimas dominantes sobre las que corre el blues de verdad.",
  "mode.dorian": "Dórico",
  "mode.dorian.hint": "Menor con una nota levantada. Triste pero no derrotado: el menor del folk y del jazz.",
  "mode.phrygian": "Frigio",
  "mode.phrygian.hint": "Menor con la segunda baja. Español, sombrío, un poco peligroso.",
  "mode.lydian": "Lidio",
  "mode.lydian.hint": "Mayor con la cuarta alta. Flotante, bien abierto, brillante como banda sonora.",
  "mode.mixolydian": "Mixolidio",
  "mode.mixolydian.hint": "Mayor con la séptima baja. El mayor del rock y del blues.",
  "mode.hirajoshi": "Hirajoshi",
  "mode.hirajoshi.hint": "Una afinación japonesa de koto. Cinco notas, austera y abierta.",
  "mode.hijaz": "Hiyaz",
  "mode.hijaz.hint": "El maqam detrás de mucha música árabe y andaluza. El salto grande es todo el sabor.",
  "mode.solfeggio": "Solfeggio",
  "mode.solfeggio.hint":
    "Las nueve frecuencias solfeggio, de 174 a 963 Hz, usadas en baños de sonido y meditación. No es una tonalidad: inclinar la mano engrosa el tono con octavas y quintas en vez de cambiar de acorde. Las combinaciones con pulgar llegan a los tonos de arriba.",
  "mode.free": "Libre",
  "mode.free.hint":
    "Sin escala y sin escalones: movés la mano de lado a lado y la altura la sigue. Los dedos suman notas encima.",

  "timbre.pad": "Pad",
  "timbre.pad.desc": "Sostenido y envolvente. Suena mientras tengas la mano levantada.",
  "timbre.pluck": "Pluck",
  "timbre.pluck.desc": "Cada gesto dispara una nota que decae sola, como puntear una cuerda.",
  "timbre.bells": "Campanas",
  "timbre.bells.desc": "Metálico y brillante. Sus armónicos no son múltiplos exactos, y por eso repica.",
  "timbre.strings": "Cuerdas",
  "timbre.strings.desc": "Ataque lento, como un arco apoyándose en la cuerda. Con vibrato.",
  "timbre.choir": "Coro",
  "timbre.choir.desc": "Voces. El filtro angosto hace de garganta, que también es un filtro.",
  "timbre.organ": "Órgano",
  "timbre.organ.desc": "Arranca y corta seco. Son ondas puras apiladas en octavas y quintas.",
  "timbre.rhodes": "Rhodes",
  "timbre.rhodes.desc": "Piano eléctrico, dulce y medio jazzero. El mismo truco que las campanas, más suave.",
  "timbre.sub": "Sub",
  "timbre.sub.desc": "Grave y redondo. Sirve para sostener abajo mientras algo se mueve arriba.",
  "timbre.glass": "Vidrio",
  "timbre.glass.desc": "Textura larga y cristalina, casi sin altura definida. Para quedarse quieta.",
  "timbre.bowl": "Cuenco",
  "timbre.bowl.desc": "Un cuenco tibetano. Dos tonos peleando entre sí producen ese pulso lento.",
  "timbre.drone": "Drone",
  "timbre.drone.desc": "No decae nunca y suelta despacio. Hecho para quedarse abajo de todo lo demás.",

  "fx.reverb": "Reverb",
  "fx.delay": "Delay",
  "fx.chorus": "Chorus",
  "fx.drive": "Saturación",

  "response.smoothness": "Suavidad",
  "response.smoothness.hint":
    "A la izquierda responde al instante pero puede temblar; a la derecha se desliza pero contesta un poco después. Los pads y el cuenco la piden alta; el pluck y el órgano, baja.",
  "response.glide": "Deslizar entre acordes",
  "response.glide.hint":
    "Los acordes se deslizan de uno a otro en vez de volver a atacarse. Hermoso en los sonidos sostenidos, raro en los percusivos.",

  "hands.duo": "Modo dúo — cada mano toca su propia voz",
  "hands.swap": "Cambiar de mano el acorde",
  "hands.skeleton": "Dibujar las manos",

  "legend.title": "Cómo se toca",
  "legend.degrees": "**1 a 4 dedos** — el grado: I, II, III, IV",
  "legend.thumb": "**Pulgar afuera** — suma cinco: V, VI, VII",
  "legend.tilt": "**Inclinar la mano** — menor ← natural → séptima",
  "legend.octave": "**Subir o bajar** — la octava",
  "legend.fist": "**Puño** — silencio",
  "legend.other": "**La otra mano** — la altura es volumen, abrirla es brillo",
  "legend.family": "**Otra mano: 2 dedos** — séptimas",
  "legend.colors": "**Otra mano: 1 dedo** — colores",
  "legend.edge": "**Mano al borde** — ♭ a la izquierda, ♯ a la derecha",
  "legend.show": "Mostrar la guía de gestos",

  "feedback.label": "reportar un error o una idea",
  "feedback.subject": "manos — error o idea",
  "feedback.body":
    "Contame qué pasó (o qué te hubiera gustado que pase):\n\n\n\n— Dejá los datos técnicos de abajo, ayudan un montón —\n{info}",

  "family.sevenths": "séptimas",
  "family.colors": "colores",

  "voicing.chords": "Acordes",
  "voicing.notes": "Notas sueltas",
  "voicing.hint": "Notas sueltas: cada gesto es una nota de la escala, para melodías. Más lento que un instrumento con teclas — sirve para líneas tranquilas, no para pasajes rápidos.",

  "map.show": "Mostrar el mapa de acordes",

  "panel.midi": "MIDI",
  "midi.enable": "Mandar MIDI a tus instrumentos",
  "midi.hint":
    "Tus gestos tocan tus propios sintes — GarageBand, Ableton, hardware. En Mac, prendé el IAC Driver en Configuración MIDI Audio, elegilo abajo y agregá una pista de instrumento de software en tu DAW. El volumen viaja por CC7 y el brillo por CC74. La batería queda interna.",
  "midi.output": "Salida",
  "midi.mute": "Silenciar el sonido propio",
  "midi.unsupported": "Este navegador no puede mandar MIDI — Chrome y Edge sí.",
  "midi.none": "No encontré salidas MIDI. Abrí tu DAW o prendé el IAC Driver, y apagá y prendé esto de nuevo.",

  "panel.rhythm": "Ritmo",
  "rhythm.enable": "Batería — la otra mano la dirige",
  "rhythm.tempo": "Tempo",
  "rhythm.hint":
    "El patrón lleva el compás solo; la otra mano lo dirige. Los dedos eligen qué tan cargado va (1 a 4), la altura es su volumen y el puño lo silencia sin perder el compás. Con la batería prendida, esa mano deja de elegir familias de acordes.",

  "timbregroup.sustained": "Pads y voces",
  "timbregroup.struck": "Teclas y punteos",
  "timbregroup.resonant": "Campanas y vidrios",
  "timbregroup.low": "Graves y drones",

  "timbre.hand.left": "Mano izquierda",
  "timbre.hand.right": "Mano derecha",
  "timbre.perhand.hint": "En modo dúo cada mano tiene su propio instrumento.",

  "help.rhythm.title": "La batería",
  "help.rhythm.body":
    "El ritmo corre con su propio reloj, siempre en compás, y tu mano lo dirige: los dedos para la densidad, la altura para el volumen, el puño para silenciarlo justo en el compás. Que se dirija en vez de golpearse es a propósito: con la latencia de la cámara cada golpe llegaría tarde, pero un patrón dirigido va siempre apretado. Se prende en Ritmo.",

  "gesture.finger.one": "1 dedo",
  "gesture.fingers": "{n} dedos",
  "gesture.thumb": "pulgar",
  "gesture.thumb.plus": "pulgar + {n}",
  "gesture.family.sevenths": "otra mano: 2 dedos",
  "gesture.family.colors": "otra mano: 1 dedo",
  "gesture.shift.flat": "al borde izquierdo",
  "gesture.shift.sharp": "al borde derecho",
  "gesture.tilt.min7": "inclinada ⟸",
  "gesture.tilt.min": "inclinada ←",
  "gesture.tilt.maj": "inclinada →",
  "gesture.tilt.dom7": "inclinada ⟹",

  "song.open": "canción",
  "song.title": "Tocar una canción",
  "song.intro":
    "Pegá los acordes de lo que estés leyendo — solos o arriba de la letra, las dos formas sirven. La app elige la tonalidad donde la canción pide menos trucos, y te muestra el gesto de cada acorde.",
  "song.placeholder": "C  G  Am  F\nC  G  F  C",
  "song.load": "Leer los acordes",
  "song.clear": "Sacar la canción",
  "song.key": "Tonalidad elegida: {key}",
  "song.key.direct": "{direct} de {total} acordes salen directo con los dedos.",
  "song.override": "Tocarla en otra tonalidad",
  "song.chords.title": "Acorde por acorde",
  "song.approx": "está escrito {written}, se toca como {played}",
  "song.bass": "el bajo /{bass} no va a sonar",
  "song.unplayable": "no se alcanza en esta tonalidad",
  "song.none": "Ahí no encontré acordes.",
  "song.skipped": "No entendí: {tokens}",

  "hint.raise": "levantá una mano frente a la cámara",
  "hint.open": "abrí la mano para que suene",
  "hint.second": "sumá la otra mano para el volumen y el brillo",

  "record.open": "grabar",
  "record.start": "Empezar a grabar",
  "record.stop": "Parar y guardar",
  "record.unavailable": "Este navegador no puede grabar.",
  "record.saved": "se guardó {name}",
  "record.audio": "El sonido (WAV)",
  "record.audioVoice": "El sonido + mi voz (WAV)",
  "record.video": "El video de la toma",
  "record.videoVoice": "El video + mi voz",
  "record.voice.hint": "Con auriculares la voz sale limpia; con parlantes el mic también escucha al instrumento.",
  "record.mic.denied": "hace falta permiso de micrófono para grabar tu voz",

  "help.open": "cómo se toca",
  "help.close": "Cerrar",
  "help.title": "Cómo se toca",
  "help.intro":
    "Esto no imita a la guitarra ni al piano. Leer formas de acordes con una webcam es frágil y además no significa gran cosa: un RE es otra forma en cada instrumento. Lo que una cámara lee bien son cosas contables y posicionales, y de eso está hecho el instrumento.",

  "help.gestures.title": "Los gestos",
  "help.hands.title": "Qué hace cada mano",
  "help.hands.body":
    "Si hay una sola mano en pantalla, esa toca. Si hay dos, una sostiene el acorde y la otra lo modela: subila para que suene más fuerte, abrila para que se ponga brillante, cerrá el puño para cortar. Con el modo dúo prendido tocan las dos, cada una con su voz — que también significa que pueden tocar dos personas a la vez.",

  "help.modes.title": "Las escalas",
  "help.modes.body":
    "Guiado y pentatónica menor no pueden sonar mal: toques lo que toques encaja. Las tonalidades mayor y menor te dan los siete grados y muestran sus números romanos, y ahí es donde la teoría se vuelve algo que sentís en vez de estudiar. Los modos y las escalas del mundo cambian el clima sin cambiar los gestos. El modo libre saca la escala del medio y deja que la altura se deslice, como un theremín: ese es para quien ya toca.",

  "help.record.title": "Grabar",
  "help.record.body":
    "El botón de grabar captura exactamente lo que escuchás y lo guarda como WAV, listo para tirar a cualquier editor o DAW. Se corta solo a los diez minutos. No se sube nada: el archivo se arma en el navegador y se baja directo a tu máquina.",

  "help.tips.title": "Si no te está leyendo bien",
  "help.tips.body":
    "La luz sobre tus manos importa más que una buena cámara: ponete de frente a una ventana o a una lámpara, no de espaldas. Mantené la mano a un brazo de distancia y con la palma hacia el lente. Un fondo cargado no molesta, pero si una mano pasa por detrás de la otra se confunde un instante. Si lo sentís tembloroso o un poco tarde, lo que hay que mover es el control de suavidad, en Respuesta.",

  "help.privacy.title": "A dónde va tu cámara",
  "help.privacy.body":
    "A ningún lado. El modelo corre adentro de tu navegador, no hay servidor, ni cuenta, ni analytics, y ninguna imagen sale de tu máquina.",

  "status.running": "{fps} fps · {voices} voces",
  "status.recording": "grabando {time}",
  "label.key": "en {key} {mode}",
  "label.free": "{note} · {voices} · libre",
  "label.voices.one": "1 voz",
  "label.voices.many": "{count} voces",
};
