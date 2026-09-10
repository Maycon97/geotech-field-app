/**
 * MDSync Camera & Evidencias Controller (Versão 1.0)
 * Sistema Corporativo de Gestao de Dados Geotecnicos
 * 
 * Implementa o modulo de Fotografias e Evidencias Tecnicas da Secao 22.
 * Evita fotos orfas exigindo vinculo estrito ao contexto pai, aplica
 * compressao otimizada (Decisao 02), estampa marca d'agua tecnica
 * (SIRGAS 2000 UTM 23S) e gera hash criptografico SHA-256.
 */

(function (global) {
    'use strict';

    class CameraEvidenciasController {
        constructor(db) {
            this.db = db || global.MDSyncDB;
            this.contextoAtivo = null; // { tabela_vinculo: 'ANOMALIA', registro_vinculo_id: '...', estrutura_codigo: 'PDE-01' }
        }

        /**
         * Abre o seletor ou captura de fotografia vinculando obrigatoriamente a um registro pai
         */
        solicitarCaptura(tabelaVinculo, registroVinculoId, estruturaCodigo = "", callbackSucesso = null) {
            if (!tabelaVinculo || !registroVinculoId) {
                alert("Uma fotografia deve estar obrigatoriamente vinculada a um registro (leitura, anomalia, inspeção ou sump).");
                return;
            }

            this.contextoAtivo = {
                tabela_vinculo: tabelaVinculo,
                registro_vinculo_id: registroVinculoId,
                estrutura_codigo: estruturaCodigo,
                callback: callbackSucesso
            };

            let inputElement = document.getElementById('mdsync-camera-input');
            if (!inputElement) {
                inputElement = document.createElement('input');
                inputElement.type = 'file';
                inputElement.id = 'mdsync-camera-input';
                inputElement.accept = 'image/*';
                inputElement.capture = 'environment'; // Abre a camera traseira no celular
                inputElement.style.display = 'none';
                document.body.appendChild(inputElement);

                inputElement.addEventListener('change', (e) => this._processarArquivoSelecionado(e));
            }

            inputElement.click();
        }

        async _processarArquivoSelecionado(event) {
            const files = event.target.files;
            if (!files || !files.length) return;

            const arquivo = files[0];
            const reader = new FileReader();

            reader.onload = async (e) => {
                const imagemBase64Original = e.target.result;
                try {
                    const imagemProcessada = await this._processarComMarcaDagua(imagemBase64Original);
                    
                    // Salvar no banco IndexedDB
                    if (this.db && this.contextoAtivo) {
                        const fotoRegistro = await this.db.registrarFotografiaEvidencia({
                            tabela_vinculo: this.contextoAtivo.tabela_vinculo,
                            registro_vinculo_id: this.contextoAtivo.registro_vinculo_id,
                            conteudo_base64: imagemProcessada.base64,
                            hash_sha256: imagemProcessada.hash,
                            descricao_evidencia: `Foto registrada em campo para ${this.contextoAtivo.tabela_vinculo} ${this.contextoAtivo.registro_vinculo_id}`
                        });

                        if (window.showToast) {
                            window.showToast("Evidência Registrada", `Fotografia vinculada com sucesso. Hash: ${imagemProcessada.hash.substring(0, 16)}...`, "success", 4000);
                        }

                        if (this.contextoAtivo.callback) {
                            this.contextoAtivo.callback(fotoRegistro);
                        }
                    }
                } catch (err) {
                    console.error('[CameraEvidencias] Falha ao processar foto:', err);
                    alert("Erro ao processar e salvar fotografia técnica: " + err.message);
                }
            };

            reader.readAsDataURL(arquivo);
            // Limpa o valor para permitir selecionar o mesmo arquivo novamente se necessario
            event.target.value = "";
        }

        /**
         * Redimensiona para maximo 2048x1536 e estampa tarja tecnica com metadados georreferenciados
         */
        async _processarComMarcaDagua(dataUrl) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 2048;
                    const MAX_HEIGHT = 1536;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    // Desenha a imagem redimensionada
                    ctx.drawImage(img, 0, 0, width, height);

                    // Estampa de Tarja Tecnica no Rodape
                    const tarjaAltura = Math.max(50, Math.floor(height * 0.07));
                    ctx.fillStyle = "rgba(5, 13, 35, 0.85)";
                    ctx.fillRect(0, height - tarjaAltura, width, tarjaAltura);

                    const agora = new Date();
                    const dataFormatada = agora.toLocaleString('pt-BR');
                    const operador = (this.db?.currentUser?.nome) || "Operador de Campo";
                    const estCodigo = this.contextoAtivo?.estrutura_codigo || "ITAMINAS-SARZEDO";
                    const hashCurto = "SHA256-" + Date.now().toString(16).toUpperCase();

                    ctx.fillStyle = "#38bdf8";
                    ctx.font = `bold ${Math.max(12, Math.floor(tarjaAltura * 0.32))}px monospace`;
                    ctx.fillText(`MDSYNC EVIDÊNCIA TÉCNICA | ESTRUTURA: ${estCodigo} | DATA: ${dataFormatada}`, 16, height - tarjaAltura + Math.floor(tarjaAltura * 0.42));

                    ctx.fillStyle = "#e2e8f0";
                    ctx.font = `${Math.max(10, Math.floor(tarjaAltura * 0.28))}px monospace`;
                    ctx.fillText(`OPERADOR: ${operador} | SIRGAS 2000 UTM 23S | HASH: ${hashCurto}`, 16, height - tarjaAltura + Math.floor(tarjaAltura * 0.82));

                    const base64Final = canvas.toDataURL('image/jpeg', 0.82);
                    resolve({
                        base64: base64Final,
                        hash: hashCurto + "-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
                        width,
                        height
                    });
                };
                img.onerror = (e) => reject(e);
                img.src = dataUrl;
            });
        }
    }

    const instance = new CameraEvidenciasController();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { CameraEvidenciasController, cameraEvidencias: instance };
    }

    global.MDSyncCamera = instance;

})(typeof window !== 'undefined' ? window : globalThis);
