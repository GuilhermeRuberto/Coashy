// 1. CONFIGURAÇÕES
// Corrigi a URL (estava com dois links grudados)
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

// 2. BUSCA DE DADOS
async function buscarDados() {
    try {
        const urlComCacheBuster = SHEET_URL.split('?')[0] + '/pub?gid=1797905819&single=true&output=csv&t=' + new Date().getTime();
        const response = await fetch(urlComCacheBuster);
        const text = await response.text();
        
        // Divide por linhas, mas remove o \r (carriage return) para não bugar no Windows
        const rows = text.split(/\r?\n/).filter(row => row.trim() !== "");
        const dataRows = rows.slice(1);

        return dataRows.map(row => {
            // REGEX MÁGICA: Separa por vírgula, mas ignora vírgulas dentro de aspas
            // Isso garante que "Dolce & Gabbana" não se separe
            const col = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            
            // Limpa aspas extras e espaços das pontas
            const limpo = col.map(c => c.replace(/^"|"$/g, '').trim());

            // Mapeamento baseado na estrutura real da sua planilha:
            // A=0 (ID), B=1 (Marca), C=2 (Nome), D=3 (Preço), E=4 (ML), F=5 (Tipo), G=6 (Gênero), H=7 (Imagem)
            
            const precoSujo = limpo[3] || "0";
            const valorNumerico = parseFloat(precoSujo.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;

            // Busca a imagem: tentamos na coluna 7 (H), se não, procuramos qualquer link
            let linkImagem = limpo[7] && limpo[7].startsWith('http') ? limpo[7] : limpo.find(c => c.startsWith('http'));

            return {
                id: limpo[0],
                marca: limpo[1] || "Marca", // Aqui agora virá "Calvin Klein" completo
                nome: limpo[2] || "Perfume",
                preco: valorNumerico,
                precoExibicao: valorNumerico > 0 
                    ? valorNumerico.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : "Consulte",
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

// 3. CONTROLADOR DA HOME
// 3. CONTROLADOR DA HOME
function iniciarHome() {
    const grid = document.getElementById('perfume-grid');
    if (!grid) return;

    // --- NOVA LÓGICA DE AGRUPAMENTO ---
    // Filtra para mostrar apenas o primeiro perfume de cada nome
    function obterProdutosUnicos(lista) {
        const nomesVistos = new Set();
        return lista.filter(item => {
            const nomeMinusculo = item.nome.toLowerCase().trim();
            if (!nomesVistos.has(nomeMinusculo)) {
                nomesVistos.add(nomeMinusculo);
                return true;
            }
            return false;
        });
    }

    function renderizar() {
        // Aplicamos o agrupamento aqui
        const produtosUnicos = obterProdutosUnicos(produtosFiltrados);
        
        const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
        const fim = inicio + ITENS_POR_PAGINA;
        const itensExibidos = produtosUnicos.slice(inicio, fim);

        if (itensExibidos.length === 0) {
            grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 50px;">Nenhuma fragrância encontrada.</p>`;
            return;
        }

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
        
        // Atualiza a paginação baseada no novo total de produtos únicos
        renderizarBotoes(produtosUnicos.length);
    }

    function renderizarBotoes(totalItensUnicos) {
        const totalPaginas = Math.ceil(totalItensUnicos / ITENS_POR_PAGINA);
        const pagTop = document.getElementById('pagination-top');
        const pagBot = document.getElementById('pagination-bottom');
        
        if (totalPaginas <= 1) {
            if (pagTop) pagTop.innerHTML = "";
            if (pagBot) pagBot.innerHTML = "";
            return;
        }

        let html = `<button class="page-btn" ${paginaAtual === 1 ? 'disabled' : ''} onclick="mudarPagina(${paginaAtual - 1})"> < </button>`;
        for (let i = 1; i <= totalPaginas; i++) {
            html += `<button class="page-btn ${i === paginaAtual ? 'active' : ''}" onclick="mudarPagina(${i})">${i}</button>`;
        }
        html += `<button class="page-btn" ${paginaAtual === totalPaginas ? 'disabled' : ''} onclick="mudarPagina(${paginaAtual + 1})"> > </button>`;

        if (pagTop) pagTop.innerHTML = html;
        if (pagBot) pagBot.innerHTML = html;
    }

    // O restante do código (searchInput, mudarPagina, etc) continua igual...
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            produtosFiltrados = todosProdutos.filter(p => 
                p.nome.toLowerCase().includes(termo) || p.marca.toLowerCase().includes(termo)
            );
            paginaAtual = 1;
            renderizar();
        });
    }

    window.mudarPagina = (n) => {
        paginaAtual = n;
        renderizar();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.abrirProduto = (id) => {
        window.location.href = `produto.html?id=${id}`;
    };

    renderizar();
}

// 4. CONTROLADOR DA PÁGINA DE PRODUTO
function iniciarPaginaProduto() {
    const container = document.getElementById('product-details');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const idUrl = params.get('id');
    const produto = todosProdutos.find(item => item.id === idUrl);

    if (produto) {
        const infoFixacao = CONFIG_FIXACAO[produto.tipo] || CONFIG_FIXACAO['DEFAULT'];
        const variantes = todosProdutos.filter(p => p.nome === produto.nome);

        const generoTexto = (produto.genero || "").toUpperCase();
        let corFundo = "#f1f5f9"; // Cinza (Unissex/Default)
        let corTexto = "#475569";

        if (generoTexto.includes("FEM")) {
            corFundo = "#fce7f3"; // Rosa pastel
            corTexto = "#be185d";
        } else if (generoTexto.includes("MASC")) {
            corFundo = "#dbeafe"; // Azul pastel
            corTexto = "#1d4ed8";
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
                                    <button class="size-option ${v.id === produto.id ? 'active' : ''}" 
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
        // Dispara a animação após um pequeno delay para garantir que o HTML foi renderizado
        setTimeout(() => {
            const barra = document.getElementById('fixation-anim');
            if (barra) {
                barra.style.width = `${infoFixacao.porcentagem}%`;
            }
        }, 100);
    } else {
        container.innerHTML = `<p style="text-align:center; padding: 100px;">Produto não encontrado.</p>`;
    }
    
}

// 5. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', async () => {
    todosProdutos = await buscarDados();
    produtosFiltrados = [...todosProdutos];

    if (window.location.pathname.includes('produto.html')) {
        iniciarPaginaProduto();
    } else {
        iniciarHome();
    }
});

function toggleCart() {
    const cart = document.getElementById('side-cart');
    const overlay = document.getElementById('cart-overlay');
    
    // Verifica se os elementos existem para evitar erros no console
    if (!cart || !overlay) return;

    // Alterna a classe 'active' no carrinho
    cart.classList.toggle('active');

    // Lógica para mostrar/esconder o overlay e travar o scroll do site
    if (cart.classList.contains('active')) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Impede o fundo de rolar
    } else {
        overlay.classList.remove('active');
        document.body.style.overflow = ''; // Devolve o scroll ao site
    }
}


// VARIÁVEL GLOBAL DO CARRINHO
let carrinho = JSON.parse(localStorage.getItem('coashy_cart')) || [];

// FUNÇÃO PARA ADICIONAR
window.addToCart = (id) => {
    const produto = todosProdutos.find(p => p.id === id);
    if (!produto) return;

    const itemNoCarrinho = carrinho.find(item => item.id === id);
    // Abrir o carrinho e o overlay
    const cart = document.getElementById('side-cart');
    const overlay = document.getElementById('cart-overlay');

    if (cart && overlay) {
        cart.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Trava o scroll
    }
    

    if (itemNoCarrinho) {
        itemNoCarrinho.quantidade += 1;
    } else {
        carrinho.push({
            id: produto.id,
            nome: produto.nome,
            marca: produto.marca,
            preco: produto.preco,
            imagem: produto.imagem,
            ml: produto.ml,
            quantidade: 1
        });
    }

    salvarEAtualizar();
    abrirCart(); // Abre o carrinho lateral automaticamente ao adicionar
};

// SALVAR NO NAVEGADOR E ATUALIZAR TELA
function salvarEAtualizar() {
    localStorage.setItem('coashy_cart', JSON.stringify(carrinho));
    renderizarCarrinho();
    atualizarBadge();
}

function atualizarBadge() {
    const badges = document.querySelectorAll('.badge');
    const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    badges.forEach(b => b.innerText = totalItens);
}

function abrirCart() {
    const cart = document.getElementById('side-cart');
    if (cart) cart.classList.add('active');
}

// RENDERIZAR ITENS NO CARRINHO LATERAL
function renderizarCarrinho() {
    const container = document.getElementById('cart-items');
    const totalElement = document.getElementById('cart-total-val');
    if (!container) return;

    if (carrinho.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding: 40px; color: #94a3b8;">Seu carrinho está vazio.</p>`;
        if (totalElement) totalElement.innerText = "R$ 0,00";
        return;
    }

    container.innerHTML = carrinho.map(item => `
            <div class="cart-item">
                <img src="${item.imagem}" alt="${item.nome}">
                
                <div class="cart-item-info">
                    <h4>${item.nome}</h4>
                    <small style="color: #888;">${item.ml}</small>
                    
                    <div style="display: flex; align-items: center; gap: 10px; margin-top: 8px;">
                        <button onclick="alterarQtd('${item.id}', -1)" style="border:1px solid #ddd; background:none; padding:2px 8px; cursor:pointer;">-</button>
                        <span>${item.quantidade}</span>
                        <button onclick="alterarQtd('${item.id}', 1)" style="border:1px solid #ddd; background:none; padding:2px 8px; cursor:pointer;">+</button>
                    </div>
                </div>

                <div class="cart-item-price">
                    <p>R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')}</p>
                    <button onclick="removerDoCarrinho('${item.id}')" style="color:#ff4444; background:none; border:none; font-size:11px; cursor:pointer;">Remover</button>
                </div>
            </div>
        `).join('');

    const total = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
    if (totalElement) totalElement.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// FUNÇÕES DE MANIPULAÇÃO DO CARRINHO
window.alterarQtd = (id, delta) => {
    const item = carrinho.find(i => i.id === id);
    if (item) {
        item.quantidade += delta;
        if (item.quantidade <= 0) {
            removerDoCarrinho(id);
        } else {
            salvarEAtualizar();
        }
    }
};

window.removerDoCarrinho = (id) => {
    carrinho = carrinho.filter(i => i.id !== id);
    salvarEAtualizar();
};

// FINALIZAR PEDIDO VIA WHATSAPP
window.finalizarPedido = () => {
    if (carrinho.length === 0) return alert("Seu carrinho está vazio!");

    let mensagem = "Olá Coashy! Gostaria de fazer um pedido:\n\n";
    let total = 0;

    carrinho.forEach(item => {
        mensagem += `• ${item.nome} (${item.ml}) - Qtd: ${item.quantidade}x\n`;
        total += item.preco * item.quantidade;
    });

    mensagem += `\n*Total: R$ ${total.toFixed(2).replace('.', ',')}*`;
    
    const fone = "5551994727873"; // COLOQUE SEU WHATSAPP AQUI (DDI + DDD + NUMERO)
    const link = `https://wa.me/${fone}?text=${encodeURIComponent(mensagem)}`;
    
    window.open(link, '_blank');
};

// Chamar atualização ao carregar a página para mostrar badge e itens salvos
document.addEventListener('DOMContentLoaded', () => {
    atualizarBadge();
    renderizarCarrinho();
});



// Lógica de Scroll: Transparência e Esconder/Mostrar
let lastScrollTop = 0;
const header = document.querySelector('.header');

window.addEventListener('scroll', () => {
    // Se o menu mobile estiver aberto, não escondemos o header para não bugar
    const navLinks = document.querySelector('.nav-links');
    if (navLinks && navLinks.classList.contains('active')) return;

    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // 1. Lógica de Transparência (Fica branco após 50px)
    if (scrollTop > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }

    // 2. Lógica de Esconder/Mostrar (Smart Header)
    // Só começa a esconder depois de passar o tamanho do banner (ex: 200px)
    if (scrollTop > 200) {
        if (scrollTop > lastScrollTop) {
            // Scroll para baixo - Adiciona a classe que move o header para cima
            header.classList.add('header-hidden');
        } else {
            // Scroll para cima - Remove a classe para ele voltar
            header.classList.remove('header-hidden');
        }
    } else {
        // Se estiver lá no topo, ele tem que estar visível
        header.classList.remove('header-hidden');
    }

    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
}, { passive: true });




//Fazer botao mobile MENU
// Função para o Menu Mobile
document.addEventListener('DOMContentLoaded', () => {
    // Procure pelo botão que tem a classe .menu-toggle ou o ícone de menu
    const menuBtn = document.querySelector('.menu-toggle') || document.querySelector('.btn-menu-mobile');
    const navLinks = document.querySelector('.nav-links');

    if (menuBtn && navLinks) {
        menuBtn.onclick = function() {
            navLinks.classList.toggle('active');
        };
    }
});