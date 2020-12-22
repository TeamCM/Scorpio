let socket;
let errorRequestClickRegister = 0;
let createdGoogleRecaptcha = 0;
let clickedTimes = 0;
let logout;
let debug = 0;
let isApp = 0;
function addZero(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}
function promptFile(multiple) {
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
//let loginmode = document.querySelector("#loginmode").dataset.loginmode;
if(!loginmode) login();
if(loginmode == 1) register();
if(loginmode == 2) {isApp = 1;}
function login(){
    if($(".app-mount-login").css("display") == "none") {$(".app-mount-login").css("display", "block");}
    if($(".app-mount-register").css("display") == "block") {$(".app-mount-register").css("display", "none");}
    if($("#app").css("display") == "block") {$("#app").css("display", "none");}
    //if(document.querySelector(".app-mount-login").style.display == "none"){document.querySelector(".app-mount-login").style.display = "block"}
    //if(document.querySelector(".app-mount-register").style.display == "block"){document.querySelector(".app-mount-register").style.display = "none"}
    //if(document.querySelector("#app").style.display == "block"){document.querySelector("#app").style.display = "none"}

    if(window.localStorage.token) return app();
    window.history.pushState({}, "", "login");
    if(typeof socket !== "undefined") {if(socket.disconnect){socket.disconnect();}socket.destroy();socket=undefined}
    if(typeof logout !== "undefined") {logout = undefined;delete logout;}
    //document.querySelector("#loginbtn").onclick = function(e){
    $("#loginbtn").on("click", function(e){
        e.preventDefault();
        const email = $("input[name=\"email\"]").val();
        const pwd = $("input[name=\"password\"]").val();
        if(clickedTimes == 1) return;

        superagent.post("/api/v1/login").send({email:email,password:pwd}).set('accept', 'json').end((err, res) => {
            if(JSON.parse(res.text).message == "That account is banned"){
                clickedTimes = 1;
                let bane = document.createElement("p");
                bane.style.fontSize = "20px";
                bane.style.color = "red";
                bane.innerText = "Está conta está banida do Scorpio";
                //return $(".app-mount").appendChild(bane);
                return $(".app-mount-login").append(bane);
                //return document.querySelector(".app-mount-login").appendChild(bane);
            }
            if(JSON.parse(res.text).message == "That account is desactivated by the user"){
                clickedTimes = 1;
                let bane = document.createElement("p");
                bane.style.fontSize = "20px";
                bane.style.color = "red";
                bane.innerText = "Está conta foi desativada pelo usuário";
                //return $(".app-mount").appendChild(bane);
                return $(".app-mount-login").append(bane);
                //return document.querySelector(".app-mount-login").appendChild(bane);
            }
                if(res.statusCode == 404){
                    let bane = document.createElement("p");
                    bane.style.fontSize = "20px";
                    bane.style.color = "red";
                    bane.innerText = "Não existe essa conta";
                    //return $(".app-mount").appendChild(bane);
                    return $(".app-mount-login").append(bane);
                    //return document.querySelector(".app-mount-login").appendChild(bane);
                }

                let token = JSON.parse(res.text);
                window.localStorage.setItem("token", token.user.token);
                $(".app-mount-login").fadeOut("fast", "", () => {$("#app").fadeIn("fast", "", () => {app();});});
            });
        });
}
function register(){
    if(window.localStorage.token) return app();
    if($(".app-mount-register").css("display") == "none"){$(".app-mount-register").css("display", "block");}
    if($(".app-mount-login").css("display") == "block"){$(".app-mount-login").css("display", "none");}
    if($(".app-mount-app").css("display") == "block") {$(".app-mount-app").css("display", "none");}
    //if(document.querySelector(".app-mount-register").style.display == "none"){document.querySelector(".app-mount-register").style.display = "block"}
    //if(document.querySelector(".app-mount-login").style.display == "block"){document.querySelector(".app-mount-login").style.display = "none"}
    //if(document.querySelector(".app-mount-app".style.display == "block")){document.querySelector(".app-mount-app").style.display = "none"}

    if(typeof socket !== "undefined") {if(socket.disconnect){socket.disconnect();}socket.destroy();socket=undefined}
    if(typeof logout !== "undefined") {logout = undefined;delete logout;}
    window.history.pushState({}, "", "register");
    superagent.get("/recaptchasitekey").end(function(err, res){
        if(createdGoogleRecaptcha == 0){
            let element = document.createElement("div");
            element.className = "g-recaptcha";
            element.dataset.sitekey = res.text;
            $("#register").append(element);
            //document.querySelector("#register").appendChild(element);
            let googleScript = document.createElement("script");
            googleScript.src="https://www.google.com/recaptcha/api.js";
            $(document.head).append(googleScript);
            //document.head.appendChild(googleScript)
            createdGoogleRecaptcha=1;
        }
        $("#registerbtn").on("click", function(e){
        //document.querySelector("#register").onclick = function(){
            e.preventDefault();

            const name = $("input[name=\"username\"]").val();
            const email = $("input[name=\"emaill\"]").val();
            const pwd = $("input[name=\"passwordl\"]").val();
            const captcha = $("#g-recaptcha-response").val();

            superagent.post("/api/v1/register").send({name:name,email:email,captcha:captcha,password:pwd}).set('accept', 'json').end((err, res) => {
                if(res.statusCode == 400){
                    function report(){
                        let element = document.createElement("p");
                        element.style.color = "red";
                        element.className="error";
                        if(JSON.parse(res.text).message == "Please select name"){element.innerText="Por favor coloque um nome de usuario";}
                        if(JSON.parse(res.text).message == "Please select email"){element.innerText="Por favor coloque seu email";}
                        if(JSON.parse(res.text).message == "Please select password"){element.innerText="Por favor coloque uma senha";}
                        if(JSON.parse(res.text).message == "Please select captcha"){element.innerText="Por favor faça o captcha";}
                        errorRequestClickRegister = 1;
                        return $("#app").append(element);
                        //return document.querySelector("#app").appendChild(element)
                    }
                    report();
                    if(errorRequestClickRegister){
                        $(".error").remove();
                        //document.querySelector(".error").remove();
                        errorRequestClickRegister=0;
                        return report();
                    } else if(!errorRequestClickRegister){
                        return report();
                    };
                }
                let token = JSON.parse(res.text);
                window.localStorage.setItem("token", token.user.token);
                $(".app-mount-register").fadeOut("fast", "", () => {$("#app").fadeIn("fast", "", () => {app();});});
            });
        });
});
}
function app(){
    if($(".app-mount-login").css("display") == "block") {$(".app-mount-login").css("display", "none");$("#app").css("display", "block");}
    if($(".app-mount-register").css("display") == "block") {$(".app-mount-register").css("display", "none");}
    //if($("#app").css("display") == "none") {$("#app").css("display", "block");}
    //if(document.querySelector(".app-mount-login").style.display == "block"){document.querySelector(".app-mount-login").style.display = "none";document.querySelector("#app").style.display = "block"}
    //if(document.querySelector(".app-mount-register").style.display == "block"){document.querySelector(".app-mount-register").style.display = "none";}
    //if(document.querySelector("#app").style.display == "none") {document.querySelector("#app").style.display = "block";}

    logout = function(){
        //document.querySelector("#app").style.opacity = 0;
        $("#app").fadeOut("fast", "", () => {
            window.localStorage.clear();
            return $(".app-mount-login").fadeIn("fast", "", () => {return login();});
        });
        
    }
    window.history.pushState({}, "", "app");
    if(!window.localStorage.token) return login();
    superagent.post("/api/v1/banned").set("Authorization", window.localStorage.token).send(null).end(function(err, res){
        if(res.statusCode == 404){window.localStorage.clear();return login();}
        if(JSON.parse(res.text).banned == true){window.localStorage.clear(); return login();}
    });

    if(!window.localStorage.token) return login();

    socket = io.connect({
        reconnectionDelayMax: 3000
    });

    ;

    $(".file").on("change", function(){
        console.log("mudou ae chefia");
        let files = document.querySelector(".file").files;

        let form = new FormData();
        for(let i=0;i<files.length;i++){
            let file = files[i];

            form.append(`file${i}`, file);
        }
        let xhr = new XMLHttpRequest();

        xhr.open("POST", "/api/sendfile");
        xhr.setRequestHeader("Authorization", window.localStorage.token);

        xhr.onload = function(){
            console.log("Concluido!");
        }

        if(xhr.status == "200" && xhr.responseText == "Done"){
            console.log("Concluido!");
        }

        xhr.send(form);
    });
    /*document.querySelector(".file").onchange = function(){
        let files = document.querySelector(".file").files;

        let form = new FormData();
        for(let i=0;i<files.length;i++){
            let file = files[i];

            form.append(`file${i}`, file);
        }
        let xhr = new XMLHttpRequest();

        xhr.open("POST", "/api/sendfile");
        xhr.setRequestHeader("Authorization", window.localStorage.token);

        xhr.onload = function(){
            console.log("Concluido!");
        }

        if(xhr.status == "200" && xhr.responseText == "Done"){
            console.log("Concluido!");
        }

        xhr.send(form);
    }*/

    socket.on("error", err => {
        if(err.logout == true) return logout();
    });

    socket.on("refresh", () => {window.location.reload()});

    socket.on("messageCreate", messageObj => {
        if(debug == 1) console.log(messageObj);
        let messageDoc = document.createElement("p");
        /*let message = DOMPurify.sanitize(messageObj.message);*/
        let arrMessage = messageObj.message.split(" ");
        for(let i=0; i<arrMessage.length; i++){
            let thisLocation = window.location.href;
            if(arrMessage[i].match(regex)){arrMessage[i] = `<a onclick="window.open('${arrMessage[i]}');" href="#">${arrMessage[i]}</a>`}
        }
        messageObj.message = arrMessage.join(" ");
        messageDoc.innerHTML = `<p style=\"color: white;\">${messageObj.author}</p><p style=\"color: grey;\">${messageObj.message}</p>`;
        $("#messages").append(messageDoc);
        //document.querySelector("#messages").appendChild(messageDoc);
        window.scrollTo(0,999999999);
    });

    window.addEventListener("keydown", (e) => {
        if(e.key == "Enter") {
            let message = $("input[name=\"message\"]").val();
            //let message = document.querySelector("input[name=\"message\"]").value;
            let token = window.localStorage.token;

            if(!token) return login();
            if(!message) return;

            if(debug == 1) console.log({token: token, message: message});
            $("input[name=\"message\"]").val("");
            //document.querySelector("input[name=\"message\"]").value = "";
            socket.emit("messageForServer", {token: token, message: message});
        }
    });
}