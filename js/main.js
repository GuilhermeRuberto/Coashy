document.addEventListener('DOMContentLoaded', () => {
    // 1. SEUS DADOS (Substitua pelos dados da sua planilha)
    const perfumes = [
        { marca: "Coashy", nome: "Aurous Gold", preco: "239,90", imagem: "https://fimgs.net/mdimg/perfume-thumbs/375x500.13016.avif" },
        { marca: "arab", nome: "junior", preco: "239,90", imagem: "https://fimgs.net/mdimg/perfume-thumbs/375x500.13016.avif" },
        { marca: "Dior", nome: "Homme Intense", preco: "199,90", imagem: "https://fimgs.net/mdimg/perfume-thumbs/375x500.15336.avif" },
        { marca: "mac", nome: "Nocturne", preco: "259,90", imagem: "https://fimgs.net/mdimg/perfume-thumbs/375x500.13016.avif" },
        { marca: "Carab", nome: "Aurous Gold", preco: "239,90", imagem: "https://fimgs.net/mdimg/perfume-thumbs/375x500.13016.avif" },
        { marca: "arab", nome: "junior", preco: "239,90", imagem: "https://fimgs.net/mdimg/perfume-thumbs/375x500.13016.avif" },
        { marca: "Dior", nome: "Homme Intense", preco: "199,90", imagem: "https://fimgs.net/mdimg/perfume-thumbs/375x500.15336.avif" },
        { marca: "mac", nome: "Nocturne", preco: "259,90", imagem: "https://fimgs.net/mdimg/perfume-thumbs/375x500.13016.avif" }

    ];

    const grid = document.getElementById('perfume-grid');
    const searchInput = document.querySelector('.search-bar input');

    // 2. FUNÇÃO PARA RENDERIZAR OS CARDS
    function renderizar(lista) {
        if (!grid) return;
        
        if (lista.length === 0) {
            grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 50px; color: var(--gray-light);">Nenhuma fragrância encontrada.</p>`;
            return;
        }

        grid.innerHTML = lista.map(item => `
            <div class="card">
                <div class="card_img">
                    <img src="${item.imagem}" alt="${item.nome}">
                </div>
                <div class="card-info">
                    <h4>${item.marca}</h4>
                    <h3>${item.nome}</h3>
                    <span class="price">R$ ${item.preco}</span>
                    <button class="btn-add">Adicionar</button>
                </div>
            </div>
        `).join('');
    }

    // 3. LÓGICA DE BUSCA
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            const filtrados = perfumes.filter(p => 
                p.nome.toLowerCase().includes(termo) || 
                p.marca.toLowerCase().includes(termo)
            );
            renderizar(filtrados);
        });
    }

    // 4. MENU MOBILE
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Inicializa a vitrine
    renderizar(perfumes);
});