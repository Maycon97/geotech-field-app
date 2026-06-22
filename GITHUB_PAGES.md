# Publicacao no GitHub Pages

Este pacote esta pronto para ser publicado como site estatico no GitHub Pages.

## Opcao rapida pelo navegador

1. Crie um repositorio no GitHub, por exemplo `mdsync-campo`.
2. Envie todos os arquivos desta pasta para a raiz do repositorio.
3. No GitHub, abra `Settings` > `Pages`.
4. Em `Build and deployment`, escolha:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Salve e aguarde o GitHub gerar a URL publica.

## URL esperada

Depois da publicacao, a URL normalmente fica assim:

`https://SEU_USUARIO.github.io/mdsync-campo/`

## Observacoes importantes

- O app e um PWA estatico e funciona bem no GitHub Pages.
- O acesso a arquivos do dispositivo continua dependendo do usuario selecionar arquivos no navegador ou no APK.
- Dados locais, PIN, mapas anexados e registros offline continuam salvos no dispositivo do usuario via armazenamento local.
- O GitHub Pages nao executa backend nem API corporativa. Para sincronizacao real entre pessoas, sera necessario conectar uma API/banco depois.
