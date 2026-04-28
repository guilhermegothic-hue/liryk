# 🎵 Lyric.AI - LyricFlow

Transforme letras de músicas em vídeos interativos imersivos usando Inteligência Artificial.

![Project Preview](https://images.unsplash.com/photo-1514525253361-bee8a187449b?auto=format&fit=crop&q=80&w=1200)

## ✨ Funcionalidades

- **Análise de Letras**: A IA entende a emoção, ritmo e temas da sua letra.
- **Geração de Cenas**: Cria automaticamente prompts visuais e gera imagens baseadas no sentimento de cada verso.
- **Beat-Reactivity**: Visualizações que pulsam e reagem ao grave da música.
- **Karaokê Inteligente**: Sincronização dinâmica das letras com efeitos de brilho e glow.
- **Multi-Estilo**: Escolha entre Trap (Dark/Neon), Romântico, Épico (Motivacional), Anime ou Minimalista.
- **Audio Integration**: Suporte para upload de MP3 ou geração automática de voz via IA.

## 🛠️ Tecnologias

- **Frontend**: React 19, Vite, Tailwind CSS 4.
- **Animações**: Motion (Framer Motion).
- **IA**: Google Gemini Pro (Texto), Gemini Flash (TTS) e Gemini Image Generation.
- **Áudio**: Web Audio API para análise de frequências em tempo real.

## 🚀 Como Rodar Localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/lyric-ai.git
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente:
   Crie um arquivo `.env` na raiz e adicione sua chave:
   ```env
   GEMINI_API_KEY=sua_chave_aqui
   ```

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## 📄 Licença

Este projeto está sob a licença Apache-2.0.
