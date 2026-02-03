// Global theme management - loads saved theme on all pages
(function() {
    // Load and apply saved theme immediately
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
    
    function applyTheme(theme) {
        const root = document.documentElement;
        
        if (theme === 'light') {
            // Light theme colors
            root.style.setProperty('--bg-primary', '#ffffff');
            root.style.setProperty('--bg-secondary', '#f5f5f5');
            root.style.setProperty('--accent-color', '#E97775');
            root.style.setProperty('--text-primary', '#333333');
            root.style.setProperty('--text-secondary', '#666666');
        } else if (theme === 'dark') {
            // Dark theme colors (default)
            root.style.setProperty('--bg-primary', '#191919');
            root.style.setProperty('--bg-secondary', '#333333');
            root.style.setProperty('--accent-color', '#E97775');
            root.style.setProperty('--text-primary', '#E8E8E8');
            root.style.setProperty('--text-secondary', '#998282');
        } else if (theme === 'auto') {
            // Auto theme based on system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            applyTheme(prefersDark ? 'dark' : 'light');
            return;
        }
    }
    
    // Export for use by other scripts
    window.globalTheme = { applyTheme };
})();