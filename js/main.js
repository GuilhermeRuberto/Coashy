// 1. CONFIGURAÇÕES
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRZSzbt4ZdO5IcbVolHtuNdMu91pnid44OcgFjwmSOiyMlSjJDSI9hKjb4yeFRyY3FiVx90XPGfQr2X/pub?gid=1797905819&single=true&output=csv";
const ITENS_POR_PAGINA = 20;

// Variáveis Globais de Controle
let todosProdutos = [];
let produtosFiltrados = [];
let paginaAtual = 1;

// 2. FUNÇÃO DE BUSCA DE DADOS (Google Sheets)
async function buscarDados() {
    try {
        const response = await fetch(SHEET_URL + '&t=' + new Date().getTime());
        const text = await response.text();
        
        const rows = text.split(/\r?\n/).filter(row => row.trim() !== "");
        const dataRows = rows.slice(1);

        return dataRows.map(row => {
        const sep = row.includes(';') ? ';' : ',';
        // Divide as colunas e limpa aspas e espaços
        const col = row.split(sep).map(c => c.replace(/^"|"$/g, '').trim());

        // --- LÓGICA INTELIGENTE DE COLUNAS ---
        // Procuramos em todas as colunas qual delas começa com "http"
        const linkImagem = col.find(c => c.toLowerCase().startsWith('http')) || "";
    
        // O ID é sempre a col[0]
        // A Marca e Nome costumam ser col[1] e col[2]
        // O Preço formatamos para garantir que exiba R$ corretamente
        let precoSujo = col[3] || "";
        let precoLimpo = precoSujo.replace(/[R$\s]/g, '').replace(',', '.');
        let valorNumerico = parseFloat(precoLimpo);

        let precoExibicao = !isNaN(valorNumerico) 
            ? valorNumerico.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : precoSujo;

        return {
            id: col[0],
            marca: col[1],
            nome: col[2],
            preco: precoExibicao,
            ml: col.find(c => c.toLowerCase().includes('ml')) || "", // Procura a coluna que tem "ml"
            imagem: linkImagem, // Pega o primeiro link http que encontrar na linha
            descricao: col[col.length - 1] // Geralmente a descrição é a última coluna preenchida
            };
    });
    } catch (error) {
        console.error("Erro ao processar a planilha:", error);
        return [];
    }
}

// 3. CONTROLADOR DA HOME (VITRINE)
function iniciarHome() {
    const grid = document.getElementById('perfume-grid');
    const paginationTop = document.getElementById('pagination-top');
    const paginationBottom = document.getElementById('pagination-bottom');
    const searchInput = document.querySelector('.search-bar input');

    if (!grid) return; // Se não tem grid, não é a home

    // Função de Renderização com Paginação
    function renderizar() {
        // Cálculos de fatiamento
        const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
        const fim = inicio + ITENS_POR_PAGINA;
        const itensExibidos = produtosFiltrados.slice(inicio, fim);

        // Caso vazio
        if (itensExibidos.length === 0) {
            grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 50px; color: var(--gray-light);">Nenhuma fragrância encontrada.</p>`;
            if (paginationTop) paginationTop.innerHTML = "";
            if (paginationBottom) paginationBottom.innerHTML = "";
            return;
        }

        // Gera o HTML dos Cards
        grid.innerHTML = itensExibidos.map(item => `
            <div class="card" onclick="abrirProduto('${item.id}')">
                <div class="card_img">
                    <img src="${item.imagem}" alt="${item.nome}" loading="lazy">
                </div>
                <div class="card-info">
                    <h4>${item.marca}</h4>
                    <h3>${item.nome}</h3>
                    <span class="price">${item.preco}</span>
                    <button class="btn-add">Comprar</button>
                </div>
            </div>
        `).join('');

        renderizarBotoes();
    }

    // Função dos Botões de Paginação
    function renderizarBotoes() {
        const totalPaginas = Math.ceil(produtosFiltrados.length / ITENS_POR_PAGINA);
        
        if (totalPaginas <= 1) {
            if (paginationTop) paginationTop.innerHTML = "";
            if (paginationBottom) paginationBottom.innerHTML = "";
            return;
        }

        let html = '';
        // Botão Anterior
        html += `<button class="page-btn" ${paginaAtual === 1 ? 'disabled' : ''} onclick="mudarPagina(${paginaAtual - 1})"> < </button>`;

        // Números
        for (let i = 1; i <= totalPaginas; i++) {
            html += `<button class="page-btn ${i === paginaAtual ? 'active' : ''}" onclick="mudarPagina(${i})">${i}</button>`;
        }

        // Botão Próximo
        html += `<button class="page-btn" ${paginaAtual === totalPaginas ? 'disabled' : ''} onclick="mudarPagina(${paginaAtual + 1})"> > </button>`;

        if (paginationTop) paginationTop.innerHTML = html;
        if (paginationBottom) paginationBottom.innerHTML = html;
    }

    // Lógica de Pesquisa
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            produtosFiltrados = todosProdutos.filter(p => 
                p.nome.toLowerCase().includes(termo) || 
                p.marca.toLowerCase().includes(termo)
            );
            paginaAtual = 1; // Reseta para pág 1 ao pesquisar
            renderizar();
        });
    }

    // Expõe a função de mudar página para o HTML poder clicar
   window.mudarPagina = (n) => {
    const grid = document.getElementById('perfume-grid');
    const totalPaginas = Math.ceil(produtosFiltrados.length / ITENS_POR_PAGINA);
    
    if (n < 1 || n > totalPaginas) return;

    // 1. Inicia a animação de saída
    grid.classList.add('fade-out');

    // 2. Espera a animação de saída terminar (300ms)
    setTimeout(() => {
        paginaAtual = n;
        renderizar(); // Esta função desenha os novos itens

        // 3. Remove a classe para os novos itens surgirem suavemente
        grid.classList.remove('fade-out');

        // 4. Scroll suave para o topo da seção
        const section = document.querySelector('.destaques');
        if (section) {
            window.scrollTo({ top: section.offsetTop + 80, behavior: 'smooth' });
        }
    }, 300); 
};

    // Função de navegação ao clicar no card
    window.abrirProduto = (id) => {
        window.location.href = `produto.html?id=${id}`;
    };

    // Inicializa
    renderizar();
}

// 4. CONTROLADOR DA PÁGINA DE PRODUTO
function iniciarPaginaProduto() {
    const container = document.getElementById('product-details');
    if (!container) return; // Se não tem container, não é página de produto

    const params = new URLSearchParams(window.location.search);
    const idUrl = params.get('id');
    const produto = todosProdutos.find(item => item.id === idUrl);

    if (produto) {
        // Atualiza título da aba
        document.title = `${produto.nome} | Coashy`;
        
        container.innerHTML = `
            <div class="product-grid-detail">
                <div class="product-img">
                    <img src="${produto.imagem}" alt="${produto.nome}">
                </div>
                <div class="product-info">
                    <span>${produto.marca}</span>
                    <div class="title-wrapper">
                        <h1>${produto.nome}</h1>
                        <span class="ml-tag">${produto.ml}</span>
                    </div>
                    <p class="desc">${produto.descricao}</p>
                    <h2 class="price">R$ ${produto.preco}</h2>
                    
                    <button class="btn-primary">Adicionar ao Carrinho</button>
                    
                    <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                         <small style="color: var(--gray-light); display: block; margin-bottom: 5px;">
                            PAGAMENTO SEGURO
                         </small>
                         <p style="font-size: 13px; color: var(--gray-text);">
                            Em até 10x sem juros ou 5% de desconto no PIX.
                         </p>
                    </div>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `<p style="text-align:center; padding: 100px;">Produto não encontrado.</p>`;
    }
}

// 5. INICIALIZAÇÃO GLOBAL
document.addEventListener('DOMContentLoaded', async () => {
    // Menu Mobile (Funciona em todas as páginas)
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => navLinks.classList.toggle('active'));
    }


    // Busca os dados UMA vez e distribui
    todosProdutos = await buscarDados();
    produtosFiltrados = [...todosProdutos]; // Cópia inicial

    // Decide qual página carregar
    if (window.location.pathname.includes('produto.html')) {
        iniciarPaginaProduto();
    } else {
        iniciarHome();
    }
});