export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { energy, focus } = req.body || {};

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
  }

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          {
            role: 'system',
            content:
              'Eres un generador de micro-experimentos diarios de bienestar emocional. No haces diagnóstico, no das tratamiento médico, no sustituyes terapia y no propones acciones peligrosas. Devuelve siempre solo JSON válido.',
          },
          {
            role: 'user',
            content: `Genera un micro-experimento breve para una persona con energía "${energy}" y foco "${focus}". Debe ser seguro, cotidiano, no clínico, no invasivo, y realizable en menos de 10 minutos. Devuelve estrictamente JSON con esta forma: {"title":"", "focus":"${focus}", "energy":"${energy}", "hypothesis":"", "steps":["", "", ""], "safetyNote":""}`,
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'mindlab_experiment',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                title: { type: 'string' },
                focus: {
                  type: 'string',
                  enum: ['calma', 'foco', 'conexion', 'energia'],
                },
                energy: {
                  type: 'string',
                  enum: ['baja', 'media', 'alta'],
                },
                hypothesis: { type: 'string' },
                steps: {
                  type: 'array',
                  minItems: 3,
                  maxItems: 3,
                  items: { type: 'string' },
                },
                safetyNote: { type: 'string' },
              },
              required: [
                'title',
                'focus',
                'energy',
                'hypothesis',
                'steps',
                'safetyNote',
              ],
            },
          },
        },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      return res.status(500).json({
        error: 'OpenAI request failed',
        details: errorText,
      });
    }

    const data = await openaiResponse.json();

    const outputText = data.output_text;

    if (!outputText) {
      return res.status(500).json({
        error: 'No output_text returned',
        raw: data,
      });
    }

    const experiment = JSON.parse(outputText);

    return res.status(200).json(experiment);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Unexpected server error',
      details: error?.message || String(error),
    });
  }
}
