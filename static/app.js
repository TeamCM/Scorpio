if(typeof superagent != "function"){
    $(document.body).html("Habilite Superagent pra entrar no Scorpio")
}

let socket;
let errorRequestClickRegister = 0;
let createdGoogleRecaptcha = 0;
let clickedTimes = 0;
let logout;
let debug = 0;
let isApp = 0;
let reconnected = false;
let reconnectionFails = 0;

if(window.module){
    console.log("%c[Scorpio Debug] %cElectron detectado!", "color:darkviolet;", "color:blue;");

}

function addZero(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}
function promptFile() {
    let input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    return new Promise(function(resolve) {
        document.activeElement.onfocus = function() {
        document.activeElement.onfocus = null;
        setTimeout(resolve, 500);
        };
        input.onchange = function() {
            let files = Array.from(input.files);

            return resolve(files);
        };
        input.click();
    });
}

let regex = /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/igm;
let loginmode = $("#loginmode").data("loginmode");
if(loginmode == 2){$("#preloader").css("display", "block");}
if(!loginmode) login();
if(loginmode == 1) register();
if(loginmode == 2) {isApp = 1;}
function login(){
    if($(".app-mount-login").css("display") == "none") {$(".app-mount-login").css("display", "block");}
    if($(".app-mount-register").css("display") == "block") {$(".app-mount-register").css("display", "none");}
    if($("#preloader").css("display") == "block"){$("#preloader").css("display", "none")}
    if($("#app").css("display") == "block") {$("#app").css("display", "none");}

    if(window.localStorage.token) return app();
    window.history.pushState({}, "", "login");

    $("#loginbtn").on("click", function(e){
        e.preventDefault();
        const email = $("input[name=\"email\"]").val();
        const pwd = $("input[name=\"password\"]").val();
        if(clickedTimes == 1) return;

        superagent.post("/api/v1/login").send({email:email,password:pwd}).end((err, res) => {
            if(JSON.parse(res.text).message == "That account is banned"){
                clickedTimes = 1;
                let bane = document.createElement("p");
                bane.style.fontSize = "20px";
                bane.style.color = "red";
                bane.innerText = "Está conta está banida do Scorpio";
                return $(".app-mount-login").append(bane);
            }
            if(JSON.parse(res.text).message == "That account is desactivated by the user"){
                clickedTimes = 1;
                let bane = document.createElement("p");
                bane.style.fontSize = "20px";
                bane.style.color = "red";
                bane.innerText = "Está conta foi desativada pelo usuário";
                return $(".app-mount-login").append(bane);
            }
            if(res.statusCode == 404){
                let bane = document.createElement("p");
                bane.style.fontSize = "20px";
                bane.style.color = "red";
                bane.innerText = "Não existe essa conta";
                return $(".app-mount-login").append(bane);
            }

            let token = JSON.parse(res.text);
            window.localStorage.setItem("token", token.user.token);
            $(".app-mount-login").fadeOut("fast", "", () => {$("#preloading").html("Carregando Scorpio pela primeira vez");$("#preloader").css("display", "block");app();});
        });
    });
}
function register(){
    if(window.localStorage.token) return app();
    if($(".app-mount-register").css("display") == "none"){$(".app-mount-register").css("display", "block");}
    if($(".app-mount-login").css("display") == "block"){$(".app-mount-login").css("display", "none");}

    window.history.pushState({}, "", "register");
    superagent.get("/recaptchasitekey").end(function(err, res){
        if(createdGoogleRecaptcha == 0){
            let element = document.createElement("div");
            element.className = "g-recaptcha";
            element.dataset.sitekey = res.text;
            $("#register").append(element);
            let googleScript = document.createElement("script");
            googleScript.src="https://www.google.com/recaptcha/api.js";
            $(document.head).append(googleScript);
            createdGoogleRecaptcha=1;
        }
        $("#registerbtn").on("click", function(e){
            e.preventDefault();

            const name = $("input[name=\"username\"]").val();
            const email = $("input[name=\"emaill\"]").val();
            const pwd = $("input[name=\"passwordl\"]").val();
            const captcha = $("#g-recaptcha-response").val();

            superagent.post("/api/v1/register").send({name:name,email:email,captcha:captcha,password:pwd}).set('accept', 'json').end((err2, res2) => {
                if(res.statusCode == 400){
                    function report(){
                        let element = document.createElement("p");
                        element.style.color = "red";
                        element.className="error";
                        if(JSON.parse(res2.text).message == "Please select name"){element.innerText="Por favor coloque um nome de usuario";}
                        if(JSON.parse(res2.text).message == "Please select email"){element.innerText="Por favor coloque seu email";}
                        if(JSON.parse(res2.text).message == "Please select password"){element.innerText="Por favor coloque uma senha";}
                        if(JSON.parse(res2.text).message == "Please select captcha"){element.innerText="Por favor faça o captcha";}
                        if(JSON.parse(res2.text).message == "Duplicated captcha, or fatal error in server"){element.innerText="Erro no captcha!"}
                        errorRequestClickRegister = 1;
                        return $("#app").append(element);
                    }
                    report();
                    if(errorRequestClickRegister){
                        $(".error").remove();
                        errorRequestClickRegister=0;
                        return report();
                    } else if(!errorRequestClickRegister){
                        return report();
                    }
                }
                let token = JSON.parse(res2.text);
                window.localStorage.setItem("token", token.user.token);
                $(".app-mount-register").fadeOut("fast", "", () => {$("#preloading").html("Carregando Scorpio pela primeira vez");$("#preload").css("display", "block");app();});
            });
        });
    });
}
function app(){
    if($(".app-mount-login").css("display") == "block") {$(".app-mount-login").css("display", "none");}
    if($(".app-mount-register").css("display") == "block") {$(".app-mount-register").css("display", "none");}

    logout = function(){
        $("#app").fadeOut("fast", "", () => {
            window.localStorage.clear();
            window.location.href = "/login";
            return true;
        });
    }

    if(typeof io != "function"){return $("#preloading").html("Habilite Socket.io pra entrar no Scorpio")}

    window.history.pushState({}, "", "app");
    $("#user").html(`...#0001`);
    if(!window.localStorage.token) return login();
    superagent.get("/api/v1/banned").set({"Authorization": window.localStorage.token, "Cache-Control": "no-cache"}).send(null).end(function(err, res){
        if(res.statusCode == 500){window.localStorage.clear();window.location.reload();return;}
        if(res.statusCode == 404){window.localStorage.clear();return login();}
        if(err) {return $("#preloading").html("Por favor, desbloqueie<br />\"/api/v1/banned\"<br />Senão você não irá entra no Scorpio")}
        if(JSON.parse(res.text).banned == true){window.localStorage.clear();return login();}
        $("#bar").css("width", "40%");

        superagent.get("/api/v1/user").set({"Authorization": window.localStorage.token, "Cache-Control": "no-cache"}).end(function(err2,res2){
            if(res2.statusCode !== 500){
                const user = JSON.parse(res2.text).user;
                let text = user.username;
                let textSplited = text.split("");
                for(let i=0;i<text.length;i++){
                    if(i>=5){if(i>=8){textSplited[i]=""}else{textSplited[i] = "."}}
                }
                text = textSplited.join("");
                
                $("#user").html(`${text}<br />#${user.descriminator}`);
                $("#bar").css("width", "57%");

                superagent.get("/api/v2/guilds").set({"Authorization": window.localStorage.token, "Cache-Control": "no-cache"}).end(function(err3,res3){
                    if(res3.statusCode !== 500){
                        $("#bar").css("width", "73%");
                        const guilds = JSON.parse(res3.text).guilds;
                        console.log(guilds);
                        for(let i=0;i<guilds.length;i++){
                            if(guilds[i]){
                                //console.table(guilds[i]);
                                const guild = $(document.createElement("div"));
                                guild.text(i);
                                guild.addClass("btn_generic");
                                guild.addClass("guild");
        
                                $("#guilds").append(guild);
                            }
                        }

                        socket = io.connect("", {
                            upgrade: true,
                            autoConnect: false,
                            reconnection: false,
                            forceNew: true,
                            transports: ["polling", "websocket"],
                        });
                
                        socket.on("error", errr => {
                            if(errr.logout == true) return logout();
                        });
                        socket.on("ok", () => {
                            console.log("%c[Scorpio Debug] %cToken mandado pro servidor!", "color:darkviolet;", "color:green;");
                        });
                        socket.on("connect", () => {
                            console.log("%c[Scorpio Debug] %cConectado aos servidores!", "color:darkviolet;", "color:green;");
                            $("#preloading").text("Carregado!");
                            $("#bar").css("width", "100%");
                            $("#preloader").fadeOut("slow", "", () => {
                                $("#app").fadeIn("fast", "", () => {});
                            });
                            if(!reconnected){reconnected = true}
                            else {
                                if(window.tryingReconnect) clearInterval(window.tryingReconnect);
                                $("#reco1").css("display", "none");
                                $("#reco2").css("display", "block");
                                setTimeout(function(){$("#reco2").css("display", "none")}, 650);
                                window.reconnectionFails = NaN;
                            }
                        });
                
                        socket.on("disconnect", (reason) => {
                            if(reason == "io client disconnect") return;
                            if(reconnected){
                                $("#reco1").css("display", "block");
                            }
                            window.tryingReconnect = setInterval(function(){if(window.reconnectionFails >= 5){
                                $("#reco2").css("display", "none")
                                $("#app").css("display", "none");
                                let errr = document.createElement("p");
                                errr.innerText="Recarregando a aba";
                                $(document.body).append(errr);
                                setTimeout(function(){window.location.reload()},1000);
                                clearInterval(window.tryingReconnect);
                            } else {socket.open();window.reconnectionFails++;}console.log("%c[Scorpio Debug] %creconnectionFails: %c"+window.reconnectionFails, "color:darkviolet;", "color:blue;", "color:lightgreen;");if(isNaN(window.reconnectionFails)){window.reconnectionFails = 0;}}, 3000);
                        });
                
                        socket.on("refresh", () => {console.log("%c[Scorpio Debug] %cRecarregando", "color:darkviolet;", "color:white;");window.location.reload()});
                
                        socket.on("messageCreate", messageObj => {
                            console.log(`%c[Scorpio Debug]\n%c${messageObj.author}\n%c${messageObj.message}`, "color:darkviolet;", "color:white;", "color:grey;");
                            let arrMessage = messageObj.message.split(" ");
                            for(let i=0; i<arrMessage.length; i++){
                                if(arrMessage[i].match(regex)){arrMessage[i] = `<a onclick="window.open('${arrMessage[i]}');" href="#">${arrMessage[i]}</a>`}
                            }
                            let messageDoc = $(document.createElement("p"));
                            messageObj.message = arrMessage.join(" ");
                
                            messageDoc.html(`<p style=\"color: white;\">${messageObj.author}</p><p style=\"color: grey;\">${messageObj.message}</p>`);
                            $("#messages").append(messageDoc);
                            document.querySelector("#messages").scrollTo(0, document.querySelector("#messages").scrollHeight);
                        });
                
                        window.addEventListener("keydown", (e) => {
                            if(e.key == "Enter") {
                                let message = $("input[name=\"message\"]").val();
                                let token = window.localStorage.token;
                
                                if(!token) return login();
                                if(!message) return;
                
                                if(debug == 1) console.log({token: token, message: message});
                                $("input[name=\"message\"]").val("");
                                socket.emit("messageForServer", {token: token, message: message});
                            }
                        });
                        socket.open();
                    }
                    else {window.location.reload();}
                });
            } else{window.location.reload();}
        });
    });
}

/*function deleteAcc(pwd){
    if(!window.localStorage.token) return false;

    superagent.post("/api/v2/deleteAcc").set({"Authorization": window.localStorage.token}).send({password: pwd}).end(function(err,res){
        if(res.statusCode == 500 || res.statusCode == 400 || err || res.statusCode == 404){return false;}
        window.localStorage.clear();
        socket.disconnect();
        window.location.reload();
        return true
    });
}*/