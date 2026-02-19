/**
 * COASHY PERFUMARIA - Script Centralizado
 * Funcionalidades: Filtros Dinâmicos, Carrinho, Integração Sheets e UI Reativa
 */

// 1. CONFIGURAÇÕES E ESTADO GLOBAL
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRZSzbt4ZdO5IcbVolHtuNdMu91pnid44OcgFjwmSOiyMlSjJDSI9hKjb4yeFRyY3FiVx90XPGfQr2X/pub?gid=1797905819&single=true&output=csv";
const ITENS_POR_PAGINA = 20;

const CONFIG_FIXACAO = {
    'EDP': { porcentagem: 85, label: 'Eau de Parfum', tempo: '8h - 10h' },
    'EDT': { porcentagem: 65, label: 'Eau de Toilette', tempo: '4h - 6h' },
    'PARFUM': { porcentagem: 95, label: 'Parfum', tempo: '10h - 12h' },
    'COLONIA': { porcentagem: 40, label: 'Eau de Cologne', tempo: '2h - 3h' },
    'DEFAULT': { porcentagem: 50, label: 'Fragrância', tempo: '4h+' }
};

let todosProdutos = [];
let produtosFiltrados = [];
let paginaAtual = 1;
let carrinho = JSON.parse(localStorage.getItem('coashy_cart')) || [];

// 2. BUSCA DE DADOS (GOOGLE SHEETS)
async function buscarDados() {
    try {
        const t = new Date().getTime();
        const url = `${SHEET_URL.split('?')[0]}/pub?gid=1797905819&single=true&output=csv&t=${t}`;
        const response = await fetch(url);
        const text = await response.text();
        
        const rows = text.split(/\r?\n/).filter(row => row.trim() !== "");
        const dataRows = rows.slice(1);

        return dataRows.map(row => {
            const col = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            const limpo = col.map(c => c.replace(/^"|"$/g, '').trim());
            
            const precoSujo = limpo[3] || "0";
            const valorNumerico = parseFloat(precoSujo.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
            let linkImagem = limpo[7]?.startsWith('http') ? limpo[7] : limpo.find(c => c.startsWith('http'));

            return {
                id: limpo[0],
                marca: limpo[1] || "Marca",
                nome: limpo[2] || "Perfume",
                preco: valorNumerico,
                precoExibicao: valorNumerico > 0 ? valorNumerico.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "Consulte",
                ml: limpo[4] || "", 
                tipo: (limpo[5] || "EDT").toUpperCase(),
                genero: limpo[6] || "Unissex",
                imagem: linkImagem || "assets/placeholder.png",
                descricao: limpo[8] || ""
            };
        });
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        return [];
    }
}

// 3. LÓGICA DE RENDERIZAÇÃO DA VITRINE (HOME)
function obterProdutosUnicos(lista) {
    const nomesVistos = new Set();
    return lista.filter(item => {
        const chave = item.nome.toLowerCase().trim();
        if (!nomesVistos.has(chave)) {
            nomesVistos.add(chave);
            return true;
        }
        return false;
    });
}

function renderizarVitrine() {
    const grid = document.getElementById('perfume-grid');
    if (!grid) return;

    // Adiciona um efeito de "piscada" suave ao atualizar
    grid.style.opacity = '0.5';
    
    // ... resto do seu código de renderização ...

    // Devolve a opacidade após renderizar
    setTimeout(() => {
        grid.style.opacity = '1';
    }, 50);

    grid.style.maxWidth = "1200px";
    grid.style.margin = "0 auto";
    grid.style.display = "grid";
    grid.style.padding = "40px 20px";              // Mais respiro vertical

    const produtosUnicos = obterProdutosUnicos(produtosFiltrados);
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const fim = inicio + ITENS_POR_PAGINA;
    const itensExibidos = produtosUnicos.slice(inicio, fim);

    if (itensExibidos.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 50px;">Nenhuma fragrância encontrada.</p>`;
    } else {
        grid.innerHTML = itensExibidos.map(item => `
            <div class="card" onclick="abrirProduto('${item.id}')">
                <div class="card_img">
                    <img src="${item.imagem}" alt="${item.nome}" loading="lazy">
                </div>
                <div class="card-info">
                    <h4>${item.marca}</h4>
                    <h3>${item.nome}</h3>
                    <span class="price">${item.precoExibicao}</span>
                    <button class="btn-add">Ver Detalhes</button>
                </div>
            </div>
        `).join('');
    }
    renderizarPaginacao(produtosUnicos.length);
}

function renderizarPaginacao(totalItens) {
    const totalPaginas = Math.ceil(totalItens / ITENS_POR_PAGINA);
    const containers = [document.getElementById('pagination-top'), document.getElementById('pagination-bottom')];
    
    const html = totalPaginas <= 1 ? "" : `
        <button class="page-btn" ${paginaAtual === 1 ? 'disabled' : ''} onclick="mudarPagina(${paginaAtual - 1})"> < </button>
        ${Array.from({length: totalPaginas}, (_, i) => i + 1).map(i => `
            <button class="page-btn ${i === paginaAtual ? 'active' : ''}" onclick="mudarPagina(${i})">${i}</button>
        `).join('')}
        <button class="page-btn" ${paginaAtual === totalPaginas ? 'disabled' : ''} onclick="mudarPagina(${paginaAtual + 1})"> > </button>
    `;

    containers.forEach(c => { if(c) c.innerHTML = html; });
}

window.mudarPagina = (n) => {
    paginaAtual = n;
    renderizarVitrine();
    const hero = document.querySelector('.hero');
    const dest = hero ? hero.offsetHeight - 60 : 0;
    window.scrollTo({ top: dest, behavior: 'smooth' });
};

// 4. FILTROS E BUSCA
function popularFiltroMarcas() {
    const select = document.getElementById('filter-marca');
    if (!select) return;
    const marcas = [...new Set(todosProdutos.map(p => p.marca))].sort();
    select.innerHTML = '<option value="">Todas as Marcas</option>' + 
        marcas.map(m => `<option value="${m}">${m}</option>`).join('');
}

// --- CONFIGURAÇÃO DE EVENTOS ---
function configurarEventosFiltro() {
    const mainSearch = document.getElementById('main-search');
    const secondarySearch = document.getElementById('secondary-search');

    const configurarBusca = (input, permitirDropdown) => {
        input?.addEventListener('input', (e) => {
            const valor = e.target.value;
            
            // Sincroniza os inputs
            if(mainSearch) mainSearch.value = valor;
            if(secondarySearch) secondarySearch.value = valor;

            // Chama o filtro passando se deve ou não mostrar o dropdown
            aplicarFiltros('search', permitirDropdown);
        });
    };

    configurarBusca(mainSearch, true);  // Barra principal: ABRE dropdown
    configurarBusca(secondarySearch, false); // Barra secundária: NÃO abre dropdown

    // Filtros de baixo
    ['filter-marca', 'filter-genero', 'filter-tipo'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => aplicarFiltros('select'));
    });
}

// --- FUNÇÃO MESTRE DE FILTRAGEM (VERSÃO DEFINITIVA) ---
function aplicarFiltros(origem, permitirDropdown = true) {
    // 1. Captura de elementos e checagem de página
    const elBusca = document.getElementById('main-search');
    const elMarca = document.getElementById('filter-marca');
    const elGenero = document.getElementById('filter-genero');
    const elTipo = document.getElementById('filter-tipo');
    const dropdown = document.getElementById('search-dropdown');
    const grid = document.getElementById('perfume-grid');

    // 2. Define o termo de busca (usamos let para poder ler em qualquer lugar da função)
    let termo = elBusca?.value.toLowerCase().trim() || "";

    // 3. Lógica de prioridade: Se digitar, limpa selects (visual e valor)
    if (origem === 'search' && termo.length > 0) {
        if (elMarca) elMarca.value = "";
        if (elTipo) elTipo.value = "";
    }

    // 4. Captura valores atuais para o filtro
    const marca = elMarca?.value || "";
    const genero = elGenero?.value || "";
    const tipo = elTipo?.value || "";

    // 5. Filtra os produtos globalmente (funciona em qualquer página)
    produtosFiltrados = todosProdutos.filter(p => {
        const nomeOuMarca = (p.nome + " " + p.marca).toLowerCase();
        const matchTexto = termo === "" || nomeOuMarca.includes(termo);
        const matchMarca = marca === "" || p.marca === marca;
        const matchGenero = genero === "" || p.genero.toUpperCase().includes(genero.toUpperCase());
        const matchTipo = tipo === "" || p.tipo === tipo;
        
        return matchTexto && matchMarca && matchGenero && matchTipo;
    });

    // 6. Atualiza a Vitrine (APENAS se o grid existir na página atual)
    if (grid) {
        paginaAtual = 1;
        renderizarVitrine();
    }

    // 7. Gerencia o Dropdown (Se houver container de dropdown na página)
    if (dropdown) {
        if (termo.length >= 2 && permitirDropdown) {
            const sugestoes = produtosFiltrados.slice(0, 5);
            renderizarConteudoDropdown(sugestoes, dropdown);
            dropdown.classList.add('active');
        } else {
            dropdown.classList.remove('active');
        }
    }
}

// --- RENDERIZAÇÃO DO DROPDOWN ---
function renderizarConteudoDropdown(lista, container) {
    if (!container) return;

    if (lista.length === 0) {
        container.innerHTML = '<p style="padding:20px; color:#888; text-align:center;">Nenhum perfume encontrado...</p>';
        return;
    }

    const htmlProdutos = lista.map((p, index) => `
        <div class="suggestion-item" onclick="abrirProduto('${p.id}')" style="animation-delay: ${index * 0.05}s">
            <img src="${p.imagem}" style="width:45px; height:45px; border-radius:5px; object-fit:cover;">
            <div class="suggestion-info">
                <h4 style="margin:0; font-size:0.9rem;">${p.nome}</h4>
                <small>${p.marca} - ${p.ml}</small>
            </div>
        </div>
    `).join('');

    container.innerHTML = htmlProdutos + `
        <button onclick="irParaVitrine()" class="btn-ver-todos-dropdown">
            VER TODOS OS ${produtosFiltrados.length} RESULTADOS
        </button>
    `;
}

// Fecha o dropdown ao clicar fora dele
document.addEventListener('click', (event) => {
    const dropdown = document.getElementById('search-dropdown');
    const inputBusca = document.getElementById('main-search');
    const inputSecundario = document.getElementById('secondary-search');

    // Se o clique NÃO foi no dropdown e NÃO foi em nenhum dos inputs de busca
    if (dropdown && 
        !dropdown.contains(event.target) && 
        !inputBusca?.contains(event.target) && 
        !inputSecundario?.contains(event.target)) {
        
        dropdown.classList.remove('active');
    }
});

// Reabre o dropdown se o usuário clicar de volta no input e já houver texto
document.getElementById('main-search')?.addEventListener('focus', (e) => {
    if (e.target.value.length >= 2) {
        document.getElementById('search-dropdown')?.classList.add('active');
    }
});

// Função para resetar tudo
window.limparTodosFiltros = () => {
    const elBusca = document.getElementById('main-search');
    const elMarca = document.getElementById('filter-marca');
    const elGenero = document.getElementById('filter-genero');
    const elTipo = document.getElementById('filter-tipo');

    // Reseta os valores visualmente no HTML
    if (elBusca) elBusca.value = "";
    if (elMarca) elMarca.value = "";
    if (elGenero) elGenero.value = "";
    if (elTipo) elTipo.value = "";

    // Fecha o dropdown se estiver aberto
    document.getElementById('search-dropdown')?.classList.remove('active');

    // Chama a função de filtro para atualizar a vitrine e mostrar todos os perfumes
    aplicarFiltros('select'); 
};

// --- FUNÇÃO DE SCROLL (IR PARA VITRINE) ---
window.irParaVitrine = () => {
    const grid = document.getElementById('perfume-grid');
    const termo = document.getElementById('main-search')?.value || "";

    if (grid) {
        // Se estiver na HOME: apenas rola até os produtos
        document.getElementById('search-dropdown')?.classList.remove('active');
        const headerHeight = document.querySelector('.header')?.offsetHeight || 80;
        const offset = grid.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
        window.scrollTo({ top: offset, behavior: 'smooth' });
    } else {
        // Se estiver no PRODUCT.HTML: redireciona para a home com o termo de busca
        window.location.href = `index.html?busca=${encodeURIComponent(termo)}`;
    }
};
// 5. CARRINHO DE COMPRAS
function salvarEAtualizarCarrinho() {
    localStorage.setItem('coashy_cart', JSON.stringify(carrinho));
    atualizarBadge();
    renderizarCarrinhoLateral();
}

function atualizarBadge() {
    const total = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    document.querySelectorAll('.badge').forEach(b => b.innerText = total);
}

window.addToCart = (id) => {
    const produto = todosProdutos.find(p => p.id === id);
    if (!produto) return;

    const item = carrinho.find(i => i.id === id);
    if (item) item.quantidade++;
    else carrinho.push({ ...produto, quantidade: 1 });

    salvarEAtualizarCarrinho();
    toggleCart(true); // Abre o carrinho automaticamente
};

function renderizarCarrinhoLateral() {
    const container = document.getElementById('cart-items');
    const totalVal = document.getElementById('cart-total-val');
    if (!container) return;

    if (carrinho.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:40px; color:#94a3b8;">Carrinho vazio.</p>`;
        if (totalVal) totalVal.innerText = "R$ 0,00";
        return;
    }

    container.innerHTML = carrinho.map(item => `
        <div class="cart-item">
            <img src="${item.imagem}">
            <div class="cart-item-info">
                <h4>${item.nome}</h4>
                <div class="qtd-controls">
                    <button onclick="alterarQtd('${item.id}', -1)">-</button>
                    <span>${item.quantidade}</span>
                    <button onclick="alterarQtd('${item.id}', 1)">+</button>
                </div>
            </div>
            <div class="cart-item-price">
                <p>R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')}</p>
                <button class="remove-btn" onclick="removerDoCarrinho('${item.id}')">Remover</button>
            </div>
        </div>
    `).join('');

    const total = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
    if (totalVal) totalVal.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

window.alterarQtd = (id, delta) => {
    const item = carrinho.find(i => i.id === id);
    if (item) {
        item.quantidade += delta;
        if (item.quantidade <= 0) removerDoCarrinho(id);
        else salvarEAtualizarCarrinho();
    }
};

window.removerDoCarrinho = (id) => {
    carrinho = carrinho.filter(i => i.id !== id);
    salvarEAtualizarCarrinho();
};

// 6. UI E NAVEGAÇÃO (HEADER/MENU)
function toggleCart(forceOpen = null) {
    const cart = document.getElementById('side-cart');
    const overlay = document.getElementById('cart-overlay');
    if (!cart || !overlay) return;

    const shouldOpen = forceOpen !== null ? forceOpen : !cart.classList.contains('active');
    
    cart.classList.toggle('active', shouldOpen);
    overlay.classList.toggle('active', shouldOpen);
    document.body.style.overflow = shouldOpen ? 'hidden' : '';
}

function toggleMenu() {
    document.getElementById('main-nav')?.classList.toggle('active');
}

// Smart Header
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (!header || document.querySelector('.nav-links.active')) return;

    let st = window.pageYOffset || document.documentElement.scrollTop;
    
    header.classList.toggle('scrolled', st > 50);
    
    if (st > 200) {
        header.classList.toggle('header-hidden', st > lastScroll);
    } else {
        header.classList.remove('header-hidden');
    }
    lastScroll = st <= 0 ? 0 : st;
}, { passive: true });

// 7. PÁGINA DE PRODUTO
function iniciarPaginaProduto() {
    const container = document.getElementById('product-details');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const idUrl = params.get('id');
    const produto = todosProdutos.find(item => item.id === idUrl);

    if (produto) {
        const infoFixacao = CONFIG_FIXACAO[produto.tipo] || CONFIG_FIXACAO['DEFAULT'];
        const variantes = todosProdutos.filter(p => p.nome === produto.nome);

        // Lógica de Cores por Gênero
        const generoTexto = (produto.genero || "").toUpperCase();
        let corFundo = "#f1f5f9"; // Default Unissex
        let corTexto = "#475569";
        let classeGenero = "gender-unissex";

        if (generoTexto.includes("FEM")) {
            corFundo = "#fce7f3"; 
            corTexto = "#be185d";
            classeGenero = "gender-fem";
        } else if (generoTexto.includes("MASC")) {
            corFundo = "#dbeafe"; 
            corTexto = "#1d4ed8";
            classeGenero = "gender-masc";
        }

        container.innerHTML = `
            <div class="product-grid-detail">
                <div class="product-img">
                    <img src="${produto.imagem}" alt="${produto.nome}">
                </div>
                <div class="product-info">
                    <div class="top-info">
                        <span class="brand-tag">${produto.marca}</span>
                    </div>
                    <h1>${produto.nome}</h1>

                    <div class="specs-row" style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px; flex-wrap: wrap;">
                        <div class="variations-section" style="margin: 0; display: flex; align-items: center;">
                            ${variantes.length > 1 ? `
                                <div class="size-selector" style="margin: 0; display: flex; gap: 10px; align-items: center;">
                                     ${variantes.map(v => `
                                    <button class="size-option ${v.id === idUrl ? 'active' : ''} ${classeGenero}" 
                                    style="margin: 0;"
                                    onclick="window.location.href='produto.html?id=${v.id}'">
                                    ${v.ml}
                                    </button>
                                    `).join('')}
                                </div>
                            ` : `
                                <span style="font-size: 1.1rem; font-weight: 600; color: #64748b; line-height: 1;">${produto.ml}</span>
                            `}
                        </div>
    
                        <span class="gender-badge" style="
                            margin: 0; 
                            display: inline-flex; 
                            align-items: center; 
                            height: fit-content;
                            background-color: ${corFundo};
                            color: ${corTexto};
                            padding: 4px 12px;
                            border-radius: 20px;
                            font-size: 0.8rem;
                            font-weight: 600;
                            text-transform: uppercase;
                            ">
                            ${produto.genero}
                        </span>
                    </div>

                    <div class="fixation-container">
                        <div class="fixation-header">
                            <span class="type-badge">${infoFixacao.label}</span>
                            <span class="fixation-percent">Fixação</span>
                        </div>
                        <div class="fixation-bar" style="background: #eee; height: 8px; border-radius: 10px; overflow: hidden; margin: 10px 0;">
                            <div id="fixation-anim" class="fixation-fill" style="width: 0;"></div>
                        </div>
                        <small>Duração média estimada: ${infoFixacao.tempo}</small>
                    </div>

                    <div class="price-container">
                        <h2>${produto.precoExibicao}</h2>
                        <p class="installments">ou 10x de R$ ${(produto.preco / 10).toFixed(2).replace('.', ',')}</p>
                    </div>
                    <button class="btn-add-cart" onclick="addToCart('${produto.id}')">ADICIONAR AO CARRINHO</button>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            const barra = document.getElementById('fixation-anim');
            if (barra) barra.style.width = `${infoFixacao.porcentagem}%`;
        }, 100);
    } else {
        container.innerHTML = `<p style="text-align:center; padding: 100px;">Produto não encontrado.</p>`;
    }
}

// 8. INICIALIZAÇÃO UNIFICADA
async function inicializar() {
    // Busca os dados da planilha
    todosProdutos = await buscarDados();
    produtosFiltrados = [...todosProdutos];

    const isProductPage = window.location.pathname.includes('produto.html');
    
    // 1. Lógica de busca vinda de outra página (via URL)
    const urlParams = new URLSearchParams(window.location.search);
    const buscaDaUrl = urlParams.get('busca');
    const inputBusca = document.getElementById('main-search');

    if (buscaDaUrl && inputBusca) {
        inputBusca.value = buscaDaUrl;
        // Não precisamos de setTimeout aqui pois já estamos dentro do inicializar (async)
        aplicarFiltros('search');
    }

    // 2. Configura os eventos de busca em ambas as páginas
    configurarEventosFiltro();

    // 3. Renderiza conforme a página atual
    if (isProductPage) {
        iniciarPaginaProduto();
    } else {
        popularFiltroMarcas();
        renderizarVitrine();
    }
    
    // 4. Atualiza componentes de UI
    atualizarBadge();
    renderizarCarrinhoLateral();
}

// Comandos de ação global
window.abrirProduto = (id) => window.location.href = `produto.html?id=${id}`;

window.finalizarPedido = () => {
    if (carrinho.length === 0) return alert("Carrinho vazio!");
    let msg = "Olá Coashy! Gostaria de fazer um pedido:\n\n" + 
               carrinho.map(i => `• ${i.nome} (${i.ml}) - ${i.quantidade}x`).join('\n');
    const total = carrinho.reduce((acc, i) => acc + (i.preco * i.quantidade), 0);
    msg += `\n\n*Total: R$ ${total.toFixed(2).replace('.', ',')}*`;
    window.open(`https://wa.me/5551994727873?text=${encodeURIComponent(msg)}`, '_blank');
};

// Disparo inicial
document.addEventListener('DOMContentLoaded', inicializar);