// loginHome.js
document.addEventListener('DOMContentLoaded', () => {
  // Select by class instead of ID
  const guestBtns = document.querySelectorAll('.btn-guest');

  guestBtns.forEach(btn => {
    btn.addEventListener('click', e => {
      // Prevent immediate navigation
      e.preventDefault();

      // Store “guest” status
      sessionStorage.setItem('currentUser', 'guest');

      // Redirect to /home
      window.location.href = '/home';
    });
  });
});
