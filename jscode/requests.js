console.log("requests.js loaded")

async function requestLLM(models, message) {
    try {
        const history = getHistory();
        const empty = (history.length === 0);

        const response = await fetch("http://localhost:8080/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-chatid": getChatIdFromURL()
            },
            body: JSON.stringify({
                "model": models,
                "prompt": message,
                "history": history,
                "empty": empty
            }),
            credentials: "include"
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const data = JSON.parse(line);
                        if (data.model == "prompt") {fillQuestion(data.mess_uuid); continue;}
                        fillAnswers([data.model, stylizeJson(data.response || ""), data.mess_uuid]);
                    } catch (e) {
                        console.error('Failed to parse line:', line, e);
                    }
                }
            }
        }

        // Handle any remaining data in buffer
        if (buffer.trim()) {
            try {
                const data = JSON.parse(buffer);
                fillAnswers([data.model, stylizeJson(data.response)]);
            } catch (e) {
                console.error('Failed to parse final buffer:', buffer, e);
            }
        }

    } catch (error) {
        console.error('Error:', error);
        document.getElementById("datta").innerHTML = "Error: " + error;
    }
}
async function loadChatList() {
    try {
        const response = await fetch('http://localhost:8080/chatlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "g-recaptcha-response": 0
            },
            credentials: 'include',
            body: JSON.stringify({})
        });

        const data = await response.json();
        const nestedChats = data.chatlist.map(c => [c.chat_id, c.chat_name])
        console.log("chats: ", nestedChats);


        return nestedChats;
    } catch (err) {
        warnToast('Error getting chatlist:', err);
        return [[]]
    }
}
function loadChat(id) {
    if (!id) return;

    fetch(`http://localhost:8080/chat/${id}`, { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
            if (!data.valid || !Array.isArray(data.messages)) return;

            const msgs = data.messages;

            for (let i = 0; i < msgs.length; i++) {
                if (msgs[i].sender_user == true) {
                    createQuestion(msgs[i].message, msgs[i].mess_uuid);

                    let modelMessages = [];
                    let j = i + 1;

                    while (j < msgs.length && msgs[j].sender_user == false) {
                        modelMessages.push(msgs[j]);
                        j++;
                    }

                    if (modelMessages.length > 0) {
                        const modelNames = modelMessages.map(m => m.sender);
                        createAnswers(modelNames);
                        modelMessages.forEach(m => {
                            fillAnswers([m.sender, stylizeJson(m.message), m.mess_uuid]);
                        });
                    }

                    i = j - 1;
                }
            }
        })
        .catch(error => console.error("Fetch error:", error));
}
async function newChat() {
    const response = await fetch('http://localhost:8080/newchat', { method: 'POST', credentials: "include" });
    const data = await response.json();

    chatid = data.chatid;

    if (chatid != undefined) {
        moveUserTo(chatid)
    }
}

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
                    credentials: 'include',
                    body: JSON.stringify({ code })
                }).then(r => r.json())
                    .then(d => {
                        const parsed = typeof d === 'string' ? JSON.parse(d) : d;
                        if (parsed.status === "Login success") {
                            successToast("login success");
                            loginJWT();
                        }
                    });
            }
        } catch (_) { }
    }, 500);
};
async function loginJWT() {
    try {
        const response = await fetch('http://localhost:8080/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-authtype': 'loginJWT',
                "g-recaptcha-response": 0
            },
            credentials: 'include',
            body: JSON.stringify({})
        });

        if (!response.ok) {
            infoToast("looks like you're new here. For now only google auth works");
            return true
        }

        const data = await response.json();
        console.log('Auth success:', data.status);

        logged(data)

        return true;
    } catch (err) {
        warnToast('Network error, try reloading the page:', err);
        return false
    }
}

async function refreshJWT() {
    try {
        const response = await fetch('http://localhost:8080/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "Accept": "application/json",
                'X-authtype': 'refreshJWT',
                "g-recaptcha-response": 0
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
function onSubmit(token) {
    e.preventDefault();
    document.getElementById("loginForm").submit();
} // Recaptcha

const CLIENT_ID = '310803326430-1kp91brnc26sg0s2ioai89hr3fipjren.apps.googleusercontent.com';
const REDIRECT_URI = 'http://localhost:3000';

function requestModels() {
    clearModels();

    fetch("http://127.0.0.1:8080/models", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({ "input": modelbox.value })
    })
    .then(response => response.json())
    .then(data => {
        // data is an array of model objects
        data.forEach(model => {
            createCheckboxFromModel(
                model.Aggregator,
                model.Provider,
                model.ID,
                model.Name,
                model.Price,
                model.Context,
                model.Inputs,
                model.Outputs
            );
        });
    })
    .catch(error => {
        console.error('Error fetching models:', error);
    });
}
window.addEventListener('popstate', () => {
    loadChat(getChatIdFromURL());
});

window.addEventListener('load', () => {
    loadChat(getChatIdFromURL());
    console.log("loaded: ", getChatIdFromURL())
});

function moveUserTo(chatid) {
    window.history.pushState({}, "", `/chat/${chatid}`);
    return true;
}

function moveUserHome() {
    window.history.pushState({}, "", "/");
    return true;
}
 
/* traditional login. Maybe I'll get back to it in the future

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
                loginJWT()
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById("datta").innerHTML = "Error: " + error;
        });
    //grecaptcha.reset();
}

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


*/
