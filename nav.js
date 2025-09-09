// nav.js
document.addEventListener('DOMContentLoaded', () => {
    const navHtml = `
        <nav class="fixed top-0 left-0 right-0 z-50 glass-card m-2 rounded-xl">
            <div class="flex justify-center space-x-6 p-4">
                <a href="/" class="nav-link">Início</a>
                <a href="/avisos.html" class="nav-link">Avisos</a>
                <a href="/condicoes.html" class="nav-link">Condições</a>
                <a href="/previsao.html" class="nav-link">Previsão</a>
                <a href="/mares.html" class="nav-link active">Marés & Oceanografia & Lua </a>
                <a href="/sensores.html" class="nav-link">Sensores</a>
                <a href="/historico.html" class="nav-link">Histórico</a>
                <a href="/NASA - Imagens Espaciais.html" class="nav-link">NASA</a>
            </div>
        </nav>
    `;

    document.body.insertAdjacentHTML('afterbegin', navHtml);
    
    // Adicionar estilos para a navegação
    const navStyles = `
        <style>
            .nav-link {
                color: var(--text-secondary);
                text-decoration: none;
                padding: 8px 16px;
                border-radius: 8px;
                transition: all 0.3s ease;
            }
            .nav-link:hover {
                color: var(--text-primary);
                background: var(--accent-light);
            }
            .nav-link.active {
                color: white;
                background: var(--accent);
            }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', navStyles);
});