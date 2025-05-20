import UI from './ui.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('currentUser')) {
        localStorage.setItem('currentUser', `User${Math.floor(Math.random() * 1000)}`);
    }
    UI.init();
});