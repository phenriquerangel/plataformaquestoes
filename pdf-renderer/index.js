const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
// Aumenta o limite do payload para aceitar listas grandes de questões
app.use(express.json({ limit: '10mb' }));

const PORT = 3000;

// Função para converter os dados da questão em uma string HTML
const generateHtml = (data, title, incluirGabarito = true) => {
    const questionsHtml = data.map((q, index) => {
        const enunciadoParts = Array.isArray(q.enunciado) ? q.enunciado : [{ type: 'text', content: q.enunciado || '' }];
        const enunciadoHtml = enunciadoParts.map(p => p.type === 'latex' ? `\\(${p.content}\\)` : p.content).join('');

        const alternativasHtml = (q.alternativas || []).map((alt, i) => {
            const altText = (alt || '').replace(/\[math\]([\s\S]*?)\[\/math\]/g, (match, p1) => `\\(${p1}\\)`);
            return `<div><strong>${String.fromCharCode(65 + i)})</strong> ${altText}</div>`;
        }).join('');

        const svgHtml = q.diagrama_svg ? `<div class="diagram">${q.diagrama_svg}</div>` : '';

        return `
            <div class="question">
                <div class="enunciado"><strong>${index + 1}.</strong> ${enunciadoHtml}</div>
                ${svgHtml}
                <div class="alternativas">${alternativasHtml}</div>
            </div>
        `;
    }).join('');

    const gabaritoHtml = data.map((q, index) => {
        const explicacaoParts = Array.isArray(q.explicacao) ? q.explicacao : [{ type: 'text', content: q.explicacao || '' }];
        const explicacaoHtml = explicacaoParts.map(p => p.type === 'latex' ? `\\(${p.content}\\)` : p.content).join('');
        const respostaHtml = (q.resposta_correta || 'N/A').replace(/\[math\]([\s\S]*?)\[\/math\]/g, (match, p1) => `\\(${p1}\\)`);

        return `
            <div class="answer">
                <div><strong>${index + 1}. Resposta:</strong> ${respostaHtml}</div>
                <div class="explicacao"><strong>Explicação:</strong> ${explicacaoHtml}</div>
            </div>
        `;
    }).join('');

    // Template HTML completo que será renderizado
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <script type="text/javascript" id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
            <style>
                body { font-family: Helvetica, sans-serif; font-size: 12pt; line-height: 1.4; color: black; }
                .page { padding: 0; }
                h1 { text-align: center; text-transform: uppercase; font-size: 16pt; }
                .header-info { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                .question { margin-bottom: 20px; page-break-inside: avoid; }
                .enunciado { font-weight: bold; margin-bottom: 8px; }
                .diagram { text-align: center; margin: 10px 0; }
                .diagram svg { max-width: 80%; height: auto; }
                .alternativas { padding-left: 20px; }
                .alternativas div { margin-bottom: 4px; }
                .gabarito-page { page-break-before: always; }
                .answer { margin-bottom: 16px; page-break-inside: avoid; }
                .explicacao { font-size: 10pt; padding-left: 15px; margin-top: 4px; }
            </style>
        </head>
        <body>
            <div class="page">
                <h1>${title}</h1>
                <div class="header-info">
                    <span>Nome: _________________________________________</span>
                    <span>Data: ___/___/___</span>
                </div>
                ${questionsHtml}
            </div>
            ${incluirGabarito ? `<div class="page gabarito-page">
                <h1>GABARITO E EXPLICAÇÕES</h1>
                ${gabaritoHtml}
            </div>` : ''}
        </body>
        </html>
    `;
};

// Endpoint que recebe os dados e retorna o PDF
app.post('/render', async (req, res) => {
    const { data, title, incluir_gabarito } = req.body;

    if (!data || !Array.isArray(data)) {
        return res.status(400).send({ error: '"data" (array of questions) is required.' });
    }

    let browser;
    try {
        browser = await puppeteer.launch({ headless: true, args: [ '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none', ], });
        const page = await browser.newPage();
        const htmlContent = generateHtml(data, title || 'Avaliação', incluir_gabarito !== false);
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        await page.evaluate(async () => { if (window.MathJax && window.MathJax.typesetPromise) { await window.MathJax.typesetPromise(); } });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', right: '20mm', bottom: '25mm', left: '20mm' }, displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: `<div style="font-size: 8px; width: 100%; text-align: center; color: #555;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>`, });
        res.setHeader('Content-Type', 'application/pdf');
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send({ error: 'Failed to generate PDF.' });
    } finally {
        if (browser) { await browser.close(); }
    }
});

app.listen(PORT, () => {
    console.log(`PDF Renderer service listening on port ${PORT}`);
});