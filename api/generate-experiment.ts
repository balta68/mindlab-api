declare const process: {
  env: {
    OPENAI_API_KEY?: string;
  };
};

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

  const { energy, focus, recentTitles } = req.body || {};

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
  }

  const variationSeed = Math.random().toString(36).slice(2);

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        temperature: 0.9,
        input: [
          {
            role: 'system',
            content: `Eres un generador de micro-experimentos prácticos de bienestar emocional.

Diseñas acciones breves, concretas y observables, basadas en principios generales de psicología, aprendizaje conductual y autocuidado cotidiano.

REGLAS OBLIGATORIAS:

1. El experimento debe poder hacerse en menos de 10 minutos.
2. Debe implicar una acción física, atencional, social o conductual concreta.
3. Debe ser específico. Evita frases genéricas como "piensa en...", "relájate", "respira mejor" o "sé positivo".
4. Los pasos deben ser claros, numerables y ejecutables sin interpretación.
5. Evita repetir estructuras típicas, especialmente respiración consciente, salvo que el foco sea calma y la energía sea baja.
6. Debe sentirse como un pequeño reto práctico, no como un consejo motivacional.
7. Usa lenguaje simple, directo y cotidiano.
8. No uses lenguaje clínico ni terapéutico.
9. No hagas diagnóstico, no recomiendes medicación y no sustituyas atención profesional.
10. No propongas acciones peligrosas, invasivas, humillantes, de exposición intensa o que puedan aumentar el malestar.

OBJETIVO:

Que la persona pueda hacer el experimento inmediatamente, sin pensar demasiado, y observar un pequeño cambio.`,
          },
          {
            role: 'user',
            content: `Genera un micro-experimento para:

Energía: "${energy}"
Foco: "${focus}"

NO repitas estos experimentos recientes:
${Array.isArray(recentTitles) ? recentTitles.join(', ') : ''}

Variación obligatoria: ${variationSeed}

REQUISITOS:

- Debe ser específico, no genérico.
- Debe implicar acción directa.
- Debe poder hacerse ahora mismo.
- Debe durar menos de 10 minutos.
- Evita respiración consciente salvo caso muy justificado.
- Evita frases típicas de autoayuda.
- La hipótesis debe explicar de forma sencilla qué se espera observar.
- Los tres pasos deben ser breves y ejecutables.

Devuelve estrictamente JSON con esta estructura:
{
  "title": "",
  "focus": "${focus}",
  "energy": "${energy}",
  "hypothesis": "",
  "steps": ["", "", ""],
  "safetyNote": ""
}`,
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

    const outputText =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      data.output?.[0]?.content?.[0]?.json;

    if (!outputText) {
      return res.status(500).json({
        error: 'No usable output returned',
        raw: data,
      });
    }

    const experiment =
      typeof outputText === 'string' ? JSON.parse(outputText) : outputText;

    return res.status(200).json(experiment);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Unexpected server error',
      details: error?.message || String(error),
    });
  }
}
