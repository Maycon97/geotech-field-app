# MDSync - Centralizador de Dados de Campo

MDSync e um app web/PWA para centralizar dados de campo da Geotecnia, com foco em leituras de instrumentos, checklists, georreferenciamento, evidencias, relatorios, indicadores e visualizacao operacional das estruturas monitoradas.

O projeto foi estruturado para funcionar no navegador, em modo offline-first, e pode ser publicado diretamente no GitHub Pages.

## Principais recursos

- Visao geral operacional com indicadores de campo.
- Coleta de leituras de instrumentos geotecnicos.
- Checklist de inspecao de estabilidade, drenagem e acessos.
- Checklist veicular com evidencias fotograficas.
- GeoView com dashboards dinamicos e dados por estrutura.
- Georreferenciamento em SIRGAS 2000 / UTM 23S.
- Relatorios auditaveis com filtros por estrutura, periodo e tipo de dado.
- Exportacao em formatos autorizados: PDF, DOCX, DOC, XLSX, XLS e PPTX.
- PWA com manifest, service worker e cache offline.
- Bibliotecas vendorizadas localmente, sem dependencia de CDN para os componentes principais.

## Estrutura do projeto

```text
.
|-- index.html
|-- styles.css
|-- app.js
|-- manifest.webmanifest
|-- service-worker.js
|-- assets/
|-- data/
|-- vendor/
|-- tools/
|-- .github/
|-- _headers
|-- _redirects
|-- netlify.toml
|-- vercel.json
|-- GITHUB_PAGES.md
`-- README.md
```

## Como rodar localmente

Na raiz do projeto:

```powershell
python -m http.server 8780 --bind 127.0.0.1
```

Depois acesse:

```text
http://127.0.0.1:8780/index.html
```

Tambem e possivel abrir o `index.html` diretamente no navegador, mas o servidor local e recomendado para validar PWA, service worker, assets e rotas.

## Publicacao no GitHub Pages

1. Crie um repositorio no GitHub.
2. Envie todos os arquivos desta pasta para a raiz do repositorio.
3. Confirme que o arquivo `.nojekyll` esta presente na raiz.
4. No GitHub, va em `Settings > Pages`.
5. Configure:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. Aguarde a publicacao.

O link publico ficara no padrao:

```text
https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/
```

## Publicacao por linha de comando

Exemplo para um repositorio novo:

```powershell
git init
git add .
git commit -m "Publica MDSync"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/NOME-DO-REPOSITORIO.git
git push -u origin main
```

Depois ative o GitHub Pages nas configuracoes do repositorio.

## Atualizacao do site

Sempre que houver uma nova versao:

```powershell
git add .
git commit -m "Atualiza MDSync"
git push
```

O GitHub Pages atualiza automaticamente apos o push.

## Dados e privacidade

O MDSync foi pensado para operacao offline-first. Os dados preenchidos pelo usuario podem ser mantidos no armazenamento local do navegador ou do app instalado.

Antes de publicar uma versao em ambiente aberto, revise:

- Dados sensiveis em `data/`.
- Imagens e mapas em `assets/`.
- PDFs, planilhas e arquivos corporativos.
- Informacoes de API, endpoints ou caminhos internos.

Para uso corporativo real, recomenda-se integrar autenticacao, API oficial, controle de acesso e politica de retencao alinhada a LGPD.

## PWA

O app ja contem:

- `manifest.webmanifest`
- `service-worker.js`
- icones em `assets/icons/`

Ao acessar pelo navegador, o usuario pode instalar o app como PWA quando o navegador oferecer essa opcao.

## APK Android

O APK de teste e gerado fora desta pasta, a partir do projeto Android local:

```text
work/geosync-android
```

Os arquivos web desta pasta sao sincronizados para os assets do APK antes da compilacao.

## Compatibilidade

Recomendado:

- Google Chrome
- Microsoft Edge
- Android WebView atualizado
- Tela desktop, tablet ou celular

## Observacao importante

Este repositorio publica o front-end estatico. Integracoes com banco de dados corporativo, APIs internas, SharePoint, Power BI ou servidores de autenticacao devem ser conectadas em uma etapa de backend/API.

