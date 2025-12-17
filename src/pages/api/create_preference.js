// src/pages/api/create_preference.js
import { MercadoPagoConfig, Preference } from 'mercadopago';

// ⚠️ PEGA AQUÍ TU "ACCESS TOKEN" DE PRUEBA (Empieza con APP_USR-...)
const client = new MercadoPagoConfig({ accessToken: 'TU_ACCESS_TOKEN_AQUI' });

export async function POST({ request }) {
  try {
    const { items } = await request.json();

    const preference = new Preference(client);
    
    const result = await preference.create({
      body: {
        items: items,
        back_urls: {
          success: "http://localhost:4321/success", // Donde vuelve si paga bien
          failure: "http://localhost:4321/failure", // Donde vuelve si falla
          pending: "http://localhost:4321/pending",
        },
        auto_return: "approved",
      }
    });

    return new Response(JSON.stringify({ id: result.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}