export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { energy, focus } = req.body;

  return res.status(200).json({
    title: 'Respiración consciente breve',
    focus: focus || 'calma',
    energy: energy || 'media',
    hypothesis: 'La respiración lenta consciente reduce tu exceso de activación para llevarte al lugar dónde poder tomar tus mejores decisiones: Tu mente consciente y equilibrada.',
    steps: [
      'Inhala durante 4 segundos',
      'Mantén 2 segundos',
      'Exhala durante 6 segundos',
    ],
    safetyNote: 'Si te mareas, detente.'
  });
}