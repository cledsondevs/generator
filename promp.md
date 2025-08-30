eu quero criar um projeto bem simples

- de inicio é só um backend
- o usuario informa um prompt
- ele pega esse prompt e chama uma llm para gerar 3 slides , e retorna no formato json , use gemini : AIzaSyDpLNBaYVrLSzxWj0kLD3v7n75pR5O-AfM
- depois ele chama a llm para gerar as images do slide : model = "gemini-2.5-flash-image-preview"
- depois ele transforma isso em pdf e salva na pasta do usuario
