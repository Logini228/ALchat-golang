const loginToggle = document.getElementById('loginToggle');
const loginDropdown = document.getElementById('loginDropdown');
const overlay = document.getElementById('overlay');
const closeBtn = document.getElementById('closeBtn');

console.log("login.js loaded")

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
//document.getElementById('loginForm').addEventListener('submit', function (e) {
//    e.preventDefault();
    // Get the values, not the elements
//    const email = document.getElementById('email').value;
//    const password = document.getElementById('password').value;
//
//    if (validate()) {
//        console.log('Login attempt:', email, password);
//        auth("login", grecaptcha.getResponse(), email, password)
//    }
//});

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
                if (!code) return errorToast("auth fail");
                fetch('http://localhost:8080/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-authtype': 'google' },
                    body: JSON.stringify({ code })
                }).then(r => r.json())
                    .then(d => {
                        const parsed = typeof d === 'string' ? JSON.parse(d) : d;
                        if (parsed.status === "Login success") {
                            successToast("login success");
                        }
                    });
            }
        } catch (_) { }
    }, 500);
};


async function refreshJWT() {
  try {
    const response = await fetch('http://localhost:8080/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-authtype': 'refreshJWT',
        "g-recaptcha-response": recaptcha
      },
      credentials: 'include',
      body: JSON.stringify({})
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Refresh failed:', data);
      return { success: false, error: data.error || 'Refresh request failed' };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Network error during token refresh:', err);
    return { success: false, error: 'Network error' };
  }
}