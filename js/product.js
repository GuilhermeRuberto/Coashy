// Este array no futuro será preenchido pelo fetch() da sua planilha
let bancoDeDadosPerfumes = []; 

function inicializarPaginaProduto() {
    // 1. Pega o ID do perfume na URL (ex: product.html?id=001)
    const urlParams = new URLSearchParams(window.location.search);
    const produtoId = urlParams.get('id');

    // 2. Simulação de busca no banco de dados
    // No futuro: const todosOsPerfumes = await buscarDadosDaPlanilha();
    const todosOsPerfumes = JSON.parse(localStorage.getItem('perfumes_data')) || [];

    // 3. Encontra o perfume atual
    const perfumeAtual = todosOsPerfumes.find(p => p.id === produtoId);

    if (!perfumeAtual) {
        console.error("Perfume não encontrado!");
        return;
    }

    // 4. Busca variações (outros com mesmo nome, mas tamanhos diferentes)
    const variacoes = todosOsPerfumes.filter(p => p.nome === perfumeAtual.nome);

    // 5. Preenche os textos básicos
    document.querySelector('.brand-tag').innerText = perfumeAtual.marca;
    document.querySelector('h1').innerText = perfumeAtual.nome;
    document.getElementById('main-product-img').src = perfumeAtual.imagem;
    
    // 6. Lógica dos Botões de ML (Só aparece se variacoes.length > 1)
    renderizarVariacoes(variacoes, perfumeAtual);
}

function renderizarVariacoes(lista, ativo) {
    const wrapper = document.getElementById('variation-wrapper');
    const container = document.getElementById('size-options-container');

    if (lista.length > 1) {
        wrapper.style.display = 'block';
        container.innerHTML = '';

        // Ordena por tamanho (50ml, 100ml...)
        lista.sort((a, b) => parseInt(a.ml) - parseInt(b.ml));

        lista.forEach(p => {
            const btn = document.createElement('button');
            btn.className = `size-option ${p.id === ativo.id ? 'active' : ''}`;
            btn.innerText = p.ml;
            
            btn.onclick = () => {
                // Ao clicar, a gente simplesmente muda o ID na URL e recarrega
                // ou apenas atualiza os preços na tela sem recarregar
                atualizarPrecosNaTela(p);
                
                document.querySelectorAll('.size-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
            container.appendChild(btn);
        });
    } else {
        wrapper.style.display = 'none';
        atualizarPrecosNaTela(ativo);
    }
}

function atualizarPrecosNaTela(produto) {
    const precoTxt = document.getElementById('product-price');
    const parcelaTxt = document.getElementById('installment-val');

    precoTxt.innerText = `R$ ${produto.preco.toFixed(2).replace('.', ',')}`;
    parcelaTxt.innerText = `R$ ${(produto.preco / 10).toFixed(2).replace('.', ',')}`;
}