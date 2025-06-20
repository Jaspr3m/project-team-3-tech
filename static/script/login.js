/**
 * register.js
 * Client-side validation for email & password inputs,
 * plus a toggle button for password visibility.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ——————————————————————————————
  // Cache DOM elements
  // ——————————————————————————————
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', () => {
      sessionStorage.removeItem('currentUser');
    });
  }
  
  const emailInput       = document.querySelector('.email');
  const emailFeedback    = document.querySelector('.emailFeedback');
  const passwordInput    = document.querySelector('.password');
  const passwordFeedback = document.querySelector('.passwordFeedback');
  const togglePassword   = document.querySelector('.showPassword');

  // ——————————————————————————————
  // SVG icons for show/hide toggle
  // ——————————————————————————————
  const icons = {
    show: `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
           xmlns="http://www.w3.org/2000/svg">
        <title>Show password</title>
        <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12"
              stroke="#000" stroke-width="2" stroke-linecap="round"/>
        <path d="M1 12C1 12 5 20 12 20C19 20 23 12 23 12"
              stroke="#000" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="12" r="3"
                stroke="#000" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    hide: `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
           xmlns="http://www.w3.org/2000/svg">
        <title>Hide password</title>
        <path d="M2 2L22 22" stroke="#000" stroke-width="2" stroke-linecap="round"/>
        <path d="M6.7 6.7C3.7 8.8 2 12 2 12C2 12 5.6 19 12 19
                 C14.1 19 15.8 18.3 17.3 17.3"
              stroke="#000" stroke-width="2" stroke-linecap="round"/>
        <path d="M11 5.1C11.3 5 11.7 5 12 5
                 C18.4 5 22 12 22 12C22 12 21.3 13.3 20 14.8"
              stroke="#000" stroke-width="2" stroke-linecap="round"/>
        <path d="M14 14.2C13.5 14.7 12.8 15 12 15
                 C10.3 15 9 13.7 9 12
                 C9 11.2 9.3 10.4 9.9 9.9"
              stroke="#000" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `
  };

  // ——————————————————————————————
  // Validation helpers & patterns
  // ——————————————————————————————
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * Validate an input field and update its feedback element.
   * @param  {HTMLInputElement} input
   * @param  {HTMLElement}       feedbackEl
   * @param  {Function}          isValidFn    returns true if valid
   * @param  {string}            validMsg
   * @param  {string}            invalidMsg
   */
  function validateField(input, feedbackEl, isValidFn, validMsg, invalidMsg) {
    const value = input.value.trim();
    if (!value) {
      feedbackEl.textContent = '';
      feedbackEl.className = 'feedback';
      return;
    }
    if (isValidFn(value)) {
      feedbackEl.textContent = validMsg;
      feedbackEl.className = 'feedback valid';
    } else {
      feedbackEl.textContent = invalidMsg;
      feedbackEl.className = 'feedback invalid';
    }
  }

  // ——————————————————————————————
  // Email validation on blur & input
  // ——————————————————————————————
  ['blur', 'input'].forEach(evt =>
    emailInput.addEventListener(evt, () => {
      validateField(
        emailInput,
        emailFeedback,
        val => emailRegex.test(val),
        'Valid email',
        'Invalid email'
      );
    })
  );
  emailInput.addEventListener('focus', () => {
    emailFeedback.textContent = '';
    emailFeedback.className = 'feedback';
  });

  // ——————————————————————————————
  // Password validation on blur & input
  // ——————————————————————————————
  ['blur', 'input'].forEach(evt =>
    passwordInput.addEventListener(evt, () => {
      validateField(
        passwordInput,
        passwordFeedback,
        val => val.length >= 6,
        'Valid password',
        'Invalid password (minimum 6 characters)'
      );
    })
  );
  passwordInput.addEventListener('focus', () => {
    passwordFeedback.textContent = 'Password must be at least 6 characters';
    passwordFeedback.className = 'feedback';
  });

  // ——————————————————————————————
  // Toggle password visibility
  // ——————————————————————————————
  togglePassword.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    togglePassword.innerHTML = show ? icons.hide : icons.show;
  });
});
