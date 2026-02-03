// Automatically load navbar component into pages
document.addEventListener("DOMContentLoaded", function() {
    
    // Function to load component using XMLHttpRequest (works better with file:// protocol)
    function loadComponent(url, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container element with ID '${containerId}' not found`);
            return;
        }

        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 0) { // 0 for local files
                    container.innerHTML = xhr.responseText;
                } else {
                    console.error(`Error loading ${url}: ${xhr.status} ${xhr.statusText}`);
                }
            }
        };
        xhr.onerror = function() {
            console.error(`Network error loading ${url}`);
        };
        xhr.send();
    }

    // Load navbar and footer components
    loadComponent('components/navbar.html', 'navbar-container');
    loadComponent('components/footer.html', 'footer-container');
});