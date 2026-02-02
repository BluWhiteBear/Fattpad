
// Tab switching logic for home page
document.addEventListener('DOMContentLoaded', function() {
	const tabBtns = document.querySelectorAll('.tab-btn');
	const tabPanels = document.querySelectorAll('.tab-panel');

	tabBtns.forEach(btn => {
		btn.addEventListener('click', function() {
			// Remove active from all buttons
			tabBtns.forEach(b => b.classList.remove('active'));
			// Hide all panels
			tabPanels.forEach(panel => panel.classList.remove('active'));

			// Activate clicked button
			btn.classList.add('active');
			// Show corresponding panel
			const tab = btn.getAttribute('data-tab');
			document.getElementById('tab-' + tab).classList.add('active');
		});
	});
});
