import { db } from "./firebase-config.js";
import { 
    collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// 1. Carregar Fornecedores no Select ao iniciar
async function carregarFornecedores() {
    const select = document.getElementById("selectForn");
    const snap = await getDocs(collection(db, "fornecedores"));
    
    select.innerHTML = '<option value="">Selecione a Fábrica...</option>';
    snap.forEach(d => {
        const f = d.data();
        select.innerHTML += `<option value="${d.id}">${f.nome}</option>`;
    });
}

// 2. Salvar Produto Principal
document.getElementById("btnSalvarProd").onclick = async () => {
    const sku = document.getElementById("newSku").value;
    const nome = document.getElementById("newNome").value;
    const fornecedorId = document.getElementById("selectForn").value;

    if (!sku || !nome || !fornecedorId) {
        alert("Preencha todos os campos e selecione uma fábrica!");
        return;
    }

    try {
        await addDoc(collection(db, "produtos"), {
            codigo: sku,
            nome: nome,
            fornecedorId: fornecedorId,
            dataCadastro: new Date()
        });
        alert("Produto cadastrado com sucesso!");
        location.reload(); 
    } catch (e) {
        console.error("Erro ao salvar: ", e);
    }
};

// 3. Listar Produtos e Seus Volumes (Para busca e consulta)
async function listarEstrutura() {
    const corpo = document.getElementById("corpoTabela");
    corpo.innerHTML = "<tr><td colspan='4'>Carregando estrutura...</td></tr>";

    const prodSnap = await getDocs(query(collection(db, "produtos"), orderBy("nome", "asc")));
    const volSnap = await getDocs(collection(db, "volumes"));
    const fornSnap = await getDocs(collection(db, "fornecedores"));

    // Mapear fornecedores para acesso rápido pelo ID
    const listaForn = {};
    fornSnap.forEach(d => listaForn[d.id] = d.data().nome);

    const listaVolumes = volSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    corpo.innerHTML = "";

    prodSnap.forEach(docP => {
        const p = docP.data();
        const idP = docP.id;
        const nomeForn = listaForn[p.fornecedorId] || "Não vinculado";

        // Linha do Produto Pai
        corpo.innerHTML += `
            <tr class="row-produto">
                <td>[${p.codigo}] ${p.nome}</td>
                <td><span class="badge-forn">${nomeForn}</span></td>
                <td>---</td>
                <td>
                    <button class="btn-action btn-edit" onclick="editarProduto('${idP}', '${p.nome}')">✏️ Editar</button>
                    <button class="btn-action btn-vol" onclick="abrirModalVolume('${idP}', '${p.nome}')">+ Volume</button>
                </td>
            </tr>
        `;

        // Filtrar e mostrar volumes deste produto
        const volumesDesteProd = listaVolumes.filter(v => v.produtoId === idP);
        volumesDesteProd.forEach(v => {
            corpo.innerHTML += `
                <tr class="row-volume">
                    <td class="indent">${v.descricao}</td>
                    <td>---</td>
                    <td>Item cadastrado</td>
                    <td>
                        <button class="btn-action" style="background:#ddd" onclick="editarVolume('${v.id}', '${v.descricao}')">Editar Vol.</button>
                    </td>
                </tr>
            `;
        });
    });
}

// 4. Lógica do Modal de Volumes
window.abrirModalVolume = (id, nome) => {
    window.idProdutoAtual = id; // Armazena temporariamente o ID
    document.getElementById("nomeProdPai").innerText = `Produto: ${nome}`;
    document.getElementById("modalVol").style.display = "flex";
};

document.getElementById("btnSalvarVol").onclick = async () => {
    const desc = document.getElementById("volDesc").value;
    
    if (!desc) return alert("Digite a descrição do volume!");

    await addDoc(collection(db, "volumes"), {
        produtoId: window.idProdutoAtual,
        descricao: desc,
        quantidade: 0, // Inicia zerado, pois a entrada é feita na tela de estoque
        ultimaMovimentacao: null
    });

    alert("Volume vinculado!");
    location.reload();
};

// Funções de Edição (Exemplos de lógica)
window.editarProduto = async (id, nomeAntigo) => {
    const novoNome = prompt("Novo nome do produto:", nomeAntigo);
    if (novoNome) {
        await updateDoc(doc(db, "produtos", id), { nome: novoNome });
        listarEstrutura();
    }
};

window.editarVolume = async (id, descAntiga) => {
    const novaDesc = prompt("Nova descrição do volume:", descAntiga);
    if (novaDesc) {
        await updateDoc(doc(db, "volumes", id), { descricao: novaDesc });
        listarEstrutura();
    }
};

// Inicialização
carregarFornecedores();
listarEstrutura();
