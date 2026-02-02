// Automatically load navbar component into pages
document.addEventListener("DOMContentLoaded", function()
{
    // Fetch and insert the navbar HTML
    fetch('/components/navbar.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('navbar-placeholder').innerHTML = data;
        })
        .catch(error => console.error('Error loading navbar:', error));

    // Fetch and insert the footer HTML
    fetch('/components/footer.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer-placeholder').innerHTML = data;
        })
        .catch(error => console.error('Error loading footer:', error));
});