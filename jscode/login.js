const loginToggle = document.getElementById('loginToggle');
const loginDropdown = document.getElementById('loginDropdown');
const overlay = document.getElementById('overlay');
const closeBtn = document.getElementById('closeBtn');

console.log("login.js loaded")

// Global click handler to close dropdown when clicking outside
document.addEventListener('click', function (e) {
    if (loginDropdown.classList.contains('show')) {
        // Check if click is outside the login dropdown and login button
        if (!loginDropdown.contains(e.target) && !loginToggle.contains(e.target)) {
            closeLoginDropdown();
        }
    }
});

// Toggle login dropdown
loginToggle.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    toggleLoginDropdown();
});

// Close dropdown when clicking close button
closeBtn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    closeLoginDropdown();
});

// Prevent all clicks inside dropdown from closing it
loginDropdown.addEventListener('click', function (e) {
    e.stopPropagation();
});

loginDropdown.addEventListener('mousedown', function (e) {
    e.stopPropagation();
});

// Close dropdown when pressing Escape
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeLoginDropdown();
    }
});


function closeLoginDropdown() {
    loginDropdown.classList.remove('show');
    loginToggle.classList.remove('active');

    // Reset form
    document.getElementById('loginForm').reset();
    document.getElementById('emailError').style.display = 'none';
    document.getElementById('passwordError').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}


function toggleLoginDropdown() {
    if (loginDropdown.classList.contains('show')) {
        closeLoginDropdown();
    } else {
        openLoginDropdown();
    }
}

function openLoginDropdown() {
    loginDropdown.classList.add('show');
    loginToggle.classList.add('active');
    document.getElementById('email').focus();
}

function validate() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Reset error messages
    document.getElementById('emailError').style.display = 'none';
    document.getElementById('passwordError').style.display = 'none';
    var recaptcha = grecaptcha.getResponse()

    // Basic validation
    let isValid = true;

    if (!email || !email.includes('@')) {
        document.getElementById('emailError').style.display = 'block';
        isValid = false;
    }

    if (!password || password.length < 6) {
        document.getElementById('passwordError').style.display = 'block';
        isValid = false;
    }

    if (!recaptcha) {
        document.getElementById('recaptchaError').style.display = 'block';
        isValid = false;
    }

    return isValid
}

// Traditional form login
document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    // Get the values, not the elements
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (validate()) {
        console.log('Login attempt:', email, password);
        auth("login", grecaptcha.getResponse(), email, password)
    }
});

function Register() {
    if (validate()) {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        console.log('register attempt:', email, password);
        auth("register", grecaptcha.getResponse(), email, password)
    }

}

function ForgotPassword() {
    if (validate()) {
        console.log('reset attempt:', email);
        const email = document.getElementById('email').value;
        auth("reset", email)
    }

}

function auth(authtype = "none", recaptcha = 0, _email, _password) {
    console.log(_email, _password);
    fetch("http://localhost:8080/auth", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-authtype": authtype,
            "g-recaptcha-response": recaptcha
        },

        body: JSON.stringify({ email: new String(_email), password: new String(_password) })
    })
        .then(r => r.text())
        .then(d => {
            const parsed = typeof d === 'string' ? JSON.parse(d) : d;
            if (parsed.status === "Login success") {
                LoginSuccessToast();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById("datta").innerHTML = "Error: " + error;
        });
    grecaptcha.reset();
}

function onSubmit(token) {
    e.preventDefault();
    document.getElementById("loginForm").submit();
} // Recaptcha

const CLIENT_ID = '310803326430-1kp91brnc26sg0s2ioai89hr3fipjren.apps.googleusercontent.com';
const REDIRECT_URI = 'http://localhost:3000';

function signInWithGoogle() {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', CLIENT_ID);
    url.searchParams.set('redirect_uri', REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('access_type', 'offline');

    const popup = window.open(
        url,
        'google',
        'width=500,height=600,left=200,top=100'
    );
    const timer = setInterval(() => {
        try {
            if (popup.location.origin === location.origin &&
                popup.location.pathname === '/') {
                const code = new URL(popup.location.href).searchParams.get('code');
                popup.close();
                clearInterval(timer);
                if (!code) return document.getElementById('google_broken').cloneNode(true).toast();
                fetch('http://localhost:8080/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-authtype': 'google' },
                    body: JSON.stringify({ code })
                }).then(r => r.json())
                    .then(d => {
                        const parsed = typeof d === 'string' ? JSON.parse(d) : d;
                        if (parsed.status === "Login success") {
                            LoginSuccessToast();
                        }
                    });
            }
        } catch (_) { }
    }, 500);
};

function LoginSuccessToast() {
    document.getElementById('login_success').cloneNode(true).toast()
}
//auth("google")
