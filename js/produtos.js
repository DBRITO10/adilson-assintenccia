import { db } from './firebase-config.js'; 
import { 
    collection, 
    addDoc, 
    getDocs, 
    onSnapshot, 
    query, 
    orderBy, 
    doc, 
    updateDoc, 
    arrayUnion 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const produtosCol = collection(db, "produtos");
const fornecedoresCol = collection(db, "fornecedores");

// --- 1. CARREGAR FORNECEDORES (Busca CNPJ e Nome) ---
async function carregarFornecedores() {
    const select = document.getElementById('selectForn');
    const snapshot = await getDocs(fornecedoresCol);
    
    select.innerHTML = '<option value="">Selecione uma Fábrica...</option>';
    snapshot.forEach(docSnap => {
        const forn = docSnap.data();
        // Usamos o CNPJ no value e o Nome no texto
        select.innerHTML += `<option value="${forn.cnpj}">${forn.nome} (${forn.cnpj})</option>`;
    });
}

// --- 2. LISTAR PRODUTOS (Real-time) ---
function listarProdutos() {
    const q = query(produtosCol, orderBy("sku", "asc"));
    
    onSnapshot(q, (snapshot) => {
        const corpoTabela = document.getElementById('corpoTabela');
        corpoTabela.innerHTML = '';

        snapshot.forEach(docSnap => {
            const prod = docSnap.data();
            const id = docSnap.id;

            // Linha Principal
            const tr = document.createElement('tr');
            tr.className = 'row-produto';
            tr.innerHTML = `
                <td>${prod.sku} - ${prod.nome}</td>
                <td><span class="badge-forn">${prod.fornecedorNome || 'N/A'}</span></td>
                <td>${prod.volumes ? prod.volumes.length : 0} Vol.</td>
                <td>
                    <button class="btn-action btn-vol" onclick="abrirModal('${id}', '${prod.nome}')">+ Volume</button>
                </td>
            `;
            corpoTabela.appendChild(tr);

            // Sub-linhas de Volumes
            if (prod.volumes && prod.volumes.length > 0) {
                prod.volumes.forEach(vol => {
                    const trVol = document.createElement('tr');
                    trVol.className = 'row-volume';
                    trVol.innerHTML = `
                        <td class="indent">${vol}</td>
                        <td colspan="3"></td>
                    `;
                    corpoTabela.appendChild(trVol);
                });
            }
        });
    });
}

// --- 3. CADASTRAR PRODUTO ---
document.getElementById('btnSalvarProd').addEventListener('click', async () => {
    const sku = document.getElementById('newSku').value;
    const nome = document.getElementById('newNome').value;
    const select = document.getElementById('selectForn');
    const cnpj = select.value;
    const nomeForn = select.options[select.selectedIndex].text.split(' (')[0]; // Pega só o nome antes do CNPJ

    if (!sku || !nome || !cnpj) return alert("Preencha tudo!");

    await addDoc(produtosCol, {
        sku,
        nome,
        fornecedorCnpj: cnpj,
        fornecedorNome: nomeForn,
        volumes: [],
        criadoEm: new Date()
    });

    document.getElementById('newSku').value = '';
    document.getElementById('newNome').value = '';
});

// --- 4. SALVAR VOLUME (DENTRO DO PRODUTO) ---
document.getElementById('btnSalvarVol').addEventListener('click', async (e) => {
    const idProd = e.target.dataset.idProd;
    const descVol = document.getElementById('volDesc').value;

    if (!descVol) return alert("Digite a descrição do volume!");

    try {
        const docRef = doc(db, "produtos", idProd);
        // O arrayUnion adiciona o item ao array sem duplicar e sem apagar o que já existe
        await updateDoc(docRef, {
            volumes: arrayUnion(descVol)
        });

        document.getElementById('volDesc').value = '';
        fecharModal();
    } catch (err) {
        console.error("Erro ao adicionar volume:", err);
    }
});

// Inicialização
window.onload = () => {
    carregarFornecedores();
    listarProdutos();
};

window.abrirModal = (id, nome) => {
    document.getElementById('modalVol').style.display = 'flex';
    document.getElementById('nomeProdPai').innerText = `Produto: ${nome}`;
    document.getElementById('btnSalvarVol').dataset.idProd = id;
};
