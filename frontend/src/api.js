/**
 * Cliente de API centralizado para fazer requisições ao backend.
 * @param {string} endpoint O endpoint da API (ex: 'materias').
 * @param {string} method O método HTTP (ex: 'GET', 'POST', 'DELETE').
 * @param {object} [body] O corpo da requisição para métodos como POST e PUT.
 * @returns {Promise<any>} Uma promessa que resolve com os dados da resposta.
 * @throws {Error} Lança um erro com status e mensagem se a requisição falhar.
 */
export async function apiClient(endpoint, method = 'GET', body = null) {
  const API_URL = '/api';
  const url = `${API_URL}/${endpoint}`;
  const options = {
    method,
    headers: {},
  };

  console.log(`%c[API Request] -> ${method} ${url}`, 'color: blue; font-weight: bold;', body || '');

  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    
    // Clona a resposta para poder ler o corpo duas vezes (uma para log, outra para o app)
    const responseToLog = response.clone();
    const responseText = await responseToLog.text();

    if (!response.ok) {
      console.error(`%c[API Response ERROR] <- ${response.status} ${response.statusText}`, 'color: red; font-weight: bold;', responseText);
      let errorDetail = `Erro ${response.status}`;
      try {
        errorDetail = JSON.parse(responseText).detail || responseText;
      } catch (e) {
        errorDetail = responseText.slice(0, 200) || errorDetail; // Mostra os primeiros 200 caracteres do erro
      }
      const error = new Error(errorDetail);
      error.status = response.status;
      throw error;
    }

    console.log(`%c[API Response OK] <- ${response.status}`, 'color: green; font-weight: bold;', JSON.parse(responseText));
    const data = JSON.parse(responseText);
    return data;
  } catch (err) {
    throw err; // Re-lança o erro para ser pego pelo 'catch' da chamada
  }
}