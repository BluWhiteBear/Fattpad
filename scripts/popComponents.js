// Automatically load navbar component into pages
document.addEventListener("DOMContentLoaded", function() {
    
    // Function to load component - try multiple methods for local files
    function loadComponent(componentName, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container element with ID '${containerId}' not found`);
            return;
        }

        // Get the current page's path to construct relative path correctly
        const currentPath = window.location.pathname;
        const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
        const url = basePath + 'components/' + componentName;
        
        console.log(`Loading component: ${componentName} from ${url}`);

        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 0) { // 0 for local files
                    container.innerHTML = xhr.responseText;
                    console.log(`Successfully loaded ${componentName}`);
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
    loadComponent('navbar.html', 'navbar-container');
    loadComponent('footer.html', 'footer-container');
});