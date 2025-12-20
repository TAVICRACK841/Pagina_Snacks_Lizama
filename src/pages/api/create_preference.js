// 1. Habilitamos modo servidor
export const prerender = false;

const accessToken = import.meta.env.MP_ACCESS_TOKEN;

export async function POST({ request }) {
  try {
    // Recibimos los items Y TAMBIÉN la referencia del pedido (ID de Firebase)
    const { items, external_reference } = await request.json();

    // TU CONFIGURACIÓN DE RED (Asegúrate que sea tu IP correcta)
    const myUrl = "http://192.168.1.213:4321";

    const preferenceData = {
      items: items,
      // AQUÍ VINCULAMOS EL PAGO CON TU PEDIDO DE FIREBASE
      external_reference: external_reference, 
      statement_descriptor: "SNACKS LIZAMA",
      back_urls: {
        success: `${myUrl}/orders`,
        failure: `${myUrl}/menu`,
        pending: `${myUrl}/menu`
      },
      // auto_return: "approved", 
    };

    console.log("📦 Creando preferencia para pedido:", external_reference);

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferenceData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("🔴 Error API MP:", data);
      return new Response(JSON.stringify({ error: "Error MP", details: data }), { status: 500 });
    }

    return new Response(JSON.stringify({ id: data.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("🔴 Error Servidor:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}