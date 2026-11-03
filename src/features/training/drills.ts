export type Drill = { id: string; name: string; plan: string; cue: string }
export const DRILLS: Record<string, Drill[]> = {
  '100m': [
    { id: '100-1', name: 'Salidas de bloques', plan: '6 × 20 m · pausa 3 min', cue: 'Primera zancada potente y tronco bajo durante 8-10 pasos.' },
    { id: '100-2', name: 'Skipping A y B', plan: '3 × 20 m · pausa 1 min', cue: 'Rodilla alta y pie aterrizando bajo la cadera.' },
    { id: '100-3', name: 'Aceleración 30 m', plan: '5 × 30 m · pausa 2 min', cue: 'Empuje largo contra el suelo, inclinación constante.' },
    { id: '100-4', name: 'Velocidad lanzada', plan: '4 × 30 m con 20 m de entrada', cue: 'Cara y hombros relajados, zancada alta y rápida.' },
  ],
  '200m': [
    { id: '200-1', name: 'Curva al 90%', plan: '4 × 120 m · pausa 4 min', cue: 'Mantén la inclinación hacia el interior sin frenar.' },
    { id: '200-2', name: 'Tempo 200 m', plan: '3 × 200 m al 85% · pausa 6 min', cue: 'Ritmo parejo y cuerpo suelto en la recta final.' },
    { id: '200-3', name: 'Salida + curva', plan: '5 × 60 m · pausa 3 min', cue: 'Acelera en la entrada de curva, no te cierres.' },
    { id: '200-4', name: 'Multisaltos', plan: '4 × 6 saltos · pausa 2 min', cue: 'Contactos cortos y elásticos con el suelo.' },
  ],
  '400m': [
    { id: '400-1', name: 'Tempo 300 m', plan: '3 × 300 m al 85% · pausa 8 min', cue: 'Reparte el esfuerzo, termina fuerte.' },
    { id: '400-2', name: 'Resistencia a la velocidad', plan: '3 × 150 m al 95% · pausa 6 min', cue: 'Mantén la técnica aunque llegue la fatiga.' },
    { id: '400-3', name: 'Parciales 200 + 200', plan: '2 series · pausa 10 min', cue: 'El segundo 200 no debe ser mucho más lento.' },
    { id: '400-4', name: 'Técnica en fatiga', plan: '4 × 80 m relajados', cue: 'Brazos sueltos y zancada larga sin tensión.' },
  ],
  '400mh': [
    { id: 'mh-1', name: 'Ritmo entre vallas', plan: '3 × 5 vallas bajas · pausa 5 min', cue: 'Mismo número de pasos entre todas las vallas.' },
    { id: 'mh-2', name: 'Pierna de ataque y arrastre', plan: '4 × 6 pasadas en valla baja', cue: 'Ataque rápido y arrastre con rodilla alta.' },
    { id: 'mh-3', name: 'Aproximación a la 1ª valla', plan: '5 × 45 m · pausa 4 min', cue: 'Llega con pasos fijos y velocidad controlada.' },
    { id: 'mh-4', name: '150 m con 3 vallas', plan: '3 series · pausa 6 min', cue: 'Reanuda el sprint al aterrizar.' },
  ],
}
